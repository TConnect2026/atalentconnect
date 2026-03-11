"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, ChevronRight, Settings, Building2, Search, UserCog, FolderOpen, FileText, Target, ClipboardList, Users } from "lucide-react"
import { SearchDetailsPanel } from "@/components/pipeline/search-details-panel"
import { SearchContextBar } from "@/components/layout/search-context-bar"
import { InterviewPlanPanel } from "@/components/pipeline/interview-plan-panel"
import { CompanyDetailsPanel } from "@/components/pipeline/company-details-panel"
import { ScoutingReportPanel } from "@/components/pipeline/scouting-report-panel"
import { RecruitingTeamPanel } from "@/components/pipeline/recruiting-team-panel"
import { DocumentsPanel } from "@/components/pipeline/documents-panel"
import { SearchAgreementPanel } from "@/components/pipeline/search-agreement-panel"

// Items under the Search Details header
const SIDEBAR_MAIN_ITEMS = [
  { key: 'position_details', label: 'Position Details', icon: ClipboardList },
  { key: 'client_contacts', label: 'Client Contacts', icon: Users },
  { key: 'interview_plan', label: 'Interview Plan', icon: Target },
  { key: 'documents', label: 'Search Documents', icon: FolderOpen },
]

const SIDEBAR_INTELLIGENCE_ITEMS = [
  { key: 'company_details', label: 'Company Intel', icon: Building2 },
  { key: 'scouting_report', label: 'Talent Intel', icon: Search },
]

const SIDEBAR_ADMIN_ITEMS = [
  { key: 'recruiting_team', label: 'Recruiting Team', icon: UserCog },
  { key: 'agreement', label: 'Search Agreement', icon: FileText },
]

// Sections that belong to the "Search Details" parent
const SEARCH_DETAILS_SECTIONS = ['details', 'position_details', 'client_contacts']

export default function PipelineWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const searchId = params?.id as string

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
        .gte("stage_order", 0)
        .order("stage_order", { ascending: true })
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
      case 'documents': return documents.length > 0 ? documents.length : null
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
    <div className="min-h-screen bg-bg-page">
      {/* ===== CONTEXT BAR ===== */}
      <SearchContextBar
        searchId={searchId}
        companyName={search.company_name}
        positionTitle={search.position_title}
        clientLogoUrl={search.client_logo_url}
        launchDate={search.launch_date}
        targetFillDate={search.target_fill_date}
        status={search.status}
        activePage="search-details"
        onDatesUpdated={loadSearchData}
      />

      {/* Page Title */}
      <div className="px-6 pt-4 pb-0">
        <h1 className="text-2xl font-bold text-navy">Search Details</h1>
      </div>

      {/* Sidebar + Content */}
      <div className="flex flex-1">
        {/* Left Sidebar Nav */}
        <div className="w-72 bg-bg-page border-r border-ds-border flex-shrink-0 px-4 pt-3 pb-4 space-y-1">

          {/* Main navigation items */}
          {SIDEBAR_MAIN_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.key
            const count = getSidebarCount(item.key)

            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-lg border-2 transition-all ${
                  isActive
                    ? 'bg-bg-page shadow-sm'
                    : 'bg-bg-page border-ds-border hover:bg-white'
                }`}
                style={isActive ? { borderColor: 'var(--orange)' } : undefined}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: isActive ? 'var(--orange)' : 'var(--text-secondary)' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold block text-navy">
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

          {/* Intelligence Separator */}
          <div className="pt-3 pb-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-ds-border"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Intelligence</span>
              <div className="flex-1 h-px bg-ds-border"></div>
            </div>
          </div>

          {SIDEBAR_INTELLIGENCE_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.key
            const count = getSidebarCount(item.key)

            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-lg border-2 transition-all ${
                  isActive
                    ? 'bg-bg-page shadow-sm'
                    : 'bg-bg-page border-ds-border hover:bg-white'
                }`}
                style={isActive ? { borderColor: 'var(--orange)' } : undefined}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: isActive ? 'var(--orange)' : 'var(--text-secondary)' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold block text-navy">
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

          {/* Admin Separator */}
          <div className="pt-3 pb-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-ds-border"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Admin</span>
              <div className="flex-1 h-px bg-ds-border"></div>
            </div>
          </div>

          {SIDEBAR_ADMIN_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.key
            const count = getSidebarCount(item.key)

            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-lg border-2 transition-all ${
                  isActive
                    ? 'bg-bg-page shadow-sm'
                    : 'bg-bg-page border-ds-border hover:bg-white'
                }`}
                style={isActive ? { borderColor: 'var(--orange)' } : undefined}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: isActive ? 'var(--orange)' : 'var(--text-secondary)' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold block text-navy">
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
        <div className="flex-1 px-6 pt-3 pb-6">

            {/* Back to Search Details link — shown on non-details sub-pages */}
            {!SEARCH_DETAILS_SECTIONS.includes(activeSection) && (
              <button
                onClick={() => setActiveSection('details')}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-navy mb-3 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Search Details
              </button>
            )}

            {(activeSection === 'details' || activeSection === 'position_details' || activeSection === 'client_contacts') && (
              <SearchDetailsPanel searchId={searchId} search={search} onUpdate={loadSearchData} notes={clientNotes} onNotesChange={handleNotesChange} isSavingNotes={isSavingNotes} stages={stages} searchContacts={contacts} firmId={search?.firm_id} onNavigateToInterviewPlan={() => setActiveSection('interview_plan')} scrollTo={activeSection !== 'details' ? activeSection : undefined} />
            )}

            {activeSection === 'interview_plan' && (
              <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 rounded-t-lg bg-[#64748B]">
                  <h2 className="text-2xl font-bold text-white">Interview Plan</h2>
                </div>
                <InterviewPlanPanel
                  searchId={searchId}
                  firmId={search?.firm_id}
                  stages={stages}
                  searchContacts={contacts}
                  onUpdate={loadSearchData}
                />
              </div>
            )}

            {activeSection === 'company_details' && (
              <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 rounded-t-lg bg-[#64748B]">
                  <h2 className="text-2xl font-bold text-white">Company Intel</h2>
                </div>
                <CompanyDetailsPanel searchId={searchId} search={search} onUpdate={loadSearchData} />
              </div>
            )}

            {activeSection === 'scouting_report' && (
              <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 rounded-t-lg bg-[#64748B]">
                  <h2 className="text-2xl font-bold text-white">Talent Intel</h2>
                </div>
                <ScoutingReportPanel searchId={searchId} search={search} onUpdate={loadSearchData} />
              </div>
            )}

            {activeSection === 'documents' && (
              <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 rounded-t-lg bg-[#64748B]">
                  <h2 className="text-2xl font-bold text-white">Search Documents</h2>
                </div>
                <DocumentsPanel
                  searchId={searchId}
                  documents={documents}
                  search={search}
                  onUpdate={loadSearchData}
                />
              </div>
            )}

            {activeSection === 'recruiting_team' && (
              <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 rounded-t-lg bg-[#64748B]">
                  <h2 className="text-2xl font-bold text-white">Recruiting Team</h2>
                </div>
                <RecruitingTeamPanel
                  searchId={searchId}
                  teamMembers={teamMembers}
                  onUpdate={loadSearchData}
                />
              </div>
            )}

            {activeSection === 'agreement' && (
              <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
                <div className="px-6 py-4 rounded-t-lg bg-[#64748B]">
                  <h2 className="text-2xl font-bold text-white">Search Agreement</h2>
                </div>
                <SearchAgreementPanel
                  searchId={searchId}
                  firmId={search?.firm_id}
                  onUpdate={loadSearchData}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
