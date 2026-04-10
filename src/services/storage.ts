import type { Complaint, Jar, StorageAdapter, User } from '../types'

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  jar: (id: string) => `cj:jar:${id}`,
  complaints: (jarId: string) => `cj:complaints:${jarId}`,
  currentUser: 'cj:currentUser',
  activeJarId: 'cj:activeJarId',
} as const

// ─── Default seed data ────────────────────────────────────────────────────────

const DEFAULT_USER: User = {
  id: 'user-1',
  name: 'Me',
}

const DEFAULT_JAR_ID = 'jar-default'

function createDefaultJar(): Jar {
  return {
    id: DEFAULT_JAR_ID,
    name: 'Our Complain Jar',
    ownerId: DEFAULT_USER.id,
    memberIds: [DEFAULT_USER.id],
    amountPerComplaint: 100, // $1.00
    currency: 'USD',
    createdAt: new Date().toISOString(),
  }
}

// ─── localStorage adapter ─────────────────────────────────────────────────────

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Public adapter ───────────────────────────────────────────────────────────

export const localStorageAdapter: StorageAdapter = {
  getCurrentUser(): User {
    return get<User>(KEYS.currentUser) ?? DEFAULT_USER
  },

  getJar(jarId: string): Jar | null {
    return get<Jar>(KEYS.jar(jarId))
  },

  saveJar(jar: Jar): void {
    set(KEYS.jar(jar.id), jar)
  },

  getComplaints(jarId: string): Complaint[] {
    return get<Complaint[]>(KEYS.complaints(jarId)) ?? []
  },

  saveComplaint(complaint: Complaint): void {
    const existing = get<Complaint[]>(KEYS.complaints(complaint.jarId)) ?? []
    set(KEYS.complaints(complaint.jarId), [complaint, ...existing])
  },

  clearComplaints(jarId: string): void {
    set(KEYS.complaints(jarId), [])
  },
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Ensure a jar exists on first load.

export function bootstrapStorage(): { jarId: string } {
  const jarId = DEFAULT_JAR_ID
  if (!localStorageAdapter.getJar(jarId)) {
    localStorageAdapter.saveJar(createDefaultJar())
  }
  return { jarId }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
