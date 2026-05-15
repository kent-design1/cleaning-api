import winston from 'winston'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logsDir = join(__dirname, '../../logs')

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
}

// Custom format for console — human readable
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length
            ? '\n' + JSON.stringify(meta, null, 2)
            : ''
        return `${timestamp} ${level}: ${message}${metaStr}`
    })
)

// JSON format for files — machine readable, searchable
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
)

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

    transports: [
        // Errors only — keep this file small and focused
        new winston.transports.File({
            filename: join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5 * 1024 * 1024,    // 5MB max per file
            maxFiles: 5                    // keep last 5 files
        }),

        // Everything — full audit trail
        new winston.transports.File({
            filename: join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5
        })
    ]
})

// Console output in development only
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }))
}

// Convenience method for HTTP request logging
logger.httpLog = (req, statusCode, responseTime) => {
    logger.info(`${req.method} ${req.originalUrl} ${statusCode} ${responseTime}ms`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    })
}

export { logger }
export default logger