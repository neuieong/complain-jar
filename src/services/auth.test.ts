// ─── Auth service tests ───────────────────────────────────────────────────────
// Written BEFORE implementation (TDD red phase).
// Security-critical: these cover token storage, clearance, and API error paths
// that must work correctly before any HTTP adapter or UI can be trusted.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ─── localStorage mock ────────────────────────────────────────────────────────

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]) }),
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Import after mock is in place
import {
  storeToken,
  getToken,
  clearAuth,
  isAuthenticated,
  storeUser,
  getStoredUser,
  login,
  register,
  AuthError,
} from './auth'

// ─── Token management ─────────────────────────────────────────────────────────

describe('token management', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('storeToken writes the token to localStorage under cj:auth:token', () => {
    storeToken('abc.def.ghi')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('cj:auth:token', 'abc.def.ghi')
  })

  it('getToken returns the stored token', () => {
    store['cj:auth:token'] = 'my-jwt'
    expect(getToken()).toBe('my-jwt')
  })

  it('getToken returns null when nothing is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('clearAuth removes both the token and the user from localStorage', () => {
    clearAuth()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('cj:auth:token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('cj:auth:user')
  })

  it('isAuthenticated returns true when a token exists', () => {
    store['cj:auth:token'] = 'present'
    expect(isAuthenticated()).toBe(true)
  })

  it('isAuthenticated returns false when no token exists', () => {
    expect(isAuthenticated()).toBe(false)
  })
})

// ─── User storage ─────────────────────────────────────────────────────────────

describe('user storage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('storeUser serialises the user to localStorage under cj:auth:user', () => {
    const user = { id: 'u1', name: 'Alice' }
    storeUser(user)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'cj:auth:user',
      JSON.stringify(user),
    )
  })

  it('getStoredUser returns the deserialised user object', () => {
    const user = { id: 'u1', name: 'Alice' }
    store['cj:auth:user'] = JSON.stringify(user)
    expect(getStoredUser()).toEqual(user)
  })

  it('getStoredUser returns null when nothing is stored', () => {
    expect(getStoredUser()).toBeNull()
  })

  it('getStoredUser returns null when stored value is malformed JSON', () => {
    store['cj:auth:user'] = '{ not valid json'
    expect(getStoredUser()).toBeNull()
  })
})

// ─── API calls ────────────────────────────────────────────────────────────────

describe('login()', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends credentials as JSON to /api/auth/login', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'tok', user: { id: 'u1', name: 'Alice' } }),
    } as Response)

    await login('alice@example.com', 'hunter2')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: 'alice@example.com', password: 'hunter2' }),
      }),
    )
  })

  it('returns { token, user } on success', async () => {
    const payload = { token: 'jwt-xyz', user: { id: 'u1', name: 'Alice' } }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    } as Response)

    const result = await login('alice@example.com', 'hunter2')
    expect(result).toEqual(payload)
  })

  it('throws AuthError with server message on 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    } as Response)

    // Capture the error once — mockResolvedValueOnce is consumed by the first call
    const err = await login('a@b.com', 'wrong').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AuthError)
    expect((err as Error).message).toBe('Invalid credentials')
  })

  it('throws AuthError on any non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    } as Response)

    await expect(login('a@b.com', 'pass')).rejects.toBeInstanceOf(AuthError)
  })
})

describe('register()', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends name, email, password to /api/auth/register', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'tok', user: { id: 'u2', name: 'Bob' } }),
    } as Response)

    await register('Bob', 'bob@example.com', 'securepass')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Bob', email: 'bob@example.com', password: 'securepass' }),
      }),
    )
  })

  it('throws AuthError on 409 (email already in use)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Email already in use' }),
    } as Response)

    const err = await register('Bob', 'bob@example.com', 'pass').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AuthError)
    expect((err as Error).message).toBe('Email already in use')
  })
})
