import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import {
    acceptApplication,
    rejectApplication,
    getMyApplications
} from '../controllers/applicationController.js'

const router = express.Router()

router.get('/mine', protect, authorize('cleaner'), getMyApplications)
router.put('/:id/accept', protect, authorize('customer'), acceptApplication)
router.put('/:id/reject', protect, authorize('customer'), rejectApplication)

export default router