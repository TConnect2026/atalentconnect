"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { User, Clock, Mail } from "lucide-react"

interface KanbanPipelineViewProps {
  searchId: string
  stages: any[]
  candidates: any[]
  onOpenPanel: (panel: string) => void
}

export function KanbanPipelineView({
  searchId,
  stages,
  candidates,
  onOpenPanel
}: KanbanPipelineViewProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null)

  // Calculate days in stage
  const calculateDaysInStage = (candidate: any) => {
    if (!candidate.stage_entry_date) return null
    const days = Math.floor(
      (new Date().getTime() - new Date(candidate.stage_entry_date).getTime()) / (1000 * 60 * 60 * 24)
    )
    return days
  }

  // Get candidates for a specific stage
  const getCandidatesForStage = (stageId: string) => {
    return candidates.filter(c => c.current_stage_id === stageId)
  }

  // Empty state - no stages
  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold mb-2 text-navy">
            Add interview stages to build your pipeline
          </h3>
          <p className="text-text-secondary mb-4">
            Get started by adding your first interview stage
          </p>
          <Button
            onClick={() => onOpenPanel('stages')}
            className="text-white font-semibold bg-orange"
          >
            Add Stages
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Kanban Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-ds-border">
        <h3 className="text-lg font-bold text-navy">Candidate Pipeline</h3>
        <div className="text-sm text-text-secondary">
          <span className="font-semibold">{candidates.length}</span> candidate(s) across{' '}
          <span className="font-semibold">{stages.length}</span> stage(s)
        </div>
      </div>

      {/* Kanban Columns - Horizontal Scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage, index) => {
            const stageCandidates = getCandidatesForStage(stage.id)

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-[280px] bg-white rounded-lg border-2 border-ds-border"
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-ds-border bg-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-navy/10 text-xs font-bold text-navy">
                        {index + 1}
                      </span>
                      <h4 className="font-bold text-text-primary text-sm">{stage.name}</h4>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-bg-page text-xs font-semibold text-text-primary">
                      {stageCandidates.length}
                    </span>
                  </div>
                </div>

                {/* Candidate Cards */}
                <div className="p-2 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {stageCandidates.length === 0 ? (
                    <div className="py-8 text-center">
                      <User className="w-10 h-10 mx-auto text-text-muted mb-2" />
                      <p className="text-xs text-text-muted">No candidates yet</p>
                    </div>
                  ) : (
                    stageCandidates.map((candidate) => {
                      const daysInStage = calculateDaysInStage(candidate)

                      return (
                        <div
                          key={candidate.id}
                          className="bg-white border border-ds-border rounded-lg p-3 hover:border-navy hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          {/* Candidate Name */}
                          <h5 className="font-bold text-sm text-text-primary mb-2 truncate">
                            {candidate.first_name} {candidate.last_name}
                          </h5>

                          {/* Email */}
                          {candidate.email && (
                            <div className="flex items-center gap-1 text-xs text-text-secondary mb-2">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{candidate.email}</span>
                            </div>
                          )}

                          {/* Current Company/Title */}
                          {candidate.current_company && (
                            <p className="text-xs text-text-secondary mb-2 truncate">
                              {candidate.current_title && `${candidate.current_title} at `}
                              {candidate.current_company}
                            </p>
                          )}

                          {/* Days in Stage */}
                          {daysInStage !== null && (
                            <div className="flex items-center gap-1 text-xs text-text-muted mt-2 pt-2 border-t border-ds-border">
                              <Clock className="w-3 h-3" />
                              <span>
                                {daysInStage === 0
                                  ? 'Added today'
                                  : daysInStage === 1
                                  ? '1 day in stage'
                                  : `${daysInStage} days in stage`}
                              </span>
                            </div>
                          )}

                          {/* Status Badge */}
                          {candidate.status && (
                            <div className="mt-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  candidate.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : candidate.status === 'interviewing'
                                    ? 'bg-navy/10 text-navy'
                                    : candidate.status === 'offer'
                                    ? 'bg-purple-100 text-purple-800'
                                    : candidate.status === 'hired'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-bg-section text-text-primary'
                                }`}
                              >
                                {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Candidate Detail Modal - Placeholder for Phase 2 */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-navy">
                {selectedCandidate.first_name} {selectedCandidate.last_name}
              </h3>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-text-muted hover:text-text-secondary"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-text-primary">
              <p><strong>Email:</strong> {selectedCandidate.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {selectedCandidate.phone || 'N/A'}</p>
              <p><strong>Current Company:</strong> {selectedCandidate.current_company || 'N/A'}</p>
              <p><strong>Current Title:</strong> {selectedCandidate.current_title || 'N/A'}</p>
              <p><strong>Status:</strong> {selectedCandidate.status || 'N/A'}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setSelectedCandidate(null)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
