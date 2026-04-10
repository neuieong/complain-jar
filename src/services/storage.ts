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

// ─── localStorage helpers ─────────────────────────────────────────────────────

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

// ─── localStorage adapter ─────────────────────────────────────────────────────
// All methods return Promises so this adapter satisfies the same async
// StorageAdapter interface as the HTTP adapter — zero changes to callers
// when switching between the two.

export const localStorageAdapter: StorageAdapter = {
  async getCurrentUser(): Promise<User> {
    return get<User>(KEYS.currentUser) ?? DEFAULT_USER
  },

  async getJar(jarId: string): Promise<Jar | null> {
    return get<Jar>(KEYS.jar(jarId))
  },

  async saveJar(jar: Jar): Promise<void> {
    set(KEYS.jar(jar.id), jar)
  },

  async getComplaints(jarId: string): Promise<Complaint[]> {
    return get<Complaint[]>(KEYS.complaints(jarId)) ?? []
  },

  async saveComplaint(complaint: Complaint): Promise<void> {
    const existing = get<Complaint[]>(KEYS.complaints(complaint.jarId)) ?? []
    set(KEYS.complaints(complaint.jarId), [complaint, ...existing])
  },

  async bustJar(jarId: string): Promise<Jar> {
    const jar = get<Jar>(KEYS.jar(jarId))
    if (!jar) throw new Error(`Jar ${jarId} not found`)
    const busted: Jar = { ...jar, bustedAt: new Date().toISOString() }
    set(KEYS.jar(jarId), busted)
    set(KEYS.complaints(jarId), [])
    return busted
  },
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Ensures a default jar exists on first load (localStorage path only).

export function bootstrapStorage(): { jarId: string } {
  const jarId = DEFAULT_JAR_ID
  if (!get<Jar>(KEYS.jar(jarId))) {
    set(KEYS.jar(jarId), createDefaultJar())
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
