"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { ChevronRight, Building2, Search, UserCog, FolderOpen, FileText, Target, ClipboardList, Users, NotebookPen, CheckCircle2, Clock, ArrowRight } from "lucide-react"
import { SearchDetailsPanel } from "@/components/pipeline/search-details-panel"
import { SearchContextBar } from "@/components/layout/search-context-bar"
import { InterviewPlanPanel } from "@/components/pipeline/interview-plan-panel"
import { CompanyDetailsPanel } from "@/components/pipeline/company-details-panel"
import { LatestNewsPanel } from "@/components/pipeline/latest-news-panel"
import { ScoutingReportPanel } from "@/components/pipeline/scouting-report-panel"
import { RecruitingTeamPanel } from "@/components/pipeline/recruiting-team-panel"
import { DocumentsPanel } from "@/components/pipeline/documents-panel"
import { SearchAgreementPanel } from "@/components/pipeline/search-agreement-panel"
import Link from "next/link"

// ─── Sidebar nav items ───────────────────────────────────────────────────────


const SIDEBAR_MAIN_ITEMS = [
  { key: 'company_details', label: 'Company Intel', icon: Building2 },
  { key: 'intake_brief', label: 'Intake Brief', icon: NotebookPen },
  { key: 'position_details', label: 'Position Details', icon: ClipboardList },
  { key: 'client_contacts', label: 'Client Contacts', icon: Users },
  { key: 'interview_plan', label: 'Interview Plan', icon: Target },
]

