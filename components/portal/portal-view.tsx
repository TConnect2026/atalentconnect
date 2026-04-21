"use client"

import { useState } from "react"
import type { Search, Stage, Candidate, Interview, Document } from "@/types"
import { PortalCover } from "./portal-cover"
import { PortalDetailsStrip } from "./portal-details-strip"
import { PortalFunnel } from "./portal-funnel"
import { PortalCompareBar } from "./portal-compare-bar"
import { PortalCandidateCard } from "./portal-candidate-card"
import { PortalFeedbackModal } from "./portal-feedback-modal"
import { StageHeader } from "@/components/candidates/stage-header"

interface PortalViewProps {
  search: Search
  stages: Stage[]
  candidates: Candidate[]
  interviews: Interview[]
  documents: Document[]
  leadRecruiterName?: string | null
  leadRecruiterEmail?: string | null
  reviewerName: string
  reviewerEmail: string
  canEditCover?: boolean
  onSearchUpdated?: () => void
}

export function PortalView({
  search,
  stages,
  candidates,
  interviews,
  documents,
  leadRecruiterName,
  leadRecruiterEmail,
  reviewerName,
  reviewerEmail,
  canEditCover = false,
  onSearchUpdated,
}: PortalViewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [feedbackFor, setFeedbackFor] = useState<Candidate | null>(null)

  const activeCandidates = candidates.filter(
    (c) => !c.status || c.status === "active"
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCompareClick = () => {
    if (selected.size < 2) return
    alert(
      `Compare view is coming soon (Phase 2). Selected ${selected.size} candidates.`
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF9F7" }}>
      <PortalCover
        searchId={search.id}
        companyName={search.company_name}
        positionTitle={search.position_title}
        coverImageUrl={search.cover_image_url}
        canEdit={canEditCover}
        onUploaded={() => onSearchUpdated?.()}
      />

      <PortalDetailsStrip
        launchDate={search.launch_date}
        targetCloseDate={search.target_fill_date}
        leadRecruiterName={leadRecruiterName}
        leadRecruiterEmail={leadRecruiterEmail}
      />

      <PortalFunnel stages={stages} candidates={activeCandidates} />

      <PortalCompareBar
        selectedCount={selected.size}
        onCompareClick={handleCompareClick}
      />

      {/* Candidates grouped by stage — only stages with at least one visible candidate */}
      {(() => {
        const visibleStages = stages
          .map((stage) => {
            const visibleCandidates = stage.visible_in_portal
              ? activeCandidates.filter(
                  (c) => c.stage_id === stage.id && c.visible_in_portal
                )
              : []
            return { stage, visibleCandidates }
          })
          .filter(({ visibleCandidates }) => visibleCandidates.length > 0)

        return (
          <div className="px-6 sm:px-10 pb-12 space-y-10">
            {visibleStages.map(({ stage, visibleCandidates }) => (
              <section key={stage.id}>
                <div className="mb-5">
                  <StageHeader
                    name={stage.name}
                    count={visibleCandidates.length}
                  />
                </div>

                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                  }}
                >
                  {visibleCandidates.map((candidate) => (
                    <PortalCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      interviews={interviews}
                      documents={documents}
                      isSelected={selected.has(candidate.id)}
                      onToggleSelect={() => toggleSelect(candidate.id)}
                      onFeedbackClick={() => setFeedbackFor(candidate)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {visibleStages.length === 0 && (
              <div className="text-center py-16 text-navy/40 text-sm">
                {stages.length === 0
                  ? "No pipeline stages configured yet."
                  : "No candidates are shared yet — check back soon."}
              </div>
            )}
          </div>
        )
      })()}

      {feedbackFor && (
        <PortalFeedbackModal
          isOpen={!!feedbackFor}
          onClose={() => setFeedbackFor(null)}
          candidateId={feedbackFor.id}
          candidateName={`${feedbackFor.first_name} ${feedbackFor.last_name}`}
          searchId={search.id}
          reviewerName={reviewerName}
          reviewerEmail={reviewerEmail}
        />
      )}
    </div>
  )
}
