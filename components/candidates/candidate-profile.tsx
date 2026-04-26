"use client"

import { useState, useEffect } from "react"
import { Candidate, CandidateAttachment, Interview, InterviewFeedback, Stage, Search, RecruiterFile } from "@/types"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CandidateProfileProps {
  candidate: Candidate
  isOpen: boolean
  onClose: () => void
  readOnly?: boolean
  accessLevel?: 'full_access' | 'limited_access'
  searchId: string
  search?: Search
  onDataReload?: () => void
}

export function CandidateProfile({
  candidate,
  isOpen,
  onClose,
  readOnly = false,
  accessLevel = 'full_access',
  searchId,
  search,
  onDataReload
}: CandidateProfileProps) {
  const [editedCandidate, setEditedCandidate] = useState<Candidate>(candidate)
  const [attachments, setAttachments] = useState<CandidateAttachment[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [feedbackMap, setFeedbackMap] = useState<Record<string, InterviewFeedback[]>>({})
  const [stages, setStages] = useState<Stage[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // UI state
  const [isEditingHeader, setIsEditingHeader] = useState(false)
  const [isEditingAssessment, setIsEditingAssessment] = useState(false)
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set())
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [isAddingStage, setIsAddingStage] = useState(false)

  // Recruiter Assessment state
  const [recruiterAssessment, setRecruiterAssessment] = useState('')
  const [recruiterAssessmentFiles, setRecruiterAssessmentFiles] = useState<RecruiterFile[]>([])
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(['', '', '', '', ''])
  const [noticePeriod, setNoticePeriod] = useState('')
  const [relocationWillingness, setRelocationWillingness] = useState<'yes' | 'no' | 'open_to_discussion' | ''>('')
  const [compensationExpectation, setCompensationExpectation] = useState('')
  const [isUploadingAssessmentFile, setIsUploadingAssessmentFile] = useState(false)
  const [isSavingAssessment, setIsSavingAssessment] = useState(false)

  useEffect(() => {
    if (isOpen && candidate) {
      setEditedCandidate(candidate)
      setRecruiterAssessment(candidate.recruiter_assessment || '')
      setRecruiterAssessmentFiles(candidate.recruiter_assessment_files || [])
      setCompensationExpectation(candidate.compensation_expectation || '')
      setNoticePeriod(candidate.notice_period || '')
      setRelocationWillingness(candidate.relocation_willingness || '')

      const existing = candidate.key_takeaways || []
      const padded = [...existing, '', '', '', '', ''].slice(0, 5)
      setKeyTakeaways(padded)

      loadCandidateData()
    }
  }, [isOpen, candidate])

  const loadCandidateData = async () => {
    setIsLoadingData(true)
    try {
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("candidate_attachments")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("uploaded_at", { ascending: false })

      if (attachmentsError) throw attachmentsError
      setAttachments(attachmentsData || [])

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
        .eq("candidate_id", candidate.id)
        .order("scheduled_at", { ascending: false })

      if (interviewsError) throw interviewsError
      setInterviews(interviewsData || [])

      const feedbackPromises = (interviewsData || []).map(async (interview) => {
        const { data: feedbackData } = await supabase
          .from("interview_feedback")
          .select("*")
          .eq("interview_id", interview.id)
        return { interviewId: interview.id, feedback: feedbackData || [] }
      })

      const feedbackResults = await Promise.all(feedbackPromises)
      const feedbackMapData: Record<string, InterviewFeedback[]> = {}
      feedbackResults.forEach(({ interviewId, feedback }) => {
        feedbackMapData[interviewId] = feedback
      })
      setFeedbackMap(feedbackMapData)

      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .order("stage_order", { ascending: true })

      if (stagesError) throw stagesError
      setStages(stagesData || [])

      if (candidate.stage_id) {
        setExpandedStageIds(new Set([candidate.stage_id]))
      }
    } catch (error) {
      console.error("Error loading candidate data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  // ── Save handlers ──

  const handleSaveHeader = async () => {
    if (readOnly) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("candidates")
        .update({
          first_name: editedCandidate.first_name,
          last_name: editedCandidate.last_name,
          email: editedCandidate.email,
          phone: editedCandidate.phone,
          current_title: editedCandidate.current_title,
          current_company: editedCandidate.current_company,
          location: editedCandidate.location,
          linkedin_url: editedCandidate.linkedin_url,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidate.id)

      if (error) throw error
      setIsEditingHeader(false)
      if (onDataReload) onDataReload()
    } catch (error) {
      console.error("Error saving candidate:", error)
      alert("Failed to save candidate")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAssessment = async () => {
    if (readOnly) return
    setIsSavingAssessment(true)
    try {
      const filteredTakeaways = keyTakeaways.filter(t => t.trim() !== '')
      const { error } = await supabase
        .from("candidates")
        .update({
          recruiter_assessment: recruiterAssessment,
          recruiter_assessment_files: recruiterAssessmentFiles,
          compensation_expectation: compensationExpectation,
          notice_period: noticePeriod,
          relocation_willingness: relocationWillingness || null,
          key_takeaways: filteredTakeaways.length > 0 ? filteredTakeaways : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidate.id)

      if (error) throw error
      setIsEditingAssessment(false)
      if (onDataReload) onDataReload()
    } catch (error) {
      console.error("Error saving assessment:", error)
      alert("Failed to save assessment")
    } finally {
      setIsSavingAssessment(false)
    }
  }

  const handleAddStage = async () => {
    if (!newStageName.trim()) return
    setIsAddingStage(true)
    try {
      const nextOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) + 1 : 1
      const { error } = await supabase
        .from("stages")
        .insert({
          search_id: searchId,
          name: newStageName.trim(),
          order: nextOrder,
          visible_in_client_portal: true
        })

      if (error) throw error
      setNewStageName('')
      loadCandidateData()
      if (onDataReload) onDataReload()
    } catch (error) {
      console.error("Error adding stage:", error)
      alert("Failed to add stage")
    } finally {
      setIsAddingStage(false)
    }
  }

  // ── Upload handlers ──

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${candidate.id}-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('candidate-photos')
        .upload(fileName, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from("candidates")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", candidate.id)

      if (updateError) throw updateError

      setEditedCandidate({ ...editedCandidate, photo_url: urlData.publicUrl })
      if (onDataReload) onDataReload()
    } catch (error) {
      console.error("Error uploading photo:", error)
      alert("Failed to upload photo")
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${candidate.id}-resume-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('candidateresumes')
        .upload(fileName, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('candidateresumes')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from("candidates")
        .update({ resume_url: urlData.publicUrl })
        .eq("id", candidate.id)

      if (updateError) throw updateError

      setEditedCandidate({ ...editedCandidate, resume_url: urlData.publicUrl })
      if (onDataReload) onDataReload()
    } catch (error) {
      console.error("Error uploading resume:", error)
      alert("Failed to upload resume")
    }
  }

  const handleAssessmentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAssessmentFile(true)
    try {
      let fileType: 'document' | 'video' | 'audio' | 'other' = 'other'
      if (file.type.startsWith('video/')) fileType = 'video'
      else if (file.type.startsWith('audio/')) fileType = 'audio'
      else if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('document')) fileType = 'document'

      const fileName = `${Date.now()}-${file.name}`
      const filePath = `recruiter-files/${searchId}/${candidate.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('recruiter-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('recruiter-files')
        .getPublicUrl(filePath)

      const newFile: RecruiterFile = {
        id: crypto.randomUUID(),
        name: file.name,
        url: urlData.publicUrl,
        type: fileType,
        size: file.size,
        uploaded_at: new Date().toISOString()
      }

      const updated = [...recruiterAssessmentFiles, newFile]
      setRecruiterAssessmentFiles(updated)

      await supabase
        .from("candidates")
        .update({ recruiter_assessment_files: updated })
        .eq("id", candidate.id)
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Failed to upload file")
    } finally {
      setIsUploadingAssessmentFile(false)
    }
  }

  const handleDeleteAssessmentFile = async (fileId: string) => {
    if (readOnly) return
    const updated = recruiterAssessmentFiles.filter(f => f.id !== fileId)
    setRecruiterAssessmentFiles(updated)

    await supabase
      .from("candidates")
      .update({ recruiter_assessment_files: updated })
      .eq("id", candidate.id)
  }

  // ── Helpers ──

  const getInitials = () => {
    return `${editedCandidate.first_name?.[0] || ''}${editedCandidate.last_name?.[0] || ''}`.toUpperCase()
  }

  const getResumeFileName = (url: string) => {
    const parts = url.split('/')
    return decodeURIComponent(parts[parts.length - 1])
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const toggleStageExpanded = (stageId: string) => {
    setExpandedStageIds(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  const getInterviewerNames = (interview: Interview) => {
    if (interview.interviewers && interview.interviewers.length > 0) {
      return interview.interviewers.map(i => i.contact_name).join(', ')
    }
    return interview.interviewer_name
  }

  const getTimezoneAbbreviation = (timezone: string) => {
    const tzMap: Record<string, string> = {
      'America/New_York': 'ET',
      'America/Chicago': 'CT',
      'America/Denver': 'MT',
      'America/Los_Angeles': 'PT',
    }
    return tzMap[timezone] || timezone.split('/')[1]?.replace(/_/g, ' ') || timezone
  }

  if (!isOpen) return null

  const isTeamView = !readOnly

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Sticky close bar */}
        <div className="sticky top-0 bg-white border-b border-ds-border px-6 py-2 flex items-center justify-end z-10">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-text-muted hover:text-text-primary">
            <span className="text-xl leading-none">&times;</span>
          </Button>
        </div>

        <div className="px-6 pb-8">

          {/* ────────────────────────────────────────────────────────
              1. HEADER — plain white, no navy bar
              ──────────────────────────────────────────────────────── */}
          <div className="py-5">
            {!isEditingHeader ? (
              <div className="flex items-start gap-5">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {editedCandidate.photo_url ? (
                    <img
                      src={editedCandidate.photo_url}
                      alt={`${editedCandidate.first_name} ${editedCandidate.last_name}`}
                      className="w-20 h-20 rounded-full object-cover border-2 border-ds-border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-navy flex items-center justify-center text-white text-xl font-bold">
                      {getInitials()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Name + LinkedIn */}
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <h2 className="text-2xl font-bold text-navy truncate">
                      {editedCandidate.first_name} {editedCandidate.last_name}
                    </h2>
                    {editedCandidate.linkedin_url ? (
                      <a
                        href={editedCandidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 hover:opacity-80 transition-opacity"
                        title="View LinkedIn Profile"
                      >
                        <svg className="w-6 h-6 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    ) : (
                      !readOnly && (
                        <button
                          onClick={() => setIsEditingHeader(true)}
                          className="text-xs text-text-muted hover:text-text-secondary flex-shrink-0"
                        >
                          + Add LinkedIn
                        </button>
                      )
                    )}
                  </div>

                  {/* Title at Company */}
                  {(editedCandidate.current_title || editedCandidate.current_company) && (
                    <p className="text-sm text-text-primary mb-1.5">
                      {editedCandidate.current_title}
                      {editedCandidate.current_title && editedCandidate.current_company && ' at '}
                      {editedCandidate.current_company && (
                        <span className="font-medium">{editedCandidate.current_company}</span>
                      )}
                    </p>
                  )}

                  {/* Location | Phone | Email */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    {editedCandidate.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {editedCandidate.location}
                      </span>
                    )}
                    {editedCandidate.phone && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {editedCandidate.phone}
                      </span>
                    )}
                    {editedCandidate.email && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {editedCandidate.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button — far right */}
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingHeader(true)}
                    className="flex-shrink-0 text-xs"
                  >
                    Edit
                  </Button>
                )}
              </div>
            ) : (
              /* ── Edit mode ── */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Edit Candidate Info</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditedCandidate(candidate); setIsEditingHeader(false) }}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveHeader} disabled={isSaving} className="bg-navy hover:bg-navy/90 text-white">
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {editedCandidate.photo_url ? (
                    <img src={editedCandidate.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center text-white font-bold">{getInitials()}</div>
                  )}
                  <label className="cursor-pointer text-xs text-navy hover:opacity-80 font-medium">
                    Change Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-text-secondary">First Name *</Label>
                    <Input value={editedCandidate.first_name} onChange={(e) => setEditedCandidate({ ...editedCandidate, first_name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-text-secondary">Last Name *</Label>
                    <Input value={editedCandidate.last_name} onChange={(e) => setEditedCandidate({ ...editedCandidate, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-text-secondary">Title</Label>
                    <Input value={editedCandidate.current_title || ''} onChange={(e) => setEditedCandidate({ ...editedCandidate, current_title: e.target.value })} placeholder="e.g. VP of Engineering" />
                  </div>
                  <div>
                    <Label className="text-xs text-text-secondary">Company</Label>
                    <Input value={editedCandidate.current_company || ''} onChange={(e) => setEditedCandidate({ ...editedCandidate, current_company: e.target.value })} placeholder="e.g. Acme Corp" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-text-secondary">Email *</Label>
                  <Input type="email" value={editedCandidate.email} onChange={(e) => setEditedCandidate({ ...editedCandidate, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-text-secondary">Phone</Label>
                    <Input type="tel" value={editedCandidate.phone || ''} onChange={(e) => setEditedCandidate({ ...editedCandidate, phone: e.target.value })} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <Label className="text-xs text-text-secondary">Location</Label>
                    <Input value={editedCandidate.location || ''} onChange={(e) => setEditedCandidate({ ...editedCandidate, location: e.target.value })} placeholder="City, State" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-text-secondary">LinkedIn URL</Label>
                  <Input value={editedCandidate.linkedin_url || ''} onChange={(e) => setEditedCandidate({ ...editedCandidate, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────
              2. RESUME / CV — thin divider, no navy bar
              ──────────────────────────────────────────────────────── */}
          <div className="border-t border-ds-border py-3">
            {editedCandidate.resume_url ? (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <a
                  href={editedCandidate.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-navy hover:underline font-medium truncate"
                >
                  {getResumeFileName(editedCandidate.resume_url)}
                </a>
                {!readOnly && (
                  <label className="cursor-pointer flex-shrink-0 ml-auto">
                    <span className="text-xs text-text-muted hover:text-navy cursor-pointer font-medium">Replace</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
                  </label>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-text-muted">No resume uploaded</span>
                {!readOnly && (
                  <label className="cursor-pointer flex-shrink-0 ml-auto">
                    <span className="text-xs text-navy hover:underline cursor-pointer font-medium">Upload Resume</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────
              3. INTERVIEW PROGRESS — slim navy bar
              ──────────────────────────────────────────────────────── */}
          <div className="mt-4">
            {/* Slim navy header bar */}
            <div className="bg-navy text-white px-4 py-1.5 rounded-t-md">
              <span className="text-xs font-semibold tracking-wide uppercase">Interview Progress</span>
            </div>

            <div className="border border-t-0 border-ds-border rounded-b-md p-4 space-y-2">
              {isLoadingData ? (
                <p className="text-sm text-text-muted">Loading stages...</p>
              ) : stages.length === 0 ? (
                <p className="text-sm text-text-muted">No stages configured</p>
              ) : (
                stages.map((stage) => {
                  const isCurrentStage = candidate.stage_id === stage.id
                  const stageInterviews = isCurrentStage ? interviews : []
                  const isExpanded = expandedStageIds.has(stage.id)
                  const feedbackCount = stageInterviews.reduce((count, interview) => {
                    return count + (feedbackMap[interview.id]?.length || 0)
                  }, 0)

                  return (
                    <div
                      key={stage.id}
                      className={`rounded border ${isCurrentStage ? 'border-navy/40 bg-navy/5' : 'border-ds-border'}`}
                    >
                      <button
                        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-bg-section/60 transition-colors"
                        onClick={() => toggleStageExpanded(stage.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrentStage ? 'bg-navy text-white' : 'bg-bg-page text-text-muted'
                          }`}>
                            {stage.order}
                          </span>
                          <span className="text-sm font-medium text-text-primary">{stage.name}</span>
                          {isCurrentStage && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-navy text-white rounded">Current</span>
                          )}
                          {isCurrentStage && stageInterviews.length > 0 && (
                            <span className="text-[11px] text-text-muted">
                              {stageInterviews.length} interview{stageInterviews.length !== 1 ? 's' : ''}
                              {feedbackCount > 0 && ` / ${feedbackCount} feedback`}
                            </span>
                          )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-ds-border px-3 py-2 space-y-2">
                          {isCurrentStage && stageInterviews.length > 0 ? (
                            stageInterviews.map((interview) => {
                              const feedbackList = feedbackMap[interview.id] || []
                              const totalInterviewers = interview.interviewers?.length || 1
                              const isInterviewExpanded = expandedInterviewId === interview.id

                              return (
                                <div key={interview.id} className="rounded border border-ds-border bg-white">
                                  <button
                                    className="w-full px-3 py-2 text-left hover:bg-bg-section transition-colors"
                                    onClick={() => setExpandedInterviewId(isInterviewExpanded ? null : interview.id)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-text-primary">
                                          {getInterviewerNames(interview)}
                                          {interview.interviewers && interview.interviewers.length > 1 && (
                                            <span className="ml-1.5 text-[10px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded">Panel</span>
                                          )}
                                        </p>
                                        <p className="text-[11px] text-text-muted mt-0.5">
                                          {formatDate(interview.scheduled_at)} at{' '}
                                          {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {' '}{getTimezoneAbbreviation(interview.timezone)}
                                          {' / '}{interview.duration_minutes}min
                                          {' / '}{interview.interview_type.replace(/_/g, ' ')}
                                        </p>
                                      </div>
                                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                        feedbackList.length >= totalInterviewers
                                          ? 'bg-green-100 text-green-700'
                                          : feedbackList.length > 0
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-bg-section text-text-secondary'
                                      }`}>
                                        {feedbackList.length >= totalInterviewers ? 'Complete'
                                          : feedbackList.length > 0 ? `${feedbackList.length}/${totalInterviewers} Feedback`
                                          : 'Scheduled'}
                                      </span>
                                    </div>
                                  </button>

                                  {isInterviewExpanded && feedbackList.length > 0 && (
                                    <div className="border-t border-ds-border px-3 py-2 space-y-2">
                                      {feedbackList.map((fb) => (
                                        <div key={fb.id} className="pl-3 border-l-2 border-navy">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-xs font-medium text-text-primary">{fb.interviewer_name}</p>
                                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                                              fb.recommendation === 'advance' ? 'bg-green-100 text-green-700' :
                                              fb.recommendation === 'hold' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-red-100 text-red-700'
                                            }`}>
                                              {fb.recommendation === 'advance' ? 'Advance' : fb.recommendation === 'hold' ? 'Hold' : 'Concern'}
                                            </span>
                                          </div>
                                          {fb.interview_notes && <p className="text-xs text-text-secondary whitespace-pre-wrap">{fb.interview_notes}</p>}
                                          {fb.strengths && <p className="text-xs text-text-secondary mt-0.5"><span className="font-medium text-green-700">Strengths:</span> {fb.strengths}</p>}
                                          {fb.concerns && <p className="text-xs text-text-secondary mt-0.5"><span className="font-medium text-red-700">Concerns:</span> {fb.concerns}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-xs text-text-muted py-0.5">
                              {isCurrentStage ? 'No interviews scheduled yet' : 'Stage not yet reached'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              {/* + Add Stage */}
              {!readOnly && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="New stage name..."
                    className="text-sm h-8 flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStage() }}
                  />
                  <Button
                    onClick={handleAddStage}
                    disabled={isAddingStage || !newStageName.trim()}
                    size="sm"
                    className="bg-navy hover:bg-navy/90 text-white h-8 text-xs px-3"
                  >
                    {isAddingStage ? '...' : '+ Add Stage'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              4. RECRUITER ASSESSMENT — slim navy bar
              ──────────────────────────────────────────────────────── */}
          {isTeamView && (
            <div className="mt-5">
              {/* Slim navy header bar */}
              <div className="bg-navy text-white px-4 py-1.5 rounded-t-md flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide uppercase">Recruiter Assessment &mdash; Team Only</span>
                {!isEditingAssessment ? (
                  <button onClick={() => setIsEditingAssessment(true)} className="text-[11px] text-white/80 hover:text-white font-medium">
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRecruiterAssessment(candidate.recruiter_assessment || '')
                        setCompensationExpectation(candidate.compensation_expectation || '')
                        setNoticePeriod(candidate.notice_period || '')
                        setRelocationWillingness(candidate.relocation_willingness || '')
                        const existing = candidate.key_takeaways || []
                        setKeyTakeaways([...existing, '', '', '', '', ''].slice(0, 5))
                        setIsEditingAssessment(false)
                      }}
                      className="text-[11px] text-white/80 hover:text-white font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAssessment}
                      disabled={isSavingAssessment}
                      className="text-[11px] bg-white/20 hover:bg-white/30 text-white font-medium px-2 py-0.5 rounded disabled:opacity-50"
                    >
                      {isSavingAssessment ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="border border-t-0 border-ds-border rounded-b-md p-4 space-y-5">

                {/* a) Notes & Attachments */}
                <div>
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Notes & Attachments</h4>
                  <Textarea
                    value={recruiterAssessment}
                    onChange={(e) => setRecruiterAssessment(e.target.value)}
                    placeholder="Assessment notes — sourcing context, interview impressions, fit analysis..."
                    rows={5}
                    disabled={!isEditingAssessment}
                    className="resize-none bg-white text-sm"
                  />

                  <div className="mt-2.5 space-y-1.5">
                    {recruiterAssessmentFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between py-1 px-2 rounded border border-ds-border bg-bg-section text-sm">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-navy hover:underline truncate flex-1">
                          {file.name}
                        </a>
                        {isEditingAssessment && (
                          <button onClick={() => handleDeleteAssessmentFile(file.id)} className="text-[11px] text-red-500 hover:text-red-700 ml-2 flex-shrink-0">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    {isEditingAssessment && (
                      <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-navy hover:underline font-medium mt-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        {isUploadingAssessmentFile ? 'Uploading...' : 'Attach File'}
                        <input type="file" className="hidden" onChange={handleAssessmentFileUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* b) Compensation & Logistics */}
                <div className="bg-bg-section rounded-md p-3 border border-ds-border">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2.5">Compensation & Logistics</h4>
                  <div className="space-y-2.5">
                    <div>
                      <Label className="text-xs text-text-muted">Compensation Expectations</Label>
                      <Input
                        value={compensationExpectation}
                        onChange={(e) => setCompensationExpectation(e.target.value)}
                        placeholder="e.g. $180-200k base + 30% bonus + equity"
                        disabled={!isEditingAssessment}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-text-muted">Notice Period</Label>
                      <Input
                        value={noticePeriod}
                        onChange={(e) => setNoticePeriod(e.target.value)}
                        placeholder="e.g. 2 weeks, 30 days, immediate"
                        disabled={!isEditingAssessment}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-text-muted">Relocation Willingness</Label>
                      <select
                        value={relocationWillingness}
                        onChange={(e) => setRelocationWillingness(e.target.value as any)}
                        disabled={!isEditingAssessment}
                        className="w-full px-3 py-1.5 text-sm border border-ds-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy disabled:bg-bg-section disabled:text-text-muted h-8"
                      >
                        <option value="">-- Select --</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="open_to_discussion">Open to Discussion</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* c) Key Takeaways */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Key Takeaways</h4>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-navy/10 text-navy rounded">
                      Shared with client portal
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {keyTakeaways.map((takeaway, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-text-muted text-xs flex-shrink-0 w-3 text-right">{index + 1}.</span>
                        <Input
                          value={takeaway}
                          onChange={(e) => {
                            const updated = [...keyTakeaways]
                            updated[index] = e.target.value
                            setKeyTakeaways(updated)
                          }}
                          placeholder="Add a key point..."
                          disabled={!isEditingAssessment}
                          className="text-sm h-8"
                        />
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-text-muted mt-2">
                    These bullets are the only part visible to the client team
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
