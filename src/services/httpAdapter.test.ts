// ─── HTTP adapter tests ───────────────────────────────────────────────────────
// Written BEFORE implementation (TDD red phase).
//
// Security-critical cases:
//  • Every request MUST carry Authorization: Bearer <token>
//  • A 401 response MUST clear auth state (no stale-credential access)
//  • 404s on getJar return null (not throw)
//  • All other non-ok responses throw ApiError
//
// Functional cases:
//  • Each adapter method hits the correct URL + HTTP verb
//  • Response payloads are returned as-is (server shapes match frontend types)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHttpAdapter, ApiError, UnauthorizedError } from './httpAdapter'

// ─── Minimal jar / complaint fixtures ────────────────────────────────────────

const JAR = {
  id: 'jar-1',
  name: 'Test Jar',
  ownerId: 'u1',
  memberIds: ['u1'],
  amountPerComplaint: 100,
  currency: 'USD',
  createdAt: '2024-01-01T00:00:00.000Z',
}

const COMPLAINT = {
  id: 'c1',
  jarId: 'jar-1',
  userId: 'u1',
  note: 'ugh',
  amount: 100,
  createdAt: '2024-01-02T00:00:00.000Z',
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const TOKEN = 'test-jwt-token'
let adapter: ReturnType<typeof createHttpAdapter>

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  adapter = createHttpAdapter('http://localhost:3001', () => TOKEN)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── Security: Authorization header ──────────────────────────────────────────

describe('Authorization header (security)', () => {
  it('includes Bearer token on getJar', async () => {
    mockFetch(JAR)
    await adapter.getJar('jar-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      }),
    )
  })

  it('includes Bearer token on getComplaints', async () => {
    mockFetch([COMPLAINT])
    await adapter.getComplaints('jar-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    )
  })

  it('includes Bearer token on saveComplaint', async () => {
    mockFetch(COMPLAINT, 201)
    await adapter.saveComplaint(COMPLAINT)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    )
  })

  it('includes Bearer token on saveJar (PUT)', async () => {
    mockFetch(JAR)
    await adapter.saveJar(JAR)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    )
  })

  it('includes Bearer token on bustJar', async () => {
    mockFetch(JAR)
    await adapter.bustJar('jar-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    )
  })
})

// ─── Security: 401 handling ───────────────────────────────────────────────────

describe('401 response handling (security)', () => {
  it('getJar throws UnauthorizedError on 401', async () => {
    mockFetch({ error: 'Unauthorized' }, 401)
    await expect(adapter.getJar('jar-1')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('saveComplaint throws UnauthorizedError on 401', async () => {
    mockFetch({ error: 'Unauthorized' }, 401)
    await expect(adapter.saveComplaint(COMPLAINT)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('bustJar throws UnauthorizedError on 401', async () => {
    mockFetch({ error: 'Unauthorized' }, 401)
    await expect(adapter.bustJar('jar-1')).rejects.toBeInstanceOf(UnauthorizedError)
  })
})

// ─── getJar ───────────────────────────────────────────────────────────────────

describe('getJar()', () => {
  it('makes a GET request to /api/jars/:id', async () => {
    mockFetch(JAR)
    await adapter.getJar('jar-1')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/jars/jar-1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('returns the jar on success', async () => {
    mockFetch(JAR)
    const result = await adapter.getJar('jar-1')
    expect(result).toEqual(JAR)
  })

  it('returns null on 404 (jar not found or not a member)', async () => {
    mockFetch({ error: 'Jar not found' }, 404)
    const result = await adapter.getJar('missing')
    expect(result).toBeNull()
  })

  it('throws ApiError on other non-ok responses', async () => {
    mockFetch({ error: 'Server error' }, 500)
    await expect(adapter.getJar('jar-1')).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── getComplaints ────────────────────────────────────────────────────────────

describe('getComplaints()', () => {
  it('makes a GET request to /api/jars/:jarId/complaints', async () => {
    mockFetch([COMPLAINT])
    await adapter.getComplaints('jar-1')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/jars/jar-1/complaints',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('returns the complaints array on success', async () => {
    mockFetch([COMPLAINT])
    const result = await adapter.getComplaints('jar-1')
    expect(result).toEqual([COMPLAINT])
  })

  it('returns an empty array when the server returns []', async () => {
    mockFetch([])
    const result = await adapter.getComplaints('jar-1')
    expect(result).toEqual([])
  })
})

// ─── saveComplaint ────────────────────────────────────────────────────────────

describe('saveComplaint()', () => {
  it('makes a POST request to /api/jars/:jarId/complaints', async () => {
    mockFetch(COMPLAINT, 201)
    await adapter.saveComplaint(COMPLAINT)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/jars/jar-1/complaints',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends note in the request body', async () => {
    mockFetch(COMPLAINT, 201)
    await adapter.saveComplaint(COMPLAINT)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"note":"ugh"'),
      }),
    )
  })
})

// ─── saveJar ──────────────────────────────────────────────────────────────────

describe('saveJar()', () => {
  it('makes a PUT request to /api/jars/:id', async () => {
    mockFetch(JAR)
    await adapter.saveJar(JAR)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/jars/jar-1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('sends name and amountPerComplaint in the body', async () => {
    mockFetch(JAR)
    await adapter.saveJar(JAR)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"name":"Test Jar"'),
      }),
    )
  })
})

// ─── bustJar ──────────────────────────────────────────────────────────────────

describe('bustJar()', () => {
  it('makes a POST request to /api/jars/:id/bust', async () => {
    mockFetch(JAR)
    await adapter.bustJar('jar-1')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/jars/jar-1/bust',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns the updated jar with bustedAt set', async () => {
    const busted = { ...JAR, bustedAt: '2024-06-01T00:00:00.000Z' }
    mockFetch(busted)
    const result = await adapter.bustJar('jar-1')
    expect(result.bustedAt).toBe('2024-06-01T00:00:00.000Z')
  })
})

// ─── getCurrentUser ───────────────────────────────────────────────────────────

describe('getCurrentUser()', () => {
  it('returns the user passed to the factory via getUser()', async () => {
    const user = { id: 'u1', name: 'Alice' }
    const adapterWithUser = createHttpAdapter(
      'http://localhost:3001',
      () => TOKEN,
      () => user,
    )
    const result = await adapterWithUser.getCurrentUser()
    expect(result).toEqual(user)
  })

  it('throws when no user is available', async () => {
    const adapterNoUser = createHttpAdapter(
      'http://localhost:3001',
      () => TOKEN,
      () => null,
    )
    await expect(adapterNoUser.getCurrentUser()).rejects.toThrow()
  })
})
