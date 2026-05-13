import asyncHandler from '../utils/asyncHandler.js'
import User from '../models/User.js'
import CleanerProfile from '../models/CleanerProfile.js'
import Job from '../models/Job.js'
import sendEmail from '../utils/sendEmail.js'

// GET /api/admin/cleaners/pending — list cleaners awaiting verification
export const getPendingVerifications = asyncHandler(async (req, res) => {
    const pending = await CleanerProfile.find({
        idVerificationStatus: 'pending'
    }).populate('user', 'name email createdAt')

    res.json(pending)
})

// PUT /api/admin/cleaners/:id/verify — approve a cleaner's ID
export const verifyCleanerID = asyncHandler(async (req, res) => {
    const profile = await CleanerProfile.findOne({ user: req.params.id })
        .populate('user', 'name email')

    if (!profile) {
        res.status(404)
        throw new Error('Cleaner profile not found')
    }

    profile.idVerificationStatus = 'approved'
    profile.idVerifiedAt = new Date()
    profile.idVerifiedBy = req.user._id
    profile.idVerificationNote = undefined
    await profile.save()

    await sendEmail({
        to: profile.user.email,
        subject: 'ID Verified — You can now apply for jobs',
        html: `
      <h2>Congratulations, ${profile.user.name}!</h2>
      <p>Your ID has been verified. You can now browse and apply for cleaning jobs.</p>
      <a href="${process.env.CLIENT_URL}/cleaner/browse-jobs"
        style="background:#16a34a;color:white;padding:12px 24px;
               border-radius:6px;text-decoration:none">
        Browse Jobs
      </a>
    `
    })

    res.json({ message: 'Cleaner ID verified successfully' })
})

// PUT /api/admin/cleaners/:id/reject — reject a cleaner's ID
export const rejectCleanerID = asyncHandler(async (req, res) => {
    const { reason } = req.body

    if (!reason) {
        res.status(400)
        throw new Error('Please provide a reason for rejection')
    }

    const profile = await CleanerProfile.findOne({ user: req.params.id })
        .populate('user', 'name email')

    if (!profile) {
        res.status(404)
        throw new Error('Cleaner profile not found')
    }

    profile.idVerificationStatus = 'rejected'
    profile.idVerificationNote = reason
    await profile.save()

    await sendEmail({
        to: profile.user.email,
        subject: 'ID Verification Update — Action Required',
        html: `
      <h2>Hi ${profile.user.name},</h2>
      <p>Unfortunately your ID verification was not successful.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please upload a clearer copy of your ID and resubmit.</p>
      <a href="${process.env.CLIENT_URL}/cleaner/profile"
        style="background:#2563eb;color:white;padding:12px 24px;
               border-radius:6px;text-decoration:none">
        Update ID
      </a>
    `
    })

    res.json({ message: 'Cleaner ID rejected', reason })
})

// GET /api/admin/users — all users
export const getAllUsers = asyncHandler(async (req, res) => {
    const { role, page = 1, limit = 20 } = req.query

    const filter = {}
    if (role) filter.role = role

    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
        User.find(filter)
            .select('-password -refreshTokens')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        User.countDocuments(filter)
    ])

    res.json({
        users,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    })
})

// PUT /api/admin/users/:id/ban — ban a user
export const banUser = asyncHandler(async (req, res) => {
    const { reason } = req.body

    const user = await User.findById(req.params.id)

    if (!user) {
        res.status(404)
        throw new Error('User not found')
    }

    if (user.role === 'admin') {
        res.status(403)
        throw new Error('Cannot ban an admin')
    }

    user.isBanned = true
    user.bannedReason = reason || 'Banned by admin'
    user.refreshTokens = []    // kick all active sessions
    await user.save()

    res.json({ message: `User ${user.email} has been banned` })
})

// PUT /api/admin/users/:id/unban
export const unbanUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)

    if (!user) {
        res.status(404)
        throw new Error('User not found')
    }

    user.isBanned = false
    user.bannedReason = undefined
    await user.save()

    res.json({ message: `User ${user.email} has been unbanned` })
})

// GET /api/admin/stats
export const getStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalCustomers,
        totalCleaners,
        pendingVerifications,
        totalJobs,
        openJobs,
        completedJobs
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'cleaner' }),
        CleanerProfile.countDocuments({ idVerificationStatus: 'pending' }),
        Job.countDocuments(),
        Job.countDocuments({ status: 'open' }),
        Job.countDocuments({ status: 'completed' })
    ])

    res.json({
        users: { total: totalUsers, customers: totalCustomers, cleaners: totalCleaners },
        verifications: { pending: pendingVerifications },
        jobs: { total: totalJobs, open: openJobs, completed: completedJobs }
    })
})