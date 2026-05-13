import mongoose from 'mongoose'

const CustomerProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true       // one profile per user
        },
        phone: {
            type: String,
            trim: true
        },
        addresses: [
            {
                label: { type: String, trim: true },  // "Home", "Office"
                street: { type: String, required: true },
                city: { type: String, required: true },
                postcode: { type: String, required: true },
                country: { type: String, default: 'Switzerland' },
                coordinates: {
                    lat: Number,
                    lng: Number
                },
                isDefault: { type: Boolean, default: false }
            }
        ],
        totalJobsPosted: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 }
    },
    { timestamps: true }
)

CustomerProfileSchema.index({ user: 1 })

const CustomerProfile = mongoose.model('CustomerProfile', CustomerProfileSchema)

export default CustomerProfile