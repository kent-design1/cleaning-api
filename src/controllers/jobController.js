import asyncHandler from '../utils/asyncHandler.js'
import Job from '../models/Job.js'
import CustomerProfile from '../models/CustomerProfile.js'
import TrackingEvent from '../models/TrackingEvent.js'

// POST /api/jobs — customer posts a job
export const createJob = asyncHandler(async (req, res) => {
    const {
        title, description, serviceType,
        address, scheduledDate, scheduledTime,
        estimatedHours, budget
    } = req.body

    const job = await Job.create({
        customer: req.user._id,
        title,
        description,
        serviceType,
        address,
        scheduledDate,
        scheduledTime,
        estimatedHours,
        budget
    })

    // Update customer's total jobs posted
    await CustomerProfile.findOneAndUpdate(
        { user: req.user._id },
        { $inc: { totalJobsPosted: 1 } },
        { upsert: true }
    )

    res.status(201).json(job)
})

// GET /api/jobs — browse open jobs (cleaners)
export const getOpenJobs = asyncHandler(async (req, res) => {
    const {
        serviceType,
        city,
        date,
        page = 1,
        limit = 10
    } = req.query

    const filter = { status: 'open' }

    if (serviceType) filter.serviceType = serviceType
    if (city) filter['address.city'] = new RegExp(city, 'i')
    if (date) {
        const start = new Date(date)
        const end = new Date(date)
        end.setDate(end.getDate() + 1)
        filter.scheduledDate = { $gte: start, $lt: end }
    }

    const skip = (page - 1) * limit

    const [jobs, total] = await Promise.all([
        Job.find(filter)
            .populate('customer', 'name profilePhoto')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Job.countDocuments(filter)
    ])

    res.json({
        jobs,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    })
})

// GET /api/jobs/:id — single job
export const getJobById = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)
        .populate('customer', 'name profilePhoto')
        .populate('assignedCleaner', 'name profilePhoto')

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    res.json(job)
})

// GET /api/jobs/my/posted — customer sees their own jobs
export const getMyPostedJobs = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query

    const filter = { customer: req.user._id }
    if (status) filter.status = status

    const skip = (page - 1) * limit

    const [jobs, total] = await Promise.all([
        Job.find(filter)
            .populate('assignedCleaner', 'name profilePhoto')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Job.countDocuments(filter)
    ])

    res.json({
        jobs,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    })
})

// GET /api/jobs/my/assigned — cleaner sees jobs assigned to them
export const getMyAssignedJobs = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query

    const filter = { assignedCleaner: req.user._id }
    if (status) filter.status = status

    const skip = (page - 1) * limit

    const [jobs, total] = await Promise.all([
        Job.find(filter)
            .populate('customer', 'name profilePhoto')
            .sort({ scheduledDate: 1 })
            .skip(skip)
            .limit(Number(limit)),
        Job.countDocuments(filter)
    ])

    res.json({
        jobs,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    })
})

// PUT /api/jobs/:id — customer edits their job
export const updateJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    if (job.customer.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('Not authorized to edit this job')
    }

    if (job.status !== 'open') {
        res.status(400)
        throw new Error('Cannot edit a job that is already assigned or in progress')
    }

    const updatable = [
        'title', 'description', 'serviceType',
        'address', 'scheduledDate', 'scheduledTime',
        'estimatedHours', 'budget'
    ]

    updatable.forEach(field => {
        if (req.body[field] !== undefined) {
            job[field] = req.body[field]
        }
    })

    await job.save()
    res.json(job)
})

// DELETE /api/jobs/:id — customer cancels job
export const cancelJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    if (job.customer.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('Not authorized to cancel this job')
    }

    if (['completed', 'cancelled'].includes(job.status)) {
        res.status(400)
        throw new Error(`Job is already ${job.status}`)
    }

    job.status = 'cancelled'
    job.cancelledBy = req.user._id
    job.cancellationReason = req.body.reason || 'Cancelled by customer'
    await job.save()

    res.json({ message: 'Job cancelled successfully', job })
})

// PUT /api/jobs/:id/start — cleaner starts the job
export const startJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    if (job.assignedCleaner.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('You are not assigned to this job')
    }

    if (job.status !== 'assigned') {
        res.status(400)
        throw new Error('Job must be in assigned status to start')
    }

    job.status = 'in_progress'
    job.timeStarted = new Date()
    await job.save()

    // Log tracking event
    await TrackingEvent.create({
        job: job._id,
        cleaner: req.user._id,
        event: 'started',
        location: req.body.location || null
    })

    res.json({ message: 'Job started', job })
})

// PUT /api/jobs/:id/complete — cleaner completes the job
export const completeJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    if (job.assignedCleaner.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('You are not assigned to this job')
    }

    if (job.status !== 'in_progress') {
        res.status(400)
        throw new Error('Job must be in progress to complete')
    }

    job.status = 'completed'
    job.timeCompleted = new Date()
    await job.save()

    // Log tracking event
    await TrackingEvent.create({
        job: job._id,
        cleaner: req.user._id,
        event: 'completed',
        location: req.body.location || null
    })

    res.json({ message: 'Job completed', job })
})