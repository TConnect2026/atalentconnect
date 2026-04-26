"use client"

import { useState, useEffect } from "react"
import { Candidate, Stage, Interview, InterviewFeedback, Search } from "@/types"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Button } from "@/components/ui/button"
import { AddCandidateDialog } from "@/components/candidates/add-candidate-dialog"
import { CandidateProfile } from "@/components/candidates/candidate-profile"
import { InterviewDetailPanelEnhanced } from "./interview-detail-panel-enhanced"
import { ScheduleInterviewDialogEnhanced } from "./schedule-interview-dialog-enhanced"
import { StageColumnHeader } from "./stage-column-header"

interface PipelineMatrixProps {
  searchId: string
  search: Search
  readOnly?: boolean
  accessLevel?: 'full_access' | 'limited_access'
  canSeeInterviewNotes?: boolean
}

export function PipelineMatrix({
  searchId,
  search,
  readOnly = false,
  accessLevel = 'full_access',
  canSeeInterviewNotes = true
}: PipelineMatrixProps) {
  const [stages, setStages] = useState<Stage[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [feedbackMap, setFeedbackMap] = useState<Record<string, InterviewFeedback[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Panel states
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [showCandidateProfile, setShowCandidateProfile] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [showInterviewDetail, setShowInterviewDetail] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleCandidateId, setScheduleCandidateId] = useState<string | null>(null)
  const [scheduleStageId, setScheduleStageId] = useState<string | null>(null)

  // Row hover state
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  useEffect(() => {
    loadPipelineData()
  }, [searchId])

  const loadPipelineData = async () => {
    setIsLoading(true)
    try {
      // Load stages (interview stages only, filter out sourcing)
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .eq("visible_in_client_portal", true)
        .order("stage_order", { ascending: true })

      if (stagesError) throw stagesError
      setStages(stagesData || [])

      // Load all active candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("search_id", searchId)
        .eq("status", "active")
        .order("stage_order", { ascending: true })

      if (candidatesError) throw candidatesError
      setCandidates(candidatesData || [])

      // Load all interviews
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
        .eq("search_id", searchId)
        .order("scheduled_at", { ascending: true })

      if (interviewsError) throw interviewsError
      setInterviews(interviewsData || [])

      // Load feedback for all interviews
      if (interviewsData && interviewsData.length > 0) {
        const feedbackPromises = interviewsData.map(async (interview) => {
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
      }
    } catch (error) {
      console.error("Error loading pipeline data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getInterviewsForCell = (candidateId: string, stageId: string) => {
    // Get interviews for this candidate at this stage
    // For now, we'll match by candidate and filter by status
    // In production, you'd want a stage_id on the interviews table
    return interviews.filter(i =>
      i.candidate_id === candidateId &&
      (i.status === 'scheduled' || i.status === 'completed' || i.status === 'feedback_received')
    )
  }

  const hasFeedback = (interview: Interview) => {
    const feedback = feedbackMap[interview.id] || []
    return feedback.length > 0
  }

  const formatInterviewDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric'
    })
  }

  const openCandidateProfile = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setShowCandidateProfile(true)
  }

  const openInterviewDetail = (interview: Interview) => {
    setSelectedInterview(interview)
    setShowInterviewDetail(true)
  }

  const openScheduleDialog = (candidateId: string, stageId: string) => {
    setScheduleCandidateId(candidateId)
    setScheduleStageId(stageId)
    setScheduleDialogOpen(true)
  }

  const handleArchiveCandidate = async (candidateId: string) => {
    if (!confirm("Archive this candidate?")) return

    try {
      const { error } = await supabase
        .from("candidates")
        .update({ status: 'declined', decline_reason: 'Archived' })
        .eq("id", candidateId)

      if (error) throw error
      loadPipelineData()
    } catch (error) {
      console.error("Error archiving candidate:", error)
      alert("Failed to archive candidate")
    }
  }

  const handleRemoveCandidate = async (candidateId: string) => {
    if (!confirm("Permanently remove this candidate from the pipeline?")) return

    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", candidateId)

      if (error) throw error
      loadPipelineData()
    } catch (error) {
      console.error("Error removing candidate:", error)
      alert("Failed to remove candidate")
    }
  }

  const handleMoveCandidate = async (candidateId: string, newStageId: string) => {
    try {
      const { error } = await supabase
        .from("candidates")
        .update({ stage_id: newStageId })
        .eq("id", candidateId)

      if (error) throw error
      loadPipelineData()
    } catch (error) {
      console.error("Error moving candidate:", error)
      alert("Failed to move candidate")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading pipeline...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Matrix Container */}
      <div className="overflow-x-auto border border-ds-border rounded-lg bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-ds-border bg-white">
              <th className="sticky left-0 z-20 bg-white px-4 py-3 text-left font-semibold text-navy border-r border-ds-border min-w-[200px]">
                Candidate
              </th>
              {stages.map((stage) => (
                <StageColumnHeader
                  key={stage.id}
                  stage={stage}
                  searchId={searchId}
                  readOnly={readOnly}
                  onStageUpdated={loadPipelineData}
                />
              ))}
              {!readOnly && (
                <th className="px-4 py-3 text-center min-w-[80px]">
                  <button
                    className="text-text-muted hover:text-text-secondary text-2xl font-light"
                    title="Add new stage"
                  >
                    +
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr
                key={candidate.id}
                className="border-b border-ds-border hover:bg-bg-section transition-colors"
                onMouseEnter={() => setHoveredRow(candidate.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Candidate Name Cell */}
                <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-ds-border">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => openCandidateProfile(candidate)}
                      className="text-left text-navy hover:opacity-80 font-medium hover:underline"
                    >
                      {candidate.first_name} {candidate.last_name}
                    </button>
                    {!readOnly && hoveredRow === candidate.id && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleArchiveCandidate(candidate.id)}
                          className="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-bg-section"
                          title="Archive"
                        >
                          📦
                        </button>
                        <button
                          onClick={() => handleRemoveCandidate(candidate.id)}
                          className="text-xs text-text-muted hover:text-red-600 px-2 py-1 rounded hover:bg-bg-section"
                          title="Remove"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </td>

                {/* Interview Stage Cells */}
                {stages.map((stage) => {
                  const cellInterviews = getInterviewsForCell(candidate.id, stage.id)
                  const latestInterview = cellInterviews[cellInterviews.length - 1]

                  return (
                    <td
                      key={stage.id}
                      className="px-4 py-3 text-center border-r border-ds-border min-w-[120px]"
                    >
                      {latestInterview ? (
                        <button
                          onClick={() => openInterviewDetail(latestInterview)}
                          className="inline-flex items-center gap-1 text-sm text-text-primary hover:text-navy hover:underline"
                        >
                          <span>{formatInterviewDate(latestInterview.scheduled_at)}</span>
                          {hasFeedback(latestInterview) && (
                            <span className="text-green-600" title="Feedback submitted">✓</span>
                          )}
                        </button>
                      ) : (
                        <div className="text-sm text-text-muted">
                          {readOnly ? (
                            '—'
                          ) : (
                            <button
                              onClick={() => openScheduleDialog(candidate.id, stage.id)}
                              className="text-text-muted hover:text-navy hover:underline"
                            >
                              —
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}

                {!readOnly && (
                  <td className="px-4 py-3"></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Candidate Button */}
      {!readOnly && (
        <div className="pt-2">
          <AddCandidateDialog
            searchId={searchId}
            stages={stages}
            onCandidateAdded={loadPipelineData}
          />
        </div>
      )}

      {/* Candidate Profile Panel */}
      {selectedCandidate && (
        <CandidateProfile
          candidate={selectedCandidate}
          isOpen={showCandidateProfile}
          onClose={() => {
            setShowCandidateProfile(false)
            setSelectedCandidate(null)
          }}
          readOnly={readOnly}
          accessLevel={accessLevel}
          searchId={searchId}
          search={search}
          onDataReload={loadPipelineData}
        />
      )}

      {/* Interview Detail Panel */}
      {selectedInterview && (
        <InterviewDetailPanelEnhanced
          interview={selectedInterview}
          feedback={feedbackMap[selectedInterview.id] || []}
          isOpen={showInterviewDetail}
          onClose={() => {
            setShowInterviewDetail(false)
            setSelectedInterview(null)
          }}
          readOnly={readOnly}
          canSeeInterviewNotes={canSeeInterviewNotes}
          searchId={searchId}
          search={search}
          onInterviewUpdated={loadPipelineData}
        />
      )}

      {/* Schedule Interview Dialog */}
      {scheduleDialogOpen && scheduleCandidateId && scheduleStageId && (
        <ScheduleInterviewDialogEnhanced
          isOpen={scheduleDialogOpen}
          onClose={() => {
            setScheduleDialogOpen(false)
            setScheduleCandidateId(null)
            setScheduleStageId(null)
          }}
          candidateId={scheduleCandidateId}
          stageId={scheduleStageId}
          searchId={searchId}
          onInterviewScheduled={loadPipelineData}
        />
      )}
    </div>
  )
}
