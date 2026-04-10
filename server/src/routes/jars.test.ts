import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { signToken } from '../middleware/auth'

vi.mock('../lib/prisma', () => ({
  prisma: {
    jar: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    jarMember: {
      create: vi.fn(),
    },
    complaint: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../lib/prisma'

const USER_ID = 'user-1'
const OTHER_USER_ID = 'user-2'
const JAR_ID = 'jar-1'
const token = signToken(USER_ID)
const otherToken = signToken(OTHER_USER_ID)

const mockJar = {
  id: JAR_ID,
  name: 'Our Jar',
  ownerId: USER_ID,
  amountPerComplaint: 100,
  currency: 'USD',
  createdAt: new Date('2024-01-01'),
  bustedAt: null,
  members: [{ jarId: JAR_ID, userId: USER_ID }],
}

describe('GET /api/jars/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the jar for a member', async () => {
    vi.mocked(prisma.jar.findUnique).mockResolvedValue(mockJar as never)

    const res = await request(app)
      .get(`/api/jars/${JAR_ID}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(JAR_ID)
    expect(res.body.memberIds).toContain(USER_ID)
  })

  it('returns 404 for a non-member', async () => {
    vi.mocked(prisma.jar.findUnique).mockResolvedValue(mockJar as never)

    const res = await request(app)
      .get(`/api/jars/${JAR_ID}`)
      .set('Authorization', `Bearer ${otherToken}`)

    expect(res.status).toBe(404)
  })

  it('returns 401 with no token', async () => {
    const res = await request(app).get(`/api/jars/${JAR_ID}`)

    expect(res.status).toBe(401)
  })
})

describe('POST /api/jars', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a jar and returns the serialized shape', async () => {
    vi.mocked(prisma.jar.create).mockResolvedValue(mockJar as never)

    const res = await request(app)
      .post('/api/jars')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Our Jar' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      id: JAR_ID,
      name: 'Our Jar',
      ownerId: USER_ID,
      memberIds: [USER_ID],
      amountPerComplaint: 100,
      currency: 'USD',
    })
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/jars')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('POST /api/jars/:id/bust', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs a transaction and returns the updated jar', async () => {
    vi.mocked(prisma.jar.findUnique).mockResolvedValue(mockJar as never)
    const bustedJar = { ...mockJar, bustedAt: new Date('2024-06-01') }
    vi.mocked(prisma.$transaction).mockResolvedValue([{ count: 3 }, bustedJar] as never)

    const res = await request(app)
      .post(`/api/jars/${JAR_ID}/bust`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.bustedAt).toBe('2024-06-01T00:00:00.000Z')
    // Transaction must have been called — guarantees atomicity.
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('returns 404 when a non-member tries to bust', async () => {
    vi.mocked(prisma.jar.findUnique).mockResolvedValue(mockJar as never)

    const res = await request(app)
      .post(`/api/jars/${JAR_ID}/bust`)
      .set('Authorization', `Bearer ${otherToken}`)

    expect(res.status).toBe(404)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('POST /api/jars/:id/members', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows the owner to add a member', async () => {
    vi.mocked(prisma.jar.findUnique).mockResolvedValue(mockJar as never)
    vi.mocked(prisma.jarMember.create).mockResolvedValue({} as never)
    const updatedJar = { ...mockJar, members: [{ jarId: JAR_ID, userId: USER_ID }, { jarId: JAR_ID, userId: OTHER_USER_ID }] }
    vi.mocked(prisma.jar.findUniqueOrThrow).mockResolvedValue(updatedJar as never)

    const res = await request(app)
      .post(`/api/jars/${JAR_ID}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: OTHER_USER_ID })

    expect(res.status).toBe(200)
    expect(res.body.memberIds).toContain(OTHER_USER_ID)
  })

  it('returns 404 when a non-owner tries to add a member', async () => {
    // Other user is not the owner.
    vi.mocked(prisma.jar.findUnique).mockResolvedValue(mockJar as never)

    const res = await request(app)
      .post(`/api/jars/${JAR_ID}/members`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ userId: 'user-3' })

    expect(res.status).toBe(404)
  })

  it('returns 409 when the user is already a member', async () => {
    const { Prisma } = await import('@prisma/client')
    vi.mocked(prisma.jar.findUnique).mockResolvedValue(mockJar as never)
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '5.0.0',
    })
    vi.mocked(prisma.jarMember.create).mockRejectedValue(p2002)

    const res = await request(app)
      .post(`/api/jars/${JAR_ID}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: USER_ID })

    expect(res.status).toBe(409)
  })
})
