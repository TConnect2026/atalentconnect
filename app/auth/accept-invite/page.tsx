'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const acceptInviteSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [inviteValid, setInviteValid] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isChecking, setIsChecking] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  })

  useEffect(() => {
    // Only run once
    let isMounted = true

    const checkInvite = async () => {
      if (!isMounted) return

      setIsChecking(true)
      const supabase = createClient()

      // Try multiple times with delays to wait for session to be established
      const maxRetries = 5
      let retryCount = 0

      const attemptSessionCheck = async (): Promise<boolean> => {
        if (!isMounted) return false

        try {
          // Get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          console.log(`Session check attempt ${retryCount + 1}:`, {
            hasSession: !!session,
            hasUser: !!session?.user,
            error: sessionError
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            return false
          }

          if (!session?.user) {
            // No session yet, might need to wait
            if (retryCount < maxRetries) {
              retryCount++
              console.log('No session yet, retrying in 500ms...')
              await new Promise(resolve => setTimeout(resolve, 500))
              return attemptSessionCheck()
            }
            return false
          }

          // Extract name and email from user metadata
          const inviteFirstName = session.user.user_metadata?.first_name || ''
          const inviteLastName = session.user.user_metadata?.last_name || ''
          const inviteEmail = session.user.email || ''

          console.log('User metadata:', { inviteFirstName, inviteLastName, inviteEmail })

          if (!inviteFirstName || !inviteLastName) {
            if (isMounted) {
              setInviteValid(false)
              setError('Invitation is missing required information')
            }
            return false
          }

          if (isMounted) {
            setFirstName(inviteFirstName)
            setLastName(inviteLastName)
            setUserEmail(inviteEmail)
            setInviteValid(true)
          }
          return true
        } catch (err) {
          console.error('Invitation error:', err)
          return false
        }
      }

      const success = await attemptSessionCheck()

      if (!success && isMounted) {
        setInviteValid(false)
        setError('Invalid or expired invitation link. Please request a new invitation.')
      }

      if (isMounted) {
        setIsChecking(false)
      }
    }

    checkInvite()

    return () => {
      isMounted = false
    }
  }, [])

  const onSubmit = async (data: AcceptInviteFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // Update the user's password
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) throw updateError

      if (!updateData.user) {
        throw new Error('Failed to update user information')
      }

      // Get firm_id and role from user metadata
      const firmId = updateData.user.user_metadata?.firm_id
      const role = updateData.user.user_metadata?.role || 'recruiter'

      if (!firmId) {
        throw new Error('Invalid invitation: missing firm information')
      }

      // Create the user's profile using the pre-filled names
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: updateData.user.id,
          firm_id: firmId,
          email: updateData.user.email!,
          first_name: firstName,
          last_name: lastName,
          role: role,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error(`Failed to create profile: ${profileError.message}`)
      }

      // Redirect to searches page
      router.push('/searches')
      router.refresh()
    } catch (err) {
      console.error('Accept invite error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking
  if (isChecking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 bg-white"
      >
        <Card className="w-full max-w-md bg-white shadow-xl">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy mb-4"></div>
              <p className="text-text-secondary">Verifying invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show invalid only after checking is complete
  if (!inviteValid) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 bg-white"
      >
        <Card className="w-full max-w-md bg-white shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-navy">
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-text-secondary">
              {error || 'This invitation link is invalid or has expired. Please contact your administrator for a new invitation.'}
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full text-white bg-orange"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-white"
    >
      <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center">
            <div className="text-3xl font-bold flex items-center text-navy">
              Join @talent
              <svg
                className="mx-2 w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="10" width="6" height="4" rx="2" stroke="#DC4405" strokeWidth="2" fill="none" />
                <rect x="16" y="10" width="6" height="4" rx="2" stroke="#DC4405" strokeWidth="2" fill="none" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="#DC4405" strokeWidth="2" strokeLinecap="round" />
              </svg>
              connect
            </div>
          </div>
          <CardDescription className="text-center">
            Complete your profile to accept the invitation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Name</Label>
              <div className="px-3 py-2 bg-bg-section border border-ds-border rounded-md text-text-primary">
                {firstName} {lastName}
              </div>
              <p className="text-xs text-text-muted">Your name has been set by your administrator</p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="px-3 py-2 bg-bg-section border border-ds-border rounded-md text-text-primary">
                {userEmail}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-white bg-orange"
              disabled={isLoading}
            >
              {isLoading ? 'Accepting invitation...' : 'Accept Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
