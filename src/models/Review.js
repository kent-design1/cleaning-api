import mongoose from 'mongoose'

const ReviewSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
            unique: true       // one review per job
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        cleaner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Minimum rating is 1'],
            max: [5, 'Maximum rating is 5']
        },
        comment: {
            type: String,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        }
    },
    { timestamps: true }
)

ReviewSchema.index({ cleaner: 1 })
ReviewSchema.index({ customer: 1 })

const Review = mongoose.model('Review', ReviewSchema)

export default Review