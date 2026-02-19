"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddStageDialog } from "@/components/searches/add-stage-dialog"
import { supabase } from "@/lib/supabase"
import { Pencil, Trash2, GripVertical, Video, Phone, Building2, Eye, EyeOff } from "lucide-react"

interface StagesPanelProps {
  searchId: string
  search: any
  stages: any[]
  contacts?: any[]
  onUpdate: () => void
}

export function StagesPanel({ searchId, search, stages, contacts = [], onUpdate }: StagesPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<any | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  useEffect(() => {
    const loadTeamMembers = async () => {
      const { data } = await supabase
        .from('search_team_members')
        .select('id, role, member_name, profiles(first_name, last_name)')
        .eq('search_id', searchId)
      if (data) {
        setTeamMembers(data.map((tm: any) => ({
          id: tm.id,
          name: tm.member_name || (tm.profiles ? `${tm.profiles.first_name} ${tm.profiles.last_name}` : ''),
        })))
      }
    }
    loadTeamMembers()
  }, [searchId])

  const handleDelete = async (stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', stageId)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Error deleting stage:', err)
      alert('Failed to delete stage')
    }
  }

  const handleEdit = (stage: any) => {
    setEditingStage(stage)
    setIsAddDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
    setEditingStage(null)
    onUpdate()
  }

  const getInterviewerName = (stage: any) => {
    if (!stage.interviewer_contact_id) return null
    const id = stage.interviewer_contact_id

    // Check if it's a recruiting team member (prefixed with team-)
    if (id.startsWith('team-')) {
      const teamId = id.replace('team-', '')
      const tm = teamMembers.find((t: any) => t.id === teamId)
      return tm?.name || null
    }

    // Otherwise look up in client contacts
    const contact = contacts.find((c: any) => c.id === id)
    if (!contact) return null
    return contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'video':
        return <Video className="w-3.5 h-3.5" />
      case 'phone':
        return <Phone className="w-3.5 h-3.5" />
      case 'in-person':
        return <Building2 className="w-3.5 h-3.5" />
      default:
        return null
    }
  }

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'video':
        return 'Video'
      case 'phone':
        return 'Phone'
      case 'in-person':
        return 'In-Person'
      default:
        return format
    }
  }

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {/* Add Stage Button */}
      <Button
        onClick={() => {
          setEditingStage(null)
          setIsAddDialogOpen(true)
        }}
        size="sm"
        className="w-full text-white font-semibold bg-orange"
      >
        + Add Stage
      </Button>

      {/* Stages List */}
      {stages.length === 0 ? (
        <div className="py-6 text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-text-muted">No stages yet</p>
          <p className="text-xs text-text-muted mt-1">Add interview stages to build your pipeline</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="border border-ds-border rounded-lg p-3 hover:border-ds-border transition-colors"
            >
              <div className="flex items-start gap-2">
                {/* Drag Handle (optional for Phase 1) */}
                <div className="flex-shrink-0 pt-1 cursor-move text-text-muted hover:text-text-secondary">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Stage Info */}
                <div className="flex-1 min-w-0">
                  {/* Stage Name and Order */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-bg-page text-xs font-bold text-text-primary">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => handleEdit(stage)}
                      className="text-sm font-bold text-text-primary truncate hover:text-navy transition-colors text-left"
                    >
                      {stage.name}
                    </button>
                    {getInterviewerName(stage) && (
                      <span className="text-xs font-normal text-text-muted truncate">— {getInterviewerName(stage)}</span>
                    )}
                  </div>

                  {/* Format and Visibility */}
                  <div className="flex items-center gap-2 mt-2">
                    {stage.format && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy/10 text-navy text-xs rounded">
                        {getFormatIcon(stage.format)}
                        <span>{getFormatLabel(stage.format)}</span>
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                        stage.visible_to_client
                          ? 'bg-green-100 text-green-800'
                          : 'bg-bg-section text-text-secondary'
                      }`}
                    >
                      {stage.visible_to_client ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hidden</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(stage)}
                    className="p-1.5 hover:bg-bg-section rounded transition-colors"
                    title="Edit stage"
                  >
                    <Pencil className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    title="Delete stage"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      {stages.length > 0 && (
        <div className="pt-2 text-xs text-text-muted text-center">
          Drag to reorder stages
        </div>
      )}

      {/* Add Stage Dialog */}
      <AddStageDialog
        isOpen={isAddDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogClose}
        searchId={searchId}
        currentStagesCount={stages.length}
        existingStage={editingStage}
      />
    </div>
  )
}
