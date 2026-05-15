import logger from '../utils/logger.js'

const requestLogger = (req, res, next) => {
    const start = Date.now()

    // When response finishes, log the result
    res.on('finish', () => {
        const duration = Date.now() - start
        const level = res.statusCode >= 400 ? 'warn' : 'info'

        logger[level](`${req.method} ${req.originalUrl}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userId: req.user?._id || 'unauthenticated'
        })
    })

    next()
}

export default requestLogger