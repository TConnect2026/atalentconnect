'use client'

import { useState } from 'react'
import { signInWithProvider, signInWithMagicLink } from '@/lib/supabase-client'

type Provider = 'google' | 'azure'

export default function LoginPage() {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicEmail, setMagicEmail] = useState('')
  const [isSendingLink, setIsSendingLink] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  const handleContinue = async () => {
    if (!selectedProvider) return
    setIsLoading(true)
    setError(null)
    try {
      await signInWithProvider(selectedProvider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleSendMagicLink = async () => {
    if (!magicEmail.trim()) return
    setIsSendingLink(true)
    setError(null)
    setLinkSent(false)
    try {
      await signInWithMagicLink(magicEmail.trim())
      setLinkSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send login link.')
    } finally {
      setIsSendingLink(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1F3C62' }}>
      <div className="w-full max-w-[380px] sm:max-w-sm">
        {/* Card */}
        <div className="rounded-2xl shadow-2xl px-5 sm:px-8 py-8 sm:py-10" style={{ backgroundColor: '#FAF9F7' }}>
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="text-[22px] sm:text-[28px] font-bold inline-flex items-center whitespace-nowrap" style={{ color: '#1F3C62' }}>
              @talent
              <svg
                className="mx-1 sm:mx-1.5 w-5 sm:w-6 h-5 sm:h-6 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="10" width="6" height="4" rx="2" stroke="#E87A2F" strokeWidth="2" fill="none" />
                <rect x="16" y="10" width="6" height="4" rx="2" stroke="#E87A2F" strokeWidth="2" fill="none" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="#E87A2F" strokeWidth="2" strokeLinecap="round" />
              </svg>
              connect
            </div>
          </div>

          <p className="text-center text-sm mb-8" style={{ color: '#4A5568' }}>
            Sign in to your recruiter account
          </p>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-4">
            <button
              type="button"
              onClick={() => setSelectedProvider('google')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 transition-all text-sm font-medium disabled:opacity-50"
              style={{
                borderColor: selectedProvider === 'google' ? '#1F3C62' : '#E5E5E5',
                backgroundColor: selectedProvider === 'google' ? '#F0F4F8' : '#FFFFFF',
                color: '#333333',
              }}
            >
              {/* Google Logo */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => setSelectedProvider('azure')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 transition-all text-sm font-medium disabled:opacity-50"
              style={{
                borderColor: selectedProvider === 'azure' ? '#1F3C62' : '#E5E5E5',
                backgroundColor: selectedProvider === 'azure' ? '#F0F4F8' : '#FFFFFF',
                color: '#333333',
              }}
            >
              {/* Microsoft Logo */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Continue with Microsoft
            </button>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedProvider || isLoading}
            className="w-full py-3.5 rounded-lg text-sm font-semibold text-white transition-all disabled:cursor-not-allowed"
            style={{
              backgroundColor: !selectedProvider ? '#F0C9A8' : '#E87A2F',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Redirecting...' : 'Continue'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#D9D9D9' }} />
            <span className="text-xs font-medium" style={{ color: '#999999' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#D9D9D9' }} />
          </div>

          {/* Magic Link */}
          {linkSent ? (
            <div className="text-center py-3 px-4 rounded-lg" style={{ backgroundColor: '#F0F9F4' }}>
              <p className="text-sm font-medium" style={{ color: '#2D7A4F' }}>Login link sent!</p>
              <p className="text-xs mt-1" style={{ color: '#5A9E76' }}>Check your inbox for a one-click login link.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={isSendingLink}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMagicLink() }}
                className="w-full px-4 py-3.5 rounded-lg border-2 text-sm outline-none transition-colors disabled:opacity-50"
                style={{
                  borderColor: '#E5E5E5',
                  backgroundColor: '#FFFFFF',
                  color: '#333333',
                }}
              />
              <button
                type="button"
                onClick={handleSendMagicLink}
                disabled={!magicEmail.trim() || isSendingLink}
                className="w-full py-3.5 rounded-lg text-sm font-semibold text-white transition-all disabled:cursor-not-allowed"
                style={{
                  backgroundColor: !magicEmail.trim() ? '#F0C9A8' : '#E87A2F',
                  opacity: isSendingLink ? 0.7 : 1,
                }}
              >
                {isSendingLink ? 'Sending...' : 'Send Login Link'}
              </button>
            </div>
          )}

          <p className="text-center text-xs mt-6" style={{ color: '#AAAAAA' }}>
            Access is by invite only. Contact your admin for access.
          </p>
        </div>
      </div>
    </div>
  )
}
