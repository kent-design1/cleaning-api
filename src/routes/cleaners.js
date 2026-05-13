import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import {
    getMyProfile,
    updateMyProfile,
    uploadCV,
    uploadID,
    getVerifiedCleaners,
    getCleanerById
} from '../controllers/cleanerController.js'

const router = express.Router()

// Public
router.get('/', getVerifiedCleaners)
router.get('/:id', getCleanerById)

// Protected — cleaner only
router.get('/my/profile', protect, authorize('cleaner'), getMyProfile)
router.put('/my/profile', protect, authorize('cleaner'), updateMyProfile)
router.post('/my/upload-cv', protect, authorize('cleaner'), upload.single('cv'), uploadCV)
router.post('/my/upload-id', protect, authorize('cleaner'), upload.single('idCard'), uploadID)

export default router