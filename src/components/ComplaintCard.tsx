import type { Complaint } from '../types'
import { formatAmount } from '../services/storage'

interface ComplaintCardProps {
  complaint: Complaint
  currency: string
}

export function ComplaintCard({ complaint, currency }: ComplaintCardProps) {
  const date = new Date(complaint.createdAt)
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-100 last:border-0">
      {/* Emoji pill */}
      <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-base">
        😤
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">
          {complaint.note ?? (
            <span className="text-gray-400 italic">No note</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {dateStr} · {timeStr}
        </p>
      </div>

      <span className="shrink-0 text-sm font-semibold text-amber-600">
        {formatAmount(complaint.amount, currency)}
      </span>
    </div>
  )
}
