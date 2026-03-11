"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase } from "lucide-react"

interface SearchEntry {
  secureLink: string
  sessionToken: string
  companyName: string
  positionTitle: string
  status: string
}

export default function ClientSearchSelection() {
  const router = useRouter()
  const [searches, setSearches] = useState<SearchEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('client_active_searches')
    if (!stored) {
      // No searches stored — nothing to select from
      router.push('/')
      return
    }

    try {
      const parsed: SearchEntry[] = JSON.parse(stored)
      if (parsed.length === 0) {
        router.push('/')
        return
      }
      if (parsed.length === 1) {
        // Only one search — skip selection, go straight to portal
        router.push(`/client/${parsed[0].secureLink}/portal`)
        return
      }
      setSearches(parsed)
    } catch {
      router.push('/')
      return
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy"></div>
      </div>
    )
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'pending': return 'Pending'
      case 'paused': return 'Paused'
      case 'filled': return 'Filled'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'paused': return 'bg-gray-100 text-gray-600'
      case 'filled': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <div className="border-b border-border/20 py-6">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="flex justify-center mb-3">
            <div className="text-2xl font-bold flex items-center text-navy">
              @talent
              <svg
                className="mx-1 w-5 h-5"
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
          </div>
          <h1 className="text-xl font-bold text-navy">Your Active Searches</h1>
          <p className="text-sm text-text-secondary mt-1">Select a search to view its portal</p>
        </div>
      </div>

      {/* Search Cards */}
      <div className="container mx-auto px-4 max-w-3xl py-8">
        <div className="grid gap-4">
          {searches.map((search) => (
            <button
              key={search.secureLink}
              onClick={() => router.push(`/client/${search.secureLink}/portal`)}
              className="w-full text-left bg-white border border-ds-border rounded-lg p-5 hover:border-navy hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-navy/5 flex items-center justify-center flex-shrink-0 group-hover:bg-navy/10 transition-colors">
                  <Briefcase className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-navy text-base truncate">{search.positionTitle}</h3>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${getStatusColor(search.status)}`}>
                      {getStatusLabel(search.status)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{search.companyName}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/20 py-6 mt-auto">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <p className="text-xs text-text-muted">
            Powered by{" "}
            <a
              href="https://atalentconnect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              @talentconnect
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
