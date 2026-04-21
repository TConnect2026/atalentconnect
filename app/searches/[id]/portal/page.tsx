"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Search, Stage, Candidate, Interview, Document } from "@/types"
import { PortalView } from "@/components/portal/portal-view"
import { Eye } from "lucide-react"
import { SearchContextBar } from "@/components/layout/search-context-bar"

type LeadRecruiter = { first_name?: string; last_name?: string; email?: string } | null

export default function RecruiterPortalPreview() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const searchId = params.id as string

  const [search, setSearch] = useState<Search | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [leadRecruiter, setLeadRecruiter] = useState<LeadRecruiter>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
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

      const [stagesRes, candidatesRes, interviewsRes, documentsRes, leadRes] =
        await Promise.all([
          supabase
            .from("stages")
            .select("*")
            .eq("search_id", searchData.id)
            .gte("stage_order", 0)
            .order("stage_order", { ascending: true }),
          supabase
            .from("candidates")
            .select("*")
            .eq("search_id", searchData.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("interviews")
            .select(
              `*, interviewers:interview_interviewers(id, contact_id, contact_name, contact_email)`
            )
            .eq("search_id", searchData.id)
            .order("scheduled_at", { ascending: true }),
          supabase
            .from("documents")
            .select("*")
            .eq("search_id", searchData.id)
            .order("created_at", { ascending: false }),
          searchData.lead_recruiter_id
            ? supabase
                .from("profiles")
                .select("first_name, last_name, email")
                .eq("id", searchData.lead_recruiter_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ])

      if (stagesRes.error) throw stagesRes.error
      if (candidatesRes.error) throw candidatesRes.error
      if (interviewsRes.error) throw interviewsRes.error
      if (documentsRes.error) throw documentsRes.error

      setStages(stagesRes.data || [])
      setCandidates(candidatesRes.data || [])
      setInterviews(interviewsRes.data || [])
      setDocuments(documentsRes.data || [])
      setLeadRecruiter(leadRes.data ?? null)
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

  const leadRecruiterName = leadRecruiter
    ? [leadRecruiter.first_name, leadRecruiter.last_name].filter(Boolean).join(" ") || null
    : null
  const leadRecruiterEmail = leadRecruiter?.email || null

  const reviewerName =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
      : "Preview"
  const reviewerEmail = profile?.email || user?.email || ""

  return (
    <>
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

      <div className="bg-orange text-white py-2 px-6">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-semibold">Client Portal Preview</span>
          <span className="text-white/70 text-xs hidden sm:inline">
            — Viewing as the client would see it
          </span>
        </div>
      </div>

      <PortalView
        search={search}
        stages={stages}
        candidates={candidates}
        interviews={interviews}
        documents={documents}
        leadRecruiterName={leadRecruiterName}
        leadRecruiterEmail={leadRecruiterEmail}
        reviewerName={reviewerName}
        reviewerEmail={reviewerEmail}
        canEditCover
        onSearchUpdated={loadSearchData}
      />
    </>
  )
}
