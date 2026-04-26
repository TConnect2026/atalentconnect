"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { PanelistCandidateView } from "@/components/panelist/panelist-candidate-view"

interface CandidateInfo {
  id: string
  first_name: string
  last_name: string
  current_title?: string
  current_company?: string
  resume_url?: string
  linkedin_url?: string
  email?: string
  phone?: string
  photo_url?: string
  interview_date?: string
  stage_name?: string
  interview_id?: string
}

export default function PanelistPortalPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [panelistName, setPanelistName] = useState('')
  const [panelistEmail, setPanelistEmail] = useState('')
  const [panelistId, setPanelistId] = useState('')
  const [searchId, setSearchId] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [candidates, setCandidates] = useState<CandidateInfo[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateInfo | null>(null)
  const [firmLogoUrl, setFirmLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  const checkSessionAndLoad = async () => {
    const sessionToken = localStorage.getItem('panelist_session')
    if (!sessionToken) {
      router.push('/')
      return
    }

    try {
      // Validate session
      const response = await fetch('/api/panelist/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      })

      const sessionData = await response.json()
      if (!sessionData.valid) {
        localStorage.removeItem('panelist_session')
        localStorage.removeItem('panelist_search_id')
        localStorage.removeItem('panelist_id')
        router.push('/')
        return
      }

      setPanelistName(sessionData.panelistName)
      setPanelistEmail(sessionData.email)
      setPanelistId(sessionData.panelistId)
      setSearchId(sessionData.searchId)

      // Load search info
      const { data: searchData } = await supabase
        .from('searches')
        .select('position_title, company_name, firm_id')
        .eq('id', sessionData.searchId)
        .single()

      if (searchData) {
        setSearchTitle(searchData.position_title)
        setCompanyName(searchData.company_name)

        // Load firm logo
        if (searchData.firm_id) {
          const { data: firmData } = await supabase
            .from('firms')
            .select('logo_url')
            .eq('id', searchData.firm_id)
            .single()
          if (firmData?.logo_url) setFirmLogoUrl(firmData.logo_url)
        }
      }

      // Load candidates assigned to this panelist via interviews
      // Find interviews where this panelist is an interviewer
      const { data: interviewerEntries } = await supabase
        .from('interview_interviewers')
        .select('interview_id, contact_id, contact_name, contact_email')
        .or(`contact_email.eq.${sessionData.email},contact_id.eq.${sessionData.panelistId}`)

      const interviewIds = (interviewerEntries || []).map(e => e.interview_id)

      if (interviewIds.length > 0) {
        // Get the interviews
        const { data: interviews } = await supabase
          .from('interviews')
          .select('id, candidate_id, scheduled_at, stage_id, stages(name)')
          .in('id', interviewIds)
          .eq('search_id', sessionData.searchId)

        if (interviews && interviews.length > 0) {
          const candidateIds = [...new Set(interviews.map(i => i.candidate_id))]

          const { data: candidatesData } = await supabase
            .from('candidates')
            .select('id, first_name, last_name, current_title, current_company, resume_url, linkedin_url, email, phone, photo_url')
            .in('id', candidateIds)

          if (candidatesData) {
            const mapped: CandidateInfo[] = candidatesData.map(c => {
              const interview = interviews.find(i => i.candidate_id === c.id)
              return {
                ...c,
                interview_date: interview?.scheduled_at,
                stage_name: (interview?.stages as unknown as { name: string } | null)?.name,
                interview_id: interview?.id,
              }
            })
            setCandidates(mapped)
            if (mapped.length === 1) {
              setSelectedCandidate(mapped[0])
            }
          }
        }
      }

      // Also check direct panelist_id matches in stages' interviewer_ids
      if (interviewIds.length === 0) {
        const { data: stagesWithPanelist } = await supabase
          .from('stages')
          .select('id, name')
          .eq('search_id', sessionData.searchId)
          .contains('interviewer_ids', [sessionData.panelistId])

        if (stagesWithPanelist && stagesWithPanelist.length > 0) {
          const stageIds = stagesWithPanelist.map(s => s.id)
          const { data: candidatesInStages } = await supabase
            .from('candidates')
            .select('id, first_name, last_name, current_title, current_company, resume_url, linkedin_url, email, phone, photo_url, stage_id')
            .eq('search_id', sessionData.searchId)
            .in('stage_id', stageIds)

          if (candidatesInStages && candidatesInStages.length > 0) {
            const mapped: CandidateInfo[] = candidatesInStages.map(c => {
              const stage = stagesWithPanelist.find(s => s.id === c.stage_id)
              return {
                ...c,
                stage_name: stage?.name,
              }
            })
            setCandidates(mapped)
            if (mapped.length === 1) {
              setSelectedCandidate(mapped[0])
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading panelist portal:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('panelist_session')
    localStorage.removeItem('panelist_search_id')
    localStorage.removeItem('panelist_id')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary">Loading your portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="bg-white border-b border-ds-border sticky top-0 z-30">
        <div className="container mx-auto px-6 sm:px-8 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {firmLogoUrl && (
                <img src={firmLogoUrl} alt="Firm logo" className="h-10 w-auto object-contain" />
              )}
              <div className={firmLogoUrl ? "border-l pl-4" : ""}>
                <p className="text-lg font-bold text-navy">{searchTitle}</p>
                <p className="text-sm text-text-secondary">{companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">Welcome, {panelistName}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium border border-ds-border rounded-md hover:bg-bg-section text-text-primary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 sm:px-8 py-6 max-w-7xl">
        {selectedCandidate ? (
          <div>
            {candidates.length > 1 && (
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-sm text-navy hover:underline mb-4 flex items-center gap-1"
              >
                &larr; Back to candidates
              </button>
            )}
            <PanelistCandidateView
              candidate={selectedCandidate}
              searchId={searchId}
              panelistId={panelistId}
              panelistName={panelistName}
              panelistEmail={panelistEmail}
              positionTitle={searchTitle}
              companyName={companyName}
            />
          </div>
        ) : candidates.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold text-navy mb-4">Your Assigned Candidates</h2>
            <div className="space-y-3">
              {candidates.map(candidate => (
                <button
                  key={candidate.id}
                  onClick={() => setSelectedCandidate(candidate)}
                  className="w-full text-left p-4 bg-white border border-ds-border rounded-lg hover:bg-bg-section transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-navy">
                        {candidate.first_name} {candidate.last_name}
                      </p>
                      {(candidate.current_title || candidate.current_company) && (
                        <p className="text-sm text-text-secondary mt-0.5">
                          {candidate.current_title}
                          {candidate.current_title && candidate.current_company && ' at '}
                          {candidate.current_company}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {candidate.stage_name && (
                        <span className="text-xs px-2 py-1 rounded bg-navy/10 text-navy font-medium">
                          {candidate.stage_name}
                        </span>
                      )}
                      {candidate.interview_date && (
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(candidate.interview_date).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-text-secondary">No candidates have been assigned to you yet.</p>
            <p className="text-sm text-text-muted mt-2">Check back later or contact your recruiter.</p>
          </div>
        )}
      </div>
    </div>
  )
}
