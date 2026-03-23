import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { PrismaClient } from '@prisma/client'
import { githubCallbackSchema } from '../utils/validation.js'

const prisma = new PrismaClient()
const auth = new Hono()

// Mock данные
const MOCK_USERS: Record<string, { id: string; email: string; name: string }> =
	//хранение тестовых пользователей
	{
		test_code: {
			id: '12345',
			email: 'test@example.com',
			name: 'Test User',
		},
		test_code_2: {
			id: '67890',
			email: 'test2@example.com',
			name: 'Test User 2',
		},
	}

// POST /api/auth/github/callback обработка
auth.post('/github/callback', async c => {
	try {
		const body = await c.req.json()
		console.log('📦 Request body:', body)

		const validation = githubCallbackSchema.safeParse(body) //валидация данных

		if (!validation.success) {
			return c.json(
				{
					error: 'Validation failed', //возвращаем ошибку
					details: validation.error.issues,
				},
				400,
			)
		}

		const { code } = validation.data //извлекаем код авторизации из валид данных
		console.log('🔑 Processing code:', code)

		let githubUser

		// Mock режим для тестирования
		if (code.startsWith('test_')) {
			console.log('🧪 Using mock mode')

			githubUser = MOCK_USERS[code] //поиск пользователей

			if (!githubUser) {
				githubUser = {
					id: `mock_${Date.now()}`,
					email: `user_${code}@example.com`,
					name: `User ${code}`,
				}
			}
		} else {
			return c.json(
				{
					error:
						'Real GitHub OAuth not implemented. Use test_* codes for testing.',
				},
				501,
			)
		}

		// Сохраняем пользователя в базу данных
		console.log('💾 Saving user to database:', githubUser)

		const user = await prisma.user.upsert({
			where: { githubId: githubUser.id },
			update: {
				name: githubUser.name,
				email: githubUser.email,
			},
			create: {
				githubId: githubUser.id,
				name: githubUser.name,
				email: githubUser.email,
			},
		})

		console.log('✅ User saved:', user)

		// Создаем JWT токен
		const payload = {
			sub: user.id,
			githubId: user.githubId,
			email: user.email,
			exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 дней
		}

		const secret = process.env.JWT_SECRET || 'dev-secret-key' //получаем секрет ключ
		const token = await sign(payload, secret)

		// Возвращаем ответ
		return c.json({
			success: true,
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				githubId: user.githubId,
				createdAt: user.createdAt,
			},
		})
	} catch (error) {
		console.error('❌ Auth error:', error)
		return c.json(
			{
				success: false,
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			500,
		)
	}
})

auth.get('/me', async c => {
	//получаем инфу по текущему токену
	try {
		const authHeader = c.req.header('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return c.json(
				{
					success: false,
					error: 'Unauthorized',
					message: 'Missing or invalid Authorization header',
				},
				401,
			)
		}

		const token = authHeader.split(' ')[1]

		const secret = process.env.JWT_SECRET || 'dev-secret-key'
		const payload = await verify(token, secret, 'HS256')

		const user = await prisma.user.findUnique({
			where: { id: payload.sub as string },
		})

		if (!user) {
			return c.json(
				{
					success: false,
					error: 'User not found',
				},
				404,
			)
		}

		return c.json({
			//возвращаем данные пользователя
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				githubId: user.githubId,
				createdAt: user.createdAt,
			},
		})
	} catch (error) {
		return c.json(
			{
				success: false,
				error: 'Unauthorized',
				message: 'Invalid token',
			},
			401,
		)
	}
})

export default auth
