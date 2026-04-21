import { CalendarDays, Flag, Clock, UserCircle2 } from "lucide-react"

interface PortalDetailsStripProps {
  launchDate?: string | null
  targetCloseDate?: string | null
  leadRecruiterName?: string | null
  leadRecruiterEmail?: string | null
}

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

export function PortalDetailsStrip({
  launchDate,
  targetCloseDate,
  leadRecruiterName,
  leadRecruiterEmail,
}: PortalDetailsStripProps) {
  const items: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
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
            className="text-navy hover:text-orange transition-colors"
          >
            {leadRecruiterName}
          </a>
        ) : (
          leadRecruiterName || "—"
        ),
    },
  ]

  return (
    <div
      className="w-full border-y"
      style={{
        backgroundColor: "#F3EFE8",
        borderColor: "rgba(31, 60, 98, 0.08)",
      }}
    >
      <div className="px-6 sm:px-10 py-4">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-1.5 min-w-0">
              <div className="mt-[3px] text-navy/60 flex-shrink-0">{item.icon}</div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-navy/50">
                  {item.label}
                </div>
                <div className="text-sm font-medium text-navy">
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
