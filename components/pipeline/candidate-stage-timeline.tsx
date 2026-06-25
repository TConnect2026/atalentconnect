"use client"

import { useState, Fragment, type ReactNode } from "react"
import { Archive, Calendar, Check, ChevronDown, ChevronUp, Send } from "lucide-react"
import { CandidateStatusPill } from "@/components/candidates/candidate-card"

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
                  (stage.status === 'current' && onStageClick) || onToggleExpand ? 'cursor-pointer hover:bg-bg-section rounded-md -mx-2 px-2 py-1' : ''
                }`}
                onClick={
                  stage.status === 'current' && onStageClick
                    ? () => onStageClick(stage.id, stage.name, stage.date, stage.interviewerName)
                    : onToggleExpand
                    ? () => onToggleExpand(stage.id)
                    : undefined
                }
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

interface CandidateStageStripProps {
  stages: TimelineStage[]
  /** The candidate's current stage id (fallback for locating the current node). */
  currentStageId?: string | null
  /** Canonical status key (hold / present_to_client / pending_schedule / scheduled / declined) for the collapsed-line pill. */
  statusKey?: string | null
  /** Resolved status: when an action is DONE, show "label · date" instead of a status-owed pill. Takes precedence over statusKey. `pill` renders it as a solid pill (white text + Send icon) like the other status pills; otherwise plain colored text. */
  statusDate?: { label: string; iso: string; color?: string; pill?: boolean; icon?: boolean } | null
  /** Optional control rendered on the collapsed line, just before the chevron (e.g. a status menu). */
  actionSlot?: ReactNode
  /** Opens the schedule dialog for a stage (wired to the explicit Schedule button only). */
  onStageClick?: (stageId: string, stageName: string, existingDate?: string | null, existingInterviewer?: string | null) => void
  /** ID of the stage whose editor is currently open (controlled by the parent). */
  expandedStageId?: string | null
  /** Toggles which stage's editor is open. Parent handles open/switch/close. */
  onToggleExpand?: (stageId: string) => void
  /** The existing per-stage editor (notes / transcript / analysis / prep), re-homed below the strip. */
  renderExpansion?: (stage: TimelineStage) => ReactNode
}

/**
 * Recruiter-only compact replacement for the vertical timeline. Collapsed by
 * default: a single "[current stage] · [status]" line. Expands to a horizontal
 * strip of PAST + CURRENT stages (never future). Clicking a node opens that
 * stage's existing editor (renderExpansion) below the strip; the current node
 * also carries an explicit Schedule button that opens the schedule dialog.
 *
 * Separate from CandidateStageTimeline so the client portal's "panel" variant
 * is entirely unaffected.
 */
export function CandidateStageStrip({
  stages,
  currentStageId,
  statusKey,
  statusDate,
  actionSlot,
  onStageClick,
  expandedStageId,
  onToggleExpand,
  renderExpansion,
}: CandidateStageStripProps) {
  // Collapsed by default on every open (the parent remounts this per candidate).
  // Expanded by default on every panel open (the parent keys this per candidate,
  // so it remounts open each time). The chevron can still collapse it.
  const [open, setOpen] = useState(true)
  if (stages.length === 0) return null

  const current =
    stages.find((s) => s.status === 'current') ||
    (currentStageId ? stages.find((s) => s.id === currentStageId) : undefined)

  // Show every stage in the strip (past, current, future). Future stages render
  // muted and non-interactive; the data shape is unchanged.
  const visible = stages

  const expandedStage = expandedStageId
    ? visible.find((s) => s.id === expandedStageId)
    : undefined

  // Strip node colors are driven by STATE, not per-stage kanban color:
  // completed = navy, current = green (you-are-here), future = muted grey.
  const NAVY = '#1F3C62'
  const GREEN = '#059669' // emerald-600: "you are here" (calmer than neon #22C55E)

  return (
    <div>
      {/* Collapsed status line. The name/status area toggles the strip; the
          action slot (e.g. a status menu) and chevron sit to the right as
          siblings so the action isn't nested inside the toggle button. */}
      <div className="w-full flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          {/* Stage name removed — it's already shown bold in the strip node
              below. This line shows only the status indicator. */}
          {/* A resolved action shows "label · date" text; otherwise the SAME
              canonical pill the card uses (pill only while the action is owed). */}
          {statusDate ? (
            statusDate.pill ? (
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: statusDate.color, color: "#FFFFFF" }}
              >
                <Send className="w-3 h-3 flex-shrink-0" />
                {statusDate.label}{statusDate.iso ? ` · ${formatShortDate(statusDate.iso)}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap" style={{ color: statusDate.color }}>
                {statusDate.icon && <Archive className="w-3.5 h-3.5 flex-shrink-0" />}
                {statusDate.label}{statusDate.iso ? ` · ${formatShortDate(statusDate.iso)}` : ''}
              </span>
            )
          ) : statusKey ? (
            <CandidateStatusPill status={statusKey} />
          ) : null}
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          {actionSlot}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? (
              <ChevronUp className="w-4 h-4 text-navy" />
            ) : (
              <ChevronDown className="w-4 h-4 text-navy" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3">
          {/* Horizontal strip: every stage, left → right. Colors are by STATE,
              not by stage — completed navy, current green (you-are-here),
              future muted grey. */}
          <div className="flex items-start gap-1 overflow-x-auto pb-1">
            {visible.map((stage, i) => {
              const isCompleted = stage.status === 'completed'
              const isCurrent = stage.status === 'current'
              const isFuture = stage.status === 'future'
              const isExpanded = expandedStageId === stage.id

              const circle = (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={
                    isCompleted
                      ? { backgroundColor: NAVY }
                      : isCurrent
                      ? { border: `2px solid ${GREEN}`, backgroundColor: '#ffffff', boxShadow: `0 0 0 3px ${GREEN}2e` }
                      : { border: '2px solid #D1D5DB', backgroundColor: '#ffffff' }
                  }
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isCurrent ? GREEN : '#9CA3AF' }}
                    />
                  )}
                </span>
              )
              const label = (
                <span
                  className={`text-xs text-center leading-tight line-clamp-2 ${isCurrent ? 'font-bold' : 'font-semibold'}`}
                  style={{ color: isFuture ? '#9CA3AF' : NAVY }}
                >
                  {stage.name}
                </span>
              )
              // Date slot. Past (completed) nodes carry a recordable date: the
              // date itself opens the schedule dialog to edit, or a subtle
              // "+ date" link adds one. Current shows a static date (its Schedule
              // button below handles editing). Future shows nothing.
              let dateEl: ReactNode = null
              if (isCompleted) {
                dateEl = stage.date ? (
                  <span
                    onClick={(e) => { e.stopPropagation(); onStageClick?.(stage.id, stage.name, stage.date, stage.interviewerName) }}
                    className="text-[10px] text-text-muted whitespace-nowrap hover:text-navy hover:underline cursor-pointer"
                  >
                    {formatShortDate(stage.date)}
                  </span>
                ) : onStageClick ? (
                  <span
                    onClick={(e) => { e.stopPropagation(); onStageClick(stage.id, stage.name, null, stage.interviewerName) }}
                    className="text-[10px] text-navy/50 hover:text-navy hover:underline cursor-pointer"
                  >
                    + date
                  </span>
                ) : null
              } else if (isCurrent && stage.date) {
                dateEl = (
                  <span className="text-xs font-bold text-navy whitespace-nowrap">
                    {formatShortDate(stage.date)}
                  </span>
                )
              }

              return (
                <Fragment key={stage.id}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    {isFuture ? (
                      // Future: visible but muted and non-interactive (no editor).
                      <div className="flex flex-col items-center gap-1 px-2 py-1.5 w-[92px]">
                        {circle}
                        {label}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleExpand?.(stage.id)}
                        className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-md transition-colors w-[92px] ${
                          isExpanded ? 'bg-bg-section ring-1 ring-ds-border' : 'hover:bg-bg-section'
                        }`}
                      >
                        {circle}
                        {label}
                        {dateEl}
                      </button>
                    )}
                    {/* Explicit schedule access — current stage only. Bare node
                        click opens the editor; this opens the schedule dialog. */}
                    {isCurrent && onStageClick && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStageClick(stage.id, stage.name, stage.date, stage.interviewerName)
                        }}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-navy hover:underline"
                      >
                        <Calendar className="w-4 h-4" />
                        {stage.date ? 'Reschedule' : 'Schedule'}
                      </button>
                    )}
                  </div>
                  {i < visible.length - 1 && (
                    <div
                      className="w-4 h-[2px] mt-[19px] flex-shrink-0"
                      style={{ backgroundColor: isCompleted ? NAVY : '#e5e7eb' }}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>

          {/* The clicked stage's full editor opens here, below the strip. This
              is the existing per-stage editor (renderExpansion) — re-homed from
              the vertical row to a horizontal node click, not rewritten. */}
          {expandedStage && renderExpansion && (
            <div className="mt-3">{renderExpansion(expandedStage)}</div>
          )}
        </div>
      )}
    </div>
  )
}
