import type { Stage, Candidate } from "@/types"

interface PortalFunnelProps {
  stages: Stage[]
  candidates: Candidate[]
}

// Navy progression: darkest on left, lighter as it narrows
const NAVY_SHADES = [
  "#1F3C62",
  "#2A4F7E",
  "#3A5F8F",
  "#4B6FA0",
  "#6285B2",
  "#7E9CC4",
  "#9CB4D3",
]

const getShade = (index: number, total: number) => {
  if (total <= 1) return NAVY_SHADES[0]
  const scaled = (index / (total - 1)) * (NAVY_SHADES.length - 1)
  return NAVY_SHADES[Math.min(Math.round(scaled), NAVY_SHADES.length - 1)]
}

export function PortalFunnel({ stages, candidates }: PortalFunnelProps) {
  if (stages.length === 0) return null

  const counts = stages.map(
    (s) => candidates.filter((c) => c.stage_id === s.id && (!c.status || c.status === "active")).length
  )
  const max = Math.max(1, ...counts)

  return (
    <section className="px-6 sm:px-10 py-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-navy/60 mb-5">
        Pipeline
      </h2>

      <div className="flex items-end gap-3 sm:gap-4 min-h-[140px] overflow-x-auto pb-2">
        {stages.map((stage, idx) => {
          const count = counts[idx]
          const heightPct = (count / max) * 100
          const barHeight = `${Math.max(8, heightPct)}%`
          const color = getShade(idx, stages.length)

          return (
            <div
              key={stage.id}
              className="flex flex-col items-center flex-1 min-w-[60px]"
            >
              <div className="text-sm font-semibold text-navy mb-1.5">
                {count}
              </div>
              <div className="w-full h-[100px] flex items-end">
                <div
                  className="w-full rounded-t-[4px] transition-all"
                  style={{
                    height: barHeight,
                    backgroundColor: color,
                    minHeight: count > 0 ? "12px" : "4px",
                    opacity: count > 0 ? 1 : 0.25,
                  }}
                />
              </div>
              <div className="text-[10px] sm:text-[11px] text-navy/70 mt-2 text-center truncate w-full">
                {stage.name}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
