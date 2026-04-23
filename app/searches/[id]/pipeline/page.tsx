"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { ChevronRight, Building2, NotebookPen, ClipboardList, Users, MessageSquare } from "lucide-react"
import { SearchContextBar } from "@/components/layout/search-context-bar"
import { CompanyDetailsPanel } from "@/components/pipeline/company-details-panel"
import { LatestNewsPanel } from "@/components/pipeline/latest-news-panel"
import { IntakePanel } from "@/components/pipeline/intake-panel"

// ─── Sidebar nav items ───────────────────────────────────────────────────────


interface NavItem {
  key: string
  label: string
  icon?: typeof Building2
  children?: NavItem[]
}

const SIDEBAR_MAIN_ITEMS: NavItem[] = [
  { key: 'company_details', label: 'Company Intel', icon: Building2 },
  {
    key: 'the_search',
    label: 'The Search',
    icon: NotebookPen,
    children: [
      { key: 'essentials', label: 'Essentials', icon: ClipboardList },
      { key: 'interview_plan', label: 'Interview Plan', icon: Users },
      { key: 'intake_brief', label: 'Intake Brief', icon: MessageSquare },
    ],
  },
]

// ─── Main component ──────────────────────────────────────────────────────────

export default function PipelineWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const searchId = params?.id as string

  // Data state
  const [search, setSearch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    } catch (err) {
      console.error("Error loading search data:", err)
    } finally {
      setIsLoading(false)
    }
  }

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

    // Observe every [data-section] in the scroll container — covers both
    // refs registered via setSectionRef and anchors rendered inside panels
    // like IntakePanel.
    const observed = new Set<Element>()
    Object.values(sectionRefs.current).forEach((el) => {
      if (el && !observed.has(el)) { observer.observe(el); observed.add(el) }
    })
    container.querySelectorAll('[data-section]').forEach((el) => {
      if (!observed.has(el)) { observer.observe(el); observed.add(el) }
    })

    return () => observer.disconnect()
  }, [isLoading])

  const findSectionEl = (key: string): HTMLElement | null => {
    const fromRef = sectionRefs.current[key]
    if (fromRef) return fromRef
    return (contentRef.current?.querySelector(`[data-section="${key}"]`) as HTMLElement | null) || null
  }

  const scrollToSection = useCallback((key: string) => {
    const el = findSectionEl(key)
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

  const getSidebarExtra = (_key: string): string | null => null

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

  const renderSubItem = (item: NavItem) => {
    const SubIcon = item.icon
    const isActive = activeSection === item.key
    return (
      <button
        key={item.key}
        onClick={() => scrollToSection(item.key)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
          isActive ? 'text-orange bg-white' : 'text-navy hover:bg-white'
        }`}
      >
        {SubIcon && (
          <SubIcon
            className="w-4 h-4 flex-shrink-0"
            style={{ color: isActive ? 'var(--orange)' : 'var(--text-secondary)' }}
          />
        )}
        <span>{item.label}</span>
      </button>
    )
  }

  const renderSidebarItem = (item: NavItem) => {
    const Icon = item.icon
    const directlyActive = activeSection === item.key
    const childActive = !!item.children?.some((c) => c.key === activeSection)
    const isActive = directlyActive || childActive
    const extra = getSidebarExtra(item.key)
    const scrollTarget = item.children && item.children.length > 0 ? item.children[0].key : item.key

    return (
      <div key={item.key} className="space-y-1">
        <button
          onClick={() => scrollToSection(scrollTarget)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-lg border-2 transition-all ${
            isActive
              ? 'bg-bg-page shadow-sm'
              : 'bg-bg-page border-ds-border hover:bg-white'
          }`}
          style={isActive ? { borderColor: 'var(--orange)' } : undefined}
        >
          {Icon && (
            <Icon
              className="w-5 h-5 flex-shrink-0"
              style={{ color: isActive ? 'var(--orange)' : 'var(--text-secondary)' }}
            />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold block text-navy">
              {item.label}
            </span>
            {extra && (
              <span className="text-xs text-text-muted">{extra}</span>
            )}
          </div>
          <ChevronRight
            className="w-4 h-4 flex-shrink-0"
            style={{ color: isActive ? 'var(--orange)' : '#9ca3af' }}
          />
        </button>
        {item.children && item.children.length > 0 && (
          <div className="ml-[22px] border-l border-ds-border pl-3 space-y-0.5">
            {item.children.map(renderSubItem)}
          </div>
        )}
      </div>
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

          {/* ─── The Search (Essentials / Interview Plan / Intake Brief) ─── */}
          <IntakePanel searchId={searchId} search={search} />

        </div>
      </div>
    </div>
  )
}
