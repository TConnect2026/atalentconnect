"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, Pencil, Copy, Check, Eye, EyeOff } from "lucide-react"
import { AddStageDialog } from "@/components/searches/add-stage-dialog"

interface InterviewerInfo {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
}

interface InterviewPlanPanelProps {
  searchId: string
  firmId?: string
  stages: Array<{
    id: string
    name: string
    interviewer_ids?: string[]
    interviewer_contact_id?: string
    interview_format?: string
    visible_in_client_portal?: boolean
    stage_order?: number
    [key: string]: unknown
  }>
  searchContacts: Array<{
    id: string
    name?: string
    first_name?: string
    last_name?: string
    title?: string
    email?: string
    phone?: string
    [key: string]: unknown
  }>
  onUpdate?: () => void
}

export function InterviewPlanPanel({ searchId, firmId, stages, searchContacts, onUpdate }: InterviewPlanPanelProps) {
  const [isAddStageDialogOpen, setIsAddStageDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<InterviewPlanPanelProps['stages'][number] | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [focusAreas, setFocusAreas] = useState<Record<string, string>>({})

  const [teamProfiles, setTeamProfiles] = useState<{ id: string; first_name?: string; last_name?: string; email?: string }[]>([])
  const [panelists, setPanelists] = useState<{ id: string; name: string; title?: string; email?: string }[]>([])

  useEffect(() => {
    const loadTeamAndPanelists = async () => {
      if (firmId) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('firm_id', firmId)
          if (data) setTeamProfiles(data)
        } catch (err) {
          console.error('Error loading team profiles:', err)
        }
      }

      try {
        const { data } = await supabase
          .from('panelists')
          .select('id, name, title, email')
          .eq('search_id', searchId)
        if (data) setPanelists(data)
      } catch (err) {
        console.warn('Error loading panelists (table may not exist):', err)
      }
    }
    loadTeamAndPanelists()
  }, [searchId, firmId])

  const copyToClipboard = async (value: string, fieldName: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 1500)
  }

  const CopyButton = ({ value, fieldKey }: { value: string; fieldKey: string }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copyToClipboard(value, fieldKey) }}
      className="ml-1 flex-shrink-0 text-text-muted hover:text-navy transition-colors"
      title={`Copy ${value}`}
    >
      {copiedField === fieldKey ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  )

  const getInterviewerDetails = (stage: InterviewPlanPanelProps['stages'][number]): InterviewerInfo[] => {
    const ids = stage.interviewer_ids || (stage.interviewer_contact_id ? [stage.interviewer_contact_id] : [])
    if (ids.length === 0) return []
    return ids.map((id: string): InterviewerInfo | null => {
      const contact = searchContacts.find((c) => c.id === id)
      if (contact) return {
        id,
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        title: contact.title || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
      }
      const profile = teamProfiles.find((p) => p.id === id)
      if (profile) return {
        id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        email: profile.email || undefined,
      }
      const panelist = panelists.find((p) => p.id === id)
      if (panelist) return {
        id,
        name: panelist.name,
        title: panelist.title || undefined,
        email: panelist.email || undefined,
      }
      return null
    }).filter((x): x is InterviewerInfo => x !== null)
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Delete this stage?')) return
    try {
      const { error } = await supabase.from('stages').delete().eq('id', stageId)
      if (error) throw error
      onUpdate?.()
    } catch (err) {
      console.error('Error deleting stage:', err)
      alert('Failed to delete stage')
    }
  }

  const handleToggleVisibility = async (stage: InterviewPlanPanelProps['stages'][number]) => {
    try {
      const { error } = await supabase
        .from('stages')
        .update({ visible_in_client_portal: !stage.visible_in_client_portal })
        .eq('id', stage.id)
      if (error) console.warn('Toggle visibility failed:', error.message)
      onUpdate?.()
    } catch (err) {
      console.error('Error toggling visibility:', err)
    }
  }

  const handleStageDialogClose = () => {
    setIsAddStageDialogOpen(false)
    setEditingStage(null)
    onUpdate?.()
  }

  return (
    <div className="p-5 space-y-2">
      {/* Add Stage button row */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-text-secondary">
          {stages.length === 0 ? 'No stages yet.' : `${stages.length} stage${stages.length !== 1 ? 's' : ''}`}
        </p>
        <button
          type="button"
          onClick={() => { setEditingStage(null); setIsAddStageDialogOpen(true) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-navy hover:bg-navy/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Stage
        </button>
      </div>

      {/* Stages */}
      {stages.map((stage, index) => {
        const interviewers = getInterviewerDetails(stage)
        return (
          <div key={stage.id} className="rounded-md border border-ds-border overflow-hidden">
            {/* Stage Header — compact */}
            <div className="px-3 py-2 bg-bg-page border-b border-ds-border flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-navy w-5 text-center flex-shrink-0">{index + 1}</span>
                <h4 className="text-sm font-bold text-navy truncate">{stage.name}</h4>
                {stage.interview_format && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-navy/8 text-text-secondary font-medium flex-shrink-0">
                    {stage.interview_format}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(stage)}
                  className="p-1 rounded hover:bg-white transition-colors"
                  title={stage.visible_in_client_portal ? 'Visible to client' : 'Hidden from client'}
                >
                  {stage.visible_in_client_portal ? (
                    <Eye className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingStage(stage); setIsAddStageDialogOpen(true) }}
                  className="p-1 rounded hover:bg-white transition-colors"
                  title="Edit stage"
                >
                  <Pencil className="w-3 h-3 text-text-secondary" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteStage(stage.id)}
                  className="p-1 rounded hover:bg-red-50 transition-colors"
                  title="Delete stage"
                >
                  <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                </button>
              </div>
            </div>

            {/* Panelist Table */}
            <div className="bg-bg-page">
              {interviewers.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-muted">No interviewers assigned</div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_0.8fr_1.2fr_0.7fr_1fr] gap-1 px-3 py-1.5 border-b border-ds-border bg-[#FAFAFA]">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Name</span>
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Title</span>
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Email</span>
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Phone</span>
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Focus Area</span>
                  </div>
                  {/* Rows */}
                  {interviewers.map((interviewer) => (
                    <div
                      key={interviewer.id}
                      className="grid grid-cols-[1fr_0.8fr_1.2fr_0.7fr_1fr] gap-1 px-3 py-1.5 border-b border-ds-border last:border-b-0 items-center hover:bg-[#FAFAFA] transition-colors"
                    >
                      <span className="text-sm font-medium text-text-primary truncate">{interviewer.name}</span>
                      <span className="text-sm text-text-secondary truncate">{interviewer.title || '—'}</span>
                      <div className="flex items-center min-w-0 group/email">
                        {interviewer.email ? (
                          <>
                            <span className="text-sm text-text-secondary truncate">{interviewer.email}</span>
                            <span className="opacity-0 group-hover/email:opacity-100 transition-opacity">
                              <CopyButton value={interviewer.email} fieldKey={`email-${interviewer.id}`} />
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-text-muted">—</span>
                        )}
                      </div>
                      <div className="flex items-center min-w-0 group/phone">
                        {interviewer.phone ? (
                          <>
                            <span className="text-sm text-text-secondary truncate">{interviewer.phone}</span>
                            <span className="opacity-0 group-hover/phone:opacity-100 transition-opacity">
                              <CopyButton value={interviewer.phone} fieldKey={`phone-${interviewer.id}`} />
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-text-muted">—</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={focusAreas[`${stage.id}-${interviewer.id}`] || ''}
                        onChange={(e) => setFocusAreas(prev => ({ ...prev, [`${stage.id}-${interviewer.id}`]: e.target.value }))}
                        placeholder="e.g. Technical, Culture fit"
                        className="h-7 px-2 text-sm border border-transparent rounded bg-transparent hover:border-ds-border focus:border-navy focus:bg-white focus:outline-none transition-colors text-text-primary placeholder:text-text-muted"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )
      })}

      {/* Add Stage Dialog */}
      <AddStageDialog
        isOpen={isAddStageDialogOpen}
        onClose={handleStageDialogClose}
        onSuccess={handleStageDialogClose}
        searchId={searchId}
        firmId={firmId}
        currentStagesCount={stages.length}
        existingStage={editingStage}
      />
    </div>
  )
}
