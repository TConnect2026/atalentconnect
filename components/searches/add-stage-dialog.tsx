"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

const INTERVIEW_FORMATS = [
  "Phone Screen",
  "Video",
  "In Person",
  "Panel",
  "Other",
]

interface AddStageDialogProps {
  searchId: string
  currentStagesCount: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingStage?: any | null
}

export function AddStageDialog({ searchId, currentStagesCount, isOpen, onClose, onSuccess, existingStage }: AddStageDialogProps) {
  const [stageName, setStageName] = useState("")
  const [interviewFormat, setInterviewFormat] = useState("")
  const [interviewerId, setInterviewerId] = useState("")
  const [visibleInClientPortal, setVisibleInClientPortal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      loadContacts()
      loadTeamMembers()
      if (existingStage) {
        setStageName(existingStage.name || "")
        setInterviewFormat(existingStage.interview_format || "")
        setInterviewerId(existingStage.interviewer_contact_id || "")
        setVisibleInClientPortal(existingStage.visible_in_client_portal ?? false)
      } else {
        setStageName("")
        setInterviewFormat("")
        setInterviewerId("")
        setVisibleInClientPortal(false)
      }
    }
  }, [isOpen, searchId, existingStage])

  const loadContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('id, name, title')
      .eq('search_id', searchId)
      .order('is_primary', { ascending: false })
    setContacts(data || [])
  }

  const loadTeamMembers = async () => {
    // Try with member_name first, fall back without it if column doesn't exist
    let { data } = await supabase
      .from('search_team_members')
      .select('id, role, member_name, profiles(first_name, last_name)')
      .eq('search_id', searchId)
      .order('created_at', { ascending: true })

    if (!data) {
      const fallback = await supabase
        .from('search_team_members')
        .select('id, role, profiles(first_name, last_name)')
        .eq('search_id', searchId)
        .order('created_at', { ascending: true })
      data = fallback.data as any
    }

    if (data && data.length > 0) {
      setTeamMembers(data.map((tm: any) => ({
        id: tm.id,
        name: (tm as any).member_name || (tm.profiles ? `${tm.profiles.first_name} ${tm.profiles.last_name}` : ''),
        role: tm.role,
      })))
    } else {
      setTeamMembers([])
    }
  }

  const isEditing = !!existingStage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const stageData = {
        name: stageName,
        visible_in_client_portal: visibleInClientPortal,
        interview_format: interviewFormat || null,
        interviewer_contact_id: interviewerId ? interviewerId.replace(/^team-/, "") : null,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('stages')
          .update(stageData)
          .eq('id', existingStage.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('stages')
          .insert({
            search_id: searchId,
            stage_order: currentStagesCount,
            ...stageData,
          })

        if (error) throw error
      }

      // Reset form
      setStageName("")
      setInterviewFormat("")
      setInterviewerId("")
      setVisibleInClientPortal(false)

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving stage:', err)
      alert(`Failed to ${isEditing ? 'update' : 'add'} stage`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">{isEditing ? 'Edit Interview Stage' : 'Add Interview Stage'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="stageName" className="text-text-primary">Stage Name *</Label>
            <Input
              id="stageName"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              required
              className="mt-1 bg-white text-text-primary"
              placeholder="e.g., Technical Interview, Final Round"
            />
            {!isEditing && (
              <p className="text-xs text-text-muted mt-1">
                This stage will be added to the end of your pipeline
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="interviewFormat" className="text-text-primary">Interview Format</Label>
            <select
              id="interviewFormat"
              value={interviewFormat}
              onChange={(e) => setInterviewFormat(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-ds-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select format...</option>
              {INTERVIEW_FORMATS.map((format) => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="interviewer" className="text-text-primary">Interviewer</Label>
            <select
              id="interviewer"
              value={interviewerId}
              onChange={(e) => setInterviewerId(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-ds-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Not yet assigned</option>
              {teamMembers.length > 0 && (
                <optgroup label="Recruiting Team" style={{ color: 'var(--orange)', fontWeight: 600 }}>
                  {teamMembers.map((tm) => (
                    <option key={`team-${tm.id}`} value={`team-${tm.id}`} style={{ color: '#111827' }}>
                      {tm.name}{tm.role ? ` — ${tm.role}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {contacts.length > 0 && (
                <optgroup label="Client Team" style={{ color: 'var(--orange)', fontWeight: 600 }}>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id} style={{ color: '#111827' }}>
                      {contact.name}{contact.title ? ` — ${contact.title}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {contacts.length === 0 && teamMembers.length === 0 && (
              <p className="text-xs text-text-muted mt-1">
                Add contacts to the client team or recruiting team to assign interviewers
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 p-3 bg-bg-section rounded-lg border border-ds-border">
            <input
              type="checkbox"
              id="visibleInPortal"
              checked={visibleInClientPortal}
              onChange={(e) => setVisibleInClientPortal(e.target.checked)}
              className="mt-1 h-4 w-4 text-navy focus:ring-navy border-ds-border rounded"
            />
            <div className="flex-1">
              <Label htmlFor="visibleInPortal" className="text-text-primary font-semibold cursor-pointer">
                Show in Client Portal
              </Label>
              <p className="text-xs text-text-secondary mt-1">
                Uncheck to hide this stage from clients (e.g., Recruiter Screen). The stage will still be tracked in your analytics and funnel data.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white text-text-primary border-ds-border hover:bg-bg-section"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#0891B2] text-white hover:bg-[#DC2626] font-semibold"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Stage'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
