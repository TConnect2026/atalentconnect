"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function PanelistVerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  const verifyToken = useCallback(async () => {
    try {
      const response = await fetch('/api/panelist/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setStatus('error')
        setErrorMessage(data.error || 'Verification failed')
        return
      }

      // Store session
      localStorage.setItem('panelist_session', data.sessionToken)
      localStorage.setItem('panelist_search_id', data.searchId)
      localStorage.setItem('panelist_id', data.panelistId)

      // Redirect to portal
      router.push('/panelist/portal')
    } catch (err) {
      console.error('Verification error:', err)
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }, [token, router])

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('No token provided')
      return
    }
    verifyToken()
  }, [token, verifyToken])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="text-center max-w-md px-6">
        {status === 'verifying' && (
          <>
            <div className="w-12 h-12 border-4 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-navy">Verifying your access...</h1>
            <p className="text-text-secondary mt-2">Please wait while we verify your link.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl font-bold">!</span>
            </div>
            <h1 className="text-xl font-bold text-navy">Access Denied</h1>
            <p className="text-text-secondary mt-2">{errorMessage}</p>
            <p className="text-sm text-text-muted mt-4">
              Please contact your recruiter for a new access link.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
