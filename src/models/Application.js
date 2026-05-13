import mongoose from 'mongoose'

const ApplicationSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true
        },
        cleaner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        coverLetter: {
            type: String,
            required: [true, 'Cover letter is required'],
            maxlength: [500, 'Cover letter cannot exceed 500 characters']
        },
        proposedRate: {
            type: Number,
            min: [0, 'Rate cannot be negative']
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        }
    },
    { timestamps: true }
)

// A cleaner can only apply once per job
ApplicationSchema.index({ job: 1, cleaner: 1 }, { unique: true })

const Application =  mongoose.model('Application', ApplicationSchema)

export default Application
