"use client"

import { useState, useEffect } from "react"
import { Interview, InterviewFeedback, Candidate, Stage, Search } from "@/types"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScheduleInterviewDialogEnhanced } from "./schedule-interview-dialog-enhanced"

interface InterviewDetailPanelEnhancedProps {
  interview: Interview
  feedback: InterviewFeedback[]
  isOpen: boolean
  onClose: () => void
  readOnly?: boolean
  canSeeInterviewNotes?: boolean
  searchId: string
  search?: Search
  onInterviewUpdated: () => void
}

export function InterviewDetailPanelEnhanced({
  interview,
  feedback,
  isOpen,
  onClose,
  readOnly = false,
  canSeeInterviewNotes = true,
  searchId,
  search,
  onInterviewUpdated
}: InterviewDetailPanelEnhancedProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const [recruiter, setRecruiter] = useState<{ name: string; email: string } | null>(null)
  const [interviewGuides, setInterviewGuides] = useState<Array<{ name: string; url: string }>>([])
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (isOpen && interview) {
      loadInterviewDetails()
      loadRecruiter()
    }
  }, [isOpen, interview])

  const loadInterviewDetails = async () => {
    try {
      // Load candidate
      const { data: candidateData } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", interview.candidate_id)
        .single()

      if (candidateData) setCandidate(candidateData)

      // Load stage
      if (candidateData) {
        const { data: stageData } = await supabase
          .from("stages")
          .select("*")
          .eq("id", candidateData.stage_id)
          .single()

        if (stageData) {
          setStage(stageData)
          loadInterviewGuides(stageData)
        }
      }
    } catch (error) {
      console.error("Error loading interview details:", error)
    }
  }

  const loadRecruiter = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setRecruiter({
          name: `${profileData.first_name} ${profileData.last_name}`,
          email: profileData.email || user.email || ''
        })
      } else {
        setRecruiter({
          name: user.email?.split('@')[0] || 'Recruiter',
          email: user.email || ''
        })
      }
    } catch (error) {
      console.error("Error loading recruiter:", error)
    }
  }

  const loadInterviewGuides = async (stageData: Stage) => {
    const guides: Array<{ name: string; url: string }> = []

    if (interview.interview_guide_url) {
      guides.push({
        name: "Interview Guide",
        url: interview.interview_guide_url
      })
    }

    if (stageData.interview_guide_url) {
      guides.push({
        name: `${stageData.name} Guide`,
        url: stageData.interview_guide_url
      })
    }

    setInterviewGuides(guides)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getInterviewerNames = () => {
    if (interview.interviewers && interview.interviewers.length > 0) {
      return interview.interviewers.map(i => i.contact_name).join(', ')
    }
    return interview.interviewer_name
  }

  const handleCancelInterview = async () => {
    if (!confirm("Cancel this interview? This will send cancellation emails to all attendees.")) return

    setIsCancelling(true)

    try {
      // Update interview status
      const { error: updateError } = await supabase
        .from("interviews")
        .update({ status: 'cancelled' })
        .eq("id", interview.id)

      if (updateError) throw updateError

      // Send cancellation emails with .ics
      if (candidate && stage && search && recruiter) {
        const cancelResponse = await fetch('/api/interviews/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interview: {
              id: interview.id,
              candidate_name: `${candidate.first_name} ${candidate.last_name}`,
              candidate_email: candidate.email,
              stage_name: stage.name,
              position_title: search.position_title,
              company_name: search.company_name,
              scheduled_at: interview.scheduled_at,
              duration_minutes: interview.duration_minutes,
              location: interview.location || '',
              timezone: interview.timezone,
              notes: interview.prep_notes || '',
              interview_guide_url: interview.interview_guide_url || ''
            },
            interviewers: interview.interviewers?.map(i => ({
              name: i.contact_name,
              email: i.contact_email
            })) || [],
            recruiter: recruiter,
            type: 'cancel'
          })
        })

        if (!cancelResponse.ok) {
          console.error("Failed to send cancellation")
        }
      }

      alert("Interview cancelled. Cancellation emails sent.")
      onInterviewUpdated()
      onClose()
    } catch (error) {
      console.error("Error cancelling interview:", error)
      alert("Failed to cancel interview")
    } finally {
      setIsCancelling(false)
    }
  }

  if (!isOpen) return null

  const { date, time } = formatDateTime(interview.scheduled_at)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl">
        <Card>
          <CardHeader className="border-b border-ds-border">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {candidate?.first_name} {candidate?.last_name} — {stage?.name} Interview
                </CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  {date} · {time}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-secondary text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Interviewer(s) */}
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">Interviewer(s)</p>
              <p className="text-text-primary">{getInterviewerNames()}</p>
            </div>

            {/* Location */}
            {interview.location && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">Location</p>
                {interview.location.startsWith('http') ? (
                  <a
                    href={interview.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1F3C62] hover:opacity-80 hover:underline"
                  >
                    {interview.location}
                  </a>
                ) : (
                  <p className="text-text-primary">{interview.location}</p>
                )}
              </div>
            )}

            {/* Interview Guide(s) */}
            {interviewGuides.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-2">📋 Interview Guide(s)</p>
                <div className="space-y-2">
                  {interviewGuides.map((guide, index) => (
                    <button
                      key={index}
                      onClick={() => window.open(guide.url, '_blank')}
                      className="w-full text-left px-4 py-2 bg-bg-section hover:bg-bg-section rounded-md border border-ds-border flex items-center justify-between"
                    >
                      <span className="text-sm text-text-primary">{guide.name}</span>
                      <span className="text-[#1F3C62] text-sm">View →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prep Notes */}
            {interview.prep_notes && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">Prep Notes</p>
                <div className="bg-bg-section rounded-lg p-3 border border-ds-border">
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{interview.prep_notes}</p>
                </div>
              </div>
            )}

            {/* Feedback */}
            {canSeeInterviewNotes && feedback.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-3">Feedback</p>
                <div className="space-y-4">
                  {feedback.map((fb) => (
                    <div key={fb.id} className="bg-bg-section rounded-lg p-4 border border-ds-border">
                      <p className="font-medium text-text-primary mb-2">{fb.interviewer_name}</p>
                      {fb.interview_notes && (
                        <div className="mb-2">
                          <p className="text-sm text-text-primary whitespace-pre-wrap">{fb.interview_notes}</p>
                        </div>
                      )}
                      {fb.strengths && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-text-secondary uppercase">Strengths</p>
                          <p className="text-sm text-text-primary">{fb.strengths}</p>
                        </div>
                      )}
                      {fb.concerns && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-text-secondary uppercase">Concerns</p>
                          <p className="text-sm text-text-primary">{fb.concerns}</p>
                        </div>
                      )}
                      {fb.feedback_file_url && (
                        <button
                          onClick={() => window.open(fb.feedback_file_url, '_blank')}
                          className="text-sm text-[#1F3C62] hover:opacity-80 flex items-center gap-1 mt-2"
                        >
                          📎 View Attachment
                        </button>
                      )}
                      {fb.video_debrief_link && (
                        <button
                          onClick={() => window.open(fb.video_debrief_link, '_blank')}
                          className="text-sm text-[#1F3C62] hover:opacity-80 flex items-center gap-1 mt-2"
                        >
                          🎥 Watch Video Debrief
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Feedback Yet */}
            {canSeeInterviewNotes && feedback.length === 0 && interview.status === 'scheduled' && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-2">Feedback</p>
                <p className="text-sm text-text-muted italic">
                  No feedback submitted yet
                </p>
              </div>
            )}

            {/* Actions */}
            {!readOnly && interview.status !== 'cancelled' && (
              <div className="flex items-center gap-3 pt-4 border-t border-ds-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRescheduleDialog(true)}
                >
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelInterview}
                  disabled={isCancelling}
                  className="text-red-600 hover:text-red-700"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Interview'}
                </Button>
              </div>
            )}

            {/* Cancelled Status */}
            {interview.status === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium">
                  This interview has been cancelled
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reschedule Dialog */}
      {showRescheduleDialog && candidate && stage && (
        <ScheduleInterviewDialogEnhanced
          isOpen={showRescheduleDialog}
          onClose={() => setShowRescheduleDialog(false)}
          candidateId={candidate.id}
          stageId={stage.id}
          searchId={searchId}
          onInterviewScheduled={() => {
            setShowRescheduleDialog(false)
            onInterviewUpdated()
            onClose()
          }}
          existingInterview={interview}
        />
      )}
    </>
  )
}
