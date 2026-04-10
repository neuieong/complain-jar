import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app'

// Mock Prisma so tests run without a database.
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock bcrypt to avoid slow hashing in tests.
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}))

import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

const mockUser = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  password: 'hashed-password',
  createdAt: new Date(),
}

describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a user and returns a token + user shape', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser)

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).toEqual({ id: 'user-1', name: 'Alice' })
    // Password must not be returned.
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('returns 409 when email is already in use', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' })

    expect(res.status).toBe(409)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'short' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a token and user for valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).toEqual({ id: 'user-1', name: 'Alice' })
  })

  it('returns 401 for a wrong password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' })

    expect(res.status).toBe(401)
  })

  it('returns 401 for an unknown email (same error — no enumeration)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' })

    expect(res.status).toBe(401)
    // Error message must be identical to wrong-password case.
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com' })

    expect(res.status).toBe(400)
  })
})
