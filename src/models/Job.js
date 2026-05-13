import mongoose from 'mongoose'

const JobSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        title: {
            type: String,
            required: [true, 'Job title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters']
        },

        description: {
            type: String,
            required: [true, 'Description is required'],
            maxlength: [1000, 'Description cannot exceed 1000 characters']
        },

        serviceType: {
            type: String,
            required: true,
            enum: [
                'standard_cleaning',
                'deep_cleaning',
                'move_in_out',
                'office_cleaning',
                'laundry',
                'ironing',
                'window_cleaning'
            ]
        },

        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            postcode: { type: String, required: true },
            country: { type: String, default: 'Switzerland' },
            coordinates: {
                lat: Number,
                lng: Number
            }
        },

        scheduledDate: {
            type: Date,
            required: [true, 'Scheduled date is required']
        },

        scheduledTime: {
            type: String,         // "09:00", "14:30"
            required: [true, 'Scheduled time is required']
        },

        estimatedHours: {
            type: Number,
            required: [true, 'Estimated hours is required'],
            min: [0.5, 'Minimum 30 minutes'],
            max: [24, 'Maximum 24 hours']
        },

        budget: {
            type: Number,
            min: [0, 'Budget cannot be negative']
        },

        status: {
            type: String,
            enum: [
                'open',          // posted, waiting for applications
                'assigned',      // customer accepted a cleaner
                'in_progress',   // cleaner started the job
                'completed',     // cleaner finished the job
                'cancelled'      // cancelled by customer or admin
            ],
            default: 'open'
        },

        // Assigned cleaner (set when customer accepts an application)
        assignedCleaner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        // All cleaners who applied
        applicants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],

        // Time tracking
        timeAccepted: Date,    // when customer accepted a cleaner
        timeStarted: Date,     // when cleaner hit "start"
        timeCompleted: Date,   // when cleaner hit "complete"

        // After completion
        isReviewed: { type: Boolean, default: false },

        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        cancellationReason: String
    },
    { timestamps: true }
)

JobSchema.index({ customer: 1 })
JobSchema.index({ assignedCleaner: 1 })
JobSchema.index({ status: 1 })
JobSchema.index({ scheduledDate: 1 })

const Job =   mongoose.model('Job', JobSchema)

export default Jo