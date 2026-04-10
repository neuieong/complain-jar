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
// All methods are async so the interface works identically whether backed by
// localStorage (wraps values in Promise.resolve) or a remote HTTP API (fetch).
// Swap the adapter in one place; the Zustand store and components are unchanged.

export interface StorageAdapter {
  getCurrentUser(): Promise<User>
  getJar(jarId: string): Promise<Jar | null>
  saveJar(jar: Jar): Promise<void>
  getComplaints(jarId: string): Promise<Complaint[]>
  saveComplaint(complaint: Complaint): Promise<void>
  // bustJar atomically clears complaints + stamps bustedAt on the jar.
  // localStorage does it in two steps; the HTTP adapter maps it to a single
  // POST /api/jars/:id/bust which is transactional on the server.
  bustJar(jarId: string): Promise<Jar>
}
