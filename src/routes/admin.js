import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import {
    getPendingVerifications,
    verifyCleanerID,
    rejectCleanerID,
    getAllUsers,
    banUser,
    unbanUser,
    getStats
} from '../controllers/adminController.js'

const router = express.Router()

router.use(protect, authorize('admin'))

router.get('/stats', getStats)
router.get('/users', getAllUsers)
router.put('/users/:id/ban', banUser)
router.put('/users/:id/unban', unbanUser)
router.get('/cleaners/pending', getPendingVerifications)
router.put('/cleaners/:id/verify', verifyCleanerID)
router.put('/cleaners/:id/reject', rejectCleanerID)

export default router