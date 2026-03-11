"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Search, Stage, Candidate, Interview, Document, Contact } from "@/types"
import { ClientDashboard } from "@/components/client/client-dashboard"
import { Eye } from "lucide-react"
import { SearchContextBar } from "@/components/layout/search-context-bar"

export default function RecruiterPortalPreview() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const searchId = params.id as string

  const [search, setSearch] = useState<Search | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadSearchData()
  }, [searchId, user])

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

      // Load stages — filter to only client-visible, exclude Prospect
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
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading portal preview...</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Search not found</p>
      </div>
    )
  }

  return (
    <>
      {/* ===== CONTEXT BAR ===== */}
      <SearchContextBar
        searchId={searchId}
        companyName={search.company_name}
        positionTitle={search.position_title}
        clientLogoUrl={search.client_logo_url}
        launchDate={search.launch_date}
        targetFillDate={search.target_fill_date}
        status={search.status}
        activePage="client-portal"
        onDatesUpdated={loadSearchData}
      />

      {/* Preview Banner */}
      <div className="bg-orange text-white py-2 px-6">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-semibold">Client Portal Preview</span>
          <span className="text-white/70 text-xs hidden sm:inline">— Viewing as the client would see it</span>
        </div>
      </div>

      {/* Main Client Dashboard — same component the client sees */}
      <ClientDashboard
        search={search}
        stages={stages}
        candidates={candidates}
        interviews={interviews}
        documents={documents}
        accessLevel="full_access"
        clientEmail=""
        clientName="Preview"
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
