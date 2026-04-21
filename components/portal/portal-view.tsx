"use client"

import { useState } from "react"
import type { Search, Stage, Candidate, Interview, Document } from "@/types"
import { PortalCover } from "./portal-cover"
import { PortalDocuments } from "./portal-documents"
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
}: PortalViewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [feedbackFor, setFeedbackFor] = useState<Candidate | null>(null)

  const activeCandidates = candidates.filter(
    (c) => !c.status || c.status === "active"
  )

  // Funnel always shows every stage with its total candidate count — search activity overview.
  // Stage-card list below is filtered to only portal-visible stages.
  const portalStages = stages.filter((s) => s.visible_in_portal)

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
        companyName={search.company_name}
        positionTitle={search.position_title}
        clientLogoUrl={search.client_logo_url}
        launchDate={search.launch_date}
        targetCloseDate={search.target_fill_date}
        leadRecruiterName={leadRecruiterName}
        leadRecruiterEmail={leadRecruiterEmail}
        stages={stages}
        candidates={activeCandidates}
        documents={documents}
      />

      {/* Documents + Candidates intro — stacked, full width.
          Position spec is surfaced in the header, so exclude it here to avoid duplication. */}
      <div className="px-6 sm:px-10 pt-8 pb-6 space-y-8">
        <PortalDocuments
          documents={documents.filter(
            (d) => d.type !== "position_spec" && d.type !== "job_description"
          )}
        />

        <div>
          <h2
            className="text-navy"
            style={{ fontSize: "18px", fontWeight: 500, lineHeight: 1.2 }}
          >
            Candidates
          </h2>
          <p className="text-sm text-navy/60 mt-1">
            Select a candidate to view their profile, interview history, and share your feedback.
          </p>
        </div>
      </div>

      <PortalCompareBar
        selectedCount={selected.size}
        onCompareClick={handleCompareClick}
      />

      {/* Candidate stage cards below at full width */}
      <div className="pb-12">
        <div className="px-6 sm:px-10 space-y-4">
          {portalStages.length === 0 ? (
            <div className="text-center py-16 text-navy/40 text-sm">
              No pipeline stages have been shared yet.
            </div>
          ) : (
            portalStages.map((stage) => {
              const visibleCandidates = activeCandidates.filter(
                (c) => c.stage_id === stage.id && c.visible_in_portal
              )

              return (
                <section
                  key={stage.id}
                  className="bg-white rounded-[12px] overflow-hidden"
                  style={{ border: "1px solid rgba(31, 60, 98, 0.2)" }}
                >
                  <StageHeader
                    variant="block"
                    name={stage.name}
                    count={visibleCandidates.length}
                  />

                  <div className="p-5">
                    {visibleCandidates.length === 0 ? (
                      <p className="text-sm italic text-navy/40">
                        No candidates at this stage yet
                      </p>
                    ) : (
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
                    )}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </div>

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
