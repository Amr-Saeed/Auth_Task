import { z } from 'zod'

/** Each rule is exported so the password checklist and the schema cannot drift apart. */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'letter', label: 'At least one letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { id: 'number', label: 'At least one number', test: (value: string) => /\d/.test(value) },
  {
    id: 'special',
    label: 'At least one special character',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'))

export const signUpSchema = z.object({
  email,
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters'),
  password: z
    .string()
    .max(72, 'Password must be at most 72 characters')
    .superRefine((value, ctx) => {
      for (const rule of PASSWORD_RULES) {
        if (!rule.test(value)) ctx.addIssue({ code: 'custom', message: rule.label })
      }
    }),
})

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
})

export type SignUpValues = z.infer<typeof signUpSchema>
export type SignInValues = z.infer<typeof signInSchema>
