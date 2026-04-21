import type { ReactNode } from "react"

type Variant = "underline" | "bar" | "block"

interface StageHeaderProps {
  name: string
  count: number
  /** Optional icon shown to the left of the stage name (e.g. interview format) */
  leadingIcon?: ReactNode
  /** Optional extra control rendered after the count (e.g. portal-visibility toggle) */
  trailing?: ReactNode
  /**
   * Visual style.
   * - "underline": navy text on transparent with a navy underline
   * - "bar": navy-filled bar with white text (pipeline kanban column headers)
   * - "block": full-width light-gray block with navy text (portal stage cards)
   */
  variant?: Variant
}

const NAVY = "#1F3C62"
const UNDERLINE = "rgba(31, 60, 98, 0.15)"
const COUNT_PILL_BG = "rgba(31, 60, 98, 0.08)"

export function StageHeader({
  name,
  count,
  leadingIcon,
  trailing,
  variant = "underline",
}: StageHeaderProps) {
  if (variant === "block") {
    return (
      <header
        className="flex items-center gap-2 px-5 py-3"
        style={{ backgroundColor: "#F0F0F0" }}
      >
        {leadingIcon && (
          <span className="text-navy/60 flex-shrink-0">{leadingIcon}</span>
        )}
        <h2 className="text-base font-semibold text-navy truncate">{name}</h2>
        <span
          className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-semibold flex-shrink-0"
          style={{
            backgroundColor: COUNT_PILL_BG,
            color: NAVY,
          }}
        >
          {count}
        </span>
        {trailing && <div className="ml-auto flex-shrink-0">{trailing}</div>}
      </header>
    )
  }

  if (variant === "bar") {
    return (
      <header
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-[8px]"
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {leadingIcon && (
            <span className="text-white/80 flex-shrink-0">{leadingIcon}</span>
          )}
          <h2 className="text-sm font-semibold text-white truncate">{name}</h2>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-white"
            style={{ color: NAVY }}
          >
            {count}
          </span>
          {trailing}
        </div>
      </header>
    )
  }

  return (
    <header
      className="flex items-center justify-between gap-2 pb-2.5"
      style={{ borderBottom: `0.5px solid ${UNDERLINE}` }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {leadingIcon && (
          <span className="text-navy/60 flex-shrink-0">{leadingIcon}</span>
        )}
        <h2 className="text-base font-semibold text-navy truncate">{name}</h2>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-semibold"
          style={{
            backgroundColor: COUNT_PILL_BG,
            color: NAVY,
          }}
        >
          {count}
        </span>
        {trailing}
      </div>
    </header>
  )
}
