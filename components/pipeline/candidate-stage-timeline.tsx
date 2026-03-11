"use client"

import { Check, Pencil } from "lucide-react"

export interface TimelineStage {
  id: string
  name: string
  status: 'completed' | 'current' | 'future'
  date?: string | null // ISO date string
  color?: string | null // hex color from kanban column header
  interviewerName?: string | null
}

interface CandidateStageTimelineProps {
  stages: TimelineStage[]
  variant: 'card' | 'panel'
  onStageClick?: (stageId: string, stageName: string, existingDate?: string | null, existingInterviewer?: string | null) => void
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

export function CandidateStageTimeline({ stages, variant, onStageClick }: CandidateStageTimelineProps) {
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
            <div className="flex items-center gap-2 min-w-0 flex-1 pb-2 -mt-0.5">
              <span
                className={`text-sm truncate ${stage.status === 'future' ? 'text-text-muted font-medium' : 'font-semibold'}`}
                style={stage.status !== 'future' ? { color: stageColor } : undefined}
              >
                {stage.name}
              </span>
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
                  {onStageClick && (
                    <button
                      onClick={() => onStageClick(stage.id, stage.name, stage.date, stage.interviewerName)}
                      className="ml-auto p-1 rounded hover:bg-bg-section text-text-muted hover:text-navy transition-colors flex-shrink-0"
                      title="Edit schedule"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  {onStageClick && (
                    <button
                      onClick={() => onStageClick(stage.id, stage.name, null, null)}
                      className="ml-auto px-3 py-2 sm:py-1 rounded text-xs font-semibold text-white bg-orange hover:opacity-90 transition-opacity flex-shrink-0 min-h-[36px] sm:min-h-0"
                    >
                      Schedule
                    </button>
                  )}
                  {!onStageClick && (
                    <span className="text-xs text-text-muted flex-shrink-0">TBD</span>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
