import { useState } from 'react'
import { Sparkles, X, AlertCircle } from 'lucide-react'
import { useJarStore } from '../store/jarStore'
import { ComplaintCard } from '../components/ComplaintCard'
import { getToken } from '../services/auth'

const API_URL = import.meta.env.VITE_API_URL

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; report: string; complaintCount: number }
  | { status: 'error'; message: string }

export function History() {
  const complaints = useJarStore((s) => s.complaints)
  const jar = useJarStore((s) => s.jar)
  const stats = useJarStore((s) => s.stats)()

  const currency = jar?.currency ?? 'USD'
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: 'idle' })

  async function handleAnalyze() {
    if (!jar || !API_URL) return
    setAnalysis({ status: 'loading' })

    try {
      const res = await fetch(`${API_URL}/api/jars/${jar.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken() ?? ''}`,
        },
      })
      const body = await res.json() as { report?: string; complaintCount?: number; error?: string }

      if (!res.ok) {
        setAnalysis({ status: 'error', message: body.error ?? 'Analysis failed' })
        return
      }

      setAnalysis({
        status: 'done',
        report: body.report ?? '',
        complaintCount: body.complaintCount ?? complaints.length,
      })
    } catch {
      setAnalysis({ status: 'error', message: 'Could not reach the analysis service' })
    }
  }

  const canAnalyze = Boolean(API_URL) && complaints.some((c) => c.note)

  return (
    <main className="flex flex-col px-6 pt-10 pb-28 min-h-screen bg-amber-50">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">History</h1>
        {canAnalyze && (
          <button
            onClick={handleAnalyze}
            disabled={analysis.status === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-white
                       text-xs font-semibold shadow-sm active:bg-amber-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {analysis.status === 'loading' ? 'Analysing…' : 'Analyse'}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {stats.totalComplaints} complaint{stats.totalComplaints !== 1 ? 's' : ''} ·{' '}
        {stats.totalAmountFormatted} total
      </p>

      {/* Analysis panel */}
      {analysis.status === 'loading' && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 mb-5">
          <div className="flex items-center gap-2 text-amber-500 mb-3">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-semibold">Analysing your complaints…</span>
          </div>
          <p className="text-xs text-gray-400">
            Three AI agents are reviewing your jar. This usually takes 20–40 seconds.
          </p>
        </div>
      )}

      {analysis.status === 'error' && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4 mb-5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Analysis failed</p>
            <p className="text-xs text-red-500 mt-0.5">{analysis.message}</p>
          </div>
          <button onClick={() => setAnalysis({ status: 'idle' })}>
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {analysis.status === 'done' && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold text-gray-800">
                Insights — {analysis.complaintCount} complaints analysed
              </span>
            </div>
            <button onClick={() => setAnalysis({ status: 'idle' })}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {analysis.report}
          </p>
        </div>
      )}

      {/* Complaint list */}
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
