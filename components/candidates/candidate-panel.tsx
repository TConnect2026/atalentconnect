"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Candidate, InterviewNote, Scorecard, Interview, InterviewFeedback } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog"

interface CandidatePanelProps {
  candidate: Candidate | null
  isOpen: boolean
  onClose: () => void
  readOnly?: boolean
  accessLevel?: 'full_access' | 'limited_access'
  clientEmail?: string
  clientName?: string
  searchId?: string
  onDataReload?: () => void
}

export function CandidatePanel({
  candidate,
  isOpen,
  onClose,
  readOnly = false,
  accessLevel = 'full_access',
  clientEmail,
  clientName,
  searchId,
  onDataReload
}: CandidatePanelProps) {
  const [notes, setNotes] = useState<InterviewNote[]>([])
  const [scorecards, setScorecards] = useState<Scorecard[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [feedbackMap, setFeedbackMap] = useState<Record<string, InterviewFeedback[]>>({})
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null)
  const [stages, setStages] = useState<any[]>([])
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState<string>('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [recruiterNotes, setRecruiterNotes] = useState<string>('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [candidateLinks, setCandidateLinks] = useState<any[]>([])
  const [newLink, setNewLink] = useState({ label: '', url: '', type: 'other' })
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [showInlineFeedbackFor, setShowInlineFeedbackFor] = useState<string | null>(null)
  const [inlineFeedback, setInlineFeedback] = useState({ recommendation: '', interview_notes: '', strengths: '', concerns: '' })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [removeReason, setRemoveReason] = useState<string>('')
  const [removeReasonType, setRemoveReasonType] = useState<string>('declined_by_client')
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [recruiterFiles, setRecruiterFiles] = useState<any[]>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [newFileLink, setNewFileLink] = useState({ name: '', url: '', type: 'link' })
  const [showAddLinkForm, setShowAddLinkForm] = useState(false)
  const [isUploadingGuide, setIsUploadingGuide] = useState<string | null>(null)
  const [shareRecruiterNotes, setShareRecruiterNotes] = useState(false)
  const [editableInfo, setEditableInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: ''
  })
  const [isSavingInfo, setIsSavingInfo] = useState(false)

  useEffect(() => {
    if (candidate?.id) {
      loadCandidateDetails()
      // Initialize all editable fields from candidate data
      setRecruiterNotes(candidate.recruiter_notes || '')
      setCandidateLinks(candidate.links || [])
      setRecruiterFiles(candidate.recruiter_files || [])
      setShareRecruiterNotes(candidate.share_recruiter_notes || false)
      setEditableInfo({
        first_name: candidate.first_name || '',
        last_name: candidate.last_name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        linkedin_url: candidate.linkedin_url || ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id])

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return
    }

    try {
      // Delete interview interviewers first
      await supabase
        .from('interview_interviewers')
        .delete()
        .eq('interview_id', interviewId)

      // Delete the interview
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewId)

      if (error) throw error

      alert('Interview deleted successfully')
      loadCandidateDetails()
    } catch (err) {
      console.error('Error deleting interview:', err)
      alert('Failed to delete interview')
    }
  }

  const handleSendReminder = async (interviewId: string) => {
    try {
      const response = await fetch('/api/interviews/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Reminder sent successfully to ${data.interviewers.length} interviewer(s)`)
      } else {
        alert('Failed to send reminder: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error sending reminder:', err)
      alert('Failed to send reminder')
    }
  }

  const loadCandidateDetails = async () => {
    if (!candidate) return

    setIsLoading(true)
    try {
      // Load interview notes
      const { data: notesData, error: notesError } = await supabase
        .from("interview_notes")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })

      if (notesError) throw notesError
      setNotes(notesData || [])

      // Load scorecards
      const { data: scorecardsData, error: scorecardsError } = await supabase
        .from("scorecards")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })

      if (scorecardsError) throw scorecardsError
      setScorecards(scorecardsData || [])

      // Load stages for the search
      if (searchId) {
        const { data: stagesData, error: stagesError } = await supabase
          .from("stages")
          .select("*")
          .eq("search_id", searchId)
          .order("stage_order", { ascending: true })

        if (!stagesError && stagesData) {
          setStages(stagesData)
        }
      }

      // Load interviews with all interviewers
      const { data: interviewsData, error: interviewsError } = await supabase
        .from("interviews")
        .select(`
          *,
          interview_interviewers (
            id,
            interview_id,
            contact_id,
            contact_name,
            contact_email,
            created_at
          )
        `)
        .eq("candidate_id", candidate.id)
        .order("scheduled_at", { ascending: false })

      if (interviewsError) throw interviewsError

      // Map the data to include interviewers array
      const interviewsWithInterviewers = (interviewsData || []).map(interview => ({
        ...interview,
        interviewers: interview.interview_interviewers || []
      }))

      setInterviews(interviewsWithInterviewers as any)
      console.log('Loaded interviews for candidate:', {
        candidateId: candidate.id,
        candidateName: `${candidate.first_name} ${candidate.last_name}`,
        interviewCount: interviewsWithInterviewers.length,
        interviews: interviewsWithInterviewers
      })

      // Load feedback for all interviews (can be multiple per interview for panels)
      if (interviewsData && interviewsData.length > 0) {
        const interviewIds = interviewsData.map(i => i.id)
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("interview_feedback")
          .select("*")
          .in("interview_id", interviewIds)
          .order("submitted_at", { ascending: false })

        if (!feedbackError && feedbackData) {
          const feedbackByInterview: Record<string, InterviewFeedback[]> = {}
          feedbackData.forEach(feedback => {
            if (!feedbackByInterview[feedback.interview_id]) {
              feedbackByInterview[feedback.interview_id] = []
            }
            feedbackByInterview[feedback.interview_id].push(feedback)
          })
          setFeedbackMap(feedbackByInterview)
        }
      }
    } catch (err) {
      console.error("Error loading candidate details:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResumeUpload = async (file: File) => {
    if (!candidate) return

    setIsUploadingResume(true)
    setResumeError(null)

    try {
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a PDF, DOC, or DOCX file')
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${candidate.first_name}-${candidate.last_name}.${fileExt}`
      const filePath = `resumes/${candidate.search_id}/${fileName}`

      // Upload new resume
      const { error: uploadError } = await supabase.storage
        .from('candidateresumes')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('candidateresumes')
        .getPublicUrl(filePath)

      // Update candidate record
      const { error: updateError } = await supabase
        .from('candidates')
        .update({ resume_url: urlData.publicUrl })
        .eq('id', candidate.id)

      if (updateError) throw updateError

      // Reload candidate details
      loadCandidateDetails()
    } catch (err) {
      console.error('Error uploading resume:', err)
      setResumeError(err instanceof Error ? err.message : 'Failed to upload resume')
    } finally {
      setIsUploadingResume(false)
    }
  }

  const getResumeFileName = (url: string) => {
    const parts = url.split('/')
    const fileName = parts[parts.length - 1]
    // Decode the URL-encoded filename
    return decodeURIComponent(fileName)
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "strong_yes":
        return "bg-cyan-100 text-cyan-800 border-cyan-300"
      case "yes":
        return "bg-cyan-50 text-cyan-700 border-cyan-200"
      case "maybe":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "no":
        return "bg-red-50 text-red-700 border-red-200"
      case "strong_no":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-bg-section text-text-primary border-ds-border"
    }
  }

  const getRecommendationLabel = (recommendation: string) => {
    return recommendation.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getTimezoneAbbreviation = (timezone: string) => {
    const tzMap: Record<string, string> = {
      'America/New_York': 'ET',
      'America/Chicago': 'CT',
      'America/Denver': 'MT',
      'America/Los_Angeles': 'PT',
      'America/Phoenix': 'MT',
      'America/Anchorage': 'AKT',
      'Pacific/Honolulu': 'HT',
    }
    return tzMap[timezone] || timezone.split('/')[1]?.replace(/_/g, ' ') || timezone
  }

  const handleMarkAsDeclinedOrWithdrew = async (status: 'declined' | 'withdrew') => {
    if (!candidate || !searchId) return

    setIsUpdatingStatus(true)
    try {
      // Get current stage name to save as last_active_stage
      const { data: stageData } = await supabase
        .from('stages')
        .select('name')
        .eq('id', candidate.stage_id)
        .single()

      const lastActiveStage = stageData?.name || ''

      // Update candidate status
      const { error } = await supabase
        .from('candidates')
        .update({
          status,
          decline_reason: declineReason || null,
          last_active_stage: lastActiveStage
        })
        .eq('id', candidate.id)

      if (error) throw error

      // Reset form
      setDeclineReason('')

      // Reload data
      onDataReload?.()

      // Close panel
      onClose()
    } catch (err) {
      console.error('Error updating candidate status:', err)
      alert('Failed to update candidate status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleReactivate = async () => {
    if (!candidate) return

    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          status: 'active',
          decline_reason: null
        })
        .eq('id', candidate.id)

      if (error) throw error

      onDataReload?.()
      onClose()
    } catch (err) {
      console.error('Error reactivating candidate:', err)
      alert('Failed to reactivate candidate')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveRecruiterNotes = async () => {
    if (!candidate) return

    setIsSavingNotes(true)
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ recruiter_notes: recruiterNotes })
        .eq('id', candidate.id)

      if (error) throw error

      onDataReload?.()
    } catch (err) {
      console.error('Error saving recruiter notes:', err)
      alert('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleAddLink = async () => {
    if (!candidate || !newLink.label || !newLink.url) return

    setIsAddingLink(true)
    try {
      const linkWithId = {
        id: crypto.randomUUID(),
        ...newLink
      }

      const updatedLinks = [...candidateLinks, linkWithId]

      const { error } = await supabase
        .from('candidates')
        .update({ links: updatedLinks })
        .eq('id', candidate.id)

      if (error) throw error

      setCandidateLinks(updatedLinks)
      setNewLink({ label: '', url: '', type: 'other' })
      onDataReload?.()
    } catch (err) {
      console.error('Error adding link:', err)
      alert('Failed to add link')
    } finally {
      setIsAddingLink(false)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!candidate) return

    try {
      const updatedLinks = candidateLinks.filter(link => link.id !== linkId)

      const { error } = await supabase
        .from('candidates')
        .update({ links: updatedLinks })
        .eq('id', candidate.id)

      if (error) throw error

      setCandidateLinks(updatedLinks)
      onDataReload?.()
    } catch (err) {
      console.error('Error deleting link:', err)
      alert('Failed to delete link')
    }
  }

  const handleSubmitInlineFeedback = async (interviewId: string, interviewerEmail: string) => {
    if (!inlineFeedback.recommendation) {
      alert('Please select a recommendation')
      return
    }

    setIsSubmittingFeedback(true)
    try {
      const { error } = await supabase
        .from('interview_feedback')
        .insert({
          interview_id: interviewId,
          interviewer_name: clientName || '',
          interviewer_email: interviewerEmail,
          recommendation: inlineFeedback.recommendation,
          interview_notes: inlineFeedback.interview_notes || null,
          strengths: inlineFeedback.strengths || null,
          concerns: inlineFeedback.concerns || null,
          submitted_at: new Date().toISOString()
        })

      if (error) throw error

      // Reset form
      setInlineFeedback({ recommendation: '', interview_notes: '', strengths: '', concerns: '' })
      setShowInlineFeedbackFor(null)

      // Reload data
      loadCandidateDetails()
      onDataReload?.()
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Failed to submit feedback')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleRemoveFromPipeline = async () => {
    if (!candidate || !searchId) return

    setIsUpdatingStatus(true)
    try {
      // Get current stage name
      const { data: stageData } = await supabase
        .from('stages')
        .select('name')
        .eq('id', candidate.stage_id)
        .single()

      const lastActiveStage = stageData?.name || ''

      // Determine status based on reason type
      let status: 'declined' | 'withdrew' = 'declined'
      let reason = removeReason

      if (removeReasonType === 'declined_by_candidate') {
        status = 'withdrew'
      } else if (removeReasonType === 'declined_by_client') {
        reason = `Declined by client${removeReason ? `: ${removeReason}` : ''}`
      } else if (removeReasonType === 'position_filled') {
        reason = 'Position filled'
      } else if (removeReasonType === 'other') {
        reason = removeReason
      }

      // Update candidate
      const { error } = await supabase
        .from('candidates')
        .update({
          status,
          decline_reason: reason || null,
          last_active_stage: lastActiveStage
        })
        .eq('id', candidate.id)

      if (error) throw error

      // Reset
      setShowRemoveDialog(false)
      setRemoveReason('')
      setRemoveReasonType('declined_by_client')

      onDataReload?.()
      onClose()
    } catch (err) {
      console.error('Error removing from pipeline:', err)
      alert('Failed to remove from pipeline')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleRecruiterFileUpload = async (file: File) => {
    if (!candidate) return

    setIsUploadingFile(true)
    try {
      // Determine file type
      let fileType: 'document' | 'video' | 'audio' | 'other' = 'other'
      if (file.type.startsWith('video/')) {
        fileType = 'video'
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio'
      } else if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('document')) {
        fileType = 'document'
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `recruiter-files/${candidate.search_id}/${candidate.id}/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('recruiter-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('recruiter-files')
        .getPublicUrl(filePath)

      // Create file object
      const newFile = {
        id: crypto.randomUUID(),
        name: file.name,
        url: urlData.publicUrl,
        type: fileType,
        size: file.size,
        uploaded_at: new Date().toISOString()
      }

      const updatedFiles = [...recruiterFiles, newFile]

      // Update candidate record
      const { error: updateError } = await supabase
        .from('candidates')
        .update({ recruiter_files: updatedFiles })
        .eq('id', candidate.id)

      if (updateError) throw updateError

      setRecruiterFiles(updatedFiles)
      onDataReload?.()
    } catch (err) {
      console.error('Error uploading file:', err)
      alert('Failed to upload file')
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleAddFileLink = async () => {
    if (!candidate || !newFileLink.name || !newFileLink.url) return

    try {
      const newFile = {
        id: crypto.randomUUID(),
        name: newFileLink.name,
        url: newFileLink.url,
        type: newFileLink.type as any,
        uploaded_at: new Date().toISOString()
      }

      const updatedFiles = [...recruiterFiles, newFile]

      const { error } = await supabase
        .from('candidates')
        .update({ recruiter_files: updatedFiles })
        .eq('id', candidate.id)

      if (error) throw error

      setRecruiterFiles(updatedFiles)
      setNewFileLink({ name: '', url: '', type: 'link' })
      setShowAddLinkForm(false)
      onDataReload?.()
    } catch (err) {
      console.error('Error adding link:', err)
      alert('Failed to add link')
    }
  }

  const handleDeleteRecruiterFile = async (fileId: string) => {
    if (!candidate) return

    try {
      const updatedFiles = recruiterFiles.filter(f => f.id !== fileId)

      const { error } = await supabase
        .from('candidates')
        .update({ recruiter_files: updatedFiles })
        .eq('id', candidate.id)

      if (error) throw error

      setRecruiterFiles(updatedFiles)
      onDataReload?.()
    } catch (err) {
      console.error('Error deleting file:', err)
      alert('Failed to delete file')
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${mb.toFixed(1)} MB`
  }

  const handleInterviewGuideUpload = async (file: File, interviewId: string) => {
    if (!candidate) return

    try {
      setIsUploadingGuide(interviewId)

      // Upload to Supabase storage
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `interview-guides/${candidate.search_id}/${interviewId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('interview-guides')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('interview-guides')
        .getPublicUrl(filePath)

      // Update interview record with guide URL
      const { error: updateError } = await supabase
        .from('interviews')
        .update({ interview_guide_url: urlData.publicUrl })
        .eq('id', interviewId)

      if (updateError) throw updateError

      // Reload interview data
      await loadCandidateDetails()
    } catch (error) {
      console.error('Error uploading interview guide:', error)
      alert('Failed to upload interview guide')
    } finally {
      setIsUploadingGuide(null)
    }
  }

  const handleSendInterviewGuide = async (interviewId: string) => {
    // TODO: Implement sending interview guide to interviewer
    // This would typically:
    // 1. Get the interview guide URL (from interview or fallback to stage guide)
    // 2. Send email to interviewer(s) with the guide link
    // 3. Update interview status if needed
    alert('Send Interview Guide functionality coming soon!')
  }

  const handleToggleShareNotes = async () => {
    if (!candidate) return

    const newValue = !shareRecruiterNotes
    setShareRecruiterNotes(newValue)

    const { error } = await supabase
      .from('candidates')
      .update({ share_recruiter_notes: newValue })
      .eq('id', candidate.id)

    if (error) {
      console.error('Error updating share_recruiter_notes:', error)
      alert('Failed to update sharing preference')
      setShareRecruiterNotes(!newValue) // Revert on error
    }
  }

  const handleSaveCandidateInfo = async () => {
    if (!candidate) return

    try {
      setIsSavingInfo(true)

      const { error } = await supabase
        .from('candidates')
        .update({
          first_name: editableInfo.first_name,
          last_name: editableInfo.last_name,
          email: editableInfo.email,
          phone: editableInfo.phone || null,
          linkedin_url: editableInfo.linkedin_url || null
        })
        .eq('id', candidate.id)

      if (error) throw error

      // Reload data to get fresh candidate info
      onDataReload?.()
      alert('Candidate information saved successfully!')
    } catch (error) {
      console.error('Error saving candidate info:', error)
      alert('Failed to save candidate information')
    } finally {
      setIsSavingInfo(false)
    }
  }

  if (!candidate) return null

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[100] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Side Panel - Full screen on mobile, side panel on desktop */}
      <div
        className={`fixed top-0 right-0 h-screen bg-white shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } w-full md:w-3/4 lg:w-2/5 overflow-hidden flex flex-col`}
      >
        {/* Header - Close Button Only */}
        <div className="border-b bg-white px-4 sm:px-6 py-2 flex items-center justify-end flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px]"
          >
            <span className="text-2xl">×</span>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Candidate Information - Editable */}
          {!readOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Candidate Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-text-primary mb-1.5 block">First Name</Label>
                    <Input
                      value={editableInfo.first_name}
                      onChange={(e) => setEditableInfo({...editableInfo, first_name: e.target.value})}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-text-primary mb-1.5 block">Last Name</Label>
                    <Input
                      value={editableInfo.last_name}
                      onChange={(e) => setEditableInfo({...editableInfo, last_name: e.target.value})}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label className="text-sm text-text-primary mb-1.5 block">Email</Label>
                  <Input
                    type="email"
                    value={editableInfo.email}
                    onChange={(e) => setEditableInfo({...editableInfo, email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-sm text-text-primary mb-1.5 block">Phone</Label>
                  <Input
                    type="tel"
                    value={editableInfo.phone}
                    onChange={(e) => setEditableInfo({...editableInfo, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* LinkedIn */}
                <div>
                  <Label className="text-sm text-text-primary mb-1.5 block">LinkedIn Profile</Label>
                  <Input
                    type="url"
                    value={editableInfo.linkedin_url}
                    onChange={(e) => setEditableInfo({...editableInfo, linkedin_url: e.target.value})}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveCandidateInfo}
                  disabled={isSavingInfo}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isSavingInfo ? 'Saving...' : 'Save Candidate Information'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Candidate Information - Read Only for Clients */}
          {readOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Candidate Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-text-muted">Name</Label>
                  <p className="text-text-primary font-medium">
                    {candidate.first_name} {candidate.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-text-muted">Email</Label>
                  <p className="text-text-primary">{candidate.email}</p>
                </div>
                {candidate.phone && (
                  <div>
                    <Label className="text-sm text-text-muted">Phone</Label>
                    <p className="text-text-primary">{candidate.phone}</p>
                  </div>
                )}
                {candidate.linkedin_url && (
                  <div>
                    <Label className="text-sm text-text-muted">LinkedIn</Label>
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy hover:text-navy hover:underline block"
                    >
                      View LinkedIn Profile →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resume & Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resume & Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.resume_url ? (
                <div className="space-y-3">
                  <div className="rounded-lg p-3 border" style={{ backgroundColor: 'oklch(0.92 0.02 250)', borderColor: 'oklch(0.78 0.04 250)' }}>
                    <p className="text-sm text-text-secondary mb-1">Current Resume:</p>
                    <p className="text-sm font-medium text-text-primary truncate">
                      {getResumeFileName(candidate.resume_url)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full touch-manipulation min-h-[44px]">
                        View Resume
                      </Button>
                    </a>
                    <a
                      href={candidate.resume_url}
                      download
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full touch-manipulation min-h-[44px]">
                        Download
                      </Button>
                    </a>
                  </div>
                  {!readOnly && (
                    <div>
                      <Label htmlFor="replace-resume" className="text-sm text-text-secondary block mb-1.5">
                        Replace Resume
                      </Label>
                      <Input
                        id="replace-resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleResumeUpload(file)
                            e.target.value = ''
                          }
                        }}
                        disabled={isUploadingResume}
                        className="cursor-pointer text-sm"
                      />
                      {isUploadingResume && (
                        <p className="text-sm text-navy mt-1.5">Uploading...</p>
                      )}
                      {resumeError && (
                        <p className="text-sm text-red-600 mt-1.5">{resumeError}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {!readOnly ? (
                    <div>
                      <Label htmlFor="upload-resume" className="text-sm text-text-secondary block mb-1.5">
                        Upload Resume
                      </Label>
                      <Input
                        id="upload-resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleResumeUpload(file)
                            e.target.value = ''
                          }
                        }}
                        disabled={isUploadingResume}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-text-muted mt-1.5">
                        Accepted formats: PDF, DOC, DOCX (Max 10MB)
                      </p>
                      {isUploadingResume && (
                        <p className="text-sm text-navy mt-1.5">Uploading...</p>
                      )}
                      {resumeError && (
                        <p className="text-sm text-red-600 mt-1.5">{resumeError}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm">No resume uploaded</p>
                  )}
                </div>
              )}

              {/* Other Documents & Links */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-text-primary mb-3">Other Documents & Links</h4>

                {/* Existing Links */}
                {candidateLinks.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {candidateLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-2 rounded border" style={{ backgroundColor: 'oklch(0.92 0.02 250)', borderColor: 'oklch(0.78 0.04 250)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{link.label}</p>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs hover:underline truncate block"
                            style={{ color: 'oklch(0.55 0.01 250)' }}
                          >
                            {link.url}
                          </a>
                        </div>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLink(link.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Link - Only for recruiters */}
                {!readOnly && (
                  <div className="space-y-2 bg-bg-section p-3 rounded-lg border border-ds-border">
                    <Label className="text-sm font-medium text-text-primary">Add Document/Link</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Label (e.g., 'GitHub Profile', 'Portfolio', 'Work Sample')"
                        value={newLink.label}
                        onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        placeholder="URL (e.g., https://github.com/username)"
                        value={newLink.url}
                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                        className="text-sm"
                      />
                      <select
                        value={newLink.type}
                        onChange={(e) => setNewLink({ ...newLink, type: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-navy"
                      >
                        <option value="github">GitHub</option>
                        <option value="portfolio">Portfolio</option>
                        <option value="work_sample">Work Sample</option>
                        <option value="video">Video (Interview/Intro)</option>
                        <option value="other">Other</option>
                      </select>
                      <Button
                        onClick={handleAddLink}
                        disabled={isAddingLink || !newLink.label || !newLink.url}
                        className="w-full bg-[#0891B2] hover:bg-[#DC2626] text-white"
                        size="sm"
                      >
                        {isAddingLink ? 'Adding...' : '+ Add Link'}
                      </Button>
                    </div>
                  </div>
                )}

                {candidateLinks.length === 0 && readOnly && (
                  <p className="text-sm text-text-muted">No additional documents or links</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recruiter Notes - Only for recruiters */}
          {!readOnly && (
            <Card className="border-2 border-amber-300 bg-amber-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Recruiter Notes
                    <span className="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      Private - Not visible to clients
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Text Notes */}
                <div>
                  <Label className="text-sm font-medium text-text-primary mb-2 block">Notes</Label>
                  <Textarea
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    placeholder="Sourcing notes, initial impressions, background info, compensation expectations, etc..."
                    rows={6}
                    className="resize-none bg-white"
                  />
                  <p className="text-xs text-text-secondary mt-1.5">
                    Your private intel - sourcing channel, initial conversation notes, compensation discussion, special considerations, etc.
                  </p>
                </div>

                {/* Share with Interviewers Toggle */}
                <div className="flex items-center justify-between p-3 bg-amber-100 border border-amber-300 rounded">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-text-primary mb-0.5 block cursor-pointer" htmlFor="share-notes-toggle">
                      Share with interviewers
                    </Label>
                    <p className="text-xs text-text-secondary">
                      Allow interviewers to see these notes in their portal view
                    </p>
                  </div>
                  <button
                    id="share-notes-toggle"
                    type="button"
                    onClick={handleToggleShareNotes}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      shareRecruiterNotes ? 'bg-cyan-600' : 'bg-bg-page'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        shareRecruiterNotes ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <Button
                  onClick={handleSaveRecruiterNotes}
                  disabled={isSavingNotes}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </Button>

                {/* File Attachments */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-text-primary mb-3 block">Attachments</Label>

                  {/* Existing Files */}
                  {recruiterFiles.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {recruiterFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 rounded border" style={{ backgroundColor: 'oklch(0.92 0.02 250)', borderColor: 'oklch(0.78 0.04 250)' }}>
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">
                                {file.type === 'video' ? '🎥' :
                                 file.type === 'audio' ? '🎤' :
                                 file.type === 'document' ? '📄' :
                                 file.type === 'link' ? '🔗' : '📎'}
                              </span>
                              <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                              {file.size && <span>• {formatFileSize(file.size)}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium hover:underline"
                              style={{ color: 'oklch(0.55 0.01 250)' }}
                            >
                              {file.type === 'link' ? 'Open' : 'View'}
                            </a>
                            <button
                              onClick={() => handleDeleteRecruiterFile(file.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload File */}
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded border border-ds-border">
                      <Label htmlFor="recruiter-file-upload" className="text-sm font-medium text-text-primary mb-2 block">
                        Upload File
                      </Label>
                      <Input
                        id="recruiter-file-upload"
                        type="file"
                        accept="*/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleRecruiterFileUpload(file)
                            e.target.value = ''
                          }
                        }}
                        disabled={isUploadingFile}
                        className="cursor-pointer text-sm"
                      />
                      <p className="text-xs text-text-muted mt-1.5">
                        Documents, videos, voice memos, etc. (Max 50MB)
                      </p>
                      {isUploadingFile && (
                        <p className="text-sm text-navy mt-2">Uploading...</p>
                      )}
                    </div>

                    {/* Add Link */}
                    {!showAddLinkForm ? (
                      <Button
                        onClick={() => setShowAddLinkForm(true)}
                        variant="outline"
                        className="w-full border-ds-border text-text-primary hover:bg-bg-section"
                        size="sm"
                      >
                        + Add Link (Loom, Google Drive, etc.)
                      </Button>
                    ) : (
                      <div className="bg-white p-3 rounded border border-ds-border space-y-2">
                        <Label className="text-sm font-medium text-text-primary">Add Link</Label>
                        <Input
                          placeholder="Link name (e.g., 'Loom Debrief', 'Google Drive folder')"
                          value={newFileLink.name}
                          onChange={(e) => setNewFileLink({ ...newFileLink, name: e.target.value })}
                          className="text-sm"
                        />
                        <Input
                          placeholder="URL (e.g., https://loom.com/...)"
                          value={newFileLink.url}
                          onChange={(e) => setNewFileLink({ ...newFileLink, url: e.target.value })}
                          className="text-sm"
                        />
                        <select
                          value={newFileLink.type}
                          onChange={(e) => setNewFileLink({ ...newFileLink, type: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-navy"
                        >
                          <option value="link">Link</option>
                          <option value="video">Video Link</option>
                          <option value="document">Document Link</option>
                          <option value="other">Other</option>
                        </select>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setShowAddLinkForm(false)
                              setNewFileLink({ name: '', url: '', type: 'link' })
                            }}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddFileLink}
                            disabled={!newFileLink.name || !newFileLink.url}
                            className="flex-1 bg-[#0891B2] hover:bg-[#DC2626] text-white"
                            size="sm"
                          >
                            Add Link
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {recruiterFiles.length === 0 && (
                    <p className="text-sm text-text-muted text-center py-2">
                      No attachments yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interviews - Grouped by Stage */}
          {!readOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interviews by Stage</CardTitle>
                {/* DEBUG INFO */}
                <div className="text-xs text-text-secondary mt-2 bg-yellow-50 p-2 rounded">
                  DEBUG: Total interviews loaded: {interviews.length} | Candidate ID: {candidate?.id?.substring(0, 8)}... | Current stage_id: {candidate?.stage_id?.substring(0, 8)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {stages.map((stage, stageIndex) => {
                  const isCurrentStage = candidate?.stage_id === stage.id
                  // If candidate has no stage, show all interviews in first stage as default
                  // Otherwise show interviews in current stage only
                  const isFirstStage = stageIndex === 0
                  const stageInterviews = candidate?.stage_id
                    ? (isCurrentStage ? interviews : [])
                    : (isFirstStage ? interviews : [])
                  const isExpanded = expandedStageId === stage.id || isCurrentStage || (!candidate?.stage_id && isFirstStage)

                  console.log('Stage interviews:', {
                    stageName: stage.name,
                    isCurrentStage,
                    stageInterviewCount: stageInterviews.length,
                    totalInterviews: interviews.length
                  })

                  return (
                    <div key={stage.id} className="border rounded-lg" style={{ borderColor: isCurrentStage ? 'oklch(0.65 0.01 250)' : 'oklch(0.85 0.02 250)' }}>
                      {/* Stage Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-bg-section transition-colors"
                        onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                        style={{ backgroundColor: isCurrentStage ? 'oklch(0.95 0.02 250)' : 'white' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-text-primary">
                              Stage {stage.order}: {stage.name}
                            </h3>
                            {isCurrentStage && (
                              <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: 'oklch(0.78 0.08 250)', color: 'white' }}>
                                Current Stage - {stageInterviews.length} interviews
                              </span>
                            )}
                            {!isCurrentStage && !candidate?.stage_id && isFirstStage && (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-orange-500 text-white">
                                No stage set - showing {stageInterviews.length} interviews here
                              </span>
                            )}
                            {!isCurrentStage && stageInterviews.length > 0 && !((!candidate?.stage_id && isFirstStage)) && (
                              <span className="px-2 py-1 text-xs bg-bg-page text-text-secondary rounded">
                                {stageInterviews.length} interviews
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-text-muted">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>

                      {/* Stage Content - Expanded */}
                      {isExpanded && (
                        <div className="border-t p-4 space-y-4" style={{ borderColor: 'oklch(0.9 0.02 250)' }}>
                          {/* Schedule Interview Button for this stage */}
                          {searchId && (
                            <Button
                              onClick={() => {
                                setEditingInterview(null) // Clear any editing state
                                setShowScheduleDialog(true)
                              }}
                              className="w-full text-white bg-orange hover:bg-orange-hover"
                            >
                              Schedule Interview
                            </Button>
                          )}

                          {/* Interviews for this stage */}
                          {stageInterviews.length === 0 ? (
                            <p className="text-text-muted text-sm">No interviews scheduled for this stage yet</p>
                          ) : (
                            stageInterviews.map((interview) => {
                              const feedbackList = feedbackMap[interview.id] || []
                              const isInterviewExpanded = expandedInterviewId === interview.id
                              const feedbackCount = feedbackList.length
                              const totalInterviewers = interview.interviewers?.length || 1

                              return (
                      <div key={interview.id} className="border rounded-lg bg-bg-section">
                        {/* Interview Summary - Clickable */}
                        <div
                          className="p-4 space-y-3 cursor-pointer hover:bg-bg-section transition-colors"
                          onClick={() => setExpandedInterviewId(isInterviewExpanded ? null : interview.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {interview.interviewers && interview.interviewers.length > 0 ? (
                                <div>
                                  <p className="font-semibold text-text-primary">
                                    {interview.interviewers.map(i => i.contact_name).join(', ')}
                                    {interview.interviewers.length > 1 && (
                                      <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                        Panel Interview
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-text-secondary mt-0.5">
                                    {feedbackCount} of {totalInterviewers} feedback received
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-semibold text-text-primary">{interview.interviewer_name}</p>
                                  <p className="text-sm text-text-secondary">
                                    {feedbackCount > 0 ? 'Feedback Received' : 'Awaiting Feedback'}
                                  </p>
                                </div>
                              )}
                              <p className="text-sm text-text-secondary mt-1">
                                {new Date(interview.scheduled_at).toLocaleDateString()} at{" "}
                                {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-text-muted mt-0.5">
                                {interview.duration_minutes} min • {getTimezoneAbbreviation(interview.timezone)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSendReminder(interview.id)
                                  }}
                                  className="p-1.5 hover:bg-green-100 rounded transition-colors"
                                  title="Send reminder to interviewers"
                                >
                                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingInterview(interview)
                                    setShowScheduleDialog(true)
                                  }}
                                  className="p-1.5 hover:bg-navy/10 rounded transition-colors"
                                  title="Edit interview"
                                >
                                  <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteInterview(interview.id)
                                  }}
                                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                  title="Delete interview"
                                >
                                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                feedbackCount === totalInterviewers ? 'bg-cyan-100 text-cyan-800' :
                                feedbackCount > 0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-navy/10 text-navy'
                              }`}>
                                {feedbackCount === totalInterviewers ? 'Completed' :
                                 feedbackCount > 0 ? 'Partial' : 'Scheduled'}
                              </span>
                              <span className="px-2 py-1 text-xs bg-bg-page text-text-primary rounded">
                                {interview.interview_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              <span className="text-xs text-text-muted">
                                {isInterviewExpanded ? '▼' : '▶'} Click for details
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Detail View - Interviewers */}
                        {isInterviewExpanded && (
                          <div className="border-t border-ds-border bg-white p-4 space-y-3">
                            {interview.interviewers && interview.interviewers.length > 0 ? (
                              interview.interviewers.map((interviewer) => {
                                const interviewerFeedback = feedbackList.find(f =>
                                  f.interviewer_email === interviewer.contact_email
                                )

                                return (
                                  <div key={interviewer.id} className="border rounded-lg p-3 bg-bg-section">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <p className="font-semibold text-text-primary">{interviewer.contact_name}</p>
                                        <p className="text-sm text-text-secondary">{interviewer.contact_email}</p>
                                      </div>
                                      <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                          interviewerFeedback ? 'bg-cyan-100 text-cyan-800' : 'bg-bg-section text-text-secondary'
                                        }`}>
                                          {interviewerFeedback ? 'Feedback Received' : 'Awaiting Feedback'}
                                        </span>
                                        {interviewerFeedback ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              // TODO: Show feedback modal or expand inline
                                            }}
                                            className="text-xs h-7"
                                          >
                                            View Feedback
                                          </Button>
                                        ) : clientEmail && interviewer.contact_email.toLowerCase() === clientEmail.toLowerCase() ? (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setShowInlineFeedbackFor(showInlineFeedbackFor === interviewer.id ? null : interviewer.id)
                                            }}
                                            className="text-xs h-7 bg-[#0891B2] text-white hover:bg-[#DC2626]"
                                          >
                                            {showInlineFeedbackFor === interviewer.id ? 'Cancel' : 'Submit Feedback'}
                                          </Button>
                                        ) : !readOnly ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              // TODO: Send reminder
                                            }}
                                            className="text-xs h-7"
                                          >
                                            Send Reminder
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>

                                    {interviewerFeedback && (
                                      <div className="mt-3 pt-3 border-t border-ds-border space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-xs text-text-muted">
                                            Submitted {new Date(interviewerFeedback.submitted_at).toLocaleDateString()}
                                          </p>
                                          <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${
                                            interviewerFeedback.recommendation === 'advance' ? 'bg-cyan-100 text-cyan-800' :
                                            interviewerFeedback.recommendation === 'hold' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-orange-100 text-orange-800'
                                          }`}>
                                            {interviewerFeedback.recommendation === 'decline' || interviewerFeedback.recommendation === 'concern' ? 'Concern' :
                                             interviewerFeedback.recommendation.replace(/\b\w/g, l => l.toUpperCase())}
                                          </span>
                                        </div>
                                        {(interviewerFeedback.interview_notes || interviewerFeedback.strengths || interviewerFeedback.concerns) && (
                                          <div className="bg-white rounded p-3 border border-ds-border">
                                            <Label className="text-sm text-text-secondary mb-1 block">Notes</Label>
                                            <div className="text-sm text-text-primary space-y-2">
                                              {interviewerFeedback.interview_notes && (
                                                <p className="whitespace-pre-wrap">{interviewerFeedback.interview_notes}</p>
                                              )}
                                              {interviewerFeedback.strengths && (
                                                <p className="whitespace-pre-wrap"><span className="font-medium text-cyan-700">Strengths:</span> {interviewerFeedback.strengths}</p>
                                              )}
                                              {interviewerFeedback.concerns && (
                                                <p className="whitespace-pre-wrap"><span className="font-medium text-orange-700">Concerns:</span> {interviewerFeedback.concerns}</p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {interviewerFeedback.video_debrief_link && (
                                          <div>
                                            <a
                                              href={interviewerFeedback.video_debrief_link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-navy hover:text-navy hover:underline text-sm inline-flex items-center gap-1"
                                            >
                                              🎥 Watch Video Debrief →
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Inline Feedback Form */}
                                    {showInlineFeedbackFor === interviewer.id && !interviewerFeedback && (
                                      <div className="mt-3 pt-3 border-t border-ds-border bg-white rounded p-3 space-y-3">
                                        <h5 className="text-sm font-semibold text-text-primary">Submit Your Feedback</h5>

                                        {/* Recommendation Buttons */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-2 block">Recommendation</Label>
                                          <div className="grid grid-cols-3 gap-2">
                                            <button
                                              onClick={() => setInlineFeedback({...inlineFeedback, recommendation: 'advance'})}
                                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                                inlineFeedback.recommendation === 'advance'
                                                  ? 'border-cyan-500 bg-cyan-50'
                                                  : 'border-ds-border hover:border-cyan-300'
                                              }`}
                                            >
                                              <div className="text-2xl mb-1">✓</div>
                                              <div className="text-sm font-semibold">Advance</div>
                                            </button>
                                            <button
                                              onClick={() => setInlineFeedback({...inlineFeedback, recommendation: 'hold'})}
                                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                                inlineFeedback.recommendation === 'hold'
                                                  ? 'border-yellow-500 bg-yellow-50'
                                                  : 'border-ds-border hover:border-yellow-300'
                                              }`}
                                            >
                                              <div className="text-2xl mb-1">⏸</div>
                                              <div className="text-sm font-semibold">Hold</div>
                                            </button>
                                            <button
                                              onClick={() => setInlineFeedback({...inlineFeedback, recommendation: 'concern'})}
                                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                                inlineFeedback.recommendation === 'concern'
                                                  ? 'border-orange-500 bg-orange-50'
                                                  : 'border-ds-border hover:border-orange-300'
                                              }`}
                                            >
                                              <div className="text-2xl mb-1">⚠</div>
                                              <div className="text-sm font-semibold">Concern</div>
                                            </button>
                                          </div>
                                        </div>

                                        {/* Notes Field */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-1.5 block">Overall Interview Notes</Label>
                                          <Textarea
                                            value={inlineFeedback.interview_notes}
                                            onChange={(e) => setInlineFeedback({...inlineFeedback, interview_notes: e.target.value})}
                                            placeholder="Your overall impression and key takeaways..."
                                            rows={3}
                                            className="resize-none text-sm"
                                          />
                                        </div>

                                        {/* Strengths */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-1.5 block">Key Strengths</Label>
                                          <Textarea
                                            value={inlineFeedback.strengths}
                                            onChange={(e) => setInlineFeedback({...inlineFeedback, strengths: e.target.value})}
                                            placeholder="What impressed you?"
                                            rows={2}
                                            className="resize-none text-sm"
                                          />
                                        </div>

                                        {/* Concerns */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-1.5 block">Concerns or Gaps</Label>
                                          <Textarea
                                            value={inlineFeedback.concerns}
                                            onChange={(e) => setInlineFeedback({...inlineFeedback, concerns: e.target.value})}
                                            placeholder="Any reservations or areas of concern?"
                                            rows={2}
                                            className="resize-none text-sm"
                                          />
                                        </div>

                                        {/* Submit Button */}
                                        <Button
                                          onClick={() => handleSubmitInlineFeedback(interview.id, interviewer.contact_email)}
                                          disabled={isSubmittingFeedback || !inlineFeedback.recommendation}
                                          className="w-full bg-[#0891B2] hover:bg-[#DC2626] text-white"
                                        >
                                          {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            ) : (
                              // Fallback for old interviews without interviewers array
                              <div className="border rounded-lg p-3 bg-bg-section">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-semibold text-text-primary">{interview.interviewer_name}</p>
                                    <p className="text-sm text-text-secondary">{interview.interviewer_email}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                      feedbackList.length > 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-bg-section text-text-secondary'
                                    }`}>
                                      {feedbackList.length > 0 ? 'Feedback Received' : 'Awaiting Feedback'}
                                    </span>
                                    {feedbackList.length > 0 ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          // TODO: Show feedback modal
                                        }}
                                        className="text-xs h-7"
                                      >
                                        View Feedback
                                      </Button>
                                    ) : clientEmail && interview.interviewer_email.toLowerCase() === clientEmail.toLowerCase() ? (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowInlineFeedbackFor(showInlineFeedbackFor === interview.id ? null : interview.id)
                                        }}
                                        className="text-xs h-7 bg-[#0891B2] text-white hover:bg-[#DC2626]"
                                      >
                                        {showInlineFeedbackFor === interview.id ? 'Cancel' : 'Submit Feedback'}
                                      </Button>
                                    ) : !readOnly ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          // TODO: Send reminder
                                        }}
                                        className="text-xs h-7"
                                      >
                                        Send Reminder
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>

                                {feedbackList[0] && (
                                  <div className="mt-3 pt-3 border-t border-ds-border space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs text-text-muted">
                                        Submitted {new Date(feedbackList[0].submitted_at).toLocaleDateString()}
                                      </p>
                                      <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${
                                        feedbackList[0].recommendation === 'advance' ? 'bg-cyan-100 text-cyan-800' :
                                        feedbackList[0].recommendation === 'hold' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-orange-100 text-orange-800'
                                      }`}>
                                        {feedbackList[0].recommendation === 'decline' || feedbackList[0].recommendation === 'concern' ? 'Concern' :
                                         feedbackList[0].recommendation.replace(/\b\w/g, l => l.toUpperCase())}
                                      </span>
                                    </div>
                                    {(feedbackList[0].interview_notes || feedbackList[0].strengths || feedbackList[0].concerns) && (
                                      <div className="bg-white rounded p-3 border border-ds-border">
                                        <Label className="text-sm text-text-secondary mb-1 block">Notes</Label>
                                        <div className="text-sm text-text-primary space-y-2">
                                          {feedbackList[0].interview_notes && (
                                            <p className="whitespace-pre-wrap">{feedbackList[0].interview_notes}</p>
                                          )}
                                          {feedbackList[0].strengths && (
                                            <p className="whitespace-pre-wrap"><span className="font-medium text-cyan-700">Strengths:</span> {feedbackList[0].strengths}</p>
                                          )}
                                          {feedbackList[0].concerns && (
                                            <p className="whitespace-pre-wrap"><span className="font-medium text-orange-700">Concerns:</span> {feedbackList[0].concerns}</p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {feedbackList[0].video_debrief_link && (
                                      <div>
                                        <a
                                          href={feedbackList[0].video_debrief_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-navy hover:text-navy hover:underline text-sm inline-flex items-center gap-1"
                                        >
                                          🎥 Watch Video Debrief →
                                        </a>
                                      </div>
                                    )}

                                    {/* Inline Feedback Form for Fallback */}
                                    {showInlineFeedbackFor === interview.id && feedbackList.length === 0 && (
                                      <div className="mt-3 pt-3 border-t border-ds-border bg-white rounded p-3 space-y-3">
                                        <h5 className="text-sm font-semibold text-text-primary">Submit Your Feedback</h5>

                                        {/* Recommendation Buttons */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-2 block">Recommendation</Label>
                                          <div className="grid grid-cols-3 gap-2">
                                            <button
                                              onClick={() => setInlineFeedback({...inlineFeedback, recommendation: 'advance'})}
                                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                                inlineFeedback.recommendation === 'advance'
                                                  ? 'border-cyan-500 bg-cyan-50'
                                                  : 'border-ds-border hover:border-cyan-300'
                                              }`}
                                            >
                                              <div className="text-2xl mb-1">✓</div>
                                              <div className="text-sm font-semibold">Advance</div>
                                            </button>
                                            <button
                                              onClick={() => setInlineFeedback({...inlineFeedback, recommendation: 'hold'})}
                                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                                inlineFeedback.recommendation === 'hold'
                                                  ? 'border-yellow-500 bg-yellow-50'
                                                  : 'border-ds-border hover:border-yellow-300'
                                              }`}
                                            >
                                              <div className="text-2xl mb-1">⏸</div>
                                              <div className="text-sm font-semibold">Hold</div>
                                            </button>
                                            <button
                                              onClick={() => setInlineFeedback({...inlineFeedback, recommendation: 'concern'})}
                                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                                inlineFeedback.recommendation === 'concern'
                                                  ? 'border-orange-500 bg-orange-50'
                                                  : 'border-ds-border hover:border-orange-300'
                                              }`}
                                            >
                                              <div className="text-2xl mb-1">⚠</div>
                                              <div className="text-sm font-semibold">Concern</div>
                                            </button>
                                          </div>
                                        </div>

                                        {/* Notes Field */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-1.5 block">Overall Interview Notes</Label>
                                          <Textarea
                                            value={inlineFeedback.interview_notes}
                                            onChange={(e) => setInlineFeedback({...inlineFeedback, interview_notes: e.target.value})}
                                            placeholder="Your overall impression and key takeaways..."
                                            rows={3}
                                            className="resize-none text-sm"
                                          />
                                        </div>

                                        {/* Strengths */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-1.5 block">Key Strengths</Label>
                                          <Textarea
                                            value={inlineFeedback.strengths}
                                            onChange={(e) => setInlineFeedback({...inlineFeedback, strengths: e.target.value})}
                                            placeholder="What impressed you?"
                                            rows={2}
                                            className="resize-none text-sm"
                                          />
                                        </div>

                                        {/* Concerns */}
                                        <div>
                                          <Label className="text-sm text-text-primary mb-1.5 block">Concerns or Gaps</Label>
                                          <Textarea
                                            value={inlineFeedback.concerns}
                                            onChange={(e) => setInlineFeedback({...inlineFeedback, concerns: e.target.value})}
                                            placeholder="Any reservations or areas of concern?"
                                            rows={2}
                                            className="resize-none text-sm"
                                          />
                                        </div>

                                        {/* Submit Button */}
                                        <Button
                                          onClick={() => handleSubmitInlineFeedback(interview.id, interview.interviewer_email)}
                                          disabled={isSubmittingFeedback || !inlineFeedback.recommendation}
                                          className="w-full bg-[#0891B2] hover:bg-[#DC2626] text-white"
                                        >
                                          {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                              )
                            })
                          )}

                          {/* Candidate Actions - For Current Stage */}
                          {isCurrentStage && (
                            <div className="border-t pt-4 mt-4">
                              <h3 className="text-md font-semibold text-text-primary mb-4">Candidate Actions</h3>
                              {candidate.status && candidate.status !== 'active' ? (
                                <>
                                  {/* Show reactivate option for removed candidates */}
                                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-3 py-1 text-xs font-semibold rounded ${
                                        candidate.status === 'declined'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-bg-page text-text-primary'
                                      }`}>
                                        {candidate.status === 'declined' ? 'Declined' : 'Withdrew'}
                                      </span>
                                      {candidate.last_active_stage && (
                                        <span className="text-sm text-text-secondary">
                                          Last stage: <span className="font-medium">{candidate.last_active_stage}</span>
                                        </span>
                                      )}
                                    </div>
                                    {candidate.decline_reason && (
                                      <p className="text-sm text-text-primary">
                                        <span className="font-medium">Reason:</span> {candidate.decline_reason}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    onClick={handleReactivate}
                                    disabled={isUpdatingStatus}
                                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                                  >
                                    {isUpdatingStatus ? 'Reactivating...' : 'Reactivate Candidate'}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {/* Three action buttons */}
                                  <div className="grid grid-cols-3 gap-3">
                                    <Button
                                      onClick={() => {/* TODO: Advance to next stage */}}
                                      className="flex-1 text-white bg-orange hover:bg-orange-hover"
                                    >
                                      <span className="text-lg mr-1">✓</span> Advance
                                    </Button>
                                    <Button
                                      onClick={() => {/* TODO: Keep in current stage */}}
                                      className="flex-1 text-white bg-orange hover:bg-orange-hover"
                                    >
                                      <span className="text-lg mr-1">⏸</span> Hold
                                    </Button>
                                    <Button
                                      onClick={() => setShowRemoveDialog(true)}
                                      className="flex-1 text-white bg-orange hover:bg-orange-hover"
                                    >
                                      <span className="text-lg mr-1">×</span> Remove
                                    </Button>
                                  </div>

                                  {/* Remove from Pipeline Dialog */}
                                  {showRemoveDialog && (
                                    <div className="mt-4 p-4 bg-white border border-ds-border rounded-lg space-y-3">
                                      <h4 className="text-sm font-semibold text-text-primary">Remove from Pipeline</h4>

                                      <div>
                                        <Label className="text-sm text-text-primary mb-1.5 block">Reason</Label>
                                        <select
                                          value={removeReasonType}
                                          onChange={(e) => setRemoveReasonType(e.target.value)}
                                          className="w-full px-3 py-2 text-sm border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-navy"
                                        >
                                          <option value="declined_by_client">Declined by client</option>
                                          <option value="declined_by_candidate">Declined by candidate (withdrew)</option>
                                          <option value="position_filled">Position filled</option>
                                          <option value="other">Other</option>
                                        </select>
                                      </div>

                                      {(removeReasonType === 'declined_by_client' || removeReasonType === 'other') && (
                                        <div>
                                          <Label className="text-sm text-text-primary mb-1.5 block">
                                            {removeReasonType === 'declined_by_client' ? 'Additional notes (optional)' : 'Please specify'}
                                          </Label>
                                          <Textarea
                                            value={removeReason}
                                            onChange={(e) => setRemoveReason(e.target.value)}
                                            placeholder={removeReasonType === 'other' ? 'Enter reason...' : 'Additional context...'}
                                            rows={2}
                                            className="resize-none text-sm"
                                          />
                                        </div>
                                      )}

                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => {
                                            setShowRemoveDialog(false)
                                            setRemoveReason('')
                                            setRemoveReasonType('declined_by_client')
                                          }}
                                          variant="outline"
                                          className="flex-1"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={handleRemoveFromPipeline}
                                          disabled={isUpdatingStatus || (removeReasonType === 'other' && !removeReason)}
                                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                        >
                                          {isUpdatingStatus ? 'Removing...' : 'Confirm Remove'}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Schedule Next Round Button - For Current Stage */}
                          {isCurrentStage && stageIndex < stages.length - 1 && (
                            <div className="border-t pt-4 mt-4">
                              <Button
                                onClick={() => {/* TODO: Move to next stage */}}
                                className="w-full text-white bg-orange hover:bg-orange-hover"
                              >
                                Schedule Next Round (Move to {stages[stageIndex + 1]?.name})
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Schedule Interview Dialog */}
      {!readOnly && searchId && (
        <ScheduleInterviewDialog
          candidate={candidate}
          searchId={searchId}
          open={showScheduleDialog}
          onOpenChange={(open) => {
            setShowScheduleDialog(open)
            if (!open) {
              setEditingInterview(null) // Clear editing state when dialog closes
            }
          }}
          onSuccess={loadCandidateDetails}
          editingInterview={editingInterview}
        />
      )}
    </>
  )
}
