/*
 * ЗАДАЧА 4: Основы TypeScript
 *
 * упрощенное задание объединяет работу с интерфейсами, generics и DOM API.
 * Выполняйте задания по порядку, переименовав файл в .ts
 *
 * Инструкция:
 * 1. Переименуйте файл в task4-typescript-basics.ts
 * 2. Выполните TODO задания ниже по порядку
 */

// ============================================
// ЧАСТЬ 1: Интерфейсы и типы (5-10 минут)
// ============================================

// TODO 1.1: Создайте интерфейс User с полями:
// - id: number
// - name: string
// - email: string

// TODO 1.2: Создайте тип UserRole как union type:
// type UserRole = 'admin' | 'user'

interface User {
	id: number
	name: string
	email: string
}

type UserRole = 'admin' | 'user'

// TODO 1.3: Типизируйте эту функцию
function createUser(name: string, email: string, role: User) {
	return {
		id: Math.floor(Math.random() * 1000),
		name: name,
		email: email,
		role: role,
	}
}

// ============================================
// ЧАСТЬ 2: Generics
// ============================================

// TODO 2.1: Типизируйте функцию с generics
function getFirst<T>(array: T[]) {
	return array.length > 0 ? array[0] : undefined
}

// TODO 2.2: Типизируйте функцию с generics
function filterArray<T>(array: T[], predicate: (Item: T) => boolean): T[] {
	return array.filter(predicate)
}

// ============================================
// ЧАСТЬ 3: API и обработка данных
// ============================================

// TODO 3.1: Создайте интерфейс ApiResponse<T> с полями:
// - success: boolean
// - data: T | null
// - error: string | null

interface ApiResponse<T> {
	success: boolean
	data: T | null
	error: string | null
}

// TODO 3.2: Типизируйте эту функцию
async function fetchUser<T>(userId: number) {
	try {
		const response = await fetch(`/api/users/${userId}`)
		const data = await response.json()

		if (!response.ok) {
			return {
				success: false,
				data: null,
				error: 'Ошибка загрузки',
			}
		}

		return {
			success: true,
			data: data,
			error: null,
		}
	} catch (error) {
		return {
			success: false,
			data: null,
			error: null,
		}
	}
}

// ============================================
// ЧАСТЬ 4: DOM API (10-15 минут)
// ============================================

// TODO 4.1: Типизируйте эту функцию
function getElementById<T extends HTMLElement>(id: string) {
	const element = document.getElementById(id)
	if (!element) {
		throw new Error(`Element ${id} not found`)
	}
	return element
}

// TODO 4.2: Типизируйте класс FormManager
class FormManager {
	private form: HTMLElement;
	constructor(formId: string) {
		this.form = getElementById<HTMLFormElement>(formId);
	}

	getValue(fieldId: string) {
		const field = getElementById<HTMLInputElement>(fieldId);
		return field.value;
	}

	setValue(fieldId: string, value: string) {
		const field = getElementById<HTMLInputElement>(fieldId)
		field.value = value;
	}

	onSubmit(handler event ) {
		this.form.addEventListener('submit', event => {
			event.preventDefault()
			handler(event)
		})
	}
}

// ============================================
// Примеры использования
// ============================================

console.log('=== Тестирование ===')

// Пример 1: Создание пользователя
const user = createUser('Анна', 'anna@example.com', 'admin')
console.log('Создан пользователь:', user)

// Пример 2: Работа с массивами
const numbers = [1, 2, 3, 4, 5]
const first = getFirst(numbers)
const evens = filterArray(numbers, n => n % 2 === 0)
console.log('Первый элемент:', first)
console.log('Четные числа:', evens)

// Пример 3: Работа с API
 await fetchUser(1).then(response => {
     if (response.success) {
         console.log('Пользователь:', response.data);
     } else {
         console.error('Ошибка:', response.error);
     }
 });

// Пример 4: Работа с формой (требует HTML)
 const formManager = new FormManager('my-form');
 formManager.onSubmit((event) => {
     const name = formManager.getValue('name');
     console.log('Отправлено:', name);
 });
