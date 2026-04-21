"use client"

import { Check } from "lucide-react"
import type { Candidate, Document, Interview } from "@/types"
import { CandidateCard } from "@/components/candidates/candidate-card"

interface PortalCandidateCardProps {
  candidate: Candidate
  interviews: Interview[]
  documents: Document[]
  isSelected: boolean
  onToggleSelect: () => void
  onFeedbackClick: () => void
}

const NAVY = "#1F3C62"

export function PortalCandidateCard({
  candidate,
  interviews,
  documents,
  isSelected,
  onToggleSelect,
  onFeedbackClick,
}: PortalCandidateCardProps) {
  return (
    <CandidateCard
      candidate={candidate}
      interviews={interviews}
      documents={documents}
      isSelected={isSelected}
      headerAction={
        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={isSelected ? "Deselect" : "Select to compare"}
          className="w-5 h-5 rounded-[4px] flex items-center justify-center transition"
          style={{
            border: `1px solid ${isSelected ? NAVY : "rgba(31,60,98,0.25)"}`,
            backgroundColor: isSelected ? NAVY : "#FFFFFF",
          }}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>
      }
      footer={
        <button
          type="button"
          onClick={onFeedbackClick}
          className="w-full py-3 text-sm font-semibold text-white hover:opacity-90 transition"
          style={{ backgroundColor: NAVY }}
        >
          Share your feedback
        </button>
      }
    />
  )
}
