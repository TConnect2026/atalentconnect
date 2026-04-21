"use client"

import { GitCompare } from "lucide-react"

interface PortalCompareBarProps {
  selectedCount: number
  onCompareClick?: () => void
}

export function PortalCompareBar({ selectedCount, onCompareClick }: PortalCompareBarProps) {
  return (
    <div className="px-6 sm:px-10 pb-6">
      <div
        className="flex items-center justify-between gap-4 rounded-[12px] border px-5 py-3.5"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "rgba(31, 60, 98, 0.1)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <GitCompare className="w-4 h-4 text-navy/60 flex-shrink-0" />
          <p className="text-sm text-navy/80 truncate">
            {selectedCount === 0
              ? "Select candidates to compare side by side"
              : `${selectedCount} candidate${selectedCount === 1 ? "" : "s"} selected`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCompareClick}
          disabled={selectedCount < 2}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-navy text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Compare
        </button>
      </div>
    </div>
  )
}
