/*
 * ЗАДАЧА 6: Решение типовых проблем типизации
 *
 * Инструкции:
 * 1. Переименуйте файл в .ts
 * 2. Исправьте все проблемы с типизацией
 * 3. Используйте type guards, utility types и другие продвинутые возможности
 * 4. Добавьте proper обработку ошибок и edge cases
 */

// Проблемные функции, которые нужно исправить

// ПРОБЛЕМА 1: Функция с any типом

type Baza = string | number | boolean | null | undefined

function processData<T extends Baza | object>(data: T): string[] {
	if (Array.isArray(data)) {
		return data.map(item => item.toString())
	}

	if (typeof data === 'object' && data !== null) {
		return Object.entries(data).map(
			([key, value]) => `${key}: ${String(value)}`
		)
	}

	return [String(data)]
}

// ПРОБЛЕМА 2: Функция с неопределенными возвращаемыми типами
function getValue<T extends object, K extends string>(
	obj: T,
	path: K
): unknown {
	const keys = path.split('.')
	let current: any = obj

	for (const key of keys) {
		if (current && typeof current === 'object' && key in current) {
			current = current[key]
		} else {
			return undefined
		}
	}

	return current
}

// ПРОБЛЕМА 3: Функция с проблемами null/undefined
function formatUser(user) {
	return {
		fullName: user.firstName + ' ' + user.lastName,
		email: user.email.toLowerCase(),
		age: user.age || 'Не указан',
		avatar: user.avatar ? user.avatar : '/default-avatar.png',
	}
}

// ПРОБЛЕМА 4: Функция с union типами без type guards
function handleResponse(response) {
	if (response.success) {
		console.log('Данные:', response.data)
		return response.data
	} else {
		console.error('Ошибка:', response.error)
		throw new Error(response.error)
	}
}

// ПРОБЛЕМА 5: Функция с проблемами мутации
function updateArray<T>(arr: T[], index: number, newValue: T): T[] {
	if (index < 0 || index >= arr.length) return arr
	return arr.map((item, i) => (i === index ? newValue : item))
}

// ПРОБЛЕМА 6: Класс с неправильной типизацией событий
class EventEmitter {
	constructor() {
		this.listeners = {}
	}

	on(event, callback) {
		if (!this.listeners[event]) {
			this.listeners[event] = []
		}
		this.listeners[event].push(callback)
	}

	emit(event, ...args) {
		if (this.listeners[event]) {
			this.listeners[event].forEach(callback => callback(...args))
		}
	}

	off(event, callback) {
		if (this.listeners[event]) {
			this.listeners[event] = this.listeners[event].filter(
				cb => cb !== callback
			)
		}
	}
}

// ПРОБЛЕМА 7: Функция с проблемами асинхронности
async function fetchWithRetry<T>(url: string, maxRetries: number): Promise<T> {
	let lastError: unknown

	for (let i = 0; i < maxRetries; i++) {
		try {
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}
			return response.json()
		} catch (error) {
			lastError = error
			if (i < maxRetries - 1) {
				await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
			}
		}
	}

	throw lastError
}

// ПРОБЛЕМА 8: Функция валидации с проблемами типов
function validateForm(formData, rules) {
	const errors = {}

	for (const field in rules) {
		const value = formData[field]
		const rule = rules[field]

		if (rule.required && (!value || value.trim() === '')) {
			errors[field] = 'Поле обязательно для заполнения'
			continue
		}

		if (value && rule.minLength && value.length < rule.minLength) {
			errors[field] = `Минимальная длина: ${rule.minLength} символов`
			continue
		}

		if (value && rule.pattern && !rule.pattern.test(value)) {
			errors[field] = rule.message || 'Неверный формат'
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	}
}

// ПРОБЛЕМА 9: Утилитарная функция с проблемами типов
function pick<T extends object, K extends keyof T>(
	obj: T,
	keys: K[]
): Pick<T, K> {
	const result = {} as Pick<T, K>
	keys.forEach(key => {
		if (key in obj) {
			result[key] = obj[key]
		}
	})
	return result
}

// ПРОБЛЕМА 10: Функция сравнения с проблемами типов
function isEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true

	if (a == null || b == null) return a === b

	if (typeof a !== typeof b) return false

	if (typeof a === 'object') {
		const keysA = Object.keys(a)
		const keysB = Object.keys(b)

		if (keysA.length !== keysB.length) return false

		return keysA.every(key => isEqual(a[key], b[key]))
	}

	return false
}

// Примеры использования (должны работать после исправления типизации)
console.log('=== Тестирование processData ===')
console.log(processData([1, 2, 3]))
console.log(processData({ a: 1, b: 2 }))
console.log(processData('hello'))

console.log('\n=== Тестирование getValue ===')
const testObj = { user: { profile: { name: 'Анна' } } }
console.log(getValue(testObj, 'user.profile.name'))
console.log(getValue(testObj, 'user.nonexistent'))

console.log('\n=== Тестирование EventEmitter ===')
const emitter = new EventEmitter()
emitter.on('test', message => console.log('Получено:', message))
emitter.emit('test', 'Привет!')

console.log('\n=== Тестирование pick ===')
const user = {
	name: 'Анна',
	age: 25,
	email: 'anna@example.com',
	password: 'secret',
}
const publicData = pick(user, ['name', 'age', 'email'])
console.log('Публичные данные:', publicData)
