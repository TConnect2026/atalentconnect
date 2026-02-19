"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Search } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { QuickCreateSearchModal } from "@/components/searches/quick-create-search-modal"

export default function SearchesPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [searches, setSearches] = useState<Search[]>([])
  const [leadRecruiters, setLeadRecruiters] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [recruiterName, setRecruiterName] = useState("Anne")
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'filled'>('active')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    if (profile) {
      loadSearches()
      setRecruiterName(profile.first_name)
    }
  }, [profile])

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

      // Load lead recruiter names from search_team_members
      if (data && data.length > 0) {
        const searchIds = data.map((s: any) => s.id)
        const { data: teamData } = await supabase
          .from("search_team_members")
          .select("search_id, profile_id, role, profiles(first_name, last_name)")
          .in("search_id", searchIds)
          .eq("role", "Lead")

        if (teamData && teamData.length > 0) {
          const recruiterMap: Record<string, string> = {}
          teamData.forEach((t: any) => {
            const name = t.profiles
              ? `${t.profiles.first_name} ${t.profiles.last_name}`
              : "Unassigned"
            recruiterMap[t.search_id] = name
          })
          setLeadRecruiters(recruiterMap)
        }
      }
    } catch (err) {
      console.error("Error loading searches:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysOpen = (launchDate: string | null | undefined) => {
    if (!launchDate) return null
    return Math.max(0, Math.floor((new Date().getTime() - new Date(launchDate).getTime()) / (1000 * 60 * 60 * 24)))
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
      <div className="sticky top-[56px] sm:top-[64px] bg-white z-20">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-navy">
                Hi {recruiterName}
              </h1>
              <p className="text-sm mt-1 text-text-secondary">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* New Search Button */}
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="default"
              className="px-6 touch-manipulation min-h-[44px] font-bold text-lg text-white rounded-md shadow-sm transition-all hover:shadow-md hover:scale-[1.02] bg-navy"
            >
              <span className="text-orange">+</span> New Search
            </Button>
          </div>

          {/* Overview Stats */}
          <div
            className="flex items-center gap-6 rounded px-4 py-2 mt-4 bg-white border border-ds-border"
          >
            <div className="text-center">
              <div className="text-xl font-bold text-navy">{searches.filter(s => s.status === 'active').length}</div>
              <div className="text-xs uppercase tracking-wide text-text-secondary">Active</div>
            </div>
            <div className="h-6 w-px bg-ds-border"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-navy">{searches.filter(s => s.status === 'pending').length}</div>
              <div className="text-xs uppercase tracking-wide text-text-secondary">Pending</div>
            </div>
            <div className="h-6 w-px bg-ds-border"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-navy">{searches.filter(s => s.status === 'filled').length}</div>
              <div className="text-xs uppercase tracking-wide text-text-secondary">Filled YTD</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
            {/* Sticky Tabs */}
            <div className="sticky top-[136px] sm:top-[148px] bg-white z-10 pb-4 mb-4" style={{ borderBottom: '2px solid var(--navy)' }}>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('active')}
                  className="py-2 px-6 text-base transition-all font-semibold rounded-md"
                  style={{
                    color: activeTab === 'active' ? '#fff' : 'var(--navy)',
                    backgroundColor: activeTab === 'active' ? 'var(--navy)' : '#fff',
                    border: '1px solid var(--navy)',
                  }}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className="py-2 px-6 text-base transition-all font-semibold rounded-md"
                  style={{
                    color: activeTab === 'pending' ? '#fff' : 'var(--navy)',
                    backgroundColor: activeTab === 'pending' ? 'var(--navy)' : '#fff',
                    border: '1px solid var(--navy)',
                  }}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab('filled')}
                  className="py-2 px-6 text-base transition-all font-semibold rounded-md"
                  style={{
                    color: activeTab === 'filled' ? '#fff' : 'var(--navy)',
                    backgroundColor: activeTab === 'filled' ? 'var(--navy)' : '#fff',
                    border: '1px solid var(--navy)',
                  }}
                >
                  Filled
                </button>
              </div>
            </div>

        {filteredSearches.length === 0 ? (
          <Card className="project-card border-ds-border bg-white">
            <CardContent className="py-12 sm:py-16 px-4 sm:px-6">
              <div className="text-center">
                <div className="mb-4 text-5xl sm:text-6xl">🔍</div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-navy">
                  {activeTab === 'active' && 'No active searches'}
                  {activeTab === 'pending' && 'No pending searches'}
                  {activeTab === 'filled' && 'No filled searches'}
                </h3>
                <p className="text-base sm:text-lg text-text-secondary">
                  {activeTab === 'active' && 'Click "+ New Search" above to get started'}
                  {activeTab === 'pending' && 'Pending searches will appear here once created'}
                  {activeTab === 'filled' && 'Searches marked as filled will appear here'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSearches.map((search) => {
                const daysOpen = getDaysOpen((search as any).launch_date)
                const leadName = leadRecruiters[search.id]

                return (
                  <div
                    key={search.id}
                    className="bg-white rounded-xl cursor-pointer hover:card-shadow transition-shadow flex flex-col border border-ds-border"
                    style={{ borderLeft: '5px solid #78909c', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' }}
                    onClick={() => router.push(`/searches/${search.id}/candidates`)}
                  >
                    {/* Card header: title + search details link */}
                    <div className="px-5 pt-5 pb-4 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-lg font-bold leading-snug text-navy">
                            {search.company_name}
                          </div>
                          <div className="text-base font-bold mt-0.5 text-text-secondary">
                            {search.position_title}
                          </div>
                          <div className="text-xs mt-1 text-text-secondary">
                            {daysOpen !== null ? `Days Open: ${daysOpen}` : 'Not launched yet'}
                          </div>
                        </div>
                        <a
                          href={`/searches/${search.id}/pipeline`}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            router.push(`/searches/${search.id}/pipeline`)
                          }}
                          className="flex items-center gap-0.5 text-base font-bold whitespace-nowrap mt-0.5 hover:underline flex-shrink-0 text-navy"
                        >
                          Search Details
                          <ChevronRight className="w-5 h-5" />
                        </a>
                      </div>

                      {leadName && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-navy">Lead:</span>
                            <span className="font-medium text-navy">{leadName}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom buttons */}
                    <div className="flex gap-2 px-5 pb-5 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/searches/${search.id}/candidates`)
                        }}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded text-white text-center transition-colors hover:opacity-90 bg-navy"
                      >
                        Candidate Pipeline
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/client/${search.secure_link}`)
                        }}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded text-white text-center transition-colors hover:opacity-90 bg-navy"
                      >
                        Client Portal
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
        )}
      </div>

      {/* Quick Create Search Modal */}
      <QuickCreateSearchModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  )
}

