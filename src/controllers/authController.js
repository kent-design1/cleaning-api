
import User from '../models/User'
import asyncHandler from '../utils/asyncHandler'
import {sendEmail} from "../utils/sendEmail.js";
import jwt from 'jsonwebtoken'
import {generateRandomToken, hashToken, generateAccessToken, generateRefreshToken} from "../utils/generateToken.js";


// Helper — attach refresh token as HTTP-only cookie
const sendRefreshTokenCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,         // JS cannot read this
        secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days in ms
    })
}

// ── Register ────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
    const { name, email, password, phone, role } = req.body

    // Prevent someone registering as admin
    if (role === 'admin') {
        res.status(403)
        throw new Error('Cannot register as admin')
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
        res.status(400)
        throw new Error('Email already in use')
    }

    // Generate email verification token
    const verificationToken = generateRandomToken()
    const hashedToken = hashToken(verificationToken)

    const user = await User.create({
        name,
        email,
        password,
        phone,
        role: role || 'customer',
        emailVerificationToken: hashedToken,
        emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000  // 24 hours
    })

    // Send verification email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`

    await sendEmail({
        to: user.email,
        subject: 'Verify your email — Cleaning App',
        html: `
      <h2>Welcome to Cleaning App, ${user.name}!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}" style="
        background: #2563eb;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
      ">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `
    })

    res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified
        }
    })
})

// ── Verify Email ─────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params

    const hashedToken = hashToken(token)

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { $gt: Date.now() }
    })

    if (!user) {
        res.status(400)
        throw new Error('Invalid or expired verification token')
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpire = undefined
    await user.save()

    res.json({ message: 'Email verified successfully. You can now log in.' })
})

// ── Login ────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        res.status(400)
        throw new Error('Please provide email and password')
    }

    // Need password field — it's excluded by default
    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await user.matchPassword(password))) {
        res.status(401)
        throw new Error('Invalid credentials')
    }

    if (!user.isEmailVerified) {
        res.status(401)
        throw new Error('Please verify your email before logging in')
    }

    if (user.isBanned) {
        res.status(403)
        throw new Error('Your account has been banned')
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role)
    const refreshToken = generateRefreshToken(user._id)

    // Store refresh token in DB (allows invalidation on logout)
    user.refreshTokens.push(refreshToken)
    await user.save()

    // Send refresh token as HTTP-only cookie
    sendRefreshTokenCookie(res, refreshToken)

    res.json({
        accessToken,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePhoto: user.profilePhoto
        }
    })
})

// ── Refresh Token ────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken

    if (!token) {
        res.status(401)
        throw new Error('No refresh token')
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decoded.id)

    if (!user || !user.refreshTokens.includes(token)) {
        res.status(401)
        throw new Error('Invalid refresh token')
    }

    // Rotate — replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter(t => t !== token)
    const newRefreshToken = generateRefreshToken(user._id)
    user.refreshTokens.push(newRefreshToken)
    await user.save()

    const accessToken = generateAccessToken(user._id, user.role)
    sendRefreshTokenCookie(res, newRefreshToken)

    res.json({ accessToken })
})

// ── Logout ───────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken

    if (token) {
        // Remove this refresh token from DB
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { refreshTokens: token }
        })
    }

    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully' })
})

// ── Forgot Password ──────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })

    // Always return success — never reveal if email exists
    if (!user) {
        return res.json({
            message: 'If that email exists, a reset link has been sent'
        })
    }

    const resetToken = generateRandomToken()
    user.passwordResetToken = hashToken(resetToken)
    user.passwordResetExpire = Date.now() + 60 * 60 * 1000  // 1 hour
    await user.save()

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`

    await sendEmail({
        to: user.email,
        subject: 'Password Reset — Cleaning App',
        html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="
        background: #2563eb;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
      ">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `
    })

    res.json({ message: 'If that email exists, a reset link has been sent' })
})

// ── Reset Password ───────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body

    const hashedToken = hashToken(token)

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpire: { $gt: Date.now() }
    })

    if (!user) {
        res.status(400)
        throw new Error('Invalid or expired reset token')
    }

    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpire = undefined
    user.refreshTokens = []    // invalidate all sessions on password change
    await user.save()

    res.json({ message: 'Password reset successful. Please log in.' })
})

export {
    register,
    verifyEmail,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword
}
