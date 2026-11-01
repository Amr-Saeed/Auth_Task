export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

/** An error response from the API, normalised to one shape. */
export class ApiError extends Error {
  readonly status: number
  /** One entry per failed rule when the server rejected the input. */
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? 'Request failed')
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
  }
}

const BASE = '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      // Sends and accepts the httpOnly session cookie.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    // fetch only rejects on network failure, never on an HTTP error status.
    throw new ApiError(0, ['Cannot reach the server. Check your connection and try again.'])
  }

  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (body as { message?: string | string[] } | null)?.message
    const messages = Array.isArray(message) ? message : message ? [message] : []
    throw new ApiError(response.status, messages.length ? messages : ['Something went wrong'])
  }
  return body as T
}

export interface SignUpInput {
  email: string
  name: string
  password: string
}

export interface SignInInput {
  email: string
  password: string
}

export const api = {
  signUp: (input: SignUpInput) =>
    request<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  signIn: (input: SignInInput) =>
    request<{ user: User }>('/auth/signin', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/auth/me'),
}
