import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockApi, renderAt, user } from './test/helpers'

const unauthenticated = { 'GET /api/auth/me': () => ({ status: 401, body: { message: 'Unauthorized' } }) }
const authenticated = { 'GET /api/auth/me': () => ({ status: 200, body: user }) }

describe('routing and session', () => {
  it('sends a signed-out visitor from the app page to sign-in', async () => {
    mockApi(unauthenticated)
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('shows the welcome message to a signed-in user', async () => {
    mockApi(authenticated)
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Welcome to the application.' })).toBeInTheDocument()
    expect(screen.getByText('Amr Saeed')).toBeInTheDocument()
  })

  it('keeps signed-in users off the sign-in page', async () => {
    mockApi(authenticated)
    renderAt('/signin')
    expect(await screen.findByRole('heading', { name: 'Welcome to the application.' })).toBeInTheDocument()
  })

  it('logs out and returns to sign-in', async () => {
    const calls = mockApi({ ...authenticated, 'POST /api/auth/logout': () => ({ status: 204 }) })
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(calls.map((call) => call.key)).toContain('POST /api/auth/logout')
  })
})

describe('sign in', () => {
  it('shows field errors and does not call the API when empty', async () => {
    const calls = mockApi(unauthenticated)
    renderAt('/signin')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(calls.map((call) => call.key)).not.toContain('POST /api/auth/signin')
  })

  it('shows the server message for wrong credentials', async () => {
    mockApi({
      ...unauthenticated,
      'POST /api/auth/signin': () => ({ status: 401, body: { message: 'Invalid email or password' } }),
    })
    renderAt('/signin')
    await userEvent.type(await screen.findByLabelText('Email'), 'amr@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'whatever1!')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })

  it('signs in and lands on the app page', async () => {
    const calls = mockApi({
      ...unauthenticated,
      'POST /api/auth/signin': () => ({ status: 200, body: { user } }),
    })
    renderAt('/signin')
    await userEvent.type(await screen.findByLabelText('Email'), 'amr@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Welcome to the application.' })).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /api/auth/signin')?.body).toEqual({
      email: 'amr@example.com',
      password: 'Str0ng!pass',
    })
  })
})

describe('sign up', () => {
  it('updates the password checklist as the user types', async () => {
    mockApi(unauthenticated)
    renderAt('/signup')
    const password = await screen.findByLabelText('Password')
    const list = screen.getByRole('list', { name: 'Password requirements' })
    expect(list).toHaveTextContent('At least one number (not met)')

    await userEvent.type(password, 'abcdefg1')
    expect(list).toHaveTextContent('At least 8 characters (met)')
    expect(list).toHaveTextContent('At least one number (met)')
    expect(list).toHaveTextContent('At least one special character (not met)')
  })

  it('blocks a weak password and a short name before calling the API', async () => {
    const calls = mockApi(unauthenticated)
    renderAt('/signup')
    await userEvent.type(await screen.findByLabelText('Name'), 'Al')
    await userEvent.type(screen.getByLabelText('Email'), 'amr@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'weak')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(screen.getByText('Password does not meet the requirements below')).toBeInTheDocument()
    expect(calls.map((call) => call.key)).not.toContain('POST /api/auth/signup')
  })

  it('shows a conflict from the server', async () => {
    mockApi({
      ...unauthenticated,
      'POST /api/auth/signup': () => ({ status: 409, body: { message: 'An account with this email already exists' } }),
    })
    renderAt('/signup')
    await userEvent.type(await screen.findByLabelText('Name'), 'Amr Saeed')
    await userEvent.type(screen.getByLabelText('Email'), 'amr@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
  })

  it('creates the account and lands on the app page', async () => {
    mockApi({
      ...unauthenticated,
      'POST /api/auth/signup': () => ({ status: 201, body: { user } }),
    })
    renderAt('/signup')
    await userEvent.type(await screen.findByLabelText('Name'), 'Amr Saeed')
    await userEvent.type(screen.getByLabelText('Email'), 'amr@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Welcome to the application.' })).toBeInTheDocument())
  })

  it('reports a network failure clearly', async () => {
    mockApi(unauthenticated)
    renderAt('/signup')
    // Replace fetch after the session check so only the submit hits the network error.
    await screen.findByLabelText('Name')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await userEvent.type(screen.getByLabelText('Name'), 'Amr Saeed')
    await userEvent.type(screen.getByLabelText('Email'), 'amr@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText(/Cannot reach the server/)).toBeInTheDocument()
  })
})
