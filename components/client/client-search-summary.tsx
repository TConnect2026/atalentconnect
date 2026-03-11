"use client"

import { Search, Stage, Contact } from "@/types"
import { ClipboardList, ChevronDown } from "lucide-react"

interface ClientSearchSummaryProps {
  search: Search
  stages: Stage[]
  contacts: Contact[]
  isCollapsed: boolean
  onToggle: () => void
}

export function ClientSearchSummary({
  search,
  stages,
  contacts,
  isCollapsed,
  onToggle
}: ClientSearchSummaryProps) {
  return (
    <div className="mb-8">
      {/* Header bar */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between bg-[#64748B] px-6 py-4 rounded-t-xl cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <ClipboardList className="w-5 h-5 text-white" />
          <span className="font-bold text-white text-base">Search Summary</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-white transition-transform duration-200 ${
            isCollapsed ? "-rotate-90" : ""
          }`}
        />
      </button>

      {/* Body */}
      {!isCollapsed && (
        <div className="bg-bg-section border border-t-0 border-ds-border rounded-b-xl p-6 sm:p-8">
          {/* Position Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
            <DetailField label="Company" value={search.company_name} />
            {search.reports_to && (
              <DetailField label="Reports To" value={search.reports_to} />
            )}
            {search.position_location && (
              <DetailField label="Location" value={search.position_location} />
            )}
            {search.work_arrangement && (
              <DetailField label="Work Arrangement" value={search.work_arrangement.charAt(0).toUpperCase() + search.work_arrangement.slice(1)} />
            )}
            {search.compensation_range && (
              <DetailField label="Compensation Range" value={search.compensation_range} />
            )}
          </div>

          {/* Interview Process */}
          {stages.length > 0 && (
            <div className="mt-7 pt-7 border-t border-ds-border">
              <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
                Interview Process
              </h4>
              <div className="space-y-3">
                {stages.map((stage, index) => {
                  const stageContacts = getStageInterviewers(stage, contacts)
                  return (
                    <div key={stage.id} className="flex items-start gap-3.5">
                      <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <span className="text-base font-medium text-text-primary">
                          {stage.name}
                        </span>
                        {stageContacts.length > 0 && (
                          <p className="text-sm text-text-secondary mt-0.5">
                            {stageContacts.map(c => c.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed bottom border */}
      {isCollapsed && (
        <div className="h-0 border-b border-ds-border rounded-b-xl" />
      )}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-base text-text-primary mt-1">{value}</p>
    </div>
  )
}

function getStageInterviewers(stage: Stage, contacts: Contact[]): Contact[] {
  // Match contacts that are interview panel members
  // Since stages don't have interviewer_ids, we show interview_panel contacts
  return contacts.filter(c => c.role === "interview_panel")
}
