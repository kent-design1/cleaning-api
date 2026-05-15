import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../index.js'
import User from '../models/User.js'
import CleanerProfile from '../models/CleanerProfile.js'

let mongoServer
let adminToken
let cleanerId

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())

    // Create admin directly in DB
    const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        password: '123456',
        role: 'admin',
        isEmailVerified: true
    })

    const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: '123456' })
    adminToken = adminLogin.body.accessToken

    // Create cleaner with pending ID
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
        idVerificationStatus: 'pending',
        idCardUrl: 'https://example.com/id.jpg'
    })
})

afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
})

describe('GET /api/admin/stats', () => {
    it('admin can get platform stats', async () => {
        const res = await request(app)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(res.body.users).toBeDefined()
        expect(res.body.jobs).toBeDefined()
        expect(res.body.verifications).toBeDefined()
    })

    it('non-admin cannot access stats', async () => {
        // Create a regular user
        await User.create({
            name: 'Regular',
            email: 'regular@test.com',
            password: '123456',
            role: 'customer',
            isEmailVerified: true
        })

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'regular@test.com', password: '123456' })

        const res = await request(app)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${login.body.accessToken}`)

        expect(res.status).toBe(403)
    })
})

describe('GET /api/admin/cleaners/pending', () => {
    it('admin can see pending verifications', async () => {
        const res = await request(app)
            .get('/api/admin/cleaners/pending')
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThan(0)
    })
})

describe('PUT /api/admin/cleaners/:id/verify', () => {
    it('admin can verify a cleaner ID', async () => {
        const res = await request(app)
            .put(`/api/admin/cleaners/${cleanerId}/verify`)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/verified/i)

        // Check DB updated
        const profile = await CleanerProfile.findOne({ user: cleanerId })
        expect(profile.idVerificationStatus).toBe('approved')
    })
})

describe('PUT /api/admin/cleaners/:id/reject', () => {
    it('admin cannot reject without a reason', async () => {
        const res = await request(app)
            .put(`/api/admin/cleaners/${cleanerId}/reject`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({})

        expect(res.status).toBe(400)
    })
})

describe('GET /api/admin/users', () => {
    it('admin can list all users', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(res.body.users).toBeDefined()
        expect(res.body.pagination).toBeDefined()
    })

    it('admin can filter users by role', async () => {
        const res = await request(app)
            .get('/api/admin/users?role=cleaner')
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        res.body.users.forEach(user => {
            expect(user.role).toBe('cleaner')
        })
    })


})