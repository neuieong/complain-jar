import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useJarStore } from '../store/jarStore'
import { formatAmount } from '../services/storage'

const PRESET_AMOUNTS = [50, 100, 200, 500] // cents

export function Settings() {
  const jar = useJarStore((s) => s.jar)
  const updateJarName = useJarStore((s) => s.updateJarName)
  const updateAmountPerComplaint = useJarStore((s) => s.updateAmountPerComplaint)

  const [name, setName] = useState(jar?.name ?? '')
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => {
    if (jar?.name !== undefined) setName(jar.name)
  }, [jar?.name])

  function handleNameSave(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) {
      updateJarName(name.trim())
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 1500)
    }
  }

  const currency = jar?.currency ?? 'USD'
  const currentAmount = jar?.amountPerComplaint ?? 100

  return (
    <main className="flex flex-col px-6 pt-10 pb-28 min-h-screen bg-amber-50">
      <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Customize your jar</p>

      {/* Jar name */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Jar name</h2>
        <form onSubmit={handleNameSave} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-3 bg-amber-400 hover:bg-amber-500 active:scale-95 text-white rounded-xl transition-all flex items-center gap-1.5 text-sm font-medium"
          >
            {nameSaved ? <Check size={16} /> : 'Save'}
          </button>
        </form>
      </section>

      {/* Amount per complaint */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Amount per complaint
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_AMOUNTS.map((cents) => (
            <button
              key={cents}
              onClick={() => updateAmountPerComplaint(cents)}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                currentAmount === cents
                  ? 'bg-amber-400 border-amber-400 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
              }`}
            >
              {formatAmount(cents, currency)}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Currently {formatAmount(currentAmount, currency)} per complaint
        </p>
      </section>

      {/* Future features teaser */}
      <section className="mt-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Coming soon</h2>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {['Invite your partner', 'Group jars', 'Real payments'].map((feature) => (
            <div key={feature} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500">{feature}</span>
              <span className="text-xs bg-amber-100 text-amber-600 font-medium px-2 py-0.5 rounded-full">
                Soon
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
