import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { scoringService } from './scoringService.js'

export class SessionServiceError extends Error {
	constructor(
		message:
			| 'Session not found'
			| 'Question not found'
			| 'Session is not active'
			| 'Session expired'
			| 'Invalid answer format'
			| 'Answer already submitted'
			| 'Question not in session',
		public readonly statusCode: 400 | 404 | 409,
	) {
		super(message)
		this.name = 'SessionServiceError'
	}
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export class SessionService {
	async submitAnswer(
		sessionId: string,
		questionId: string,
		userAnswer: string | string[],
	) {
		return prisma.$transaction(async tx => {
			const session = await tx.session.findUnique({
				where: { id: sessionId },
			})

			//	Проверяет, что сессия существует, активна и не истекла
			if (!session) {
				throw new SessionServiceError('Session not found', 404)
			}

			if (session.status !== 'in_progress') {
				throw new SessionServiceError('Session is not active', 409)
			}

			if (session.expiresAt < new Date()) {
				await tx.session.update({
					where: { id: sessionId },
					data: { status: 'expired' },
				})
				throw new SessionServiceError('Session expired', 409)
			}

			// Проверяет, что вопрос существует
			const question = await tx.question.findUnique({
				where: { id: questionId },
			})

			if (!question) {
				throw new SessionServiceError('Question not found', 404)
			}

			// добавить проверку что вопрос принадлежит сессий **
			const SessionQuestion = await tx.sessionQuestion.findUnique({
				where: {
					sessionId_questionId: {
						sessionId,
						questionId,
					},
				},
			})
			// В таблице SessionQuestion где сохраняем id вопросов и выполняем запрос по поиску id сессий и вопроса. Все вопросы сохраняются в SessionQuestion, проверяем существует ли пара id сессий и вопроса и отклоняем запрос если не принадлежит
			if (!SessionQuestion) {
				throw new SessionServiceError('Question not in session', 400)
			}

			let score: number | null = null
			let isCorrect: boolean | null = null

			if (question.type === 'multiple-select') {
				if (!isStringArray(userAnswer)) {
					throw new SessionServiceError('Invalid answer format', 400)
				}
				if (!isStringArray(question.correctAnswer)) {
					throw new SessionServiceError('Invalid answer format', 400)
				}

				// Преобразуем строки в числа для подсчёта баллов
				const correctNumbers = question.correctAnswer.map(Number)
				const studentNumbers = userAnswer.map(Number)

				score = scoringService.scoreMultipleSelect(
					correctNumbers,
					studentNumbers,
				)

				const correctSet = new Set(correctNumbers)
				const studentSet = new Set(studentNumbers)
				isCorrect =
					studentSet.size === correctSet.size &&
					Array.from(studentSet).every(answer => correctSet.has(answer))
			}

			// Создаём запись Answer в транзакции
			try {
				return await tx.answer.create({
					data: {
						sessionId,
						questionId,
						userAnswer: userAnswer as Prisma.InputJsonValue,
						score,
						isCorrect,
					},
				})
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === 'P2002'
				) {
					throw new SessionServiceError('Answer already submitted', 409)
				}
				throw error
			}
		})
	}

	async createSession(
		userId: string,
		options?: { categoryId?: string; limit?: number; mode?: string },
	): Promise<{
		sessionId: string
		userId: string
		status: string
		mode: string
		questions: { id: string; text: string; type: string }[]
		totalQuestions: number
		answeredCount: number
		createdAt: Date
	}> {
		return prisma.$transaction(async tx => {
			// 1. Создаём сессию
			const session = await tx.session.create({
				data: {
					userId,
					expiresAt: new Date(Date.now() + 60 * 60 * 1000),
					status: 'in_progress',
				},
			})

			// 2. Фильтр
			const where: any = {}
			if (options?.categoryId) {
				where.categoryId = options.categoryId
			}

			// 3. Получаем вопросы
			const allQuestions = await tx.question.findMany({
				where,
				select: {
					id: true,
					text: true,
					type: true,
				},
			})

			// ❗ ВАЖНО: если нет вопросов
			if (allQuestions.length === 0) {
				throw new Error('No questions available')
			}

			// 4. Выбираем случайные
			let selectedQuestions = allQuestions

			if (options?.limit && options.limit > 0) {
				selectedQuestions = [...allQuestions] // 🔥 фикс (копия массива)
					.sort(() => 0.5 - Math.random())
					.slice(0, options.limit)
			}

			// 5. Сохраняем связь session ↔ question
			await tx.sessionQuestion.createMany({
				data: selectedQuestions.map(q => ({
					sessionId: session.id,
					questionId: q.id,
				})),
			})

			// 6. Возвращаем ответ
			return {
				sessionId: session.id,
				userId: session.userId,
				status: session.status,
				mode: options?.mode || 'standard',
				questions: selectedQuestions,
				totalQuestions: selectedQuestions.length,
				answeredCount: 0,
				createdAt: session.createdAt,
			}
		})
	}

	async submitSession(sessionId: string) {
		return prisma.$transaction(async tx => {
			// 1. Проверяем сессию
			const session = await tx.session.findUnique({
				where: { id: sessionId },
				include: {
					answers: true,
				},
			})

			if (!session) {
				throw new SessionServiceError('Session not found', 404)
			}

			if (session.status !== 'in_progress') {
				throw new SessionServiceError('Session is not active', 409)
			}

			if (session.expiresAt < new Date()) {
				await tx.session.update({
					where: { id: sessionId },
					data: { status: 'expired' },
				})
				throw new SessionServiceError('Session expired', 409)
			}

			// 2. Проверка: есть ли вообще ответы
			if (session.answers.length === 0) {
				throw new SessionServiceError('Session is not active', 409)
			}

			// 3. Считаем баллы
			const totalScore = session.answers.reduce((sum, answer) => {
				return sum + (answer.score ?? 0)
			}, 0)

			// 4. Завершаем сессию
			const updatedSession = await tx.session.update({
				where: { id: sessionId },
				data: {
					status: 'completed',
					score: totalScore,
					completedAt: new Date(),
				},
				include: {
					answers: true,
				},
			})

			return updatedSession
		})
	}
}

export const sessionService = new SessionService()
