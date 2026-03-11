"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Search, Stage, Candidate, Interview, Document, Contact } from "@/types"
import { ClientDashboard } from "@/components/client/client-dashboard"
import { Handshake, LogOut, FileText, BookOpen, ExternalLink, MapPin } from "lucide-react"

export default function ClientPortal() {
  const params = useParams()
  const router = useRouter()
  const secureLink = params.secureLink as string

  const [search, setSearch] = useState<Search | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [clientEmail, setClientEmail] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string>("")
  const [accessLevel, setAccessLevel] = useState<'full_access' | 'limited_access'>('full_access')
  const [firmLogoUrl, setFirmLogoUrl] = useState<string | null>(null)
  const [firmName, setFirmName] = useState<string>("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showSplash, setShowSplash] = useState(false)
  const [splashFading, setSplashFading] = useState(false)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [secureLink])

  const checkAuthAndLoadData = async () => {
    // Dev bypass
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
      setClientEmail('dev@test.com')
      setClientName('Dev User')
      setAccessLevel('full_access')
      loadSearchData()
      return
    }

    const sessionToken = localStorage.getItem(`client_session_${secureLink}`)

    if (!sessionToken) {
      router.push(`/client/${secureLink}`)
      return
    }

    const response = await fetch('/api/client/check-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, secureLink })
    })

    const data = await response.json()

    if (!data.valid) {
      localStorage.removeItem(`client_session_${secureLink}`)
      router.push(`/client/${secureLink}`)
      return
    }

    setClientEmail(data.email)
    setAccessLevel(data.accessLevel || 'full_access')
    loadClientName(data.email)
    loadSearchData()
  }

  const loadClientName = async (email: string) => {
    try {
      const { data: searchData } = await supabase
        .from("searches")
        .select("id")
        .eq("secure_link", secureLink)
        .single()

      if (!searchData) return

      const { data: contactData } = await supabase
        .from("contacts")
        .select("name")
        .eq("email", email)
        .eq("search_id", searchData.id)
        .single()

      if (contactData) {
        setClientName(contactData.name)
      }
    } catch (err) {
      console.error("Error loading client name:", err)
    }
  }

  const loadSearchData = async () => {
    setIsLoading(true)
    try {
      const { data: searchData, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("secure_link", secureLink)
        .single()

      if (searchError) throw searchError
      setSearch(searchData)

      // Load firm logo and name
      if (searchData?.firm_id) {
        const { data: firmData } = await supabase
          .from('firms')
          .select('logo_url, name')
          .eq('id', searchData.firm_id)
          .single()
        if (firmData?.logo_url) setFirmLogoUrl(firmData.logo_url)
        if (firmData?.name) setFirmName(firmData.name)
      }

      // Load stages — only client-visible, exclude negative order (Prospect)
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchData.id)
        .gte("stage_order", 0)
        .order("stage_order", { ascending: true })

      if (stagesError) throw stagesError
      setStages(stagesData || [])

      // Load candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("search_id", searchData.id)
        .order("created_at", { ascending: true })

      if (candidatesError) throw candidatesError
      setCandidates(candidatesData || [])

      // Load interviews with interviewers
      const { data: interviewsData, error: interviewsError } = await supabase
        .from("interviews")
        .select(`
          *,
          interviewers:interview_interviewers(
            id,
            contact_id,
            contact_name,
            contact_email
          )
        `)
        .eq("search_id", searchData.id)
        .order("scheduled_at", { ascending: true })

      if (interviewsError) throw interviewsError
      setInterviews(interviewsData || [])

      // Load documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("search_id", searchData.id)
        .order("created_at", { ascending: false })

      if (documentsError) throw documentsError
      setDocuments(documentsData || [])

      // Load contacts
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("search_id", searchData.id)
        .order("is_primary", { ascending: false })
      if (contactsData) setContacts(contactsData as Contact[])
    } catch (err) {
      console.error("Error loading search:", err)
    } finally {
      setIsLoading(false)
      // Show welcome splash once per session
      const splashKey = `client_splash_shown_${secureLink}`
      if (!sessionStorage.getItem(splashKey)) {
        sessionStorage.setItem(splashKey, 'true')
        setShowSplash(true)
        setTimeout(() => setSplashFading(true), 3000)
        setTimeout(() => setShowSplash(false), 3500)
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(`client_session_${secureLink}`)
    router.push(`/client/${secureLink}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <p className="text-text-muted">Search not found</p>
      </div>
    )
  }

  // Get first name for splash greeting
  const firstName = clientName ? clientName.split(' ')[0] : 'there'

  // Document lists for resources bar — only portal-visible documents
  const portalDocs = documents.filter(doc => doc.visible_to_portal)
  const positionSpec = search.position_spec_status === 'approved'
    ? portalDocs.find(doc => doc.type === 'position_spec' || doc.type === 'job_description')
    : null
  const interviewGuides = portalDocs.filter(doc => doc.type === 'interview_guide')
  const otherDocs = portalDocs.filter(doc =>
    doc.type !== 'position_spec' && doc.type !== 'job_description' && doc.type !== 'interview_guide'
  )
  const hasResources = !!(positionSpec || interviewGuides.length > 0 || otherDocs.length > 0)
  const showPositionDetails = search.portal_show_position_details ?? true

  return (
    <>
      {/* ===== WELCOME SPLASH ===== */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
            splashFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Dual logos with handshake */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 mb-6 sm:mb-10">
            {/* Client company logo */}
            {search.client_logo_url ? (
              <img
                src={search.client_logo_url}
                alt={search.company_name}
                className="h-12 sm:h-16 max-w-[140px] sm:max-w-[180px] object-contain"
              />
            ) : (
              <span className="text-2xl font-bold text-navy">{search.company_name}</span>
            )}

            {/* Handshake icon */}
            <div className="w-14 h-14 rounded-full bg-orange/10 flex items-center justify-center">
              <Handshake className="w-7 h-7 text-orange" />
            </div>

            {/* Firm logo */}
            {firmLogoUrl ? (
              <img
                src={firmLogoUrl}
                alt={firmName || 'Recruiting Firm'}
                className="h-12 sm:h-16 max-w-[140px] sm:max-w-[180px] object-contain"
              />
            ) : firmName ? (
              <span className="text-2xl font-bold text-navy">{firmName}</span>
            ) : null}
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-navy">
            Hi {firstName}
          </h1>
          <p className="text-lg text-text-secondary mt-3">Let&apos;s find your next hire.</p>
        </div>
      )}

      {/* ===== HEADER — branded logo bar ===== */}
      <header className="bg-white sticky top-0 z-30 border-b border-ds-border">
        <div className="px-4 sm:px-10 py-3 sm:py-4 flex items-center justify-between">
          {/* Client logo — large, left */}
          <div className="flex-shrink-0">
            {search.client_logo_url ? (
              <img
                src={search.client_logo_url}
                alt={search.company_name}
                className="h-12 max-w-[220px] object-contain"
              />
            ) : (
              <span className="text-2xl font-bold text-navy">{search.company_name}</span>
            )}
          </div>

          {/* Right side — client info, logout, firm logo */}
          <div className="flex items-center gap-2 sm:gap-5 flex-shrink-0">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-navy">{clientName}</p>
              <p className="text-[11px] text-text-muted">{clientEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[44px] text-xs font-semibold text-navy border-2 border-gray-400 rounded-md hover:border-navy hover:bg-bg-section transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
            {firmLogoUrl ? (
              <img
                src={firmLogoUrl}
                alt={firmName || 'Firm'}
                className="h-10 max-w-[160px] object-contain"
              />
            ) : firmName ? (
              <span className="text-sm font-bold text-text-secondary">{firmName}</span>
            ) : null}
          </div>
        </div>
      </header>

      {/* ===== PAGE TITLE + INFO + RESOURCES ===== */}
      <div className="bg-white border-b border-ds-border">
        <div className="px-4 sm:px-10 py-4 sm:py-5">
          {/* Page title */}
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Your Candidate Slate</h1>

          {/* Compact info bar */}
          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm text-text-secondary">
            <span className="font-semibold text-navy">{search.position_title}</span>
            {showPositionDetails && search.reports_to && (
              <>
                <span className="hidden sm:inline text-ds-border select-none">|</span>
                <span>
                  <span className="font-semibold text-navy">Reports To:</span> {search.reports_to}
                </span>
              </>
            )}
            {showPositionDetails && search.position_location && (
              <>
                <span className="hidden sm:inline text-ds-border select-none">|</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {search.position_location}
                </span>
              </>
            )}
          </div>

          {/* Resources bar */}
          {hasResources && (
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-x-4 gap-y-1 mt-3 text-xs sm:text-sm">
              {positionSpec && (
                <a
                  href={positionSpec.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-navy hover:text-orange transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Position Spec
                  <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                </a>
              )}
              {interviewGuides.map(guide => (
                <a
                  key={guide.id}
                  href={guide.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-navy hover:text-orange transition-colors font-medium"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {guide.name || 'Interview Guide'}
                  <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                </a>
              ))}
              {otherDocs.map(doc => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-navy hover:text-orange transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {doc.name}
                  <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== MAIN DASHBOARD ===== */}
      <ClientDashboard
        search={search}
        stages={stages}
        candidates={candidates}
        interviews={interviews}
        documents={documents}
        accessLevel={accessLevel}
        clientEmail={clientEmail || ''}
        clientName={clientName}
        contacts={contacts}
        portalShowPositionDetails={search.portal_show_position_details ?? true}
        portalShowContacts={search.portal_show_contacts ?? false}
        portalShowInterviewPlan={search.portal_show_interview_plan ?? true}
        portalShowNotes={search.portal_show_notes ?? false}
        hideContextBar
      />
    </>
  )
}
