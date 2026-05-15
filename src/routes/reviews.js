import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import {
    createReview,
    getCleanerReviews,
    getMyReviews
} from '../controllers/reviewController.js'

const router = express.Router()

// Public — anyone can see cleaner reviews
router.get('/cleaner/:id', getCleanerReviews)

// Customer only — create and see own reviews
router.post('/', protect, authorize('customer'), createReview)
router.get('/my', protect, authorize('customer'), getMyReviews)

export default router