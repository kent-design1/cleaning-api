
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import connectDB from './config/db'
import {notFound, errorHandler} from './middleware/errorMiddleware'
import {logger} from "./utils/logger.js";
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()

// Security headers
app.use(helmet())

// CORS — allow frontend
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true    // allows cookies to be sent
}))

// Rate limiting — 100 requests per 15 mins per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' }
})
app.use('/api', limiter)

// Stricter limit on auth routes — prevent brute force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts, please try again later' }
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// HTTP request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'Cleaning API is running!',
        version: '1.0.0',
        environment: process.env.NODE_ENV
    })
})

// Routes
import authRoutes from './routes/auth'
app.use('/api/auth', authRoutes)

// Error handling — must be last
app.use(notFound)
app.use(errorHandler)

// Start server
const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  connectDB()
  const PORT = process.env.PORT || 5000
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
  })

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled rejection: ${err.message}`)
    server.close(() => process.exit(1))
  })
}

export default app