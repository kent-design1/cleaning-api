import winston from "winston";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  transports: [
    // Write all errors to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),

    // Write everything to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
})

// In development also log to the console in a readable format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

export {logger}