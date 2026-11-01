import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { user, logout } = useAuth()
  const [pending, setPending] = useState(false)

  const onLogout = async () => {
    setPending(true)
    await logout()
  }

  return (
    <main className="auth-shell">
      <section className="card">
        <h1>Welcome to the application.</h1>
        <p className="muted">
          Signed in as <strong>{user?.name}</strong> ({user?.email})
        </p>
        <button type="button" className="button secondary" onClick={onLogout} disabled={pending}>
          {pending ? 'Signing out…' : 'Log out'}
        </button>
      </section>
    </main>
  )
}
