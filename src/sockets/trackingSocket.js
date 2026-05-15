import { logger } from '../utils/logger.js'
import jwt from 'jsonwebtoken'
import CleanerProfile from '../models/CleanerProfile.js'
import TrackingEvent from '../models/TrackingEvent.js'
import Job from '../models/Job.js'

// Map to track which socket belongs to which user
// socketId → userId
const connectedUsers = new Map()

const initTrackingSocket = (io) => {

    // Middleware — verify JWT before allowing socket connection
    // Same concept as our HTTP auth middleware but for sockets
    io.use((socket, next) => {
        const token = socket.handshake.auth.token

        if (!token) {
            return next(new Error('Authentication required'))
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.userId = decoded.id
            socket.userRole = decoded.role
            next()    // allow connection
        } catch (error) {
            next(new Error('Invalid token'))
        }
    })

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`)

        // Store who this socket belongs to
        connectedUsers.set(socket.id, socket.userId)

        // ── Event: join a job room ────────────────────────────
        // Both customer and cleaner join the same room for a job
        // This means any message sent to that room reaches both of them
        socket.on('join_job', (jobId) => {
            socket.join(`job_${jobId}`)
            logger.info(`User ${socket.userId} joined room: job_${jobId}`)

            // Tell them they successfully joined
            socket.emit('joined_job', {
                jobId,
                message: `Connected to job ${jobId}`
            })
        })

        // ── Event: leave a job room ───────────────────────────
        socket.on('leave_job', (jobId) => {
            socket.leave(`job_${jobId}`)
            logger.info(`User ${socket.userId} left room: job_${jobId}`)
        })

        // ── Event: cleaner updates their location ─────────────
        // Cleaner's phone sends this every 10-30 seconds while on a job
        socket.on('update_location', async (data) => {
            const { jobId, lat, lng } = data

            try {
                const job = await Job.findById(jobId)

                if (!job) {
                    return socket.emit('error', { message: 'Job not found' })
                }

                // Only the assigned cleaner can send location updates
                if (job.assignedCleaner?.toString() !== socket.userId) {
                    return socket.emit('error', { message: 'Not authorized' })
                }

                // Save location to cleaner's profile
                await CleanerProfile.findOneAndUpdate(
                    { user: socket.userId },
                    {
                        currentLocation: {
                            lat,
                            lng,
                            updatedAt: new Date()
                        }
                    }
                )

                // Broadcast to everyone in this job's room
                // The customer sees this update on their map instantly
                io.to(`job_${jobId}`).emit('location_updated', {
                    jobId,
                    lat,
                    lng,
                    timestamp: new Date()
                })

            } catch (error) {
                logger.error(`Location update error: ${error.message}`)
                socket.emit('error', { message: 'Failed to update location' })
            }
        })

        // ── Event: cleaner updates job status ─────────────────
        // en_route → arrived → started → completed
        socket.on('update_status', async (data) => {
            const { jobId, event, location, note } = data

            try {
                const job = await Job.findById(jobId)

                if (!job) {
                    return socket.emit('error', { message: 'Job not found' })
                }

                if (job.assignedCleaner?.toString() !== socket.userId) {
                    return socket.emit('error', { message: 'Not authorized' })
                }

                // Save the tracking event to database
                const trackingEvent = await TrackingEvent.create({
                    job: jobId,
                    cleaner: socket.userId,
                    event,
                    location: location || null,
                    note: note || null
                })

                // Update job status based on event
                if (event === 'started') {
                    job.status = 'in_progress'
                    job.timeStarted = new Date()
                    await job.save()
                }

                if (event === 'completed') {
                    job.status = 'completed'
                    job.timeCompleted = new Date()
                    await job.save()
                }

                // Update location if provided
                if (location) {
                    await CleanerProfile.findOneAndUpdate(
                        { user: socket.userId },
                        {
                            currentLocation: {
                                lat: location.lat,
                                lng: location.lng,
                                updatedAt: new Date()
                            }
                        }
                    )
                }

                // Broadcast status change to everyone in the room
                // Customer sees "Your cleaner has arrived!" instantly
                io.to(`job_${jobId}`).emit('status_updated', {
                    jobId,
                    event,
                    jobStatus: job.status,
                    location,
                    note,
                    timestamp: new Date()
                })

                logger.info(`Job ${jobId} status event: ${event}`)

            } catch (error) {
                logger.error(`Status update error: ${error.message}`)
                socket.emit('error', { message: 'Failed to update status' })
            }
        })

        // ── Event: disconnect ─────────────────────────────────
        socket.on('disconnect', () => {
            connectedUsers.delete(socket.id)
            logger.info(`Socket disconnected: ${socket.id}`)
        })
    })
}

export default initTrackingSocket