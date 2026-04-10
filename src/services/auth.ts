// ─── Auth service ─────────────────────────────────────────────────────────────
// Owns all authentication state: token + user stored in localStorage,
// and the API calls to create/validate credentials with the backend.
//
// Nothing else in the app touches these keys directly.

import type { User } from '../types'

const TOKEN_KEY = 'cj:auth:token'
const USER_KEY = 'cj:auth:user'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// ─── Token helpers ────────────────────────────────────────────────────────────

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/** Removes both the token and the stored user — call on logout or 401. */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export function storeUser(user: Pick<User, 'id' | 'name'>): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUser(): Pick<User, 'id' | 'name'> | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as Pick<User, 'id' | 'name'>) : null
  } catch {
    return null
  }
}

// ─── Typed error ──────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// ─── API response shape ───────────────────────────────────────────────────────

export interface AuthResponse {
  token: string
  user: { id: string; name: string }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json() as { token?: string; user?: { id: string; name: string }; error?: string }
  if (!res.ok) throw new AuthError(body.error ?? 'Login failed')
  return body as AuthResponse
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const body = await res.json() as { token?: string; user?: { id: string; name: string }; error?: string }
  if (!res.ok) throw new AuthError(body.error ?? 'Registration failed')
  return body as AuthResponse
}
