"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Search, Stage, Candidate, Interview, Document } from "@/types"
import { SearchView } from "@/components/searches/search-view"
import { ClientDashboard } from "@/components/client/client-dashboard"
import { Button } from "@/components/ui/button"

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

  useEffect(() => {
    checkAuthAndLoadData()
  }, [secureLink])

  const checkAuthAndLoadData = async () => {
    // Check if user has a valid session
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
      // Session invalid, redirect to login
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
      // Load contact info to get full name
      const { data: contactData, error } = await supabase
        .from("contacts")
        .select("name")
        .eq("email", email)
        .eq("search_id", (await supabase.from("searches").select("id").eq("secure_link", secureLink).single()).data?.id)
        .single()

      if (!error && contactData) {
        setClientName(contactData.name)
      }
    } catch (err) {
      console.error("Error loading client name:", err)
    }
  }

  const loadSearchData = async () => {
    setIsLoading(true)
    try {
      // Load search details
      const { data: searchData, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("secure_link", secureLink)
        .single()

      if (searchError) throw searchError
      setSearch(searchData)

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchData.id)
        .order("order", { ascending: true })

      if (stagesError) throw stagesError

      // Filter to only visible stages (or all stages if field doesn't exist yet)
      const filteredStages = (stagesData || []).filter(
        stage => stage.visible_in_client_portal !== false
      )
      setStages(filteredStages)

      // Load all active candidates (including sourcing stage)
      // They'll be displayed based on their interview activity
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("search_id", searchData.id)
        .order("order", { ascending: true })

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
    } catch (err) {
      console.error("Error loading search:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(`client_session_${secureLink}`)
    router.push(`/client/${secureLink}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading your project...</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <>
      {/* Client Header */}
      <header className="bg-card border-b border-border/30 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-6">
              {/* Client Logo */}
              {search.client_logo_url && (
                <img
                  src={search.client_logo_url}
                  alt={`${search.company_name} logo`}
                  className="h-12 w-auto object-contain max-w-[160px]"
                />
              )}

              {/* Search Title and Welcome */}
              <div className={search.client_logo_url ? "border-l pl-6" : ""}>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {search.position_title}
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-700 mt-0.5">
                  {search.company_name}
                </p>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Welcome, {clientName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
              <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline">{clientEmail}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="min-h-[44px] touch-manipulation bg-white text-[#1a3a52] border-gray-300 hover:bg-gray-50"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Client Dashboard */}
      <ClientDashboard
        search={search}
        stages={stages}
        candidates={candidates}
        interviews={interviews}
        documents={documents}
        accessLevel={accessLevel}
        clientEmail={clientEmail || ''}
        clientName={clientName}
      />
    </>
  )
}
