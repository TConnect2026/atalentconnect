"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MoreVertical, ChevronRight, Settings, Users, UserCog, ListChecks, FolderOpen, StickyNote } from "lucide-react"
import { SearchDetailsPanel } from "@/components/pipeline/search-details-panel"
import { RecruitingTeamPanel } from "@/components/pipeline/recruiting-team-panel"
import { ClientTeamPanel } from "@/components/pipeline/client-team-panel"
import { StagesPanel } from "@/components/pipeline/stages-panel"
import { ResourcesPanel } from "@/components/pipeline/resources-panel"

const SIDEBAR_ITEMS = [
  { key: 'details', label: 'Search Details', icon: Settings },
  { key: 'recruiting_team', label: 'Recruiting Team', icon: UserCog },
  { key: 'team', label: 'Client Team', icon: Users },
  { key: 'stages', label: 'Stages', icon: ListChecks },
  { key: 'resources', label: 'Resources', icon: FolderOpen },
  { key: 'notes', label: 'Client Notes', icon: StickyNote },
]

export default function PipelineWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const searchId = params.id as string

  // Data state
  const [search, setSearch] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Client notes state
  const [clientNotes, setClientNotes] = useState<string>("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // UI state
  const [activeSection, setActiveSection] = useState('details')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    loadSearchData()
  }, [searchId])

  const loadSearchData = async () => {
    setIsLoading(true)
    try {
      const { data: searchData, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("id", searchId)
        .single()

      if (searchError) throw searchError
      setSearch(searchData)
      setClientNotes(searchData?.notes || "")

      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("search_id", searchId)
        .order("is_primary", { ascending: false })
      setContacts(contactsData || [])

      const { data: stagesData } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .gte("order", 0)
        .order("order", { ascending: true })
      setStages(stagesData || [])

      const { data: documentsData } = await supabase
        .from("documents")
        .select("*")
        .eq("search_id", searchId)
        .order("created_at", { ascending: false })
      setDocuments(documentsData || [])

      // Load recruiting team members
      let teamData: any[] | null = null
      const { data: tmData } = await supabase
        .from("search_team_members")
        .select("id, search_id, profile_id, role, member_name, profiles(first_name, last_name, email)")
        .eq("search_id", searchId)
        .order("created_at", { ascending: true })

      if (tmData) {
        teamData = tmData.map((tm: any) => ({
          id: tm.id,
          search_id: tm.search_id,
          profile_id: tm.profile_id,
          role: tm.role,
          member_name: tm.member_name,
          first_name: tm.profiles?.first_name || '',
          last_name: tm.profiles?.last_name || '',
          email: tm.profiles?.email || '',
        }))
      }

      if (!teamData) {
        // Fallback without member_name
        const { data: tmFallback } = await supabase
          .from("search_team_members")
          .select("id, search_id, profile_id, role, profiles(first_name, last_name, email)")
          .eq("search_id", searchId)
          .order("created_at", { ascending: true })

        if (tmFallback) {
          teamData = tmFallback.map((tm: any) => ({
            id: tm.id,
            search_id: tm.search_id,
            profile_id: tm.profile_id,
            role: tm.role,
            first_name: tm.profiles?.first_name || '',
            last_name: tm.profiles?.last_name || '',
            email: tm.profiles?.email || '',
          }))
        }
      }

      setTeamMembers(teamData || [])

    } catch (err) {
      console.error("Error loading search data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotesChange = async (value: string) => {
    setClientNotes(value)
    setIsSavingNotes(true)

    try {
      const { error } = await supabase
        .from('searches')
        .update({ notes: value })
        .eq('id', searchId)

      if (error) throw error
    } catch (err) {
      console.error('Error saving notes:', err)
    } finally {
      setIsSavingNotes(false)
    }
  }

  const getSidebarCount = (key: string) => {
    switch (key) {
      case 'recruiting_team': return teamMembers.length > 0 ? teamMembers.length : null
      case 'team': return contacts.length > 0 ? contacts.length : null
      case 'stages': return stages.length > 0 ? stages.length : null
      case 'resources': return documents.length > 0 ? documents.length : null
      default: return null
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading search...</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Search not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b-2 border-ds-border">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-full">
          <div className="flex items-center justify-between">
            {/* Left - Title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/searches')}
                className="text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search List
              </Button>
              <div className="h-6 w-px bg-ds-border"></div>
              <div>
                <h1 className="text-2xl font-bold text-navy">
                  {search.company_name}
                </h1>
                <p className="text-lg font-semibold text-text-secondary">{search.position_title}</p>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              {/* Three-dot menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-text-secondary"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg card-shadow border-2 border-ds-border py-2 z-50">
                    <button
                      onClick={() => {
                        router.push(`/searches/${searchId}/portal`)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-bg-section text-text-primary font-medium text-sm"
                    >
                      View Client Portal
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/searches/${searchId}/agreement`)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-bg-section text-text-primary font-medium text-sm"
                    >
                      View Search Agreement
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/searches/${searchId}/playbook`)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-bg-section text-text-primary font-medium text-sm"
                    >
                      View Playbook
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Sidebar Nav */}
        <div className="w-72 bg-white border-r border-ds-border flex-shrink-0 p-4 space-y-2">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.key
            const count = getSidebarCount(item.key)

            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left rounded-lg border-2 transition-all ${
                  isActive
                    ? 'bg-bg-section shadow-sm'
                    : 'bg-bg-card border-ds-border hover:border-ds-border hover:bg-bg-section'
                }`}
                style={isActive ? { borderColor: 'var(--orange)' } : undefined}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: isActive ? 'var(--orange)' : 'var(--text-secondary)' }}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className="text-base font-bold block text-navy"
                  >
                    {item.label}
                  </span>
                  {count !== null && (
                    <span className="text-xs text-text-muted">{count} added</span>
                  )}
                </div>
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isActive ? 'var(--orange)' : '#9ca3af' }}
                />
              </button>
            )
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl">
            {activeSection === 'details' && (
              <div className="bg-white rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 rounded-t-lg bg-navy">
                  <h2 className="text-2xl font-bold text-white">Search Details</h2>
                </div>
                <SearchDetailsPanel searchId={searchId} search={search} onUpdate={loadSearchData} />
              </div>
            )}

            {activeSection === 'recruiting_team' && (
              <div className="bg-white rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 border-b border-ds-border">
                  <h2 className="text-lg font-bold text-navy">Recruiting Team</h2>
                  <p className="text-sm text-text-muted mt-0.5">Firm members assigned to this search</p>
                </div>
                <RecruitingTeamPanel
                  searchId={searchId}
                  teamMembers={teamMembers}
                  onUpdate={loadSearchData}
                />
              </div>
            )}

            {activeSection === 'team' && (
              <div className="bg-white rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 border-b border-ds-border">
                  <h2 className="text-lg font-bold text-navy">Client Team</h2>
                  <p className="text-sm text-text-muted mt-0.5">Interview committee and key stakeholders</p>
                </div>
                <ClientTeamPanel
                  searchId={searchId}
                  contacts={contacts}
                  onUpdate={loadSearchData}
                />
              </div>
            )}

            {activeSection === 'stages' && (
              <div className="bg-white rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 border-b border-ds-border">
                  <h2 className="text-lg font-bold text-navy">Interview Stages</h2>
                  <p className="text-sm text-text-muted mt-0.5">Define your interview process</p>
                </div>
                <StagesPanel
                  searchId={searchId}
                  search={search}
                  stages={stages}
                  contacts={contacts}
                  onUpdate={loadSearchData}
                />
              </div>
            )}

            {activeSection === 'resources' && (
              <div className="bg-white rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 border-b border-ds-border">
                  <h2 className="text-lg font-bold text-navy">Resources</h2>
                  <p className="text-sm text-text-muted mt-0.5">Documents, playbooks, and links</p>
                </div>
                <ResourcesPanel
                  searchId={searchId}
                  documents={documents}
                  search={search}
                  onUpdate={loadSearchData}
                />
              </div>
            )}

            {activeSection === 'notes' && (
              <div className="bg-white rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 border-b border-ds-border">
                  <h2 className="text-lg font-bold text-navy">Client Notes</h2>
                  <p className="text-sm text-text-muted mt-0.5">Context, background, client dynamics</p>
                </div>
                <div className="p-6">
                  <textarea
                    value={clientNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Add any context about the search, client dynamics, politics, or background info..."
                    className="w-full h-64 px-4 py-3 text-sm border border-ds-border rounded-lg focus:border-navy focus:outline-none resize-y"
                  />
                  {isSavingNotes && (
                    <p className="text-xs text-text-muted mt-2">Saving...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
