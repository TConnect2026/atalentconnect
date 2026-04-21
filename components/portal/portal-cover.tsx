import { CalendarDays, Flag, Clock, UserCircle2, FileText } from "lucide-react"
import type { Stage, Candidate, Document } from "@/types"
import { PortalFunnel } from "./portal-funnel"

interface PortalCoverProps {
  companyName: string
  positionTitle: string
  clientLogoUrl?: string | null
  launchDate?: string | null
  targetCloseDate?: string | null
  leadRecruiterName?: string | null
  leadRecruiterEmail?: string | null
  stages: Stage[]
  candidates: Candidate[]
  documents?: Document[]
}

const ORANGE = "#D97757"

const formatDate = (d?: string | null) => {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const daysOpenFrom = (launch?: string | null) => {
  if (!launch) return "—"
  const start = new Date(launch + "T00:00:00").getTime()
  const now = Date.now()
  const days = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)))
  return `${days}`
}

export function PortalCover({
  companyName,
  positionTitle,
  clientLogoUrl,
  launchDate,
  targetCloseDate,
  leadRecruiterName,
  leadRecruiterEmail,
  stages,
  candidates,
  documents = [],
}: PortalCoverProps) {
  const positionProfile = documents.find(
    (d) => d.visible_to_portal && (d.type === "position_spec" || d.type === "job_description")
  )

  const details: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    {
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      label: "Search launched",
      value: formatDate(launchDate),
    },
    {
      icon: <Flag className="w-3.5 h-3.5" />,
      label: "Target close",
      value: formatDate(targetCloseDate),
    },
    {
      icon: <Clock className="w-3.5 h-3.5" />,
      label: "Days open",
      value: daysOpenFrom(launchDate),
    },
    {
      icon: <UserCircle2 className="w-3.5 h-3.5" />,
      label: "Lead recruiter",
      value:
        leadRecruiterName && leadRecruiterEmail ? (
          <a
            href={`mailto:${leadRecruiterEmail}`}
            className="text-white hover:underline"
          >
            {leadRecruiterName}
          </a>
        ) : (
          leadRecruiterName || "—"
        ),
    },
  ]

  return (
    <div className="relative w-full overflow-hidden">
      {/* Base left-to-right navy gradient */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, #0D2137 0%, #2A5A8C 100%)",
        }}
      />

      {/* Soft radial glow in the upper-right */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 30%, transparent 60%)",
        }}
      />

      {/* Content */}
      <div className="relative px-6 sm:px-10 pt-12 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-start">
          {/* LEFT — search details */}
          <div className="min-w-0">
            <div className="flex items-start gap-5">
              {clientLogoUrl && (
                <div className="flex-shrink-0 bg-white/95 rounded-[8px] p-3 flex items-center justify-center">
                  <img
                    src={clientLogoUrl}
                    alt={companyName}
                    className="h-14 max-w-[140px] object-contain"
                  />
                </div>
              )}

              <div className="min-w-0 text-white flex-1">
                <div
                  className="text-[32px] leading-[1.1] break-words tracking-tight"
                  style={{ fontWeight: 500 }}
                >
                  {companyName}
                </div>
                <div
                  className="text-[32px] leading-[1.1] break-words tracking-tight mt-3"
                  style={{ fontWeight: 500 }}
                >
                  {positionTitle}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-start gap-x-5 gap-y-3">
              {details.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5 min-w-0">
                  <div
                    className="mt-[3px] flex-shrink-0"
                    style={{ color: "rgba(255, 255, 255, 0.6)" }}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "rgba(255, 255, 255, 0.6)" }}
                    >
                      {item.label}
                    </div>
                    <div className="text-sm font-medium text-white">
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {positionProfile && (
              <div className="mt-6">
                <a
                  href={positionProfile.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline"
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  Position Profile
                </a>
              </div>
            )}
          </div>

          {/* RIGHT — funnel in a white panel (sits below the wordmark in top-right) */}
          <div className="min-w-0 md:pt-8">
            <div className="bg-white rounded-[12px] p-5 shadow-sm">
              <PortalFunnel stages={stages} candidates={candidates} />
            </div>
          </div>
        </div>
      </div>

      {/* "Powered by" wordmark — top-right corner with padding */}
      <div
        className="absolute top-5 right-6 sm:right-8 text-xs tracking-wide select-none pointer-events-none z-10"
        style={{ color: ORANGE, fontWeight: 600 }}
      >
        @talentconnect
      </div>

      {/* Brand orange accent line along the bottom edge */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[3px]"
        style={{ backgroundColor: ORANGE }}
      />
    </div>
  )
}
