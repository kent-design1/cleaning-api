import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../index.js'
import User from '../models/User.js'
import Job from '../models/Job.js'
import CleanerProfile from '../models/CleanerProfile.js'

let mongoServer
let customerToken
let cleanerToken
let customerId
let cleanerId
let completedJobId

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())

    // Create customer
    const customer = await User.create({
        name: 'Customer',
        email: 'customer@test.com',
        password: '123456',
        role: 'customer',
        isEmailVerified: true
    })
    customerId = customer._id

    const customerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'customer@test.com', password: '123456' })
    customerToken = customerLogin.body.accessToken

    // Create cleaner
    const cleaner = await User.create({
        name: 'Cleaner',
        email: 'cleaner@test.com',
        password: '123456',
        role: 'cleaner',
        isEmailVerified: true
    })
    cleanerId = cleaner._id

    await CleanerProfile.create({
        user: cleaner._id,
        idVerificationStatus: 'approved'
    })

    const cleanerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'cleaner@test.com', password: '123456' })
    cleanerToken = cleanerLogin.body.accessToken

    // Create a completed job ready for review
    const job = await Job.create({
        customer: customerId,
        assignedCleaner: cleanerId,
        title: 'Completed cleaning job',
        description: 'This job is done and ready for review',
        serviceType: 'standard_cleaning',
        address: {
            street: 'Test Street 1',
            city: 'Zurich',
            postcode: '8001'
        },
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),  // yesterday
        scheduledTime: '09:00',
        estimatedHours: 2,
        status: 'completed',
        timeStarted: new Date(Date.now() - 3 * 60 * 60 * 1000),
        timeCompleted: new Date(Date.now() - 1 * 60 * 60 * 1000)
    })
    completedJobId = job._id.toString()
})

afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
})

describe('POST /api/reviews', () => {
    it('customer can review a completed job', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                jobId: completedJobId,
                rating: 5,
                comment: 'Excellent work, very thorough!'
            })

        expect(res.status).toBe(201)
        expect(res.body.rating).toBe(5)
        expect(res.body.comment).toBe('Excellent work, very thorough!')
    })

    it('cannot review the same job twice', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                jobId: completedJobId,
                rating: 4,
                comment: 'Trying to review again'
            })

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('You have already reviewed this job')
    })

    it('cleaner cannot leave a review', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${cleanerToken}`)
            .send({
                jobId: completedJobId,
                rating: 5,
                comment: 'I am reviewing myself'
            })

        expect(res.status).toBe(403)
    })
})

describe('GET /api/reviews/cleaner/:id', () => {
    it('anyone can see cleaner reviews', async () => {
        const res = await request(app)
            .get(`/api/reviews/cleaner/${cleanerId}`)

        expect(res.status).toBe(200)
        expect(res.body.reviews).toBeDefined()
        expect(Array.isArray(res.body.reviews)).toBe(true)
    })
})

describe('Rating aggregation', () => {
    it('cleaner average rating updates after review', async () => {
        const profile = await CleanerProfile.findOne({ user: cleanerId })

        expect(profile.averageRating).toBe(5)
        expect(profile.totalReviews).toBe(1)
    })
})

describe('GET /api/reviews/my', () => {
    it('customer can see their own reviews', async () => {
        const res = await request(app)
            .get('/api/reviews/my')
            .set('Authorization', `Bearer ${customerToken}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(1)
        expect(res.body[0].rating).toBe(5)
    })
})