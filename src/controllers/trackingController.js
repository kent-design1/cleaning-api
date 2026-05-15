import asyncHandler from '../utils/asyncHandler.js'
import TrackingEvent from '../models/TrackingEvent.js'
import Job from '../models/Job.js'
import CleanerProfile from '../models/CleanerProfile.js'

// GET /api/tracking/:jobId — get current location of cleaner
export const getCurrentLocation = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.jobId)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    // Only customer who owns the job or assigned cleaner can see tracking
    const isCustomer = job.customer.toString() === req.user._id.toString()
    const isCleaner = job.assignedCleaner?.toString() === req.user._id.toString()

    if (!isCustomer && !isCleaner) {
        res.status(403)
        throw new Error('Not authorized to track this job')
    }

    // Get the most recent location from cleaner's profile
    const cleanerProfile = await CleanerProfile.findOne({
        user: job.assignedCleaner
    })

    if (!cleanerProfile) {
        res.status(404)
        throw new Error('Cleaner profile not found')
    }

    res.json({
        jobId: job._id,
        jobStatus: job.status,
        currentLocation: cleanerProfile.currentLocation,
        assignedCleaner: job.assignedCleaner
    })
})

// GET /api/tracking/:jobId/history — full event timeline
export const getTrackingHistory = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.jobId)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    // Only customer or assigned cleaner can see history
    const isCustomer = job.customer.toString() === req.user._id.toString()
    const isCleaner = job.assignedCleaner?.toString() === req.user._id.toString()

    if (!isCustomer && !isCleaner) {
        res.status(403)
        throw new Error('Not authorized')
    }

    const events = await TrackingEvent.find({ job: req.params.jobId })
        .sort({ createdAt: 1 })   // oldest first — tells the story in order

    // Calculate duration if job is completed
    let duration = null
    if (job.timeStarted && job.timeCompleted) {
        const ms = job.timeCompleted - job.timeStarted
        const minutes = Math.floor(ms / 60000)
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60
        duration = { hours, minutes: remainingMinutes, totalMinutes: minutes }
    }

    res.json({
        job: {
            _id: job._id,
            status: job.status,
            timeAccepted: job.timeAccepted,
            timeStarted: job.timeStarted,
            timeCompleted: job.timeCompleted,
            duration
        },
        events
    })
})

// POST /api/tracking/:jobId/event — cleaner logs a tracking event
export const logTrackingEvent = asyncHandler(async (req, res) => {
    const { event, location, note } = req.body

    const job = await Job.findById(req.params.jobId)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    // Only assigned cleaner can log events
    if (job.assignedCleaner?.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('You are not assigned to this job')
    }

    const trackingEvent = await TrackingEvent.create({
        job: job._id,
        cleaner: req.user._id,
        event,
        location: location || null,
        note: note || null
    })

    // Update cleaner's current location in their profile
    if (location) {
        await CleanerProfile.findOneAndUpdate(
            { user: req.user._id },
            {
                currentLocation: {
                    lat: location.lat,
                    lng: location.lng,
                    updatedAt: new Date()
                }
            }
        )
    }

    res.status(201).json(trackingEvent)
})