import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../index.js'

let mongoServer

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
})

describe('Registration validation', () => {
    it('rejects missing name', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@test.com', password: '123456' })

        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/name/i)
    })

    it('rejects invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test', email: 'notanemail', password: '123456' })

        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/email/i)
    })

    it('rejects short password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test', email: 'test@test.com', password: '123' })

        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/password/i)
    })

    it('rejects invalid role', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test',
                email: 'test@test.com',
                password: '123456',
                role: 'superuser'
            })

        expect(res.status).toBe(400)
    })
})

describe('Login validation', () => {
    it('rejects missing email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ password: '123456' })

        expect(res.status).toBe(400)
    })

    it('rejects missing password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com' })

        expect(res.status).toBe(400)
    })
})

describe('Security headers', () => {
    it('returns security headers on every response', async () => {
        const res = await request(app).get('/')

        expect(res.headers['x-content-type-options']).toBe('nosniff')
        expect(res.headers['x-frame-options']).toBeDefined()
        expect(res.headers['x-xss-protection']).toBeDefined()
    })
})

describe('Unknown routes', () => {
    it('returns 404 for unknown routes', async () => {
        const res = await request(app).get('/api/doesnotexist')

        expect(res.status).toBe(404)
        expect(res.body.error).toMatch(/not found/i)
    })

    it('returns JSON not HTML for unknown routes', async () => {
        const res = await request(app).get('/api/doesnotexist')

        expect(res.headers['content-type']).toMatch(/json/)
    })
})