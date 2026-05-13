import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { authorize } from '../middleware/roleMiddleware.js'
import validate, { jobSchema } from '../middleware/validateMiddleware.js'
import {
    createJob,
    getOpenJobs,
    getJobById,
    getMyPostedJobs,
    getMyAssignedJobs,
    updateJob,
    cancelJob,
    startJob,
    completeJob
} from '../controllers/jobController.js'
import {
    applyForJob,
    getJobApplications
} from '../controllers/applicationController.js'

const router = express.Router()

// Public
router.get('/', getOpenJobs)
router.get('/:id', getJobById)

// Customer only
router.post('/', protect, authorize('customer'), validate(jobSchema), createJob)
router.get('/my/posted', protect, authorize('customer'), getMyPostedJobs)
router.put('/:id', protect, authorize('customer'), updateJob)
router.delete('/:id', protect, authorize('customer'), cancelJob)
router.get('/:id/applications', protect, authorize('customer'), getJobApplications)

// Cleaner only
router.get('/my/assigned', protect, authorize('cleaner'), getMyAssignedJobs)
router.post('/:id/apply', protect, authorize('cleaner'), applyForJob)
router.put('/:id/start', protect, authorize('cleaner'), startJob)
router.put('/:id/complete', protect, authorize('cleaner'), completeJob)

export default router