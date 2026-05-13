import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../index.js'
import User from '../models/User.js'
import CleanerProfile from '../models/CleanerProfile.js'

let mongoServer
let customerToken
let cleanerToken
let customerId
let cleanerId

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())

    // Create verified customer
    const customer = await User.create({
        name: 'Test Customer',
        email: 'customer@test.com',
        password: '123456',
        role: 'customer',
        isEmailVerified: true
    })
    customerId = customer._id

    // Login as customer
    const customerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'customer@test.com', password: '123456' })
    customerToken = customerLogin.body.accessToken

    // Create verified cleaner with approved ID
    const cleaner = await User.create({
        name: 'Test Cleaner',
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
})

afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
})

afterEach(async () => {
    const collections = mongoose.connection.collections
    for (const key in collections) {
        if (key !== 'users' && key !== 'cleanerprofiles') {
            await collections[key].deleteMany()
        }
    }
})

const jobData = {
    title: 'Deep clean my apartment',
    description: 'Need a thorough deep clean of my 2 bedroom apartment',
    serviceType: 'deep_cleaning',
    address: {
        street: 'Bahnhofstrasse 1',
        city: 'Zurich',
        postcode: '8001'
    },
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    scheduledTime: '09:00',
    estimatedHours: 3,
    budget: 120
}

describe('POST /api/jobs', () => {
    it('customer can create a job', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${customerToken}`)
            .send(jobData)

        expect(res.status).toBe(201)
        expect(res.body.title).toBe(jobData.title)
        expect(res.body.status).toBe('open')
    })

    it('cleaner cannot create a job', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${cleanerToken}`)
            .send(jobData)

        expect(res.status).toBe(403)
    })

    it('unauthenticated user cannot create a job', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .send(jobData)

        expect(res.status).toBe(401)
    })
})

describe('GET /api/jobs', () => {
    beforeEach(async () => {
        await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${customerToken}`)
            .send(jobData)
    })

    it('anyone can browse open jobs', async () => {
        const res = await request(app).get('/api/jobs')
        expect(res.status).toBe(200)
        expect(res.body.jobs.length).toBe(1)
        expect(res.body.pagination).toBeDefined()
    })
})

describe('Job application flow', () => {
    let jobId
    let applicationId

    beforeEach(async () => {
        const jobRes = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${customerToken}`)
            .send(jobData)
        jobId = jobRes.body._id
    })

    it('verified cleaner can apply for a job', async () => {
        const res = await request(app)
            .post(`/api/jobs/${jobId}/apply`)
            .set('Authorization', `Bearer ${cleanerToken}`)
            .send({
                coverLetter: 'I am an experienced cleaner with 5 years of experience',
                proposedRate: 25
            })

        expect(res.status).toBe(201)
        expect(res.body.status).toBe('pending')
        applicationId = res.body._id
    })

    it('cleaner cannot apply twice', async () => {
        await request(app)
            .post(`/api/jobs/${jobId}/apply`)
            .set('Authorization', `Bearer ${cleanerToken}`)
            .send({
                coverLetter: 'I am an experienced cleaner with 5 years of experience',
                proposedRate: 25
            })

        const res = await request(app)
            .post(`/api/jobs/${jobId}/apply`)
            .set('Authorization', `Bearer ${cleanerToken}`)
            .send({
                coverLetter: 'Applying again',
                proposedRate: 20
            })

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('You have already applied for this job')
    })
})