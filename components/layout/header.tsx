"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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

  // Close resources dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (resourcesOpen) setResourcesOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [resourcesOpen])

  return (
    <header
      className="sticky top-0 z-30 shadow-sm"
      style={{
        backgroundColor: '#1F3C62'
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/searches" className="flex items-center gap-2 hover:opacity-80 transition-opacity touch-manipulation">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold flex items-center text-white">
              @talent
              <svg
                className="mx-2 sm:mx-3 w-8 h-8 sm:w-10 sm:h-10"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Horizontal chain link - deep orange accent */}
                <rect x="2" y="10" width="6" height="4" rx="2" stroke="#DC4405" strokeWidth="2" fill="none" />
                <rect x="16" y="10" width="6" height="4" rx="2" stroke="#DC4405" strokeWidth="2" fill="none" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="#DC4405" strokeWidth="2" strokeLinecap="round" />
              </svg>
              connect
            </div>
          </Link>

          {/* Navigation Menu */}
          <nav className="flex items-center gap-6 sm:gap-10">
            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setResourcesOpen(!resourcesOpen)
                }}
                className="text-gray-300 hover:text-white font-medium text-base flex items-center gap-1"
              >
                Resources
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {resourcesOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-gray-200 py-2 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Global Templates
                  </div>
                  <button
                    onClick={() => {
                      // TODO: Navigate to outreach templates
                      setResourcesOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                  >
                    📧 Outreach Templates
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Navigate to weekly update templates
                      setResourcesOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                  >
                    📊 Weekly Update Templates
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Navigate to general resources
                      setResourcesOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                  >
                    📚 General Resources
                  </button>
                </div>
              )}
            </div>

            {profile && profile.role === 'administrator' && (
              <Link
                href="/team"
                className="text-gray-300 hover:text-white font-medium text-base"
              >
                Team
              </Link>
            )}

            <button className="text-gray-300 hover:text-white font-medium text-base">
              Support
            </button>
            {user && (
              <>
                {profile && (
                  <span className="text-gray-300 text-sm hidden sm:inline">
                    {profile.first_name}
                  </span>
                )}
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="text-white border-white hover:bg-white/20"
                  style={{ backgroundColor: '#1F3C62' }}
                >
                  Sign Out
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
