"use client"

import type { ReactNode } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

export interface TimelineStage {
  id: string
  name: string
  status: 'completed' | 'current' | 'future'
  date?: string | null // ISO date string
  color?: string | null // hex color from kanban column header
  interviewerName?: string | null
  /** Candidate's current-stage status (Hold / Scheduled / Declined / etc). Only populated on the current stage. */
  candidateStatusLabel?: string | null
  /** ISO date string to render next to the status label (e.g. scheduled interview date). */
  candidateStatusDate?: string | null
  /** Hex color for rendering the status label + date in context. */
  candidateStatusColor?: string | null
}

interface CandidateStageTimelineProps {
  stages: TimelineStage[]
  variant: 'card' | 'panel'
  onStageClick?: (stageId: string, stageName: string, existingDate?: string | null, existingInterviewer?: string | null) => void
  /** ID of the currently-expanded stage (panel variant only) */
  expandedStageId?: string | null
  /** Called when the stage row is clicked (anywhere outside the pencil / Schedule buttons). Only fires on stages with a scheduled date. */
  onToggleExpand?: (stageId: string) => void
  /** Render-prop returning the inline expansion panel for a given stage. Only rendered when the stage matches `expandedStageId`. */
  renderExpansion?: (stage: TimelineStage) => ReactNode
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function CandidateStageTimeline({
  stages,
  variant,
  onStageClick,
  expandedStageId,
  onToggleExpand,
  renderExpansion,
}: CandidateStageTimelineProps) {
  if (stages.length === 0) return null

  // Find the next upcoming interview (current or future with a date)
  const nextUpcoming = stages.find(
    s => (s.status === 'current' || s.status === 'future') && s.date
  )

  if (variant === 'card') {
    return (
      <div className="mt-2">
        {/* Dot timeline */}
        <div className="flex items-center gap-0.5">
          {stages.map((stage, i) => {
            const stageColor = stage.color || (stage.status === 'completed' ? '#22c55e' : stage.status === 'current' ? 'var(--orange)' : '#d1d5db')
            return (
              <div key={stage.id} className="flex items-center">
                <div className="relative group">
                  <div
                    className="w-2.5 h-2.5 rounded-full border-[1.5px] transition-colors"
                    style={
                      stage.status === 'completed'
                        ? { backgroundColor: stageColor, borderColor: stageColor }
                        : stage.status === 'current'
                        ? { backgroundColor: stageColor, borderColor: stageColor }
                        : { backgroundColor: '#ffffff', borderColor: '#d1d5db' }
                    }
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-navy text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    {stage.name}
                    {stage.date && ` — ${formatShortDate(stage.date)}`}
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className="w-3 h-[1.5px]"
                    style={{ backgroundColor: stage.status === 'completed' ? stageColor : '#e5e7eb' }}
                  />
                )}
              </div>
            )
          })}
        </div>
        {/* Next upcoming date */}
        {nextUpcoming && nextUpcoming.date && (
          <p className="text-[10px] font-semibold mt-1 truncate" style={{ color: nextUpcoming.color || 'var(--orange)' }}>
            Next: {nextUpcoming.name} — {formatShortDate(nextUpcoming.date)}
          </p>
        )}
      </div>
    )
  }

  // Panel variant — vertical timeline
  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const stageColor = stage.color || (stage.status === 'completed' ? '#22c55e' : stage.status === 'current' ? 'var(--orange)' : '#d1d5db')
        return (
          <div key={stage.id} className="flex items-start gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={
                  stage.status === 'completed'
                    ? { backgroundColor: stageColor }
                    : stage.status === 'current'
                    ? { border: `2px solid ${stageColor}`, backgroundColor: '#ffffff' }
                    : { border: '2px solid #d1d5db', backgroundColor: '#ffffff' }
                }
              >
                {stage.status === 'completed' && (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
                {stage.status === 'current' && (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }} />
                )}
              </div>
              {i < stages.length - 1 && (
                <div
                  className="w-[2px] h-6"
                  style={{ backgroundColor: stage.status === 'completed' ? stageColor : '#e5e7eb' }}
                />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div
                className={`flex items-center gap-2 min-w-0 pb-2 -mt-0.5 ${
                  onToggleExpand ? 'cursor-pointer hover:bg-bg-section rounded-md -mx-2 px-2 py-1' : ''
                }`}
                onClick={onToggleExpand ? () => onToggleExpand(stage.id) : undefined}
              >
                <span
                  className={`text-base truncate ${stage.status === 'future' ? 'text-text-muted font-semibold' : 'font-bold'}`}
                  style={stage.status !== 'future' ? { color: stageColor } : undefined}
                >
                  {stage.name}
                </span>
                {stage.candidateStatusLabel && (
                  <>
                    <span className="text-text-muted text-sm">-</span>
                    <span
                      className="text-sm font-semibold whitespace-nowrap"
                      style={{ color: stage.candidateStatusColor || stageColor }}
                    >
                      {stage.candidateStatusLabel}
                    </span>
                    {stage.candidateStatusDate && (
                      <>
                        <span className="text-text-muted text-sm">-</span>
                        <span
                          className="text-sm font-semibold whitespace-nowrap"
                          style={{ color: stage.candidateStatusColor || stageColor }}
                        >
                          {new Date(stage.candidateStatusDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </>
                    )}
                  </>
                )}
                {stage.status === 'completed' ? (
                  <span className="text-xs flex-shrink-0" style={{ color: stageColor }}>
                    {stage.date ? formatFullDate(stage.date) : 'Completed'}
                  </span>
                ) : stage.date ? (
                  <>
                    <span className="text-xs flex-shrink-0" style={{ color: stageColor }}>
                      {formatFullDate(stage.date)}
                    </span>
                    {stage.interviewerName && (
                      <span className="text-xs text-text-muted flex-shrink-0 truncate max-w-[120px]">
                        w/ {stage.interviewerName}
                      </span>
                    )}
                  </>
                ) : null}

                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  {onToggleExpand && (
                    expandedStageId === stage.id
                      ? <ChevronUp className="w-3.5 h-3.5 text-navy/60" />
                      : <ChevronDown className="w-3.5 h-3.5 text-navy/60" />
                  )}
                </div>
              </div>

              {/* Inline expansion (notes + transcript + interviewer/date) */}
              {expandedStageId === stage.id && renderExpansion && (
                <div className="pb-3 -mt-1">
                  {renderExpansion(stage)}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
