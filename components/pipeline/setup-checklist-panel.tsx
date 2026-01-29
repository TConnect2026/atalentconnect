"use client"

import { useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"

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
  // Calculate completion status
  const hasStages = stages.length > 0
  const hasClientTeam = contacts.length > 0
  const hasPlaybooks = documents.some(d => ['interview_guide', 'email_templates'].includes(d.type))

  // All required items complete
  const isComplete = hasStages && hasClientTeam

  // Call onComplete callback when all required items are done
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete()
    }
  }, [isComplete, onComplete])

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {/* Add Interview Stages */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={hasStages}
          disabled
          className="mt-0.5"
        />
        <button
          onClick={() => onOpenPanel('stages')}
          className="text-left flex-1 text-sm text-gray-700 hover:text-blue-600 transition-colors"
        >
          <span className="font-medium">Add interview stages</span>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasStages ? `${stages.length} stage(s) added` : 'Define your interview process'}
          </p>
        </button>
      </div>

      {/* Add Client Team */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={hasClientTeam}
          disabled
          className="mt-0.5"
        />
        <button
          onClick={() => onOpenPanel('team')}
          className="text-left flex-1 text-sm text-gray-700 hover:text-blue-600 transition-colors"
        >
          <span className="font-medium">Add client team</span>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasClientTeam ? `${contacts.length} contact(s) added` : 'Add hiring managers and stakeholders'}
          </p>
        </button>
      </div>

      {/* Upload Playbooks (Optional) */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={hasPlaybooks}
          disabled
          className="mt-0.5"
        />
        <button
          onClick={() => onOpenPanel('resources')}
          className="text-left flex-1 text-sm text-gray-700 hover:text-blue-600 transition-colors"
        >
          <span className="font-medium">Upload playbooks</span>
          <span className="text-xs text-gray-400 ml-1">(optional)</span>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasPlaybooks ? 'Playbooks uploaded' : 'Interview guides, email templates, etc.'}
          </p>
        </button>
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Setup complete!</span>
          </div>
        </div>
      )}
    </div>
  )
}
