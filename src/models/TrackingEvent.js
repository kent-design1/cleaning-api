import mongoose from 'mongoose'

const TrackingEventSchema = new mongoose.Schema(
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
        event: {
            type: String,
            enum: [
                'assigned',     // customer accepted cleaner
                'en_route',     // cleaner is on the way
                'arrived',      // cleaner arrived at address
                'started',      // job started
                'completed'     // job finished
            ],
            required: true
        },
        location: {
            lat: Number,
            lng: Number
        },
        note: String       // optional message at each event
    },
    { timestamps: true }
)

TrackingEventSchema.index({ job: 1 })
TrackingEventSchema.index({ cleaner: 1 })

const TrackingEvent = mongoose.model('TrackingEvent', TrackingEventSchema)

export default TrackingEvent