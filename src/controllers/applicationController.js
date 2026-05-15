import asyncHandler from '../utils/asyncHandler.js'
import Application from '../models/Application.js'
import Job from '../models/Job.js'
import CleanerProfile from '../models/CleanerProfile.js'
import TrackingEvent from '../models/TrackingEvent.js'
import {sendEmail} from '../utils/sendEmail.js'
import User from '../models/User.js'

// POST /api/jobs/:id/apply — cleaner applies
export const applyForJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    if (job.status !== 'open') {
        res.status(400)
        throw new Error('This job is no longer accepting applications')
    }

    // Check cleaner is verified before applying
    const cleanerProfile = await CleanerProfile.findOne({ user: req.user._id })

    if (!cleanerProfile || cleanerProfile.idVerificationStatus !== 'approved') {
        res.status(403)
        throw new Error('Your ID must be verified before you can apply for jobs')
    }

    // Check not already applied
    const existingApplication = await Application.findOne({
        job: job._id,
        cleaner: req.user._id
    })

    if (existingApplication) {
        res.status(400)
        throw new Error('You have already applied for this job')
    }

    const application = await Application.create({
        job: job._id,
        cleaner: req.user._id,
        coverLetter: req.body.coverLetter,
        proposedRate: req.body.proposedRate
    })

    // Add cleaner to job's applicants list
    job.applicants.push(req.user._id)
    await job.save()


    // Notify customer someone applied
    const customer = await User.findById(job.customer)
    const cleaner = req.user

    await sendEmail({
        to: customer.email,
        subject: 'Someone applied for your cleaning job',
        html: `
      <h2>New Application Received</h2>
      <p><strong>${cleaner.name}</strong> applied for your job:</p>
      <h3>${job.title}</h3>
      <p><strong>Their message:</strong></p>
      <p>${req.body.coverLetter}</p>
      ${req.body.proposedRate
            ? `<p><strong>Proposed rate:</strong> CHF ${req.body.proposedRate}/hr</p>`
            : ''
        }
      <a href="${process.env.CLIENT_URL}/customer/jobs/${job._id}/applications"
        style="background:#2563eb;color:white;padding:12px 24px;
               border-radius:6px;text-decoration:none">
        View Application
      </a>
    `
    })

    res.status(201).json(application)
})

// GET /api/jobs/:id/applications — customer sees applicants
export const getJobApplications = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    // Only the job owner can see applications
    if (job.customer.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('Not authorized to view these applications')
    }

    const applications = await Application.find({ job: job._id })
        .populate('cleaner', 'name profilePhoto')
        .populate({
            path: 'cleaner',
            populate: {
                path: '_id',
                model: 'CleanerProfile',
                localField: '_id',
                foreignField: 'user'
            }
        })
        .sort({ createdAt: -1 })

    res.json(applications)
})

// PUT /api/applications/:id/accept — customer accepts a cleaner
export const acceptApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id)
        .populate('job')

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    // Only job owner can accept
    if (application.job.customer.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('Not authorized')
    }

    if (application.job.status !== 'open') {
        res.status(400)
        throw new Error('This job is no longer open')
    }

    // Accept this application
    application.status = 'accepted'
    await application.save()

    // Reject all other applications for this job
    await Application.updateMany(
        {
            job: application.job._id,
            _id: { $ne: application._id }
        },
        { status: 'rejected' }
    )

    // Assign cleaner to the job
    await Job.findByIdAndUpdate(application.job._id, {
        status: 'assigned',
        assignedCleaner: application.cleaner,
        timeAccepted: new Date()
    })

    // Log tracking event
    await TrackingEvent.create({
        job: application.job._id,
        cleaner: application.cleaner,
        event: 'assigned'
    })

    // Notify the cleaner they got the job
    await sendEmail({
        to: application.cleaner.email,
        subject: '🎉 You got the job!',
        html: `
      <h2>Great news, ${application.cleaner.name}!</h2>
      <p>Your application was accepted for:</p>
      <h3>${application.job.title}</h3>
      <p>
        <strong>Date:</strong> 
        ${new Date(application.job.scheduledDate).toLocaleDateString()}
      </p>
      <p>
        <strong>Time:</strong> ${application.job.scheduledTime}
      </p>
      <p>
        <strong>Address:</strong> 
        ${application.job.address.street}, ${application.job.address.city}
      </p>
      <a href="${process.env.CLIENT_URL}/cleaner/jobs"
        style="background:#16a34a;color:white;padding:12px 24px;
               border-radius:6px;text-decoration:none">
        View Job Details
      </a>
    `
    })

    res.json({ message: 'Application accepted. Cleaner assigned to job.' })
})





// PUT /api/applications/:id/reject — customer rejects
export const rejectApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id)
        .populate('job')

    if (!application) {
        res.status(404)
        throw new Error('Application not found')
    }

    if (application.job.customer.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('Not authorized')
    }

    application.status = 'rejected'
    await application.save()

    res.json({ message: 'Application rejected' })
})

// GET /api/applications/mine — cleaner sees their applications
export const getMyApplications = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query

    const filter = { cleaner: req.user._id }
    if (status) filter.status = status

    const skip = (page - 1) * limit

    const [applications, total] = await Promise.all([
        Application.find(filter)
            .populate('job', 'title status scheduledDate address serviceType')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Application.countDocuments(filter)
    ])

    res.json({
        applications,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    })
})