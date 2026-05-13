import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import {
    getMyProfile,
    updateMyProfile,
    addAddress,
    deleteAddress
} from '../controllers/customerController.js'

const router = express.Router()

router.use(protect, authorize('customer'))

router.get('/profile', getMyProfile)
router.put('/profile', updateMyProfile)
router.post('/addresses', addAddress)
router.delete('/addresses/:addressId', deleteAddress)

export default router