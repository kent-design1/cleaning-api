import mongoose from 'mongoose'

const CleanerProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        bio: {
            type: String,
            maxlength: [500, 'Bio cannot exceed 500 characters']
        },

        // Uploaded documents
        cvUrl: { type: String, default: null },
        cvPublicId: { type: String, default: null },    // Cloudinary ID for deletion

        idCardUrl: { type: String, default: null },
        idCardPublicId: { type: String, default: null },

        // Admin verification of ID
        idVerificationStatus: {
            type: String,
            enum: ['not_submitted', 'pending', 'approved', 'rejected'],
            default: 'not_submitted'
        },
        idVerificationNote: String,    // admin's reason if rejected
        idVerifiedAt: Date,
        idVerifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        // Skills and services
        services: [{
            type: String,
            enum: [
                'standard_cleaning',
                'deep_cleaning',
                'move_in_out',
                'office_cleaning',
                'laundry',
                'ironing',
                'window_cleaning'
            ]
        }],

        // Availability — which days they work
        availability: {
            monday: { type: Boolean, default: false },
            tuesday: { type: Boolean, default: false },
            wednesday: { type: Boolean, default: false },
            thursday: { type: Boolean, default: false },
            friday: { type: Boolean, default: false },
            saturday: { type: Boolean, default: false },
            sunday: { type: Boolean, default: false }
        },

        hourlyRate: {
            type: Number,
            min: [0, 'Rate cannot be negative']
        },

        // Rating system
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0 },
        totalJobsCompleted: { type: Number, default: 0 },

        // Real-time location (updated while on a job)
        currentLocation: {
            lat: Number,
            lng: Number,
            updatedAt: Date
        },

        isAvailable: { type: Boolean, default: true }
    },
    { timestamps: true }
)

// CleanerProfileSchema.index({ user: 1 })
CleanerProfileSchema.index({ idVerificationStatus: 1 })
CleanerProfileSchema.index({ averageRating: -1 })

 const CleanerProfile = mongoose.model('CleanerProfile', CleanerProfileSchema)

export default CleanerProfile