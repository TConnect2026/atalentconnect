import { ArrowRight } from "lucide-react"
import type { Stage, Candidate } from "@/types"

interface PortalFunnelProps {
  stages: Stage[]
  candidates: Candidate[]
  /** Render labels for placement on a dark background */
  onDark?: boolean
}

// Darkest at the top, lighter as the funnel narrows downward.
const NAVY_PROGRESSION = [
  "#0D2137",
  "#1F3C62",
  "#2D5A8A",
  "#3D72A8",
  "#5A8FC2",
]

const getShade = (index: number, total: number) => {
  if (total <= 1) return NAVY_PROGRESSION[0]
  const scaled = (index / (total - 1)) * (NAVY_PROGRESSION.length - 1)
  return NAVY_PROGRESSION[Math.min(Math.round(scaled), NAVY_PROGRESSION.length - 1)]
}

const SVG_VIEW_WIDTH = 150
const BAND_HEIGHT = 38
const TOP_WIDTH_PCT = 1.0
const BOTTOM_WIDTH_PCT = 0.25

export function PortalFunnel({ stages, candidates, onDark = false }: PortalFunnelProps) {
  if (stages.length === 0) return null

  const counts = stages.map(
    (s) => candidates.filter((c) => c.stage_id === s.id && (!c.status || c.status === "active")).length
  )

  const n = stages.length
  const totalHeight = n * BAND_HEIGHT

  const bands = stages.map((stage, idx) => {
    const topPct =
      TOP_WIDTH_PCT - (TOP_WIDTH_PCT - BOTTOM_WIDTH_PCT) * (idx / n)
    const bottomPct =
      TOP_WIDTH_PCT - (TOP_WIDTH_PCT - BOTTOM_WIDTH_PCT) * ((idx + 1) / n)
    const cx = SVG_VIEW_WIDTH / 2
    const y = idx * BAND_HEIGHT
    const tHalf = (SVG_VIEW_WIDTH * topPct) / 2
    const bHalf = (SVG_VIEW_WIDTH * bottomPct) / 2
    const points = [
      `${cx - tHalf},${y}`,
      `${cx + tHalf},${y}`,
      `${cx + bHalf},${y + BAND_HEIGHT}`,
      `${cx - bHalf},${y + BAND_HEIGHT}`,
    ].join(" ")
    return {
      stage,
      count: counts[idx],
      points,
      color: getShade(idx, n),
      y,
    }
  })

  const headingClass = onDark
    ? "text-xs font-medium mb-4"
    : "text-xs font-medium text-navy mb-4"
  const headingStyle = onDark ? { color: "#FFFFFF" } : undefined

  const arrowClass = onDark ? "w-3.5 h-3.5 flex-shrink-0" : "w-3.5 h-3.5 flex-shrink-0 text-navy/40"
  const arrowStyle = onDark ? { color: "rgba(255,255,255,0.6)" } : undefined

  const labelStyle = onDark ? { color: "#FFFFFF" } : undefined
  const labelClass = onDark
    ? "text-xs font-medium truncate"
    : "text-xs font-medium text-navy truncate"

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <section>
      <h2 className={headingClass} style={headingStyle}>
        Pipeline as of {today}
      </h2>

      <div className="flex items-stretch gap-1">
        <svg
          height={totalHeight}
          viewBox={`0 0 ${SVG_VIEW_WIDTH} ${totalHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="flex-shrink-0"
          style={{ width: "auto", fontFamily: "inherit" }}
        >
          {bands.map((b) => (
            <g key={b.stage.id}>
              <polygon points={b.points} fill={b.color} />
              <text
                x={SVG_VIEW_WIDTH / 2}
                y={b.y + BAND_HEIGHT / 2}
                dominantBaseline="middle"
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="600"
              >
                {b.count}
              </text>
            </g>
          ))}
        </svg>

        <div className="flex-1 flex flex-col min-w-0">
          {bands.map((b) => (
            <div
              key={b.stage.id}
              className="flex items-center gap-2 min-w-0"
              style={{ height: BAND_HEIGHT }}
            >
              <ArrowRight className={arrowClass} style={arrowStyle} aria-hidden />
              <span className={labelClass} style={labelStyle}>
                {b.stage.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
