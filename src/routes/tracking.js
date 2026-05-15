import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import {
    getCurrentLocation,
    getTrackingHistory,
    logTrackingEvent
} from '../controllers/trackingController.js'

const router = express.Router()

// Customer or cleaner can see location and history
router.get('/:jobId', protect, getCurrentLocation)
router.get('/:jobId/history', protect, getTrackingHistory)

// Cleaner only — log a new event
router.post('/:jobId/event', protect, authorize('cleaner'), logTrackingEvent)

export default router