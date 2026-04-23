"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export function Header() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [resourcesOpen, setResourcesOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    const handleClickOutside = () => {
      if (resourcesOpen) setResourcesOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [resourcesOpen])

  return (
    <header className="sticky top-0 z-30 bg-navy">
      <div className="container mx-auto px-4 sm:px-6 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/searches" className="flex items-center gap-2 hover:opacity-90 transition-opacity touch-manipulation">
            <div className="text-lg font-bold flex items-center text-white tracking-tight">
              @talent
              <svg
                className="mx-1.5 w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="10" width="6" height="4" rx="2" stroke="#D97757" strokeWidth="2" fill="none" />
                <rect x="16" y="10" width="6" height="4" rx="2" stroke="#D97757" strokeWidth="2" fill="none" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="#D97757" strokeWidth="2" strokeLinecap="round" />
              </svg>
              connect
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-3 sm:gap-6 md:gap-8">
            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setResourcesOpen(!resourcesOpen)
                }}
                className="text-xs sm:text-sm font-medium flex items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                Resources
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {resourcesOpen && (
                <div
                  className="absolute right-0 sm:left-0 top-full mt-2 w-56 max-w-[calc(100vw-32px)] bg-white rounded-xl card-shadow border border-ds-border py-2 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 label-style">
                    Global Templates
                  </div>
                  <button
                    onClick={() => setResourcesOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-bg-section text-sm font-medium text-navy transition-colors"
                  >
                    Outreach Templates
                  </button>
                  <button
                    onClick={() => setResourcesOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-bg-section text-sm font-medium text-navy transition-colors"
                  >
                    Weekly Update Templates
                  </button>
                  <button
                    onClick={() => setResourcesOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-bg-section text-sm font-medium text-navy transition-colors"
                  >
                    General Resources
                  </button>
                </div>
              )}
            </div>

            {profile && profile.role === 'administrator' && (
              <Link
                href="/team"
                className="text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                Team
              </Link>
            )}

            <button
              className="text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Support
            </button>
            {user && (
              <>
                {profile && (
                  <span className="text-sm hidden sm:inline text-white/80">
                    {profile.first_name}
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-xs sm:text-sm font-medium text-white/80 hover:text-white border border-white/20 rounded-lg px-2.5 sm:px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 flex items-center hover:bg-white/10 transition-all"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
