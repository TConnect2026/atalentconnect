"use client"

import { useState, useEffect } from "react"
import { Interview, InterviewFeedback, Candidate, Stage } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface InterviewDetailPanelProps {
  interview: Interview
  feedback: InterviewFeedback[]
  isOpen: boolean
  onClose: () => void
  readOnly?: boolean
  canSeeInterviewNotes?: boolean
  onInterviewUpdated: () => void
}

export function InterviewDetailPanel({
  interview,
  feedback,
  isOpen,
  onClose,
  readOnly = false,
  canSeeInterviewNotes = true,
  onInterviewUpdated
}: InterviewDetailPanelProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const [interviewGuides, setInterviewGuides] = useState<Array<{ name: string; url: string }>>([])
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)

  useEffect(() => {
    if (isOpen && interview) {
      loadInterviewDetails()
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

      // Load stage (if we have stage_id on interview, otherwise get from candidate)
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

  const loadInterviewGuides = async (stageData: Stage) => {
    const guides: Array<{ name: string; url: string }> = []

    // Add interview's direct guide
    if (interview.interview_guide_url) {
      guides.push({
        name: "Interview Guide",
        url: interview.interview_guide_url
      })
    }

    // Add stage's guide
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
    if (!confirm("Cancel this interview?")) return

    try {
      const { error } = await supabase
        .from("interviews")
        .update({ status: 'cancelled' })
        .eq("id", interview.id)

      if (error) throw error

      onInterviewUpdated()
      onClose()
    } catch (error) {
      console.error("Error cancelling interview:", error)
      alert("Failed to cancel interview")
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
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {candidate?.first_name} {candidate?.last_name} — {stage?.name} Interview
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {date} · {time}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Interviewer(s) */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Interviewer(s)</p>
              <p className="text-gray-900">{getInterviewerNames()}</p>
            </div>

            {/* Interview Guide(s) */}
            {interviewGuides.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">📋 Interview Guide(s)</p>
                <div className="space-y-2">
                  {interviewGuides.map((guide, index) => (
                    <button
                      key={index}
                      onClick={() => window.open(guide.url, '_blank')}
                      className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-900">{guide.name}</span>
                      <span className="text-[#1F3C62] text-sm">View →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prep Notes (if available) */}
            {interview.prep_notes && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Prep Notes</p>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.prep_notes}</p>
                </div>
              </div>
            )}

            {/* Feedback (if user has access) */}
            {canSeeInterviewNotes && feedback.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Feedback</p>
                <div className="space-y-4">
                  {feedback.map((fb) => (
                    <div key={fb.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="font-medium text-gray-900 mb-2">{fb.interviewer_name}</p>
                      {fb.interview_notes && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.interview_notes}</p>
                        </div>
                      )}
                      {fb.strengths && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-gray-600 uppercase">Strengths</p>
                          <p className="text-sm text-gray-700">{fb.strengths}</p>
                        </div>
                      )}
                      {fb.concerns && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-gray-600 uppercase">Concerns</p>
                          <p className="text-sm text-gray-700">{fb.concerns}</p>
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
                <p className="text-sm font-semibold text-gray-700 mb-2">Feedback</p>
                <p className="text-sm text-gray-500 italic">
                  No feedback submitted yet
                </p>
              </div>
            )}

            {/* Actions */}
            {!readOnly && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelInterview}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
