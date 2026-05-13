import nodemailer from 'nodemailer'
import { logger } from '../utils/logger.js'

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT,  // true for port 465, false for 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })
}

// Test the connection on startup
export const verifyEmailConnection = async () => {
    if (process.env.NODE_ENV === 'test') return

    try {
        const transporter = createTransporter()
        await transporter.verify()
        logger.info('Email service connected')
    } catch (error) {
        logger.warn(`Email service not available: ${error.message}`)
    }
}

export default createTransporter