"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Stage, Candidate, Document, Contact, Interview } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddCandidateDialog } from "@/components/searches/add-candidate-dialog"
import { AddContactDialog } from "@/components/searches/add-contact-dialog"
import { AddStageDialog } from "@/components/searches/add-stage-dialog"
import { ClientPortalShareDialog } from "@/components/searches/client-portal-share-dialog"
import { EditCompanyDetailsDialog } from "@/components/searches/edit-company-details-dialog"
import { CandidatePanel } from "@/components/candidates/candidate-panel"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Globe } from "lucide-react"

interface SearchViewProps {
  search: Search
  stages: Stage[]
  candidates: Candidate[]
  documents?: Document[]
  contacts?: Contact[]
  isClientView?: boolean
  accessLevel?: 'full_access' | 'limited_access'
  clientEmail?: string
  clientName?: string
  onDataReload?: () => void
}

export function SearchView({
  search,
  stages,
  candidates,
  documents = [],
  contacts = [],
  isClientView = false,
  accessLevel = 'full_access',
  clientEmail,
  clientName,
  onDataReload
}: SearchViewProps) {
  const router = useRouter()
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddStage, setShowAddStage] = useState(false)
  const [showClientPortalShare, setShowClientPortalShare] = useState(false)
  const [showDetails, setShowDetails] = useState(() => {
    // Check localStorage to see if Project Details should be open
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`showDetails_${search.id}`)
      return saved === 'true'
    }
    return false
  })
  const [showDeclinedWithdrew, setShowDeclinedWithdrew] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [showEditCompanyDetails, setShowEditCompanyDetails] = useState(false)
  const [contactStages, setContactStages] = useState<Array<{stage_id: string, contact_id: string}>>([])
  const [showAssignParticipant, setShowAssignParticipant] = useState<string | null>(null)
  const [showStatusChange, setShowStatusChange] = useState(false)
  const [newStatus, setNewStatus] = useState(search.status)
  const [filledDate, setFilledDate] = useState(search.filled_date || '')

  useEffect(() => {
    loadInterviews()
    loadContactStages()
  }, [search.id, candidates])

  const loadContactStages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_stages')
        .select('stage_id, contact_id')
        .in('stage_id', stages.map(s => s.id))

      if (error) throw error
      setContactStages(data || [])
    } catch (err) {
      console.error('Error loading contact stages:', err)
    }
  }

  const loadInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          interviewers:interview_interviewers(
            id,
            contact_id,
            contact_name,
            contact_email
          )
        `)
        .eq('search_id', search.id)
        .order('scheduled_at', { ascending: true })

      if (error) throw error
      setInterviews(data || [])
      console.log('Loaded interviews for search view:', data?.length || 0)
    } catch (err) {
      console.error('Error loading interviews:', err)
    }
  }

  const getCandidatesByStage = (stageId: string) => {
    return candidates.filter(c => c.stage_id === stageId)
  }

  const getActiveCandidates = () => {
    return candidates.filter(c => !c.status || c.status === 'active')
  }

  const getDeclinedWithdrewCandidates = () => {
    return candidates.filter(c => c.status === 'declined' || c.status === 'withdrew')
  }

  const getInterviewsForCandidateInStage = (candidateId: string, stageId: string, stageIndex: number) => {
    // Get all interviews for this candidate
    const candidateInterviews = interviews.filter(i => i.candidate_id === candidateId)
    const candidate = candidates.find(c => c.id === candidateId)

    // Debug logging
    if (candidateInterviews.length > 0) {
      console.log('Interview display check:', {
        candidateName: `${candidate?.first_name} ${candidate?.last_name}`,
        candidateStageId: candidate?.stage_id,
        checkingStageId: stageId,
        stageIndex,
        interviewCount: candidateInterviews.length,
        matches: candidate?.stage_id === stageId
      })
    }

    // Show all interviews in the candidate's current stage column
    if (candidate?.stage_id === stageId && candidateInterviews.length > 0) {
      return candidateInterviews
    }

    // If candidate has no stage_id, show all interviews in first stage as default
    if (!candidate?.stage_id && stageIndex === 0 && candidateInterviews.length > 0) {
      return candidateInterviews
    }

    return []
  }

  const getInterviewerNames = (interview: Interview) => {
    if (interview.interviewers && interview.interviewers.length > 0) {
      return interview.interviewers.map(i => i.contact_name).join(', ')
    }
    return interview.interviewer_name
  }

  const formatInterviewsForCell = (candidateInterviews: Interview[]) => {
    if (candidateInterviews.length === 0) return null

    return candidateInterviews.map((interview, idx) => {
      const date = new Date(interview.scheduled_at)
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`

      return (
        <div key={interview.id} className={idx > 0 ? 'mt-1' : ''}>
          <p className="text-xs font-medium text-text-primary">{getInterviewerNames(interview)}</p>
          <p className="text-xs text-text-secondary">{formattedDate}</p>
        </div>
      )
    })
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      job_description: 'Job Description',
      interview_guide: 'Interview Guide',
      finalist_playbook: 'Finalist Playbook',
      intake_form: 'Intake Form',
      other: 'Other'
    }
    return labels[type] || type
  }

  const handleDocumentDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCandidateClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setIsPanelOpen(true)
  }

  const handlePanelClose = () => {
    setIsPanelOpen(false)
  }

  const handleDocumentUpload = async (file: File, type: string) => {
    setIsUploading(true)
    try {
      console.log('Starting upload for:', file.name, 'type:', type)

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${search.id}/${type}_${Date.now()}.${fileExt}`

      console.log('Uploading to storage with path:', fileName)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw uploadError
      }

      console.log('Upload successful, getting public URL')
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      console.log('Public URL:', publicUrl)
      console.log('Inserting document record to database')

      // Save document record to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          search_id: search.id,
          name: file.name,
          type: type,
          file_url: publicUrl,
          uploaded_by: 'System' // Default uploader name
        })

      if (dbError) {
        console.error('Database insert error:', dbError)
        throw dbError
      }

      console.log('Document uploaded successfully!')
      alert('Document uploaded successfully!')
      onDataReload?.()
    } catch (err) {
      console.error('Error uploading document:', err)
      alert(`Failed to upload document: ${err instanceof Error ? err.message : JSON.stringify(err)}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleStatusChange = async () => {
    try {
      const updateData: any = { status: newStatus }

      // If marking as filled, require filled_date
      if (newStatus === 'filled') {
        if (!filledDate) {
          alert('Please select a filled date')
          return
        }
        updateData.filled_date = filledDate
      } else {
        // Clear filled_date if not filled
        updateData.filled_date = null
      }

      const { error } = await supabase
        .from('searches')
        .update(updateData)
        .eq('id', search.id)

      if (error) throw error

      alert('Status updated successfully!')
      setShowStatusChange(false)
      onDataReload?.()
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-600 text-white border-green-600"
      case "filled":
        return "bg-navy text-white border-navy"
      case "paused":
        return "bg-yellow-600 text-white border-yellow-600"
      default:
        return "bg-text-secondary text-white border-text-secondary"
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl">
        {/* Header - Sticky */}
        <div className="sticky top-[89px] sm:top-[105px] bg-bg-section z-20 mb-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1 w-full">
              {!isClientView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/searches')}
                  className="mb-3 sm:mb-4 -ml-2 touch-manipulation min-h-[44px] text-foreground hover:text-foreground/80"
                >
                  ← Back to Projects
                </Button>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">{search.position_title}</h1>
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                {search.client_logo_url && (
                  <img
                    src={search.client_logo_url}
                    alt={`${search.company_name} logo`}
                    className="h-10 w-auto object-contain"
                  />
                )}
                <p className="text-lg sm:text-xl text-text-primary font-bold">{search.company_name}</p>
              </div>

              {!isClientView && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowClientPortalShare(true)}
                    className="px-6 py-3 text-lg font-bold rounded-md shadow-sm transition-all hover:shadow-md hover:scale-[1.02] border-2 relative overflow-hidden touch-manipulation"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0d9488',
                      borderColor: '#1e293b'
                    }}
                  >
                    {/* Background chain link icon */}
                    <svg
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-16 h-16 opacity-10"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="2" y="10" width="6" height="4" rx="2" stroke="#9ca3af" strokeWidth="2" fill="none" />
                      <rect x="16" y="10" width="6" height="4" rx="2" stroke="#9ca3af" strokeWidth="2" fill="none" />
                      <line x1="8" y1="12" x2="16" y2="12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="relative z-10 inline-flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Client Portal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Active Pipeline - The main focus */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Active Pipeline</h2>

            {getActiveCandidates().length === 0 ? (
            <Card style={{ border: '2px solid #1e3a5f' }}>
              <CardContent className="py-12 text-center">
                <p className="text-text-muted mb-4">No candidates yet</p>
                {!isClientView && (
                  <Button
                    onClick={() => setShowAddCandidate(true)}
                    size="sm"
                    className="touch-manipulation min-h-[44px] bg-[#0891B2] text-white hover:bg-[#DC2626] font-semibold"
                  >
                    + Add Candidate
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card style={{ border: '2px solid #1e3a5f' }}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-bg-section border-b border-ds-border">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary sticky left-0 bg-bg-section min-w-[200px]">
                        Candidate
                      </th>
                      {stages.map((stage) => (
                        <th key={stage.id} className="px-4 py-3 text-left text-sm font-semibold text-text-primary min-w-[150px]">
                          {stage.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getActiveCandidates().map((candidate, idx) => (
                      <tr
                        key={candidate.id}
                        className={`border-b border-ds-border hover:bg-bg-section cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-bg-section/50'}`}
                        onClick={() => handleCandidateClick(candidate)}
                      >
                        <td className="px-4 py-3 sticky left-0 bg-inherit">
                          <div>
                            <p className="font-semibold text-text-primary text-sm">
                              {candidate.first_name} {candidate.last_name}
                            </p>
                          </div>
                        </td>
                        {stages.map((stage, stageIndex) => {
                          const candidateInterviews = getInterviewsForCandidateInStage(candidate.id, stage.id, stageIndex)
                          const hasInterviews = candidateInterviews.length > 0

                          return (
                            <td key={stage.id} className="px-3 py-3 text-left align-top">
                              {hasInterviews ? (
                                <div className="text-left">
                                  {formatInterviewsForCell(candidateInterviews)}
                                </div>
                              ) : (
                                <div className="text-center text-text-muted text-xs">
                                  -
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isClientView && (
                <div className="p-4 border-t border-ds-border flex justify-center">
                  <Button
                    onClick={() => setShowAddCandidate(true)}
                    size="sm"
                    className="touch-manipulation min-h-[44px] bg-[#0891B2] text-white hover:bg-[#DC2626] font-semibold"
                  >
                    + Add Candidate
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Declined / Withdrew Section - Only for recruiters */}
          {!isClientView && getDeclinedWithdrewCandidates().length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowDeclinedWithdrew(!showDeclinedWithdrew)}
                className="w-full flex items-center justify-between p-4 bg-bg-section rounded-lg hover:bg-bg-page transition-colors"
              >
                <h3 className="text-lg font-semibold text-text-primary">
                  Declined / Withdrew ({getDeclinedWithdrewCandidates().length})
                </h3>
                <span className="text-text-secondary text-xl">
                  {showDeclinedWithdrew ? '−' : '+'}
                </span>
              </button>

              {showDeclinedWithdrew && (
                <Card className="mt-3" style={{ border: '2px solid #1e3a5f' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-bg-section border-b border-ds-border">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                            Candidate
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                            Last Stage
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                            Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getDeclinedWithdrewCandidates().map((candidate, idx) => (
                          <tr
                            key={candidate.id}
                            className={`border-b border-ds-border hover:bg-bg-section cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-bg-section/50'}`}
                            onClick={() => handleCandidateClick(candidate)}
                          >
                            <td className="px-4 py-3">
                              <div className="opacity-60">
                                <p className="font-semibold text-text-primary text-sm">
                                  {candidate.first_name} {candidate.last_name}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-text-secondary">
                                {candidate.last_active_stage || stages.find(s => s.id === candidate.stage_id)?.name || '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                candidate.status === 'declined'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-bg-page text-text-primary'
                              }`}>
                                {candidate.status === 'declined' ? 'Declined' : 'Withdrew'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-text-secondary">
                                {candidate.decline_reason || '—'}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
          </div>
        )}
          </div>

          {/* At a Glance - Always visible */}
          <div className="mb-6 p-4 bg-white rounded-lg" style={{ border: '2px solid #1e3a5f' }}>
            <h3 className="text-lg font-bold text-text-primary mb-3">👁️ At a Glance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Official Title */}
              <div>
                <p className="text-xs font-semibold text-text-muted mb-1">Official Title</p>
                <p className="text-sm font-medium text-text-primary">{search.position_title}</p>
              </div>

              {/* Location */}
              {search.position_location && (
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Location</p>
                  <p className="text-sm font-medium text-text-primary">{search.position_location}</p>
                </div>
              )}

              {/* Reports To */}
              {search.reports_to && (
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Reports To</p>
                  <p className="text-sm font-medium text-text-primary">{search.reports_to}</p>
                </div>
              )}

              {/* Compensation */}
              {accessLevel === 'full_access' && search.compensation_range && (
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Compensation Range</p>
                  <p className="text-sm font-medium text-text-primary">{search.compensation_range}</p>
                </div>
              )}
            </div>
          </div>

          {/* Placeholder: Analytics / Funnel Data will go here */}
          {!isClientView && (
            <Card className="mb-6" style={{ border: '2px solid #1e3a5f' }}>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold text-text-primary mb-3">📊 Analytics & Funnel Data</h3>
                <p className="text-sm text-text-secondary">Conversion rates, stage velocity, time-to-hire metrics</p>
              </CardContent>
            </Card>
          )}
      </div>

    {/* Candidate Panel */}
    <CandidatePanel
      candidate={selectedCandidate}
      isOpen={isPanelOpen}
      onClose={handlePanelClose}
      readOnly={isClientView}
      accessLevel={accessLevel}
      clientEmail={clientEmail}
      clientName={clientName}
      searchId={search.id}
      onDataReload={onDataReload}
    />

    {/* Add Candidate Dialog - Only for recruiters */}
    {!isClientView && (
      <AddCandidateDialog
        searchId={search.id}
        stages={stages}
        open={showAddCandidate}
        onOpenChange={setShowAddCandidate}
        onSuccess={() => {
          setShowAddCandidate(false)
          onDataReload?.()
        }}
      />
    )}

    {/* Add/Edit Contact Dialog - Only for recruiters */}
    {!isClientView && (
      <AddContactDialog
        searchId={search.id}
        isOpen={showAddContact || !!editingContact}
        existingContact={editingContact}
        onClose={() => {
          setShowAddContact(false)
          setEditingContact(null)
        }}
        onSuccess={() => {
          onDataReload?.()
          setEditingContact(null)
        }}
      />
    )}

    {/* Add Stage Dialog - Only for recruiters */}
    {!isClientView && (
      <AddStageDialog
        searchId={search.id}
        currentStagesCount={stages.length}
        isOpen={showAddStage}
        onClose={() => setShowAddStage(false)}
        onSuccess={() => {
          onDataReload?.()
        }}
      />
    )}

    {/* Client Portal Share Dialog - Only for recruiters */}
    {!isClientView && (
      <ClientPortalShareDialog
        searchId={search.id}
        secureLink={search.secure_link || ''}
        isOpen={showClientPortalShare}
        onClose={() => setShowClientPortalShare(false)}
      />
    )}

    {/* Edit Company Details Dialog - Only for recruiters */}
    {!isClientView && (
      <EditCompanyDetailsDialog
        searchId={search.id}
        currentData={{
          company_name: search.company_name,
          company_location: (search as any).company_location,
          company_website: (search as any).company_website,
          company_linkedin: (search as any).company_linkedin,
          company_social_links: (search as any).company_social_links,
        }}
        isOpen={showEditCompanyDetails}
        onClose={() => setShowEditCompanyDetails(false)}
        onSuccess={() => {
          setShowEditCompanyDetails(false)
          onDataReload?.()
        }}
      />
    )}
    </div>
  )
}
