import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AuthLayout } from '../components/AuthLayout'
import { FormErrors } from '../components/FormErrors'
import { TextField } from '../components/TextField'
import { ApiError } from '../lib/api'
import { signInSchema, type SignInValues } from '../lib/validation'

export function SignInPage() {
  const { signIn } = useAuth()
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), mode: 'onTouched' })

  const onSubmit = handleSubmit(async (values) => {
    setServerErrors([])
    try {
      await signIn(values)
    } catch (error) {
      setServerErrors(error instanceof ApiError ? error.messages : ['Something went wrong'])
    }
  })

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue."
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FormErrors messages={serverErrors} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
