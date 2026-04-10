import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useJarStore } from '../store/jarStore'
import { JarVisual } from '../components/JarVisual'

export function BustJar() {
  const [busted, setBusted] = useState(false)
  const [busting, setBusting] = useState(false)
  const [amountAtBust, setAmountAtBust] = useState('')
  const navigate = useNavigate()
  const bustJar = useJarStore((s) => s.bustJar)
  const stats = useJarStore((s) => s.stats)()

  async function handleBust() {
    if (busting) return
    setBusting(true)
    setAmountAtBust(stats.totalAmountFormatted)
    try {
      await bustJar()
      setBusted(true)
    } finally {
      setBusting(false)
    }
  }

  if (busted) {
    return (
      <main className="flex flex-col items-center justify-center px-6 pt-10 pb-28 min-h-screen bg-emerald-50 text-center">
        <span className="text-6xl mb-4">🥂</span>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Jar busted!</h1>
        <p className="text-gray-500 text-sm mb-2">
          Time to spend{' '}
          <span className="font-semibold text-emerald-600">{amountAtBust}</span>{' '}
          on something nice together.
        </p>
        <p className="text-gray-400 text-xs mb-10">The jar is empty and ready for new complaints.</p>

        <JarVisual fillPercent={0} busted />

        <button
          onClick={() => navigate('/')}
          className="mt-10 w-full max-w-xs bg-emerald-400 hover:bg-emerald-500 active:scale-95 text-white font-semibold py-4 rounded-2xl transition-all"
        >
          Start fresh 🫙
        </button>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center px-6 pt-10 pb-28 min-h-screen bg-amber-50">
      {/* Back */}
      <div className="w-full max-w-xs mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Bust the jar</h1>
      <p className="text-sm text-gray-500 mb-8">This will empty all complaints. Go enjoy the money!</p>

      <JarVisual fillPercent={100} />

      {/* Summary */}
      <div className="mt-8 w-full max-w-xs bg-white rounded-2xl shadow-sm border border-amber-100 divide-y divide-amber-50">
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-sm text-gray-500">Complaints in jar</span>
          <span className="text-lg font-bold text-gray-800">{stats.totalComplaints}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-sm text-gray-500">Total to spend</span>
          <span className="text-xl font-bold text-amber-600">{stats.totalAmountFormatted}</span>
        </div>
      </div>

      <div className="mt-6 w-full max-w-xs space-y-3">
        <button
          onClick={handleBust}
          disabled={busting}
          className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold py-4 rounded-2xl shadow-md shadow-red-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busting ? 'Busting…' : 'Yes, bust it! 🪙'}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 font-medium py-3.5 rounded-2xl transition-all text-sm"
        >
          Never mind
        </button>
      </div>
    </main>
  )
}
