import { useState } from 'react'
import { isAuthenticated } from '../services/auth'
import { AuthPage } from '../pages/Auth'

interface AuthGateProps {
  children: React.ReactNode
}

/**
 * Renders the Auth page if there is no valid token in localStorage.
 * Once the user authenticates, renders children (the main app shell).
 * No server round-trip is needed here — if the token is stale, the first
 * API call from the HTTP adapter will throw UnauthorizedError, which
 * propagates up and the parent can call clearAuth() + reset this gate.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState(() => isAuthenticated())

  if (!authed) {
    return <AuthPage onAuthenticated={() => setAuthed(true)} />
  }

  return <>{children}</>
}
