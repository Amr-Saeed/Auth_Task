import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AppRoutes } from '../App'
import { AuthProvider } from '../auth/AuthContext'

export const user = { id: '1', name: 'Amr Saeed', email: 'amr@example.com', createdAt: '2026-01-01T00:00:00Z' }

type Handler = (init: RequestInit | undefined) => { status: number; body?: unknown }

/** Stubs fetch by "METHOD /path". Any call that is not stubbed fails the test loudly. */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { key: string; body: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`
      const handler = routes[key]
      if (!handler) throw new Error(`Unexpected request: ${key}`)
      calls.push({ key, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      const { status, body } = handler(init)
      return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status })
    }),
  )
  return calls
}

export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}
