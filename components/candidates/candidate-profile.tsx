"use client"

import { useState, useEffect } from "react"
import { Candidate, CandidateAttachment, Interview, InterviewFeedback, Stage, Search } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

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

  // Check if user has access to compensation
  const canSeeCompensation = accessLevel === 'full_access' && search?.share_interview_notes !== false

  // Check if user has access to interview feedback
  const canSeeInterviewFeedback = accessLevel === 'full_access' && search?.share_interview_notes === true

  useEffect(() => {
    if (isOpen && candidate) {
      setEditedCandidate(candidate)
      loadCandidateData()
    }
  }, [isOpen, candidate])

  const loadCandidateData = async () => {
    setIsLoadingData(true)
    try {
      // Load attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("candidate_attachments")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("uploaded_at", { ascending: false })

      if (attachmentsError) throw attachmentsError
      setAttachments(attachmentsData || [])

      // Load interviews for this candidate
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

      // Load feedback for each interview
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

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .order("order", { ascending: true })

      if (stagesError) throw stagesError
      setStages(stagesData || [])
    } catch (error) {
      console.error("Error loading candidate data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSave = async () => {
    if (readOnly) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("candidates")
        .update({
          first_name: editedCandidate.first_name,
          last_name: editedCandidate.last_name,
          email: editedCandidate.email,
          location: editedCandidate.location,
          open_to_relocation: editedCandidate.open_to_relocation,
          linkedin_url: editedCandidate.linkedin_url,
          resume_url: editedCandidate.resume_url,
          general_notes: editedCandidate.general_notes,
          compensation_expectation: editedCandidate.compensation_expectation,
          aggregate_summary: editedCandidate.aggregate_summary,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidate.id)

      if (error) throw error

      if (onDataReload) onDataReload()
    } catch (error) {
      console.error("Error saving candidate:", error)
      alert("Failed to save candidate")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${candidate.id}-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('candidate-photos')
        .upload(fileName, file)

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(fileName)

      // Update candidate with photo URL
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
        .from('resumes')
        .upload(fileName, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('resumes')
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

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${candidate.id}-attachment-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName)

      // Create attachment record
      const { error: insertError } = await supabase
        .from("candidate_attachments")
        .insert({
          candidate_id: candidate.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          label: '', // User will edit this
          visibility: 'all_portal_users'
        })

      if (insertError) throw insertError

      loadCandidateData()
    } catch (error) {
      console.error("Error uploading attachment:", error)
      alert("Failed to upload attachment")
    }
  }

  const handleAttachmentLabelUpdate = async (attachmentId: string, label: string) => {
    if (readOnly) return

    try {
      const { error } = await supabase
        .from("candidate_attachments")
        .update({ label })
        .eq("id", attachmentId)

      if (error) throw error

      setAttachments(attachments.map(a => a.id === attachmentId ? { ...a, label } : a))
    } catch (error) {
      console.error("Error updating attachment label:", error)
    }
  }

  const handleAttachmentVisibilityUpdate = async (attachmentId: string, visibility: 'full_access' | 'all_portal_users') => {
    if (readOnly) return

    try {
      const { error } = await supabase
        .from("candidate_attachments")
        .update({ visibility })
        .eq("id", attachmentId)

      if (error) throw error

      setAttachments(attachments.map(a => a.id === attachmentId ? { ...a, visibility } : a))
    } catch (error) {
      console.error("Error updating attachment visibility:", error)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (readOnly) return
    if (!confirm("Delete this attachment?")) return

    try {
      const { error } = await supabase
        .from("candidate_attachments")
        .delete()
        .eq("id", attachmentId)

      if (error) throw error

      setAttachments(attachments.filter(a => a.id !== attachmentId))
    } catch (error) {
      console.error("Error deleting attachment:", error)
    }
  }

  const getInitials = () => {
    return `${editedCandidate.first_name?.[0] || ''}${editedCandidate.last_name?.[0] || ''}`.toUpperCase()
  }

  const getStageName = (stageId: string) => {
    return stages.find(s => s.id === stageId)?.name || 'Unknown Stage'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getInterviewerNames = (interview: Interview) => {
    if (interview.interviewers && interview.interviewers.length > 0) {
      return interview.interviewers.map(i => i.contact_name).join(', ')
    }
    return interview.interviewer_name
  }

  // Filter attachments based on access level
  const visibleAttachments = attachments.filter(attachment => {
    if (accessLevel === 'full_access') return true
    return attachment.visibility === 'all_portal_users'
  })

  // Filter completed interviews
  const completedInterviews = interviews.filter(i =>
    i.status === 'completed' || i.status === 'feedback_received'
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Candidate Profile</h2>
          <div className="flex items-center gap-3">
            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#1F3C62] hover:opacity-90"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {editedCandidate.photo_url ? (
                    <img
                      src={editedCandidate.photo_url}
                      alt={`${editedCandidate.first_name} ${editedCandidate.last_name}`}
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#1F3C62] flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200">
                      {getInitials()}
                    </div>
                  )}
                  {!readOnly && (
                    <div className="mt-2">
                      <label className="cursor-pointer text-xs text-[#1F3C62] hover:opacity-80 font-medium">
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Name and Details */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={editedCandidate.first_name}
                        onChange={(e) => setEditedCandidate({ ...editedCandidate, first_name: e.target.value })}
                        disabled={readOnly}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={editedCandidate.last_name}
                        onChange={(e) => setEditedCandidate({ ...editedCandidate, last_name: e.target.value })}
                        disabled={readOnly}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedCandidate.email}
                      onChange={(e) => setEditedCandidate({ ...editedCandidate, email: e.target.value })}
                      disabled={readOnly}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for scheduling interviews</p>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="City, State"
                      value={editedCandidate.location || ''}
                      onChange={(e) => setEditedCandidate({ ...editedCandidate, location: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="open_to_relocation"
                      checked={editedCandidate.open_to_relocation || false}
                      onCheckedChange={(checked) =>
                        setEditedCandidate({ ...editedCandidate, open_to_relocation: checked as boolean })
                      }
                      disabled={readOnly}
                    />
                    <Label htmlFor="open_to_relocation" className="font-normal cursor-pointer">
                      ☑ Open to relocation
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Section */}
          <Card>
            <CardHeader>
              <CardTitle>Resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editedCandidate.resume_url ? (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">Resume uploaded</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(editedCandidate.resume_url, '_blank')}
                  >
                    View
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No resume uploaded</p>
              )}
              {!readOnly && (
                <div>
                  <label className="cursor-pointer inline-block">
                    <Button variant="outline" size="sm" asChild>
                      <span>Upload Resume (PDF)</span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                  </label>
                </div>
              )}
              <p className="text-xs text-gray-500">Visible to all portal users</p>
            </CardContent>
          </Card>

          {/* LinkedIn Section */}
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Input
                  placeholder="https://linkedin.com/in/..."
                  value={editedCandidate.linkedin_url || ''}
                  onChange={(e) => setEditedCandidate({ ...editedCandidate, linkedin_url: e.target.value })}
                  disabled={readOnly}
                />
              </div>
              {editedCandidate.linkedin_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(editedCandidate.linkedin_url, '_blank')}
                >
                  View Profile
                </Button>
              )}
              <p className="text-xs text-gray-500">Visible to all portal users</p>
            </CardContent>
          </Card>

          {/* General Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>General Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add general notes about this candidate..."
                value={editedCandidate.general_notes || ''}
                onChange={(e) => setEditedCandidate({ ...editedCandidate, general_notes: e.target.value })}
                disabled={readOnly}
                rows={4}
              />
              <p className="text-xs text-gray-500">Visible to all portal users</p>
            </CardContent>
          </Card>

          {/* Compensation Expectation Section - Access Controlled */}
          {canSeeCompensation && (
            <Card>
              <CardHeader>
                <CardTitle>Compensation Expectation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="e.g., $180-200k base + 30% bonus + equity"
                  value={editedCandidate.compensation_expectation || ''}
                  onChange={(e) => setEditedCandidate({ ...editedCandidate, compensation_expectation: e.target.value })}
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500">
                  Only visible to users with "Sees comp" access
                </p>
              </CardContent>
            </Card>
          )}

          {/* Attachments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Attachments</span>
                {!readOnly && (
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>+ Add Attachment</span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                    />
                  </label>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visibleAttachments.length > 0 ? (
                <div className="space-y-3">
                  {visibleAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          {!readOnly ? (
                            <Input
                              placeholder="Add a description label..."
                              value={attachment.label}
                              onChange={(e) => handleAttachmentLabelUpdate(attachment.id, e.target.value)}
                              className="text-sm"
                            />
                          ) : (
                            attachment.label && (
                              <p className="text-sm text-gray-600">{attachment.label}</p>
                            )
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(attachment.file_url, '_blank')}
                          className="ml-3"
                        >
                          View
                        </Button>
                      </div>

                      {!readOnly && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`visibility-${attachment.id}`}
                                checked={attachment.visibility === 'all_portal_users'}
                                onChange={() => handleAttachmentVisibilityUpdate(attachment.id, 'all_portal_users')}
                              />
                              <span className="text-sm text-gray-700">● All portal users</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`visibility-${attachment.id}`}
                                checked={attachment.visibility === 'full_access'}
                                onChange={() => handleAttachmentVisibilityUpdate(attachment.id, 'full_access')}
                              />
                              <span className="text-sm text-gray-700">○ Full Access only</span>
                            </label>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No attachments</p>
              )}
            </CardContent>
          </Card>

          {/* Interview Feedback Section - Access Controlled */}
          {canSeeInterviewFeedback && (
            <Card>
              <CardHeader>
                <CardTitle>Interview Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {completedInterviews.length > 0 ? (
                  <>
                    {completedInterviews.map((interview) => {
                      const feedback = feedbackMap[interview.id] || []
                      return (
                        <div
                          key={interview.id}
                          className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {getInterviewerNames(interview)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {getStageName(interview.candidate_id)} • {formatDate(interview.scheduled_at)}
                              </p>
                            </div>
                          </div>

                          {feedback.length > 0 && (
                            <div className="space-y-2">
                              {feedback.map((fb) => (
                                <div key={fb.id} className="pl-4 border-l-2 border-[#1F3C62]">
                                  {fb.interview_notes && (
                                    <div className="mb-2">
                                      <p className="text-xs font-semibold text-gray-700 uppercase">Notes</p>
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.interview_notes}</p>
                                    </div>
                                  )}
                                  {fb.strengths && (
                                    <div className="mb-2">
                                      <p className="text-xs font-semibold text-gray-700 uppercase">Strengths</p>
                                      <p className="text-sm text-gray-700">{fb.strengths}</p>
                                    </div>
                                  )}
                                  {fb.concerns && (
                                    <div className="mb-2">
                                      <p className="text-xs font-semibold text-gray-700 uppercase">Concerns</p>
                                      <p className="text-sm text-gray-700">{fb.concerns}</p>
                                    </div>
                                  )}
                                  {fb.feedback_file_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(fb.feedback_file_url, '_blank')}
                                      className="mt-2"
                                    >
                                      View Attachment
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Aggregate Summary */}
                    <div className="mt-6 pt-6 border-t border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3">Aggregate Summary</h4>
                      <Textarea
                        placeholder="Write an overall summary of interview feedback..."
                        value={editedCandidate.aggregate_summary || ''}
                        onChange={(e) => setEditedCandidate({ ...editedCandidate, aggregate_summary: e.target.value })}
                        disabled={readOnly}
                        rows={4}
                        className="bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Overall summary visible to users with interview feedback access
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No completed interviews yet</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
