import { NavLink, useLocation } from 'react-router-dom'
import { Home, List, Settings } from 'lucide-react'

const links = [
  { to: '/', label: 'Jar', icon: Home },
  { to: '/history', label: 'History', icon: List },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const { pathname } = useLocation()
  if (pathname === '/bust') return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 pb-safe">
      <div className="max-w-sm mx-auto flex">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
