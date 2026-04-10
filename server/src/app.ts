import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth'
import { jarsRouter } from './routes/jars'
import { complaintsRouter } from './routes/complaints'
import { errorHandler } from './middleware/error'

export const app = express()

// Security headers first.
app.use(helmet())

// Restrict CORS to the frontend origin. Defaults to localhost:5173 for dev;
// set CORS_ORIGIN in production to the deployed frontend URL.
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))

// 100kb body limit — far more than any real request needs; blocks oversized payloads.
app.use(express.json({ limit: '100kb' }))

app.use('/api/auth', authRouter)
app.use('/api/jars', jarsRouter)
app.use('/api/jars/:jarId/complaints', complaintsRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Must be registered last so it catches errors from all routes.
app.use(errorHandler)
