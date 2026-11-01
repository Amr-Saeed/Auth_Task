import type { ReactNode } from 'react'

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <main className="auth-shell">
      <section className="card">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="switch">{footer}</p>
      </section>
    </main>
  )
}
