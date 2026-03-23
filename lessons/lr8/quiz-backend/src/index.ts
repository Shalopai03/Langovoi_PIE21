import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import auth from './routes/auth.js'

const app = new Hono() //создаем экземпляр HONO

app.use('*', logger()) //логируем маршрут
app.use('*', cors())

app.get('/health', c => c.json({ status: 'ok' })) //чек работоспособность сервера

app.route('/api/auth', auth) //подключаем маршруты api auth

app.get('/', c => c.text('Quiz API Server')) //корневой маршрут возвращающий текст

serve(
	// запускаем сервер
	{
		fetch: app.fetch,
		port: 3000,
	},
	info => {
		console.log(`Server is running on http://localhost:${info.port}`)
	},
)
