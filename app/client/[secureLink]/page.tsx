"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ClientPortalLanding() {
  const params = useParams()
  const router = useRouter()
  const secureLink = params.secureLink as string

  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [magicLink, setMagicLink] = useState<string | null>(null) // For testing only
  const [checkingSession, setCheckingSession] = useState(true)
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>("")
  const [positionTitle, setPositionTitle] = useState<string>("")

  useEffect(() => {
    loadSearchData()
    checkExistingSession()
  }, [])

  const loadSearchData = async () => {
    try {
      const { data, error } = await supabase
        .from('searches')
        .select('client_logo_url, company_name, position_title')
        .eq('secure_link', secureLink)
        .single()

      if (!error && data) {
        setClientLogoUrl(data.client_logo_url)
        setCompanyName(data.company_name)
        setPositionTitle(data.position_title)
      }
    } catch (err) {
      console.error('Error loading search data:', err)
    }
  }

  const checkExistingSession = async () => {
    // TODO: Remove before launch — controlled by NEXT_PUBLIC_DEV_BYPASS_AUTH in .env.local
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
      router.push(`/client/${secureLink}/portal`)
      return
    }

    // Check if user has a valid session
    const sessionToken = localStorage.getItem(`client_session_${secureLink}`)

    if (sessionToken) {
      const response = await fetch('/api/client/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, secureLink })
      })

      const data = await response.json()

      if (data.valid) {
        // Session is valid, redirect to portal
        router.push(`/client/${secureLink}/portal`)
        return
      } else {
        // Session invalid, remove it
        localStorage.removeItem(`client_session_${secureLink}`)
      }
    }

    setCheckingSession(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/client/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, secureLink })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to verify email')
        return
      }

      setSuccess(true)
      // For testing - remove in production
      if (data.magicLink) {
        setMagicLink(data.magicLink)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <p className="text-text-secondary">Checking authentication...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-8 sm:py-0">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 sm:px-6 py-6">
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-950 bg-clip-text text-transparent flex items-center">
              @talent
              <svg
                className="mx-1 w-5 h-5 sm:w-6 sm:h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="10" width="6" height="4" rx="2" stroke="#0891B2" strokeWidth="2" fill="none" />
                <rect x="16" y="10" width="6" height="4" rx="2" stroke="#0891B2" strokeWidth="2" fill="none" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" />
              </svg>
              connect
            </div>
            {clientLogoUrl && (
              <>
                <div className="w-px h-12 bg-ds-border"></div>
                <img
                  src={clientLogoUrl}
                  alt={`${companyName} logo`}
                  className="h-12 w-auto object-contain max-w-[120px]"
                />
              </>
            )}
          </div>
          <CardTitle className="text-xl sm:text-2xl">Client Portal Access</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {positionTitle && companyName
              ? `${positionTitle} - ${companyName}`
              : 'Enter your email to access your search'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                <p className="text-cyan-800 font-medium">Magic link sent!</p>
                <p className="text-cyan-700 text-sm mt-2">
                  Check your email for a link to access the portal. The link will expire in 24 hours.
                </p>
              </div>
              {magicLink && (
                <div className="p-4 bg-navy/5 border border-navy/20 rounded-lg text-left">
                  <p className="text-navy font-medium text-sm mb-2">For testing (remove in production):</p>
                  <a
                    href={magicLink}
                    className="text-navy hover:underline text-xs break-all"
                  >
                    {magicLink}
                  </a>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false)
                  setMagicLink(null)
                  setEmail("")
                }}
                className="w-full touch-manipulation min-h-[48px]"
              >
                Send Another Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5 touch-manipulation min-h-[48px] text-base"
                />
                <p className="text-xs text-text-muted mt-2">
                  Enter the email address associated with this search
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full touch-manipulation min-h-[48px] bg-orange hover:bg-orange-hover text-white"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
