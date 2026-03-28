"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Search } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList, Filter, Globe } from "lucide-react"
import { QuickCreateSearchModal } from "@/components/searches/quick-create-search-modal"

interface SearchSummary {
  candidateCount: number
  nextInterview: { candidateName: string; stageName: string; date: string } | null
  moreInterviews: number
  daysSinceActivity: number | null
}

export default function SearchesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()
  const [searches, setSearches] = useState<Search[]>([])
  const [leadRecruiters, setLeadRecruiters] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [recruiterName, setRecruiterName] = useState("Anne")
  const [activeTab, setActiveTab] = useState<'active' | 'on_hold' | 'filled'>('active')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchSummaries, setSearchSummaries] = useState<Record<string, SearchSummary>>({})
  const [showWelcome, setShowWelcome] = useState(() => searchParams.get('welcome') === '1')
  const [timerDone, setTimerDone] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      window.history.replaceState({}, '', '/searches')
      const timer = setTimeout(() => setTimerDone(true), 3000)
      return () => clearTimeout(timer)
    } else {
      setTimerDone(true)
    }
  }, [])

  useEffect(() => {
    if (timerDone && !isLoading && profile) {
      setFadeOut(true)
      const remove = setTimeout(() => setShowWelcome(false), 800)
      return () => clearTimeout(remove)
    }
  }, [timerDone, isLoading, profile])

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

        // Load summary data: candidates, interviews, latest activity
        const [candidatesRes, interviewsRes, stagesRes, activityRes] = await Promise.all([
          supabase.from("candidates").select("id, search_id, first_name, last_name, status").in("search_id", searchIds).neq("status", "archived"),
          supabase.from("interviews").select("id, search_id, candidate_id, stage_id, scheduled_at, status, candidates(first_name, last_name)").in("search_id", searchIds).neq("status", "cancelled"),
          supabase.from("stages").select("id, search_id, name").in("search_id", searchIds),
          supabase.from("candidate_activity").select("id, search_id, created_at").in("search_id", searchIds).order("created_at", { ascending: false }),
        ])

        const candidates = candidatesRes.data || []
        const interviews = interviewsRes.data || []
        const stages = stagesRes.data || []
        const activities = activityRes.data || []
        const now = new Date()

        const summaries: Record<string, SearchSummary> = {}
        for (const sid of searchIds) {
          const searchCandidates = candidates.filter((c: any) => c.search_id === sid)
          const searchStages = stages.filter((s: any) => s.search_id === sid)
          const upcoming = interviews
            .filter((iv: any) => iv.search_id === sid && iv.scheduled_at && new Date(iv.scheduled_at) >= now)
            .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

          let nextInterview: SearchSummary['nextInterview'] = null
          if (upcoming.length > 0) {
            const iv = upcoming[0] as any
            const cand = iv.candidates
            const stage = searchStages.find((s: any) => s.id === iv.stage_id)
            nextInterview = {
              candidateName: cand ? `${cand.first_name} ${cand.last_name}` : 'Unknown',
              stageName: stage?.name || '',
              date: iv.scheduled_at,
            }
          }

          const searchActivities = activities.filter((a: any) => a.search_id === sid)
          let daysSinceActivity: number | null = null
          if (searchActivities.length > 0) {
            const latest = new Date(searchActivities[0].created_at)
            daysSinceActivity = Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24))
          }

          summaries[sid] = {
            candidateCount: searchCandidates.length,
            nextInterview,
            moreInterviews: Math.max(0, upcoming.length - 1),
            daysSinceActivity,
          }
        }
        setSearchSummaries(summaries)
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

  // Compute dynamic subline
  const activeSearchCount = searches.filter(s => s.status !== 'on_hold' && s.status !== 'filled').length
  const totalUpcomingInterviews = Object.values(searchSummaries).reduce((sum, s) => sum + (s.nextInterview ? 1 + s.moreInterviews : 0), 0)

  const buildSubline = () => {
    const parts: string[] = []
    if (activeSearchCount > 0) {
      parts.push(`${activeSearchCount} active search${activeSearchCount !== 1 ? 'es' : ''}`)
    }
    if (totalUpcomingInterviews > 0) {
      parts.push(`${totalUpcomingInterviews} interview${totalUpcomingInterviews !== 1 ? 's' : ''} coming up`)
    }
    if (parts.length === 0) return 'No active searches yet — get started below.'
    return `You have ${parts.join(' and ')}.`
  }

  // Filter searches based on active tab
  // "active" tab shows everything that isn't on_hold or filled (includes active, pending, paused)
  const filteredSearches = searches.filter(s => {
    if (activeTab === 'active') return s.status !== 'on_hold' && s.status !== 'filled'
    return s.status === activeTab
  })

  if (showWelcome) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1F3C62',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.8s ease',
      }}>
        <style>{`
          @keyframes wordFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .word {
            display: inline-block;
            opacity: 0;
            animation: wordFadeIn 0.4s ease forwards;
            margin-right: 0.25em;
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: 'white', fontSize: 'clamp(3rem, 10vw, 7rem)', fontWeight: 800, marginBottom: 20 }}>
            {['Hi,', recruiterName].map((word, i) => (
              <span key={i} className="word" style={{ animationDelay: `${i * 0.3}s` }}>{word}</span>
            ))}
          </h1>
          <p style={{ color: '#E87A2F', fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 600 }}>
            {["Let's", 'get', 'to', 'work.'].map((word, i) => (
              <span key={i} className="word" style={{ animationDelay: `${(i + 2) * 0.3}s` }}>{word}</span>
            ))}
            <span className="word" style={{ animationDelay: `${6 * 0.3}s`, marginLeft: '0.1em' }}>🔍</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page">

      {/* Sticky Greeting Section */}
      <div className="sticky top-[56px] sm:top-[64px] bg-bg-page z-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="flex items-start justify-between pt-5 pb-4">
            <div>
              <p className="text-sm text-text-secondary">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-sm mt-1 text-text-secondary">
                {buildSubline()}
              </p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="default"
              className="px-4 sm:px-6 touch-manipulation min-h-[44px] font-bold text-lg text-white rounded-md shadow-sm transition-all hover:shadow-md hover:scale-[1.02] bg-navy mt-2"
            >
              <span className="text-orange">+</span> New Search
            </Button>
          </div>

          {/* Orange accent divider */}
          <div className="h-[2px] rounded-full" style={{ backgroundColor: '#E87A2F' }} />

          {/* Stats scorecard */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-8 py-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy">{activeSearchCount}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Active</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-ds-border" />
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy">{searches.filter(s => s.status === 'on_hold').length}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">On Hold</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-ds-border" />
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy">{searches.filter(s => s.status === 'filled').length}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Filled YTD</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
            {/* Sticky Tabs */}
            <div className="sticky top-[200px] sm:top-[215px] bg-bg-page z-10 pb-4 mb-4" style={{ borderBottom: '2px solid var(--navy)' }}>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('active')}
                  className="py-2 px-3 sm:px-6 text-base transition-all font-semibold rounded-md"
                  style={{
                    color: activeTab === 'active' ? '#fff' : 'var(--navy)',
                    backgroundColor: activeTab === 'active' ? 'var(--navy)' : '#fff',
                    border: '1px solid var(--navy)',
                  }}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('on_hold')}
                  className="py-2 px-3 sm:px-6 text-base transition-all font-semibold rounded-md"
                  style={{
                    color: activeTab === 'on_hold' ? '#fff' : 'var(--navy)',
                    backgroundColor: activeTab === 'on_hold' ? 'var(--navy)' : '#fff',
                    border: '1px solid var(--navy)',
                  }}
                >
                  On Hold
                </button>
                <button
                  onClick={() => setActiveTab('filled')}
                  className="py-2 px-3 sm:px-6 text-base transition-all font-semibold rounded-md"
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
                  {activeTab === 'on_hold' && 'No searches on hold'}
                  {activeTab === 'filled' && 'No filled searches'}
                </h3>
                <p className="text-base sm:text-lg text-text-secondary">
                  {activeTab === 'active' && 'Click "+ New Search" above to get started'}
                  {activeTab === 'on_hold' && 'Searches put on hold will appear here'}
                  {activeTab === 'filled' && 'Searches marked as filled will appear here'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="border-t" style={{ borderColor: '#D1D5DB' }}>
              {filteredSearches.map((search) => {
                const daysOpen = getDaysOpen((search as any).launch_date)
                const leadName = leadRecruiters[search.id]

                const summary = searchSummaries[search.id]
                const candidateLabel = summary?.candidateCount
                  ? `${summary.candidateCount} active candidate${summary.candidateCount !== 1 ? 's' : ''}`
                  : 'No candidates yet'
                const activityLabel = summary?.daysSinceActivity !== null && summary?.daysSinceActivity !== undefined
                  ? `Last activity: ${summary.daysSinceActivity} day${summary.daysSinceActivity !== 1 ? 's' : ''} ago`
                  : 'No activity yet'

                const detailsLine1 = [
                  daysOpen !== null ? `Days Open: ${daysOpen}` : 'Not launched yet',
                  (search as any).launch_date && `Launch: ${new Date((search as any).launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                  (search as any).target_fill_date && `Target Close: ${new Date((search as any).target_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                  leadName && `Lead: ${leadName}`,
                ].filter(Boolean)

                const detailsLine2 = [candidateLabel, activityLabel]

                return (
                  <div
                    key={search.id}
                    className="flex flex-col sm:flex-row sm:items-start gap-3 py-4 px-2 transition-colors border-b"
                    style={{ borderColor: '#D1D5DB' }}
                  >
                    {/* Left side */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-base font-bold text-navy cursor-pointer hover:underline"
                          onClick={() => router.push(`/searches/${search.id}/candidates`)}
                        >
                          {search.company_name} — {search.position_title}
                        </span>
                        {search.status === 'on_hold' && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange/15 text-orange">On Hold</span>
                        )}
                        {search.status === 'filled' && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">Filled</span>
                        )}
                        <button
                          onClick={() => router.push(`/searches/${search.id}/pipeline`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white rounded transition-colors hover:opacity-90 whitespace-nowrap bg-[#64748B] shadow-sm"
                        >
                          <ClipboardList className="w-3 h-3" />
                          Search Details
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {detailsLine1.join(' • ')}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {detailsLine2.join(' • ')}
                      </div>
                    </div>

                    {/* Right side buttons */}
                    <div className="flex-shrink-0 flex flex-wrap items-center gap-3 sm:gap-4">
                      <button
                        onClick={() => router.push(`/searches/${search.id}/candidates`)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap text-white min-w-[160px] transition-colors hover:opacity-90 bg-[#546E8A]"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        Candidate Pipeline
                      </button>
                      <button
                        onClick={() => router.push(`/searches/${search.id}/portal`)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap text-white min-w-[160px] transition-colors hover:opacity-90 bg-[#546E8A]"
                      >
                        <Globe className="w-3.5 h-3.5" />
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

