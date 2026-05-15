import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../index.js'
import User from '../models/User.js'   // 👈 import at top, not inside beforeEach

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany()
  }
})

describe('Health check', () => {
  it('GET / returns API info', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Cleaning API is running!')
  })
})

describe('POST /api/auth/register', () => {
  it('registers a customer successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ali Test',
        email: 'ali@test.com',
        password: '123456',
        role: 'customer'
      })

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('ali@test.com')
    expect(res.body.user.role).toBe('customer')
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('registers a cleaner successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cleaner Test',
        email: 'cleaner@test.com',
        password: '123456',
        role: 'cleaner'
      })

    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('cleaner')
  })

  it('rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ali', email: 'ali@test.com', password: '123456' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ali 2', email: 'ali@test.com', password: '123456' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email already in use')
  })

    it('rejects admin registration', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Hacker', email: 'hack@test.com', password: '123456', role: 'admin' })

        expect(res.status).toBe(400)   // 👈 change 403 to 400
    })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Create a verified user directly in the test DB
    await User.create({
      name: 'Ali Test',
      email: 'ali@test.com',
      password: '123456',
      role: 'customer',
      isEmailVerified: true
    })
  })

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ali@test.com', password: '123456' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user.email).toBe('ali@test.com')
  })

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ali@test.com', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('rejects unverified email', async () => {
    await User.create({
      name: 'Unverified',
      email: 'unverified@test.com',
      password: '123456',
      isEmailVerified: false
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unverified@test.com', password: '123456' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Please verify your email before logging in')
  })
})