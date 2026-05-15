import asyncHandler from '../utils/asyncHandler.js'
import Review from '../models/Review.js'
import Job from '../models/Job.js'
import CleanerProfile from '../models/CleanerProfile.js'
import {sendEmail} from '../utils/sendEmail.js'
import User from '../models/User.js'

// POST /api/reviews — customer submits a review
export const createReview = asyncHandler(async (req, res) => {
    const { jobId, rating, comment } = req.body

    // Find the job
    const job = await Job.findById(jobId)
        .populate('assignedCleaner', 'name email')
        .populate('customer', 'name')

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    // Only the customer who posted the job can review it
    if (job.customer._id.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error('Only the customer can review this job')
    }

    // Job must be completed before reviewing
    if (job.status !== 'completed') {
        res.status(400)
        throw new Error('You can only review a completed job')
    }

    // Can't review twice
    if (job.isReviewed) {
        res.status(400)
        throw new Error('You have already reviewed this job')
    }

    // Create the review
    const review = await Review.create({
        job: jobId,
        customer: req.user._id,
        cleaner: job.assignedCleaner._id,
        rating,
        comment
    })

    // Mark job as reviewed
    job.isReviewed = true
    await job.save()

    // Recalculate cleaner's average rating
    await recalculateRating(job.assignedCleaner._id)

    // Notify cleaner by email
    await sendEmail({
        to: job.assignedCleaner.email,
        subject: 'You received a new review!',
        html: `
      <h2>New Review from ${job.customer.name}</h2>
      <p><strong>Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
      ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
      <a href="${process.env.CLIENT_URL}/cleaner/profile"
        style="background:#2563eb;color:white;padding:12px 24px;
               border-radius:6px;text-decoration:none">
        View Profile
      </a>
    `
    })

    res.status(201).json(review)
})

// Helper — recalculate average rating after each new review
const recalculateRating = async (cleanerId) => {
    const stats = await Review.aggregate([
        { $match: { cleaner: cleanerId } },
        {
            $group: {
                _id: '$cleaner',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ])

    if (stats.length > 0) {
        await CleanerProfile.findOneAndUpdate(
            { user: cleanerId },
            {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalReviews: stats[0].totalReviews
            }
        )
    }
}

// GET /api/reviews/cleaner/:id — all reviews for a cleaner
export const getCleanerReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query
    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
        Review.find({ cleaner: req.params.id })
            .populate('customer', 'name profilePhoto')
            .populate('job', 'title serviceType')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Review.countDocuments({ cleaner: req.params.id })
    ])

    res.json({
        reviews,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    })
})

// GET /api/reviews/my — customer sees reviews they wrote
export const getMyReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({ customer: req.user._id })
        .populate('cleaner', 'name profilePhoto')
        .populate('job', 'title serviceType scheduledDate')
        .sort({ createdAt: -1 })

    res.json(reviews)
})