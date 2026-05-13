import asyncHandler from '../utils/asyncHandler.js'
import CustomerProfile from '../models/CustomerProfile.js'
import Job from '../models/Job.js'

// GET /api/customers/profile
export const getMyProfile = asyncHandler(async (req, res) => {
    let profile = await CustomerProfile.findOne({ user: req.user._id })

    if (!profile) {
        // Auto-create profile if it doesn't exist
        profile = await CustomerProfile.create({ user: req.user._id })
    }

    res.json(profile)
})

// PUT /api/customers/profile
export const updateMyProfile = asyncHandler(async (req, res) => {
    const { phone, addresses } = req.body

    const profile = await CustomerProfile.findOneAndUpdate(
        { user: req.user._id },
        { phone, addresses },
        {
            new: true,          // return updated document
            upsert: true,       // create if doesn't exist
            runValidators: true
        }
    )

    res.json(profile)
})

// POST /api/customers/addresses
export const addAddress = asyncHandler(async (req, res) => {
    const { label, street, city, postcode, country, coordinates, isDefault } = req.body

    const profile = await CustomerProfile.findOne({ user: req.user._id })

    if (!profile) {
        res.status(404)
        throw new Error('Profile not found')
    }

    // If this is set as default, remove default from others
    if (isDefault) {
        profile.addresses.forEach(addr => { addr.isDefault = false })
    }

    profile.addresses.push({
        label, street, city, postcode,
        country: country || 'Switzerland',
        coordinates,
        isDefault: isDefault || false
    })

    await profile.save()
    res.status(201).json(profile)
})

// DELETE /api/customers/addresses/:addressId
export const deleteAddress = asyncHandler(async (req, res) => {
    const profile = await CustomerProfile.findOne({ user: req.user._id })

    if (!profile) {
        res.status(404)
        throw new Error('Profile not found')
    }

    profile.addresses = profile.addresses.filter(
        addr => addr._id.toString() !== req.params.addressId
    )

    await profile.save()
    res.json(profile)
})