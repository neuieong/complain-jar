import { useJarStore } from '../store/jarStore'
import { ComplaintCard } from '../components/ComplaintCard'

export function History() {
  const complaints = useJarStore((s) => s.complaints)
  const jar = useJarStore((s) => s.jar)
  const stats = useJarStore((s) => s.stats)()

  const currency = jar?.currency ?? 'USD'

  return (
    <main className="flex flex-col px-6 pt-10 pb-28 min-h-screen bg-amber-50">
      <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">History</h1>
      <p className="text-sm text-gray-500 mb-6">
        {stats.totalComplaints} complaint{stats.totalComplaints !== 1 ? 's' : ''} ·{' '}
        {stats.totalAmountFormatted} total
      </p>

      {complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
          <span className="text-5xl mb-4">🎉</span>
          <p className="text-gray-600 font-medium">No complaints yet!</p>
          <p className="text-gray-400 text-sm mt-1">Go back and add one if you dare.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 px-5">
          {complaints.map((c) => (
            <ComplaintCard key={c.id} complaint={c} currency={currency} />
          ))}
        </div>
      )}
    </main>
  )
}
