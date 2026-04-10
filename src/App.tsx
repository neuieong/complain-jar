import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useJarStore } from './store/jarStore'
import { BottomNav } from './components/BottomNav'
import { Home } from './pages/Home'
import { History } from './pages/History'
import { BustJar } from './pages/BustJar'
import { Settings } from './pages/Settings'

function AppShell() {
  const init = useJarStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

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

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
