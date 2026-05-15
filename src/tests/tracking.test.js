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
let jobId

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())

    // Create customer
    await User.create({
        name: 'Customer',
        email: 'customer@test.com',
        password: '123456',
        role: 'customer',
        isEmailVerified: true
    })

    const customerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'customer@test.com', password: '123456' })
    customerToken = customerLogin.body.accessToken

    // Create verified cleaner
    const cleaner = await User.create({
        name: 'Cleaner',
        email: 'cleaner@test.com',
        password: '123456',
        role: 'cleaner',
        isEmailVerified: true
    })

    await CleanerProfile.create({
        user: cleaner._id,
        idVerificationStatus: 'approved'
    })

    const cleanerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'cleaner@test.com', password: '123456' })
    cleanerToken = cleanerLogin.body.accessToken

    // Create a job and assign the cleaner directly
    const job = await Job.create({
        customer: (await User.findOne({ email: 'customer@test.com' }))._id,
        assignedCleaner: cleaner._id,
        title: 'Test job',
        description: 'Test description for tracking',
        serviceType: 'deep_cleaning',
        address: {
            street: 'Test Street 1',
            city: 'Zurich',
            postcode: '8001'
        },
        scheduledDate: futureDate,
        scheduledTime: '09:00',
        estimatedHours: 2,
        status: 'assigned'
    })
    jobId = job._id.toString()
})

afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
})

describe('GET /api/tracking/:jobId', () => {
    it('customer can see cleaner location', async () => {
        const res = await request(app)
            .get(`/api/tracking/${jobId}`)
            .set('Authorization', `Bearer ${customerToken}`)

        expect(res.status).toBe(200)
        expect(res.body.jobId).toBeDefined()
        expect(res.body.jobStatus).toBe('assigned')
    })

    it('unauthorized user cannot track a job', async () => {
        const res = await request(app)
            .get(`/api/tracking/${jobId}`)

        expect(res.status).toBe(401)
    })
})

describe('GET /api/tracking/:jobId/history', () => {
    it('customer can see job tracking history', async () => {
        const res = await request(app)
            .get(`/api/tracking/${jobId}/history`)
            .set('Authorization', `Bearer ${customerToken}`)

        expect(res.status).toBe(200)
        expect(res.body.events).toBeDefined()
        expect(Array.isArray(res.body.events)).toBe(true)
        expect(res.body.job.status).toBe('assigned')
    })
})

describe('POST /api/tracking/:jobId/event', () => {
    it('cleaner can log en_route event', async () => {
        const res = await request(app)
            .post(`/api/tracking/${jobId}/event`)
            .set('Authorization', `Bearer ${cleanerToken}`)
            .send({
                event: 'en_route',
                location: { lat: 47.3769, lng: 8.5417 },
                note: 'On my way!'
            })

        expect(res.status).toBe(201)
        expect(res.body.event).toBe('en_route')
    })

    it('cleaner can log arrived event', async () => {
        const res = await request(app)
            .post(`/api/tracking/${jobId}/event`)
            .set('Authorization', `Bearer ${cleanerToken}`)
            .send({
                event: 'arrived',
                location: { lat: 47.3769, lng: 8.5417 }
            })

        expect(res.status).toBe(201)
        expect(res.body.event).toBe('arrived')
    })

    it('customer cannot log tracking events', async () => {
        const res = await request(app)
            .post(`/api/tracking/${jobId}/event`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ event: 'en_route' })

        expect(res.status).toBe(403)
    })
})

describe('Full job lifecycle via HTTP', () => {
    it('tracking history shows events in order', async () => {
        const res = await request(app)
            .get(`/api/tracking/${jobId}/history`)
            .set('Authorization', `Bearer ${customerToken}`)

        expect(res.status).toBe(200)
        expect(res.body.events.length).toBeGreaterThan(0)

        // Events should be oldest first
        const events = res.body.events
        if (events.length > 1) {
            const first = new Date(events[0].createdAt)
            const last = new Date(events[events.length - 1].createdAt)
            expect(first.getTime()).toBeLessThanOrEqual(last.getTime())
        }
    })
})