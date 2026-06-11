"use client"

import { useState, type ReactNode } from "react"
import {
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  DollarSign,
  Eye,
  Tag,
  Youtube,
  Globe,
  Link2,
  Mail,
  Phone,
  Calendar,
  HelpCircle,
  Bookmark,
} from "lucide-react"
import type { Candidate, Document, Interview } from "@/types"
import { LinkedInIcon } from "@/components/icons/linkedin-icon"

export interface CandidateCardProps {
  candidate: Candidate
  interviews: Interview[]
  documents: Document[]
  /** Optional chips row above the header (e.g. Hold, In portal) */
  badges?: ReactNode
  /** Optional control in the top-right of the header (select checkbox, three-dot menu, etc.) */
  headerAction?: ReactNode
  /** Optional full-width footer (e.g. "Share your feedback") */
  footer?: ReactNode
  /** Outline color when the card is visually selected */
  isSelected?: boolean
  /** Drag and click — optional for recruiter pipeline */
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  isDragging?: boolean
  onClick?: () => void
  /** Tone down colors when card represents an inactive candidate */
  muted?: boolean
  /** Show the candidate's email and phone under name/title (recruiter views only) */
  showContact?: boolean
  /** Collapse interview history to a single "Next: …" line instead of the full list */
  nextInterviewOnly?: boolean
  /**
   * Minimal pipeline-kanban variant:
   * - hides the recruiter's-read block
   * - drops LinkedIn from the contact block (email + phone only)
   * - hides the bottom action buttons row entirely
   */
  pipelineCompact?: boolean
}

const NAVY = "#1F3C62"
const BORDER = "rgba(31, 60, 98, 0.1)"

export const STATUS_BADGES: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  hold: { label: "Hold", bg: "#475569", fg: "#FFFFFF" },            // slate-600: deliberate hold pill
  pending_schedule: { label: "Pending Schedule", bg: "#F59E0B", fg: "#FFFFFF" }, // amber
  scheduled: { label: "Scheduled", bg: "#22C55E", fg: "#FFFFFF" },  // green
  present_to_client: { label: "Present to Client", bg: "#22C55E", fg: "#FFFFFF" }, // green
  declined: { label: "Declined", bg: "#EF4444", fg: "#FFFFFF" },    // red
}

const getInitials = (first?: string, last?: string) => {
  const f = (first || "").trim()[0] || ""
  const l = (last || "").trim()[0] || ""
  return (f + l).toUpperCase() || "?"
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const hostnameLabel = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return host || "Link"
  } catch {
    return "Link"
  }
}

const extractLinks = (text?: string): { url: string; label: string }[] => {
  if (!text) return []
  const urlRegex = /https?:\/\/[^\s<>"']+|(?:^|\s)(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?/gi
  const matches = text.match(urlRegex) || []
  const seen = new Set<string>()
  const out: { url: string; label: string }[] = []
  for (const raw of matches) {
    const url = normalizeUrl(raw)
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push({ url, label: hostnameLabel(url) })
  }
  return out
}

const getPreview = (text: string, sentences = 2) => {
  if (!text) return ""
  const parts = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+[.!?]+/g)
  if (!parts) return text.slice(0, 220) + (text.length > 220 ? "..." : "")
  return parts.slice(0, sentences).join(" ").trim()
}

