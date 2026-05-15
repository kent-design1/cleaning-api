import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import validate, {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
} from '../middleware/validateMiddleware.js'
import {
    register,
    verifyEmail,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword
} from '../controllers/authController.js'

const router = express.Router()

router.post('/register', validate(registerSchema), register)
router.get('/verify-email/:token', verifyEmail)
router.post('/login', validate(loginSchema), login)
router.post('/refresh', refreshToken)
router.post('/logout', protect, logout)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)

export default router