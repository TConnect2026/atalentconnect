"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddStageDialog } from "@/components/searches/add-stage-dialog"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Pencil, Trash2, GripVertical, Video, Phone, Building2, Eye, EyeOff, ChevronDown, ChevronRight, UserPlus, X } from "lucide-react"

interface PanelMember {
  id?: string
  stage_id: string
  name: string
  title: string
  email: string
  access_level: 'full_access' | 'limited_access' | 'no_portal_access'
}

interface StagesPanelProps {
  searchId: string
  search: any
  stages: any[]
  contacts?: any[]
  onUpdate: () => void
  firmId?: string
}

export function StagesPanel({ searchId, search, stages, contacts = [], onUpdate, firmId }: StagesPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<any | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  // Interview Panel state
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({})
  const [panelMembers, setPanelMembers] = useState<Record<string, PanelMember[]>>({})
  const [addingToStage, setAddingToStage] = useState<string | null>(null)
  const [newMember, setNewMember] = useState<Omit<PanelMember, 'id' | 'stage_id'>>({
    name: '', title: '', email: '', access_level: 'full_access'
  })

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

  // Load panel members for all stages
  useEffect(() => {
    const loadPanelMembers = async () => {
      const stageIds = stages.map(s => s.id)
      if (stageIds.length === 0) return

      const { data, error } = await supabase
        .from('stage_panel_members')
        .select('*')
        .in('stage_id', stageIds)
        .order('created_at', { ascending: true })

      if (data) {
        const grouped: Record<string, PanelMember[]> = {}
        data.forEach((pm: any) => {
          if (!grouped[pm.stage_id]) grouped[pm.stage_id] = []
          grouped[pm.stage_id].push(pm)
        })
        setPanelMembers(grouped)
      }
    }
    loadPanelMembers()
  }, [stages])

  const togglePanel = (stageId: string) => {
    setExpandedPanels(prev => ({ ...prev, [stageId]: !prev[stageId] }))
  }

  const handleAddPanelMember = async (stageId: string) => {
    if (!newMember.name.trim()) return

    try {
      const { data, error } = await supabase
        .from('stage_panel_members')
        .insert({
          stage_id: stageId,
          search_id: searchId,
          name: newMember.name.trim(),
          title: newMember.title.trim(),
          email: newMember.email.trim(),
          access_level: newMember.access_level,
        })
        .select()
        .single()

      if (error) throw error

      setPanelMembers(prev => ({
        ...prev,
        [stageId]: [...(prev[stageId] || []), data],
      }))
      setNewMember({ name: '', title: '', email: '', access_level: 'full_access' })
      setAddingToStage(null)
    } catch (err) {
      console.error('Error adding panel member:', err)
      alert('Failed to add panel member')
    }
  }

  const handleDeletePanelMember = async (stageId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('stage_panel_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setPanelMembers(prev => ({
        ...prev,
        [stageId]: (prev[stageId] || []).filter(m => m.id !== memberId),
      }))
    } catch (err) {
      console.error('Error deleting panel member:', err)
    }
  }

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

  const resolveInterviewerName = (id: string): string | null => {
    // Check team members
    const tm = teamMembers.find((t: any) => t.id === id)
    if (tm) return tm.name

    // Check client contacts
    const contact = contacts.find((c: any) => c.id === id)
    if (contact) return contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || null

    return null
  }

  const getInterviewerNames = (stage: any): string[] => {
    // Support new multi-interviewer field
    if (stage.interviewer_ids && Array.isArray(stage.interviewer_ids) && stage.interviewer_ids.length > 0) {
      return stage.interviewer_ids
        .map((id: string) => resolveInterviewerName(id))
        .filter(Boolean) as string[]
    }
    // Fallback to legacy single field
    if (stage.interviewer_contact_id) {
      const name = resolveInterviewerName(stage.interviewer_contact_id)
      return name ? [name] : []
    }
    return []
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

  const getAccessLabel = (level: string) => {
    switch (level) {
      case 'full_access': return 'Full Access'
      case 'limited_access': return 'Limited Access'
      case 'no_portal_access': return 'No Portal Access'
      default: return level
    }
  }

  const getAccessBadgeClass = (level: string) => {
    switch (level) {
      case 'full_access': return 'bg-green-100 text-green-800'
      case 'limited_access': return 'bg-yellow-100 text-yellow-800'
      case 'no_portal_access': return 'bg-bg-section text-text-secondary'
      default: return 'bg-bg-section text-text-secondary'
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
          {stages.map((stage, index) => {
            const stageMembers = panelMembers[stage.id] || []
            const isPanelExpanded = expandedPanels[stage.id] || false

            return (
              <div
                key={stage.id}
                className="border border-ds-border rounded-lg p-3 hover:border-ds-border transition-colors"
              >
                <div className="flex items-start gap-2">
                  {/* Drag Handle */}
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
                      {getInterviewerNames(stage).length > 0 && (
                        <span className="text-xs font-normal text-text-muted truncate">— {getInterviewerNames(stage).join(', ')}</span>
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

                {/* Interview Panel Section */}
                <div className="mt-2 ml-6">
                  <button
                    onClick={() => togglePanel(stage.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy/80 transition-colors"
                  >
                    {isPanelExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    Interview Panel
                    {stageMembers.length > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-bold">
                        {stageMembers.length}
                      </span>
                    )}
                  </button>

                  {isPanelExpanded && (
                    <div className="mt-2 space-y-2">
                      {/* Existing panel members */}
                      {stageMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 px-3 py-2 bg-bg-section rounded-md border border-ds-border"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-text-primary truncate">{member.name}</span>
                              {member.title && (
                                <span className="text-xs text-text-muted truncate">— {member.title}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {member.email && (
                                <span className="text-xs text-text-muted truncate">{member.email}</span>
                              )}
                              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${getAccessBadgeClass(member.access_level)}`}>
                                {getAccessLabel(member.access_level)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePanelMember(stage.id, member.id!)}
                            className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Remove panel member"
                          >
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      ))}

                      {/* Add panel member form */}
                      {addingToStage === stage.id ? (
                        <div className="p-3 bg-bg-section rounded-md border border-ds-border space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold text-text-primary">Name *</Label>
                              <Input
                                value={newMember.name}
                                onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Full name"
                                className="mt-0.5 h-8 text-sm bg-white"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-text-primary">Title</Label>
                              <Input
                                value={newMember.title}
                                onChange={(e) => setNewMember(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Job title"
                                className="mt-0.5 h-8 text-sm bg-white"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-semibold text-text-primary">Email</Label>
                              <Input
                                value={newMember.email}
                                onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="email@example.com"
                                className="mt-0.5 h-8 text-sm bg-white"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-text-primary">Access Level</Label>
                              <select
                                value={newMember.access_level}
                                onChange={(e) => setNewMember(prev => ({ ...prev, access_level: e.target.value as PanelMember['access_level'] }))}
                                className="mt-0.5 w-full h-8 px-2 rounded-md border border-ds-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="full_access">Full Access</option>
                                <option value="limited_access">Limited Access</option>
                                <option value="no_portal_access">No Portal Access</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setAddingToStage(null)
                                setNewMember({ name: '', title: '', email: '', access_level: 'full_access' })
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs bg-navy text-white hover:bg-navy/90"
                              onClick={() => handleAddPanelMember(stage.id)}
                              disabled={!newMember.name.trim()}
                            >
                              Add Member
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingToStage(stage.id)
                            setNewMember({ name: '', title: '', email: '', access_level: 'full_access' })
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-orange hover:text-orange-hover transition-colors py-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Panel Member
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
        firmId={firmId}
        currentStagesCount={stages.length}
        existingStage={editingStage}
      />
    </div>
  )
}
