import { create } from 'zustand'
import type { Complaint, Jar, JarStats } from '../types'
import {
  bootstrapStorage,
  formatAmount,
  generateId,
  localStorageAdapter as storage,
} from '../services/storage'

interface JarState {
  jar: Jar | null
  complaints: Complaint[]
  jarId: string

  // Actions
  init: () => void
  addComplaint: (note?: string) => void
  bustJar: () => void
  updateJarName: (name: string) => void
  updateAmountPerComplaint: (cents: number) => void

  // Derived
  stats: () => JarStats
}

export const useJarStore = create<JarState>((set, get) => ({
  jar: null,
  complaints: [],
  jarId: '',

  init() {
    const { jarId } = bootstrapStorage()
    const jar = storage.getJar(jarId)
    const complaints = storage.getComplaints(jarId)
    set({ jar, complaints, jarId })
  },

  addComplaint(note?: string) {
    const { jar, jarId } = get()
    if (!jar) return
    const user = storage.getCurrentUser()
    const complaint: Complaint = {
      id: generateId(),
      jarId,
      userId: user.id,
      note: note?.trim() || undefined,
      amount: jar.amountPerComplaint,
      createdAt: new Date().toISOString(),
    }
    storage.saveComplaint(complaint)
    set((s) => ({ complaints: [complaint, ...s.complaints] }))
  },

  bustJar() {
    const { jar, jarId } = get()
    if (!jar) return
    const busted: Jar = { ...jar, bustedAt: new Date().toISOString() }
    storage.saveJar(busted)
    storage.clearComplaints(jarId)
    set({ jar: busted, complaints: [] })
  },

  updateJarName(name: string) {
    const { jar } = get()
    if (!jar) return
    const updated = { ...jar, name }
    storage.saveJar(updated)
    set({ jar: updated })
  },

  updateAmountPerComplaint(cents: number) {
    const { jar } = get()
    if (!jar) return
    const updated = { ...jar, amountPerComplaint: cents }
    storage.saveJar(updated)
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
