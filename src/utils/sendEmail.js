
import nodemailer from 'nodemailer'
import {logger} from "./logger.js";

const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })

    const mailOptions = {
        from: `Cleaning App <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        logger.info(`Email sent to ${to}: ${info.messageId}`)
    } catch (error) {
        logger.error(`Email failed to ${to}: ${error.message}`)
        throw new Error('Email could not be sent')
    }
}

export {sendEmail}