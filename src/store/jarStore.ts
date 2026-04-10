import { create } from 'zustand'
import type { Complaint, Jar, JarStats, StorageAdapter } from '../types'
import { formatAmount, generateId } from '../services/storage'

interface JarState {
  jar: Jar | null
  complaints: Complaint[]
  jarId: string

  // Actions — all async so both localStorage and HTTP adapters work identically
  init: (adapter: StorageAdapter, jarId: string) => Promise<void>
  addComplaint: (note?: string) => Promise<void>
  bustJar: () => Promise<void>
  updateJarName: (name: string) => Promise<void>
  updateAmountPerComplaint: (cents: number) => Promise<void>

  // Derived
  stats: () => JarStats

  // Internal — the active adapter, set once by init()
  _adapter: StorageAdapter | null
}

export const useJarStore = create<JarState>((set, get) => ({
  jar: null,
  complaints: [],
  jarId: '',
  _adapter: null,

  async init(adapter: StorageAdapter, jarId: string) {
    const [jar, complaints] = await Promise.all([
      adapter.getJar(jarId),
      adapter.getComplaints(jarId),
    ])
    set({ jar, complaints, jarId, _adapter: adapter })
  },

  async addComplaint(note?: string) {
    const { jar, jarId, _adapter } = get()
    if (!jar || !_adapter) return
    const user = await _adapter.getCurrentUser()
    const complaint: Complaint = {
      id: generateId(),
      jarId,
      userId: user.id,
      note: note?.trim() || undefined,
      amount: jar.amountPerComplaint,
      createdAt: new Date().toISOString(),
    }
    await _adapter.saveComplaint(complaint)
    set((s) => ({ complaints: [complaint, ...s.complaints] }))
  },

  async bustJar() {
    const { jarId, _adapter } = get()
    if (!_adapter) return
    const busted = await _adapter.bustJar(jarId)
    set({ jar: busted, complaints: [] })
  },

  async updateJarName(name: string) {
    const { jar, _adapter } = get()
    if (!jar || !_adapter) return
    const updated = { ...jar, name }
    await _adapter.saveJar(updated)
    set({ jar: updated })
  },

  async updateAmountPerComplaint(cents: number) {
    const { jar, _adapter } = get()
    if (!jar || !_adapter) return
    const updated = { ...jar, amountPerComplaint: cents }
    await _adapter.saveJar(updated)
    set({ jar: updated })
  },

  stats(): JarStats {
    const { complaints, jar } = get()
    const totalComplaints = complaints.length
    const totalAmountCents = complaints.reduce((sum, c) => sum + c.amount, 0)
    const totalAmountFormatted = formatAmount(
      totalAmountCents,
      jar?.currency ?? 'USD',
    )
    return { totalComplaints, totalAmountCents, totalAmountFormatted }
  },
}))
