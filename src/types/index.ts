// ─── Core domain types ───────────────────────────────────────────────────────
// Designed with future multi-user, group-jar, and real-payments in mind.
// Fields like userId / jarId / groupId are present now so the data shape
// never needs a breaking migration when those features land.

export interface User {
  id: string
  name: string
  avatar?: string // future: URL to profile photo
}

export interface Jar {
  id: string
  name: string
  ownerId: string       // future: maps to a real User.id
  memberIds: string[]   // future: group jars have multiple members
  amountPerComplaint: number  // stored in cents (e.g. 100 = $1.00)
  currency: string      // ISO 4217 (e.g. "USD", "MYR")
  createdAt: string     // ISO 8601
  bustedAt?: string     // set when the jar is emptied
}

export interface Complaint {
  id: string
  jarId: string
  userId: string
  note?: string
  amount: number  // in cents — snapshot of amountPerComplaint at time of entry
  createdAt: string  // ISO 8601
}

// ─── View / derived types ─────────────────────────────────────────────────────

export interface JarStats {
  totalComplaints: number
  totalAmountCents: number
  totalAmountFormatted: string
}

// ─── Storage contract ─────────────────────────────────────────────────────────
// This interface defines what any storage backend must implement.
// Right now it's backed by localStorage; later it can be swapped for a REST API
// or a mobile native storage layer without changing the rest of the app.

export interface StorageAdapter {
  getJar(jarId: string): Jar | null
  saveJar(jar: Jar): void
  getComplaints(jarId: string): Complaint[]
  saveComplaint(complaint: Complaint): void
  clearComplaints(jarId: string): void
  getCurrentUser(): User
}
