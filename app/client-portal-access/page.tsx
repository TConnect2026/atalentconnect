"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ClientPortalAccessPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/client/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'A secure access link has been sent to your email.' })
        setEmail('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send access link' })
      }
    } catch (error) {
      console.error('Error requesting access:', error)
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="text-4xl font-bold flex items-center text-navy">
              @talent
              <svg
                className="mx-3 w-10 h-10"
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

          <div className="border-t border-ds-border my-6"></div>

          <CardTitle className="text-2xl font-bold text-navy">Access Your Search Portal</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div className={`px-4 py-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isSubmitting}
                className="text-center text-lg py-6"
              />
            </div>

            <Button
              type="submit"
              className="w-full hover:opacity-90 text-lg py-6 bg-orange"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending Link...' : 'Send Access Link'}
            </Button>

            <div className="border-t border-ds-border my-6"></div>

            <p className="text-sm text-center text-text-secondary">
              A secure link will be sent to your email.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
