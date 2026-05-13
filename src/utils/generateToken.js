

import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Short-lived access token — sent in response body
const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '15m' }
    )
}

// Long-lived refresh token — stored in HTTP-only cookie
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '30d' }
    )
}

// Random token for email verification and password reset
const generateRandomToken = () => {
    return crypto.randomBytes(32).toString('hex')
}

// Hash a random token before storing in DB
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export {
    generateAccessToken,
    generateRefreshToken,
    generateRandomToken,
    hashToken
}