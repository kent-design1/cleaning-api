
import express from 'express'
const router = express.Router()
import {
    register,
    verifyEmail,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword
} from '../controllers/authController'
import {protect} from "../middleware/authMiddleware.js";

router.post('/register', register)
router.get('/verify-email/:token', verifyEmail)
router.post('/login', login)
router.post('/refresh', refreshToken)
router.post('/logout', protect, logout)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

export default router