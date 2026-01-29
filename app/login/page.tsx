'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { signIn, resendVerificationEmail } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError(null)
      setResendSuccess(false)
      setUserEmail(data.email)
      await signIn(data.email, data.password)
      router.push('/searches')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    try {
      setIsResending(true)
      setResendSuccess(false)
      await resendVerificationEmail(userEmail)
      setResendSuccess(true)
      setError(null)
    } catch (err) {
      console.error('Resend error:', err)
      setError(err instanceof Error ? err.message : 'Failed to resend email')
    } finally {
      setIsResending(false)
    }
  }

  const isEmailNotConfirmed = error?.toLowerCase().includes('email') && error?.toLowerCase().includes('confirm')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ backgroundColor: 'oklch(0.98 0.001 250)' }}>
      <Card className="w-full max-w-md relative z-10" style={{ backgroundColor: 'oklch(0.99 0.001 250)', borderColor: '#374151', borderWidth: '2px' }}>
        <CardHeader className="space-y-1">
          <div className="flex justify-center">
            <div className="text-3xl font-bold inline-flex items-center whitespace-nowrap" style={{ color: '#374151' }}>
              @talent
              <svg
                className="mx-2 w-7 h-7 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ verticalAlign: 'middle' }}
              >
                <rect x="2" y="10" width="6" height="4" rx="2" stroke="#0891B2" strokeWidth="2" fill="none" />
                <rect x="16" y="10" width="6" height="4" rx="2" stroke="#0891B2" strokeWidth="2" fill="none" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" />
              </svg>
              connect
            </div>
          </div>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {resendSuccess && (
              <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                Verification email sent! Please check your inbox and click the link to confirm your email.
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm space-y-2">
                <div>{error}</div>
                {isEmailNotConfirmed && userEmail && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="text-xs underline hover:no-underline disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-600 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-red-600 text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm hover:underline"
                style={{ color: '#374151' }}
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full text-white"
              style={{ backgroundColor: '#374151' }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-medium hover:underline"
              style={{ color: '#374151' }}
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
