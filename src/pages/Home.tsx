import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Zap } from 'lucide-react'
import { useJarStore } from '../store/jarStore'
import { JarVisual } from '../components/JarVisual'
import { AddComplaintModal } from '../components/AddComplaintModal'

// The jar "feels full" at 30 complaints — purely visual, keeps it interesting.
const VISUAL_MAX = 30

export function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const jar = useJarStore((s) => s.jar)
  const stats = useJarStore((s) => s.stats)()
  const navigate = useNavigate()

  const fillPercent = Math.min(100, (stats.totalComplaints / VISUAL_MAX) * 100)

  return (
    <main className="flex flex-col items-center px-6 pt-10 pb-28 min-h-screen bg-amber-50">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">
        {jar?.name ?? 'Complain Jar'}
      </h1>
      <p className="text-sm text-gray-500 mb-8">Every complaint costs something 💸</p>

      {/* Jar */}
      <JarVisual fillPercent={fillPercent} />

      {/* Stats */}
      <div className="mt-8 w-full max-w-xs bg-white rounded-2xl shadow-sm border border-amber-100 divide-y divide-amber-50">
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-sm text-gray-500">Total complaints</span>
          <span className="text-lg font-bold text-gray-800">{stats.totalComplaints}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-sm text-gray-500">Jar value</span>
          <span className="text-lg font-bold text-amber-600">{stats.totalAmountFormatted}</span>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="mt-6 w-full max-w-xs space-y-3">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 active:scale-95 text-white font-semibold py-4 rounded-2xl shadow-md shadow-amber-200 transition-all text-base"
        >
          <PlusCircle size={20} />
          Add a complaint
        </button>

        {stats.totalComplaints > 0 && (
          <button
            onClick={() => navigate('/bust')}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 active:scale-95 text-red-500 border border-red-200 font-semibold py-3.5 rounded-2xl transition-all text-sm"
          >
            <Zap size={16} />
            Bust the jar
          </button>
        )}
      </div>

      <AddComplaintModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  )
}
