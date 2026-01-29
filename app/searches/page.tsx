"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Search } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuickCreateSearchModal } from "@/components/searches/quick-create-search-modal"

export default function SearchesPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [searches, setSearches] = useState<Search[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [recruiterName, setRecruiterName] = useState("Anne")
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'filled'>('active')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    if (profile) {
      loadSearches()
      setRecruiterName(profile.first_name)
    }
  }, [profile])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) setOpenMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openMenuId])

  const loadSearches = async () => {
    if (!profile?.firm_id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .eq("firm_id", profile.firm_id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSearches(data || [])
    } catch (err) {
      console.error("Error loading searches:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-600 text-white border-green-600"
      case "filled":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "pending":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleStatusChange = async (searchId: string, newStatus: 'active' | 'filled' | 'paused' | 'pending') => {
    try {
      const updateData: any = { status: newStatus }

      // If marking as filled, set filled_date to today
      if (newStatus === 'filled') {
        updateData.filled_date = new Date().toISOString().split('T')[0]
      } else {
        updateData.filled_date = null
      }

      const { error } = await supabase
        .from('searches')
        .update(updateData)
        .eq('id', searchId)

      if (error) throw error

      // Reload searches
      await loadSearches()
      setOpenMenuId(null)
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading searches...</p>
      </div>
    )
  }

  // Filter searches based on active tab
  const filteredSearches = searches.filter(s => s.status === activeTab)

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Greeting Section */}
      <div className="sticky top-[88px] sm:top-[104px] bg-white z-20">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Hi {recruiterName}
              </h1>
              <p className="text-sm text-gray-700 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* New Search Button */}
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="default"
              className="px-6 touch-manipulation min-h-[44px] font-bold text-lg text-white rounded-md shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
              style={{ backgroundColor: '#1F3C62' }}
            >
              <span style={{ color: '#DC4405' }}>+</span> New Search
            </Button>
          </div>

          {/* Overview Stats */}
          <div
            className="flex items-center gap-6 rounded px-4 py-2 mt-4 border border-gray-300"
            style={{
              background: 'linear-gradient(to right, rgba(30, 58, 95, 0.12), rgba(14, 165, 233, 0.12))'
            }}
          >
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{searches.filter(s => s.status === 'active').length}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide">Active</div>
            </div>
            <div className="h-6 w-px bg-gray-400"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{searches.filter(s => s.status === 'pending').length}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide">Pending</div>
            </div>
            <div className="h-6 w-px bg-gray-400"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{searches.filter(s => s.status === 'filled').length}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide">Filled YTD</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
            {/* Sticky Tabs */}
            <div className="sticky top-[168px] sm:top-[188px] bg-white z-10 pb-3 mb-4">
              <div className="flex gap-4 border-b-2 border-gray-400">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`pb-3 px-4 text-base transition-all ${
                    activeTab === 'active'
                      ? 'text-gray-900 font-bold'
                      : 'text-gray-500 hover:text-gray-700 font-semibold'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`pb-3 px-4 text-base transition-all ${
                    activeTab === 'pending'
                      ? 'text-gray-900 font-bold'
                      : 'text-gray-500 hover:text-gray-700 font-semibold'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab('filled')}
                  className={`pb-3 px-4 text-base transition-all ${
                    activeTab === 'filled'
                      ? 'text-gray-900 font-bold'
                      : 'text-gray-500 hover:text-gray-700 font-semibold'
                  }`}
                >
                  Filled
                </button>
              </div>
            </div>

        {filteredSearches.length === 0 ? (
          <Card className="project-card border-gray-200 bg-white">
            <CardContent className="py-12 sm:py-16 px-4 sm:px-6">
              <div className="text-center">
                <div className="mb-4 text-5xl sm:text-6xl">🔍</div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-gray-900">
                  {activeTab === 'active' && 'No active searches'}
                  {activeTab === 'pending' && 'No pending searches'}
                  {activeTab === 'filled' && 'No filled searches'}
                </h3>
                <p className="text-gray-600 text-base sm:text-lg">
                  {activeTab === 'active' && 'Click "+ New Search" above to get started'}
                  {activeTab === 'pending' && 'Pending searches will appear here once created'}
                  {activeTab === 'filled' && 'Searches marked as filled will appear here'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {filteredSearches.map((search, index) => (
                <div key={search.id} className="flex gap-4">
                  {/* Search Card */}
                  <div
                    className="flex-1 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-gray-400 hover:-translate-y-0.5 bg-white rounded-lg border-2 border-gray-300 border-l-4 border-l-[#1F3C62] shadow-md group"
                    onClick={() => router.push(`/searches/${search.id}`)}
                  >
                  <div className="px-6 py-5">
                    <div className="flex items-start justify-between">
                      {/* Left column */}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {search.position_title}
                        </h3>

                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                          {search.client_logo_url && (
                            <img
                              src={search.client_logo_url}
                              alt={`${search.company_name} logo`}
                              className="h-12 w-auto object-contain"
                            />
                          )}
                          <span className="text-base text-gray-700 font-medium">
                            {search.company_name}
                          </span>
                        </div>

                        {/* Launch, Target, Days Open */}
                        {(search.start_date || search.target_fill_date) && (
                          <div className="flex items-center gap-6 text-sm mb-4 pb-4 border-b border-gray-200">
                            {search.start_date && (
                              <div>
                                <span className="text-gray-600">Launch:</span>{' '}
                                <span className="text-gray-900 font-semibold">
                                  {new Date(search.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                            {search.target_fill_date && (
                              <div>
                                <span className="text-gray-600">Target:</span>{' '}
                                <span className="text-gray-900 font-semibold">
                                  {new Date(search.target_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                            {search.start_date && (
                              <div>
                                <span className="text-gray-600">Days Open:</span>{' '}
                                <span className="text-gray-900 font-semibold">
                                  {Math.max(0, Math.floor((new Date().getTime() - new Date(search.start_date).getTime()) / (1000 * 60 * 60 * 24)))}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/searches/${search.id}`)
                            }}
                            className="px-5 py-2.5 text-sm font-semibold text-white rounded-md shadow-sm transition-all hover:shadow-md hover:scale-[1.02] flex items-center gap-2"
                            style={{ backgroundColor: '#0284c7' }}
                          >
                            📋 Position Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/searches/${search.id}/pipeline`)
                            }}
                            className="px-5 py-2.5 text-sm font-semibold text-white rounded-md shadow-sm transition-all hover:shadow-md hover:scale-[1.02] flex items-center gap-2"
                            style={{ backgroundColor: '#10b981' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2.5">
                              <rect x="3" y="4" width="18" height="16" rx="2" />
                              <line x1="9" y1="4" x2="9" y2="20" />
                              <line x1="15" y1="4" x2="15" y2="20" />
                            </svg>
                            Candidate Pipeline
                          </button>
                        </div>
                      </div>

                      {/* Vertical Divider */}
                      <div className="w-px bg-gray-200 mx-6 self-stretch"></div>

                      {/* Right - Client Portal and Three-dot menu */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/searches/${search.id}/portal`)
                          }}
                          className="px-5 py-2.5 text-sm font-bold rounded-md shadow-sm transition-all hover:shadow-md hover:scale-[1.02] border-2 relative overflow-hidden flex items-center gap-2"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            borderColor: '#1e293b'
                          }}
                        >
                          {/* Background chain link icon */}
                          <svg
                            className="absolute -right-1 top-1/2 -translate-y-1/2 w-12 h-12 opacity-10"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect x="2" y="10" width="6" height="4" rx="2" stroke="#9ca3af" strokeWidth="2" fill="none" />
                            <rect x="16" y="10" width="6" height="4" rx="2" stroke="#9ca3af" strokeWidth="2" fill="none" />
                            <line x1="8" y1="12" x2="16" y2="12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <svg className="w-4 h-4 relative z-10" fill="none" stroke="#0d9488" viewBox="0 0 24 24" strokeWidth="2.5">
                            <rect x="2" y="10" width="6" height="4" rx="2" />
                            <rect x="16" y="10" width="6" height="4" rx="2" />
                            <line x1="8" y1="12" x2="16" y2="12" strokeLinecap="round" />
                          </svg>
                          <span className="relative z-10">Client Portal</span>
                        </button>

                        {/* Three-dot menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(openMenuId === search.id ? null : search.id)
                            }}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          {/* Dropdown menu */}
                          {openMenuId === search.id && (
                            <div
                              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-gray-200 py-2 z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/searches/${search.id}`)
                                  setOpenMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                              >
                                View Position Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/searches/${search.id}/agreement`)
                                  setOpenMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                              >
                                View Search Agreement
                              </button>
                              <div className="h-px bg-gray-200 my-1"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(search.id, 'pending')
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                              >
                                Mark as Pending
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(search.id, 'active')
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                              >
                                Mark as Active
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(search.id, 'filled')
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                              >
                                Mark as Filled
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Search-Specific Sidebar */}
                  <div className="w-64 flex-shrink-0 hidden lg:block">
                    <div className="bg-white rounded-lg border-2 border-gray-300 border-l-4 border-l-[#1F3C62] shadow-md p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 pb-3 border-b border-gray-200">Quick Links</h3>
                      <div className="space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/searches/${search.id}/playbook#documents`)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          📋 Position Spec
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/searches/${search.id}/playbook#documents`)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          📝 Interview Guides
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/searches/${search.id}/playbook#documents`)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          📧 Email Templates
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick Create Search Modal */}
      <QuickCreateSearchModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  )
}

