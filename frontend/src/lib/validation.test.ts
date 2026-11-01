import { describe, expect, it } from 'vitest'
import { signInSchema, signUpSchema } from './validation'

const valid = { email: 'amr@example.com', name: 'Amr', password: 'Str0ng!pass' }
const messagesFor = (input: object) => {
  const result = signUpSchema.safeParse({ ...valid, ...input })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('signUpSchema', () => {
  it('accepts a valid payload', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true)
  })

  it.each(['', 'nope', 'a@', '@b.com', 'a b@c.com'])('rejects email %j', (email) => {
    expect(messagesFor({ email }).length).toBeGreaterThan(0)
  })

  it('trims the email before validating', () => {
    expect(signUpSchema.parse({ ...valid, email: '  amr@example.com  ' }).email).toBe('amr@example.com')
  })

  it('requires a name of at least 3 characters, measured after trimming', () => {
    expect(messagesFor({ name: 'Al' })).toContain('Name must be at least 3 characters')
    expect(messagesFor({ name: ' Al ' })).toContain('Name must be at least 3 characters')
    expect(messagesFor({ name: 'Amr' })).toEqual([])
  })

  it.each([
    ['Ab1!xyz', 'At least 8 characters'],
    ['12345678!', 'At least one letter'],
    ['Password!', 'At least one number'],
    ['Password1', 'At least one special character'],
  ])('rejects password %j for missing: %s', (password, message) => {
    expect(messagesFor({ password })).toContain(message)
  })

  it('accepts exactly 8 characters meeting every rule', () => {
    expect(messagesFor({ password: 'abcdef1!' })).toEqual([])
  })

  it('caps the password at 72 characters to match the server', () => {
    expect(messagesFor({ password: `Aa1!${'x'.repeat(69)}` })).toContain('Password must be at most 72 characters')
  })
})

describe('signInSchema', () => {
  it('does not enforce password complexity', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
  })

  it('requires a password', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })
})
