import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useJarStore } from '../store/jarStore'
import { formatAmount } from '../services/storage'

interface AddComplaintModalProps {
  open: boolean
  onClose: () => void
}

export function AddComplaintModal({ open, onClose }: AddComplaintModalProps) {
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const addComplaint = useJarStore((s) => s.addComplaint)
  const jar = useJarStore((s) => s.jar)

  useEffect(() => {
    if (open) {
      setNote('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addComplaint(note)
    onClose()
  }

  if (!open) return null

  const amount = formatAmount(jar?.amountPerComplaint ?? 100, jar?.currency ?? 'USD')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-gray-800 mb-1">Add a complaint</h2>
        <p className="text-sm text-gray-500 mb-5">
          +{amount} goes into the jar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            ref={inputRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What are you complaining about? (optional)"
            rows={3}
            maxLength={280}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />

          <button
            type="submit"
            className="w-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all"
          >
            Drop it in the jar
          </button>
        </form>
      </div>
    </div>
  )
}
