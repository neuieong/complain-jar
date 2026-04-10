import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useJarStore } from './store/jarStore'
import { BottomNav } from './components/BottomNav'
import { AuthGate } from './components/AuthGate'
import { Home } from './pages/Home'
import { History } from './pages/History'
import { BustJar } from './pages/BustJar'
import { Settings } from './pages/Settings'
import { getToken, getStoredUser, clearAuth } from './services/auth'
import { createHttpAdapter, ensureJar, UnauthorizedError } from './services/httpAdapter'
import { localStorageAdapter, bootstrapStorage } from './services/storage'

// ─── Adapter selection ────────────────────────────────────────────────────────
// VITE_API_URL set  → HTTP adapter (real backend, auth required)
// VITE_API_URL absent → localStorage adapter (offline / demo mode)

const API_URL = import.meta.env.VITE_API_URL

const USE_HTTP = Boolean(API_URL)

// ─── AppShell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const init = useJarStore((s) => s.init)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        if (USE_HTTP) {
          const adapter = createHttpAdapter(API_URL!, getToken, getStoredUser)
          const { jarId } = await ensureJar(adapter, API_URL!, getToken)
          await init(adapter, jarId)
        } else {
          const { jarId } = bootstrapStorage()
          await init(localStorageAdapter, jarId)
        }
        setReady(true)
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          // Stale token — clear it and reload so AuthGate shows the login screen
          clearAuth()
          window.location.reload()
          return
        }
        console.error('Bootstrap failed:', err)
        setError('Failed to load jar. Please refresh.')
      }
    }

    void bootstrap()
  }, [init])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600 text-sm px-6 text-center">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="relative max-w-sm mx-auto min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/bust" element={<BustJar />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      {USE_HTTP ? (
        <AuthGate>
          <AppShell />
        </AuthGate>
      ) : (
        <AppShell />
      )}
    </BrowserRouter>
  )
}
