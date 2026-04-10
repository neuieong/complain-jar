import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { signToken } from '../middleware/auth'

vi.mock('../lib/prisma', () => ({
  prisma: {
    jarMember: {
      findUnique: vi.fn(),
    },
    jar: {
      findUniqueOrThrow: vi.fn(),
    },
    complaint: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'

const USER_ID = 'user-1'
const OTHER_USER_ID = 'user-2'
const JAR_ID = 'jar-1'
const token = signToken(USER_ID)
const otherToken = signToken(OTHER_USER_ID)

const mockMembership = { jarId: JAR_ID, userId: USER_ID }

const mockComplaint = {
  id: 'complaint-1',
  jarId: JAR_ID,
  userId: USER_ID,
  note: 'Traffic was terrible',
  amount: 100,
  createdAt: new Date('2024-03-01T10:00:00Z'),
}

describe('GET /api/jars/:jarId/complaints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns complaints for a member', async () => {
    vi.mocked(prisma.jarMember.findUnique).mockResolvedValue(mockMembership)
    vi.mocked(prisma.complaint.findMany).mockResolvedValue([mockComplaint] as never)

    const res = await request(app)
      .get(`/api/jars/${JAR_ID}/complaints`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 'complaint-1',
      jarId: JAR_ID,
      userId: USER_ID,
      amount: 100,
      note: 'Traffic was terrible',
    })
  })

  it('returns 404 for a non-member', async () => {
    vi.mocked(prisma.jarMember.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get(`/api/jars/${JAR_ID}/complaints`)
      .set('Authorization', `Bearer ${otherToken}`)

    expect(res.status).toBe(404)
    expect(prisma.complaint.findMany).not.toHaveBeenCalled()
  })

  it('returns 401 with no token', async () => {
    const res = await request(app).get(`/api/jars/${JAR_ID}/complaints`)

    expect(res.status).toBe(401)
  })
})

describe('POST /api/jars/:jarId/complaints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a complaint and snapshots the jar amount', async () => {
    vi.mocked(prisma.jarMember.findUnique).mockResolvedValue(mockMembership)
    vi.mocked(prisma.jar.findUniqueOrThrow).mockResolvedValue({
      id: JAR_ID,
      amountPerComplaint: 200,
    } as never)
    vi.mocked(prisma.complaint.create).mockResolvedValue({
      ...mockComplaint,
      amount: 200, // snapshotted from jar, not from request body
    } as never)

    const res = await request(app)
      .post(`/api/jars/${JAR_ID}/complaints`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'Traffic was terrible' })

    expect(res.status).toBe(201)
    // Amount must come from the jar's setting, not the request.
    expect(res.body.amount).toBe(200)
    expect(prisma.complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 200 }) }),
    )
  })

  it('returns 404 when a non-member tries to add a complaint', async () => {
    vi.mocked(prisma.jarMember.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .post(`/api/jars/${JAR_ID}/complaints`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ note: 'Sneaky complaint' })

    expect(res.status).toBe(404)
    expect(prisma.complaint.create).not.toHaveBeenCalled()
  })
})
