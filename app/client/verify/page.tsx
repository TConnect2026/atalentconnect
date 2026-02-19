"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function VerifyMagicLinkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Invalid verification link')
      return
    }

    verifyToken()
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await fetch('/api/client/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        setError(data.error || 'Failed to verify magic link')
        return
      }

      // Store session token in localStorage
      localStorage.setItem(`client_session_${data.secureLink}`, data.sessionToken)

      setStatus('success')

      // Redirect to portal after 1 second
      setTimeout(() => {
        router.push(`/client/${data.secureLink}/portal`)
      }, 1000)
    } catch (err) {
      setStatus('error')
      setError('An error occurred during verification')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="text-3xl font-bold flex items-center text-navy">
              @talent
              <svg
                className="mx-1 w-6 h-6"
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
          <CardTitle className="text-2xl text-navy">Verifying Access</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'verifying' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
              <p className="text-text-secondary">Verifying your magic link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="text-green-600 text-5xl mb-4">✓</div>
              <p className="font-medium mb-2 text-navy">Verification Successful!</p>
              <p className="text-sm text-text-secondary">Redirecting to your portal...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="text-red-600 text-5xl mb-4">✗</div>
              <p className="font-medium mb-2 text-navy">Verification Failed</p>
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyMagicLink() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    }>
      <VerifyMagicLinkContent />
    </Suspense>
  )
}
