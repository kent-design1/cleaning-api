import asyncHandler from '../utils/asyncHandler.js'
import CleanerProfile from '../models/CleanerProfile.js'
import cloudinary from '../config/cloudinary.js'

// Helper — upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => {
                if (error) reject(error)
                else resolve(result)
            }
        )
        stream.end(buffer)
    })
}

// GET /api/cleaners/profile
export const getMyProfile = asyncHandler(async (req, res) => {
    let profile = await CleanerProfile.findOne({ user: req.user._id })
        .populate('user', 'name email profilePhoto')

    if (!profile) {
        profile = await CleanerProfile.create({ user: req.user._id })
    }

    res.json(profile)
})

// PUT /api/cleaners/profile
export const updateMyProfile = asyncHandler(async (req, res) => {
    const {
        bio, services, availability,
        hourlyRate, isAvailable
    } = req.body

    const profile = await CleanerProfile.findOneAndUpdate(
        { user: req.user._id },
        { bio, services, availability, hourlyRate, isAvailable },
        { new: true, upsert: true, runValidators: true }
    )

    res.json(profile)
})

// POST /api/cleaners/upload-cv
export const uploadCV = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400)
        throw new Error('Please upload a file')
    }

    const result = await uploadToCloudinary(
        req.file.buffer,
        'cleaning-app/cvs'
    )

    // Delete old CV from Cloudinary if exists
    const existing = await CleanerProfile.findOne({ user: req.user._id })
    if (existing?.cvPublicId) {
        await cloudinary.uploader.destroy(existing.cvPublicId)
    }

    const profile = await CleanerProfile.findOneAndUpdate(
        { user: req.user._id },
        { cvUrl: result.secure_url, cvPublicId: result.public_id },
        { new: true, upsert: true }
    )

    res.json({ message: 'CV uploaded successfully', cvUrl: profile.cvUrl })
})

// POST /api/cleaners/upload-id
export const uploadID = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400)
        throw new Error('Please upload a file')
    }

    // Delete old ID from Cloudinary if exists
    const existing = await CleanerProfile.findOne({ user: req.user._id })
    if (existing?.idCardPublicId) {
        await cloudinary.uploader.destroy(existing.idCardPublicId)
    }

    const result = await uploadToCloudinary(
        req.file.buffer,
        'cleaning-app/ids'
    )

    const profile = await CleanerProfile.findOneAndUpdate(
        { user: req.user._id },
        {
            idCardUrl: result.secure_url,
            idCardPublicId: result.public_id,
            idVerificationStatus: 'pending'    // triggers admin review
        },
        { new: true, upsert: true }
    )

    res.json({
        message: 'ID uploaded successfully. Pending admin verification.',
        idVerificationStatus: profile.idVerificationStatus
    })
})

// GET /api/cleaners — public list of verified cleaners
export const getVerifiedCleaners = asyncHandler(async (req, res) => {
    const {
        serviceType,
        city,
        minRating,
        page = 1,
        limit = 10
    } = req.query

    const filter = { idVerificationStatus: 'approved' }
    if (serviceType) filter.services = serviceType
    if (minRating) filter.averageRating = { $gte: Number(minRating) }

    const skip = (page - 1) * limit

    const [cleaners, total] = await Promise.all([
        CleanerProfile.find(filter)
            .populate('user', 'name profilePhoto')
            .sort({ averageRating: -1 })
            .skip(skip)
            .limit(Number(limit)),
        CleanerProfile.countDocuments(filter)
    ])

    res.json({
        cleaners,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    })
})

// GET /api/cleaners/:id — public profile
export const getCleanerById = asyncHandler(async (req, res) => {
    const profile = await CleanerProfile.findOne({ user: req.params.id })
        .populate('user', 'name profilePhoto createdAt')

    if (!profile) {
        res.status(404)
        throw new Error('Cleaner not found')
    }

    // Don't expose ID card or sensitive details publicly
    const publicProfile = {
        user: profile.user,
        bio: profile.bio,
        services: profile.services,
        availability: profile.availability,
        hourlyRate: profile.hourlyRate,
        averageRating: profile.averageRating,
        totalReviews: profile.totalReviews,
        totalJobsCompleted: profile.totalJobsCompleted,
        isAvailable: profile.isAvailable
    }

    res.json(publicProfile)
})