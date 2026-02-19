"use client"

import { useEffect } from "react"
import { CheckCircle2, Users, ListChecks, FileText } from "lucide-react"

interface SetupChecklistPanelProps {
  searchId: string
  stages: any[]
  contacts: any[]
  documents: any[]
  onOpenPanel: (panel: string) => void
  onComplete?: () => void
}

export function SetupChecklistPanel({
  searchId,
  stages,
  contacts,
  documents,
  onOpenPanel,
  onComplete
}: SetupChecklistPanelProps) {
  const hasStages = stages.length > 0
  const hasClientTeam = contacts.length > 0
  const hasDocuments = documents.length > 0
  const isComplete = hasStages && hasClientTeam

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete()
    }
  }, [isComplete, onComplete])

  return (
    <div className="px-4 pb-4 pt-3">
      {/* Client Team */}
      <div className="flex items-center justify-between py-3 border-b border-ds-border">
        <div className="flex items-center gap-3">
          {hasClientTeam ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <Users className="w-5 h-5 text-text-muted flex-shrink-0" />
          )}
          <div>
            <span className="font-semibold text-sm text-navy">Client Team</span>
            <p className="text-xs text-text-muted">
              {hasClientTeam ? `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}` : 'Hiring managers and stakeholders'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onOpenPanel('team')}
          className="text-xs font-semibold hover:opacity-80 transition-opacity text-orange"
        >
          + Add Contacts
        </button>
      </div>

      {/* Interview Stages */}
      <div className="flex items-center justify-between py-3 border-b border-ds-border">
        <div className="flex items-center gap-3">
          {hasStages ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <ListChecks className="w-5 h-5 text-text-muted flex-shrink-0" />
          )}
          <div>
            <span className="font-semibold text-sm text-navy">Interview Stages</span>
            <p className="text-xs text-text-muted">
              {hasStages ? `${stages.length} stage${stages.length !== 1 ? 's' : ''}` : 'Define your interview process'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onOpenPanel('stages')}
          className="text-xs font-semibold hover:opacity-80 transition-opacity text-orange"
        >
          + Add Stages
        </button>
      </div>

      {/* Documents */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          {hasDocuments ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-text-muted flex-shrink-0" />
          )}
          <div>
            <span className="font-semibold text-sm text-navy">Documents</span>
            <p className="text-xs text-text-muted">
              {hasDocuments ? `${documents.length} file${documents.length !== 1 ? 's' : ''}` : 'Job descriptions, guides, etc.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onOpenPanel('resources')}
          className="text-xs font-semibold hover:opacity-80 transition-opacity text-orange"
        >
          + Upload
        </button>
      </div>
    </div>
  )
}
