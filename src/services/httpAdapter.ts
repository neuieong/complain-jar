// ─── HTTP StorageAdapter ──────────────────────────────────────────────────────
// Implements the StorageAdapter interface over the Express REST API.
// Swap this for localStorageAdapter in App.tsx to toggle between backends.
//
// Factory: createHttpAdapter(baseUrl, getToken, getUser?)
//   getToken  — returns the current JWT (from auth service)
//   getUser   — returns the cached { id, name } from auth state

import type { Complaint, Jar, StorageAdapter, User } from '../types'

// ─── Error types ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Thrown specifically on HTTP 401 — callers should clear auth and redirect. */
export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, 'Unauthorized — please log in again')
    this.name = 'UnauthorizedError'
  }
}

// ─── Internal request helper ──────────────────────────────────────────────────

async function request<T>(
  baseUrl: string,
  getToken: () => string | null,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401) throw new UnauthorizedError()

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createHttpAdapter(
  baseUrl: string,
  getToken: () => string | null,
  getUser: () => Pick<User, 'id' | 'name'> | null = () => null,
): StorageAdapter {
  const req = <T>(path: string, options?: RequestInit) =>
    request<T>(baseUrl, getToken, path, options)

  return {
    // ── User ──────────────────────────────────────────────────────────────────
    async getCurrentUser(): Promise<User> {
      const user = getUser()
      if (!user) throw new Error('No authenticated user — call login() first')
      return user
    },

    // ── Jar ───────────────────────────────────────────────────────────────────
    async getJar(jarId: string): Promise<Jar | null> {
      try {
        return await req<Jar>(`/api/jars/${jarId}`, { method: 'GET' })
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },

    async saveJar(jar: Jar): Promise<void> {
      // The backend owns amountPerComplaint + name updates via PUT.
      // bustedAt is managed exclusively by bustJar().
      await req<Jar>(`/api/jars/${jar.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: jar.name,
          amountPerComplaint: jar.amountPerComplaint,
        }),
      })
    },

    // ── Complaints ────────────────────────────────────────────────────────────
    async getComplaints(jarId: string): Promise<Complaint[]> {
      return req<Complaint[]>(`/api/jars/${jarId}/complaints`, { method: 'GET' })
    },

    async saveComplaint(complaint: Complaint): Promise<void> {
      await req<Complaint>(`/api/jars/${complaint.jarId}/complaints`, {
        method: 'POST',
        body: JSON.stringify({ note: complaint.note }),
      })
    },

    // ── Bust ──────────────────────────────────────────────────────────────────
    // Single atomic endpoint: deletes all complaints + stamps bustedAt.
    async bustJar(jarId: string): Promise<Jar> {
      return req<Jar>(`/api/jars/${jarId}/bust`, { method: 'POST' })
    },
  }
}

const ACTIVE_JAR_KEY = 'cj:activeJarId'

/** Creates a new jar on the backend and stores the resulting jarId locally. */
export async function createJarAndBootstrap(
  baseUrl: string,
  getToken: () => string | null,
  name = 'Our Complain Jar',
  amountPerComplaint = 100,
  currency = 'USD',
): Promise<{ jarId: string }> {
  const token = getToken()
  const res = await fetch(`${baseUrl}/api/jars`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, amountPerComplaint, currency }),
  })

  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new ApiError(res.status, body.error ?? 'Failed to create jar')
  }

  const jar = await res.json() as Jar
  localStorage.setItem(ACTIVE_JAR_KEY, jar.id)
  return { jarId: jar.id }
}

// In-flight promise — prevents StrictMode double-fire from creating two jars.
let ensureJarPromise: Promise<{ jarId: string }> | null = null

/**
 * Full bootstrap for the HTTP path:
 * 1. Try the stored jarId from localStorage
 * 2. If missing/stale, list the user's existing jars (GET /api/jars)
 * 3. Only if the user truly has no jars, create a new one
 *
 * Deduped via a module-level promise so React StrictMode's double-effect
 * invocation doesn't race and create two jars.
 */
export async function ensureJar(
  adapter: StorageAdapter,
  baseUrl: string,
  getToken: () => string | null,
): Promise<{ jarId: string }> {
  if (ensureJarPromise) return ensureJarPromise

  ensureJarPromise = _ensureJar(adapter, baseUrl, getToken).finally(() => {
    ensureJarPromise = null
  })
  return ensureJarPromise
}

async function _ensureJar(
  adapter: StorageAdapter,
  baseUrl: string,
  getToken: () => string | null,
): Promise<{ jarId: string }> {
  // 1. Try the cached jar ID first
  const stored = localStorage.getItem(ACTIVE_JAR_KEY)
  if (stored) {
    const jar = await adapter.getJar(stored)
    if (jar) return { jarId: stored }
    // Stale — fall through
    localStorage.removeItem(ACTIVE_JAR_KEY)
  }

  // 2. List the user's existing jars — use the first (most recently created)
  const token = getToken()
  const listRes = await fetch(`${baseUrl}/api/jars`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (listRes.status === 401) throw new UnauthorizedError()
  if (listRes.ok) {
    const jars = await listRes.json() as Jar[]
    if (jars.length > 0) {
      localStorage.setItem(ACTIVE_JAR_KEY, jars[0].id)
      return { jarId: jars[0].id }
    }
  }

  // 3. No existing jars — create one
  return createJarAndBootstrap(baseUrl, getToken)
}