// ─── Main component ──────────────────────────────────────────────────────────

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
  const [intakeBrief, setIntakeBrief] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Client notes state
  const [clientNotes, setClientNotes] = useState<string>("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Scroll tracking
  const [activeSection, setActiveSection] = useState('company_details')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const contentRef = useRef<HTMLDivElement>(null)
  const isScrollingFromClick = useRef(false)

  // ─── Data loading ────────────────────────────────────────────────────────

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

      // Load intake brief
      const { data: briefData } = await supabase
        .from("intake_briefs")
        .select("*")
        .eq("search_id", searchId)
        .single()
      setIntakeBrief(briefData || null)

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

  // ─── Auto-populate Position Details from completed intake ────────────────

  useEffect(() => {
    if (!intakeBrief || intakeBrief.status !== 'complete' || !search) return

    const snapshot = intakeBrief.snapshot
    if (!snapshot) return

    // Role Basics is the authoritative source for role-level fields when present
    const rb = snapshot.roleBasics
    const reportsToDisplay = rb?.reportsTo || snapshot.reportingTo

    // Only pre-fill fields that are currently empty on the search
    const updates: Record<string, any> = {}
    if (!search.position_title && rb?.officialTitle) updates.position_title = rb.officialTitle
    if (!search.reports_to && reportsToDisplay) updates.reports_to = reportsToDisplay
    if (!search.position_location && (rb?.roleLocation || snapshot.extras?.headquarters)) {
      updates.position_location = rb?.roleLocation || snapshot.extras?.headquarters
    }
    if (!search.work_arrangement && (rb?.workArrangement || snapshot.extras?.work_arrangement)) {
      updates.work_arrangement = rb?.workArrangement || snapshot.extras?.work_arrangement
    }
    if (!search.open_to_relocation && rb?.openToRelocation) updates.open_to_relocation = true
    if (!search.launch_date && rb?.launchDate) updates.launch_date = rb.launchDate
    if (!search.target_fill_date && rb?.targetCloseDate) updates.target_fill_date = rb.targetCloseDate
    if (!search.compensation_range && snapshot.revenueOrBudget) updates.compensation_range = snapshot.revenueOrBudget

    if (Object.keys(updates).length === 0) return

    updates.updated_at = new Date().toISOString()

    supabase
      .from('searches')
      .update(updates)
      .eq('id', searchId)
      .then(({ error }) => {
        if (!error) loadSearchData()
      })
  }, [intakeBrief?.id, intakeBrief?.status])

  // ─── Scroll-based active section tracking ────────────────────────────────

  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingFromClick.current) return
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-section')
          if (id) setActiveSection(id)
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      }
    )

    // Observe all sections
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [isLoading])

  const scrollToSection = useCallback((key: string) => {
    const el = sectionRefs.current[key]
    if (!el) return
    isScrollingFromClick.current = true
    setActiveSection(key)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Re-enable observer after scroll completes
    setTimeout(() => { isScrollingFromClick.current = false }, 800)
  }, [])

  const setSectionRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[key] = el
  }, [])

  // ─── Helpers ─────────────────────────────────────────────────────────────

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

  const getSidebarExtra = (key: string) => {
    switch (key) {
      case 'recruiting_team': return teamMembers.length > 0 ? `${teamMembers.length} added` : null
      case 'documents': return documents.length > 0 ? `${documents.length} added` : null
      case 'intake_brief':
        if (!intakeBrief) return null
        if (intakeBrief.status === 'complete') return 'Complete'
        if (intakeBrief.status === 'in_progress') return 'In progress'
        if (intakeBrief.status === 'ready') return 'Ready'
        return 'Draft'
      default: return null
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

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

  const renderSidebarItem = (item: typeof SIDEBAR_MAIN_ITEMS[0]) => {
    const Icon = item.icon
    const isActive = activeSection === item.key
    const extra = getSidebarExtra(item.key)
    const isIntakeComplete = item.key === 'intake_brief' && intakeBrief?.status === 'complete'

    return (
      <button
        key={item.key}
        onClick={() => scrollToSection(item.key)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-lg border-2 transition-all ${
          isActive
            ? 'bg-bg-page shadow-sm'
            : 'bg-bg-page border-ds-border hover:bg-white'
        }`}
        style={isActive ? { borderColor: 'var(--orange)' } : undefined}
      >
        <Icon
          className="w-5 h-5 flex-shrink-0"
          style={{ color: isActive ? 'var(--orange)' : isIntakeComplete ? '#16a34a' : 'var(--text-secondary)' }}
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold block text-navy">
            {item.label}
          </span>
          {extra && (
            <span className={`text-xs ${isIntakeComplete ? 'text-green-600' : 'text-text-muted'}`}>{extra}</span>
          )}
        </div>
        <ChevronRight
          className="w-4 h-4 flex-shrink-0"
          style={{ color: isActive ? 'var(--orange)' : '#9ca3af' }}
        />
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
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
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar Nav — sticky */}
        <div className="w-72 flex-shrink-0 px-4 pt-3 pb-4 space-y-1 sticky top-0 self-start max-h-screen overflow-y-auto">
          {SIDEBAR_MAIN_ITEMS.map(renderSidebarItem)}
        </div>

        {/* Main Content Area — scrollable */}
        <div ref={contentRef} className="flex-1 px-6 pt-3 pb-6 overflow-y-auto space-y-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>

          {/* ─── Company Intel (with Latest News subsection) ──────────── */}
          <div ref={setSectionRef('company_details')} data-section="company_details">
            <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm overflow-hidden">
              <CompanyDetailsPanel searchId={searchId} search={search} onUpdate={loadSearchData} />
              <LatestNewsPanel searchId={searchId} search={search} onUpdate={loadSearchData} />
            </div>
          </div>

          {/* Layer divider between company-level and search-level sections */}
          <div className="flex items-center gap-3 py-3" aria-hidden>
            <div className="h-0.5 flex-1 bg-ds-border rounded-full" />
            <div className="w-1.5 h-1.5 rounded-full bg-ds-border" />
            <div className="h-0.5 flex-1 bg-ds-border rounded-full" />
          </div>

          {/* ─── Intake Brief ─────────────────────────────────────────── */}
          <div ref={setSectionRef('intake_brief')} data-section="intake_brief">
            <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
              <div className="px-6 py-4 rounded-t-lg bg-navy">
                <h2 className="text-2xl font-bold text-white">Intake Brief</h2>
              </div>
              <div className="p-6">
                {!intakeBrief ? (
                  <div className="text-center py-8">
                    <NotebookPen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <h3 className="text-lg font-bold text-navy mb-1">No intake brief yet</h3>
                    <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
                      Research the company and generate a tailored intake conversation guide with AI-selected questions.
                    </p>
                    <Link
                      href={`/searches/${searchId}/intake`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors"
                    >
                      Start Intake Brief
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div>
                    {/* Status bar */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {intakeBrief.status === 'complete' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-500" />
                        )}
                        <span className={`text-sm font-medium ${intakeBrief.status === 'complete' ? 'text-green-700' : 'text-blue-700'}`}>
                          {intakeBrief.status === 'complete' ? 'Intake Complete' :
                           intakeBrief.status === 'in_progress' ? 'Session In Progress' : 'Brief Ready'}
                        </span>
                        {intakeBrief.generation_path && (
                          <span className="text-xs text-text-muted ml-2">
                            ({intakeBrief.generation_path === 'with_jd' ? 'Generated with JD' : 'Generated without JD'})
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/searches/${searchId}/intake`}
                        className="text-sm font-medium text-navy hover:underline"
                      >
                        {intakeBrief.status === 'complete' ? 'View Brief' : 'Continue Editing'} →
                      </Link>
                    </div>

                    {/* Company research summary */}
                    {intakeBrief.company_research && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-navy">{intakeBrief.company_research.company_name}</p>
                            <p className="text-sm text-text-muted">
                              {[intakeBrief.company_research.industry, intakeBrief.company_research.headquarters].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {intakeBrief.company_research.employee_count && (
                            <span className="text-xs text-text-muted bg-white px-2 py-1 rounded border border-ds-border">
                              {intakeBrief.company_research.employee_count} employees
                            </span>
                          )}
                        </div>
                        {intakeBrief.company_research.description && (
                          <p className="text-sm text-text-secondary mt-2 leading-relaxed">{intakeBrief.company_research.description}</p>
                        )}
                      </div>
                    )}

                    {/* Question count + signals preview */}
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                      {intakeBrief.questions?.length > 0 && (
                        <span>{intakeBrief.questions.length} questions prepared</span>
                      )}
                      {intakeBrief.jd_signals?.length > 0 && (
                        <span>{intakeBrief.jd_signals.length} signals identified</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Position Details + Client Contacts ───────────────────── */}
          <div ref={setSectionRef('position_details')} data-section="position_details">
            <SearchDetailsPanel
              searchId={searchId}
              search={search}
              onUpdate={loadSearchData}
              notes={clientNotes}
              onNotesChange={handleNotesChange}
              isSavingNotes={isSavingNotes}
              stages={stages}
              searchContacts={contacts}
              firmId={search?.firm_id}
              onNavigateToInterviewPlan={() => scrollToSection('interview_plan')}
            />
          </div>

          {/* Client Contacts gets its own observer target */}
          <div ref={setSectionRef('client_contacts')} data-section="client_contacts" className="h-0" />

          {/* ─── Interview Plan ────────────────────────────────────────── */}
          <div ref={setSectionRef('interview_plan')} data-section="interview_plan">
            <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
              <div className="px-6 py-4 rounded-t-lg bg-navy">
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
          </div>

          {/* ─── Search Documents ──────────────────────────────────────── */}
          <div ref={setSectionRef('documents')} data-section="documents">
            <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
              <div className="px-6 py-4 rounded-t-lg bg-navy">
                <h2 className="text-2xl font-bold text-white">Search Documents</h2>
              </div>
              <DocumentsPanel
                searchId={searchId}
                documents={documents}
                search={search}
                onUpdate={loadSearchData}
              />
            </div>
          </div>

          {/* ─── Talent Intel ──────────────────────────────────────────── */}
          <div ref={setSectionRef('scouting_report')} data-section="scouting_report">
            <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
              <div className="px-6 py-4 rounded-t-lg bg-navy">
                <h2 className="text-2xl font-bold text-white">Talent Intel</h2>
              </div>
              <ScoutingReportPanel searchId={searchId} search={search} onUpdate={loadSearchData} />
            </div>
          </div>

          {/* ─── Recruiting Team ───────────────────────────────────────── */}
          <div ref={setSectionRef('recruiting_team')} data-section="recruiting_team">
            <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
              <div className="px-6 py-4 rounded-t-lg bg-navy">
                <h2 className="text-2xl font-bold text-white">Recruiting Team</h2>
              </div>
              <RecruitingTeamPanel
                searchId={searchId}
                teamMembers={teamMembers}
                onUpdate={loadSearchData}
              />
            </div>
          </div>

          {/* ─── Search Agreement ──────────────────────────────────────── */}
          <div ref={setSectionRef('agreement')} data-section="agreement">
            <div className="bg-bg-page rounded-lg border border-ds-border shadow-sm">
              <div className="px-6 py-4 rounded-t-lg bg-navy">
                <h2 className="text-2xl font-bold text-white">Search Agreement</h2>
              </div>
              <SearchAgreementPanel
                searchId={searchId}
                firmId={search?.firm_id}
                onUpdate={loadSearchData}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