export function CandidateCard({
  candidate,
  interviews,
  documents,
  badges,
  headerAction,
  footer,
  isSelected = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onClick,
  muted = false,
  showContact = false,
  nextInterviewOnly = false,
  pipelineCompact = false,
}: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false)

  const assessment = candidate.recruiter_assessment || ""
  const hasAssessment = assessment.trim().length > 0
  const preview = getPreview(assessment, 2)
  const needsTruncation = hasAssessment && assessment.length > preview.length + 10

  const candidateInterviews = interviews
    .filter((i) => i.candidate_id === candidate.id)
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )

  const resumeDoc = documents.find(
    (d) => (d as any).candidate_id === candidate.id && d.type !== "interview_guide"
  )
  const resumeUrl = candidate.resume_url || resumeDoc?.file_url
  const linkedinUrl = candidate.linkedin_url
  const youtubeUrl = candidate.youtube_url
  const websiteUrl = candidate.website_url
  const additionalLinks = extractLinks(candidate.additional_links)

  const compensation =
    candidate.compensation_expectation ||
    candidate.compensation_expectations ||
    candidate.current_compensation

  const tags = (candidate as any).tags as string[] | undefined

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`rounded-[12px] bg-white transition ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${onClick && !draggable ? "cursor-pointer" : ""} ${
        isDragging ? "opacity-40 scale-95" : ""
      } ${muted ? "opacity-60" : ""} ${pipelineCompact ? "flex flex-col h-[220px]" : ""}`}
      style={{
        border: `1px solid rgba(31, 60, 98, 0.3)`,
        borderLeft: `3px solid ${NAVY}`,
        outline: isSelected ? `2px solid ${NAVY}` : "none",
        outlineOffset: "-2px",
      }}
    >
      {/* Badges row */}
      {badges && <div className="px-4 pt-3 flex items-center gap-1 flex-wrap">{badges}</div>}

      {/* Header: avatar centered on top, name/title/company stacked below and centered, action top-right */}
      <div className={`relative px-4 ${badges ? "pt-2" : "pt-4"} ${pipelineCompact ? "flex-1 flex flex-col pb-3" : ""}`}>
        {headerAction && (
          <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        )}

        <div className="flex justify-center mb-2">
          {candidate.photo_url ? (
            <img
              src={candidate.photo_url}
              alt={`${candidate.first_name} ${candidate.last_name}`}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              style={{ border: `1px solid ${BORDER}` }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: NAVY }}
            >
              {getInitials(candidate.first_name, candidate.last_name)}
            </div>
          )}
        </div>

        <div className={`min-w-0 ${pipelineCompact ? "flex-1 flex flex-col" : ""}`}>
          <p className="text-sm font-semibold text-navy break-words text-center leading-tight">
            {candidate.first_name} {candidate.last_name}
          </p>
          {candidate.current_title && (
            <p className="text-xs text-navy break-words text-center mt-1 line-clamp-2">
              {candidate.current_title}
            </p>
          )}
          {candidate.current_company && (
            <p className="text-xs text-navy text-center mt-0.5 truncate">
              {candidate.current_company}
            </p>
          )}

          {/* Status badge — color-coded, shown on pipeline-compact cards */}
          {pipelineCompact && (
            <div className="mt-2 flex justify-center min-h-[20px]">
              {candidate.candidate_status && (() => {
                const cfg = STATUS_BADGES[candidate.candidate_status]
                if (!cfg) return null
                // Scheduling is derived now (the dot below), not a manual badge.
                if (candidate.candidate_status === "pending_schedule" || candidate.candidate_status === "scheduled") return null
                return (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: cfg.bg, color: cfg.fg }}
                  >
                    {candidate.candidate_status === "hold" && <Bookmark className="w-3 h-3 flex-shrink-0" />}
                    {cfg.label}
                  </span>
                )
              })()}
            </div>
          )}

          {/* Interview status for the candidate's current stage, plus the next
              upcoming interview across all stages. Display only — derived from
              the interviews already passed in. */}
          {pipelineCompact && (() => {
            // Hold and Present to Client own the visual via their badge above,
            // so the derived scheduling line is fully suppressed for both.
            if (candidate.candidate_status === "hold" || candidate.candidate_status === "present_to_client") return null
            const fmtSched = (iso: string) => {
              const d = new Date(iso)
              const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
              if (!hasTime) return datePart
              return `${datePart}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
            }
            const now = Date.now()
            // Start of today, local. "Past" means the scheduled calendar day
            // has fully passed, so an interview earlier today is still treated
            // as today/upcoming (green), not Pending feedback. (A 9am interview
            // today does not flip to Pending feedback at 9:01am.)
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)
            const startOfTodayMs = startOfToday.getTime()
            // Current-stage row (one interview row per stage at most).
            const currentIv = candidateInterviews.find(
              (i) => i.stage_id === candidate.stage_id && !!i.scheduled_at
            )
            let dotColor = "#EAB308" // yellow: pending schedule
            let primaryLabel = "Pending schedule"
            let primaryTone = "text-navy"
            // True when the current-stage interview's calendar day has passed;
            // drives the grey date plus the yellow "Pending feedback" badge.
            let dayPassed = false
            if (currentIv) {
              dayPassed = new Date(currentIv.scheduled_at).getTime() < startOfTodayMs
              dotColor = dayPassed ? "#9CA3AF" : "#22C55E" // grey passed-day, green today/upcoming
              primaryLabel = fmtSched(currentIv.scheduled_at)
              primaryTone = dayPassed ? "text-text-muted" : "text-navy"
            }
            // Soonest future interview across any stage (list is sorted ascending).
            const nextUp = candidateInterviews.find(
              (i) => !!i.scheduled_at && new Date(i.scheduled_at).getTime() >= now
            )
            return (
              <div className="mt-auto pt-2 flex flex-col items-center gap-0.5">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${primaryTone}`}>
                  {currentIv ? (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#EAB308" }} />
                  )}
                  {primaryLabel}
                </span>
                {/* Reserved-height slot for the Pending feedback badge so cards
                    do not jump whether or not the badge is showing. */}
                <div className="min-h-[18px] flex items-center justify-center">
                  {dayPassed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-navy">
                      <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Pending feedback
                    </span>
                  )}
                </div>
                {/* Next takes priority; if parked post-interview (current-stage
                    day passed, no upcoming) show the most recent past instead.
                    Never both. */}
                {nextUp ? (
                  <span className="text-[10px] text-text-muted">
                    Next: {fmtSched(nextUp.scheduled_at)}{nextUp.interviewer_name ? ` with ${nextUp.interviewer_name}` : ""}
                  </span>
                ) : dayPassed && currentIv ? (
                  <span className="text-[10px] text-text-muted">
                    Last: {fmtSched(currentIv.scheduled_at)}
                  </span>
                ) : null}
              </div>
            )
          })()}

          {!pipelineCompact && showContact && (candidate.email || candidate.phone || candidate.linkedin_url) && (
            <div
              className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-navy"
              onClick={(e) => e.stopPropagation()}
            >
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="inline-flex items-center gap-1 hover:text-navy break-all"
                >
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </a>
              )}
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-1 hover:text-navy"
                >
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{candidate.phone}</span>
                </a>
              )}
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-navy break-all"
                >
                  <LinkedInIcon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {candidate.linkedin_url.replace(/^https?:\/\//i, "")}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recruiter's read — accented block */}
      {hasAssessment && !pipelineCompact && (
        <div
          className="mx-4 mt-3 px-3.5 py-3 rounded-[8px]"
          style={{
            backgroundColor: "#F3EFE8",
            borderLeft: `3px solid ${NAVY}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-navy/60 mb-1.5 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Recruiter&apos;s read
          </div>

          {!expanded ? (
            <p className="text-xs leading-relaxed text-navy/85 whitespace-pre-wrap">
              {preview}
            </p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs leading-relaxed text-navy/85 whitespace-pre-wrap">
                {assessment}
              </p>

              {(candidate.location || compensation) && (
                <div className="pt-2 border-t border-navy/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy/70">
                  {candidate.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {candidate.location}
                    </span>
                  )}
                  {compensation && (
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {compensation}
                    </span>
                  )}
                </div>
              )}

              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/8 text-[10px] font-medium text-navy"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {needsTruncation && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:text-navy/70"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Read more <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Interview section — hidden in pipeline-compact mode */}
      {pipelineCompact ? null : nextInterviewOnly ? (
        (() => {
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
          const tomorrowStart = todayStart + 24 * 60 * 60 * 1000
          const next = candidateInterviews.find(
            (i) => new Date(i.scheduled_at).getTime() >= todayStart
          )

          if (!next) {
            return (
              <p className="px-4 mt-3 text-xs italic text-navy">
                No interview scheduled
              </p>
            )
          }

          const scheduled = new Date(next.scheduled_at).getTime()
          const isToday = scheduled >= todayStart && scheduled < tomorrowStart
          const name =
            next.interviewers && next.interviewers.length > 0
              ? next.interviewers.map((i) => i.contact_name).join(", ")
              : next.interviewer_name

          return (
            <div className="px-4 mt-3 text-xs break-words">
              <span className="text-navy">Next: </span>
              <span className="text-navy font-medium">{name || "Interviewer"}</span>
              <span className="text-navy"> · </span>
              <span
                className={isToday ? "font-semibold" : "text-navy"}
                style={isToday ? { color: "#D97757" } : undefined}
              >
                {isToday ? "Today" : formatDate(next.scheduled_at)}
              </span>
            </div>
          )
        })()
      ) : (
        <div className="px-4 mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-navy/60 mb-1.5">
            Interview history
          </div>
          {candidateInterviews.length === 0 ? (
            <p className="text-xs italic text-navy/50">No interviews scheduled yet</p>
          ) : (
            <ul className="space-y-1">
              {candidateInterviews.map((itv) => {
                const name =
                  itv.interviewers && itv.interviewers.length > 0
                    ? itv.interviewers.map((i) => i.contact_name).join(", ")
                    : itv.interviewer_name
                return (
                  <li
                    key={itv.id}
                    className="flex items-center justify-between text-xs text-navy/80 gap-2"
                  >
                    <span className="break-words min-w-0 flex-1">{name || "Interviewer"}</span>
                    <span className="text-navy/50 flex-shrink-0">
                      {formatDate(itv.scheduled_at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Actions: icon-only for Resume + LinkedIn, text pills for the rest */}
      {!pipelineCompact && (resumeUrl || (linkedinUrl && !showContact) || youtubeUrl || websiteUrl || additionalLinks.length > 0) && (
        <div className="px-4 mt-3 flex flex-wrap gap-1.5 items-center" onClick={(e) => e.stopPropagation()}>
          {resumeUrl && (
            <IconLinkButton
              href={resumeUrl}
              icon={<FileText className="w-3.5 h-3.5" />}
              label="Resume"
            />
          )}
          {linkedinUrl && !showContact && (
            <IconLinkButton
              href={linkedinUrl}
              icon={<LinkedInIcon className="w-3.5 h-3.5" />}
              label="LinkedIn"
            />
          )}
          {youtubeUrl && (
            <LinkButton href={youtubeUrl} icon={<Youtube className="w-3 h-3" />} label="YouTube" />
          )}
          {websiteUrl && (
            <LinkButton href={websiteUrl} icon={<Globe className="w-3 h-3" />} label="Website" />
          )}
          {additionalLinks.map((l) => (
            <LinkButton
              key={l.url}
              href={l.url}
              icon={<Link2 className="w-3 h-3" />}
              label={l.label}
            />
          ))}
        </div>
      )}

      {/* Bottom padding if no footer */}
      {!footer && <div className="pb-4" />}

      {/* Footer slot — e.g. full-width feedback button */}
      {footer && (
        <div className="mt-4 overflow-hidden rounded-b-[12px]">{footer}</div>
      )}
    </div>
  )
}

function LinkButton({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-navy hover:bg-navy/5 transition max-w-full"
      style={{ border: `1px solid ${NAVY}` }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  )
}

function IconLinkButton({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-navy hover:bg-navy/5 transition flex-shrink-0"
      style={{ border: `1px solid ${NAVY}` }}
    >
      {icon}
    </a>
  )
}
