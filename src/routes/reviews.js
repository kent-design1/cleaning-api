import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import validate, { reviewSchema } from '../middleware/validateMiddleware.js'
import {
    createReview,
    getCleanerReviews,
    getMyReviews
} from '../controllers/reviewController.js'

const router = express.Router()

router.get('/cleaner/:id', getCleanerReviews)
router.post('/', protect, authorize('customer'), validate(reviewSchema), createReview)
router.get('/my', protect, authorize('customer'), getMyReviews)

export default router