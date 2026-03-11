"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Check, ChevronDown, X, Plus } from "lucide-react"

const INTERVIEW_FORMATS = [
  "Phone Screen",
  "Video",
  "In Person",
  "Panel",
  "Other",
]

interface InterviewerOption {
  id: string
  name: string
  subtitle?: string
  group: 'team' | 'contact' | 'panelist'
}

interface AddStageDialogProps {
  searchId: string
  firmId?: string
  currentStagesCount: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingStage?: any | null
}

export function AddStageDialog({ searchId, firmId, currentStagesCount, isOpen, onClose, onSuccess, existingStage }: AddStageDialogProps) {
  const [stageName, setStageName] = useState("")
  const [interviewFormat, setInterviewFormat] = useState("")
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([])
  const [visibleInClientPortal, setVisibleInClientPortal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [interviewerOptions, setInterviewerOptions] = useState<InterviewerOption[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showAddPanelist, setShowAddPanelist] = useState(false)
  const [newPanelistName, setNewPanelistName] = useState('')
  const [newPanelistTitle, setNewPanelistTitle] = useState('')
  const [newPanelistEmail, setNewPanelistEmail] = useState('')
  const [isSavingPanelist, setIsSavingPanelist] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadInterviewerOptions()
      if (existingStage) {
        setStageName(existingStage.name || "")
        setInterviewFormat(existingStage.interview_format || "")
        // Support both old single interviewer and new multi
        const existingIds = existingStage.interviewer_ids || []
        if (existingIds.length > 0) {
          setSelectedInterviewerIds(existingIds)
        } else if (existingStage.interviewer_contact_id) {
          setSelectedInterviewerIds([existingStage.interviewer_contact_id])
        } else {
          setSelectedInterviewerIds([])
        }
        setVisibleInClientPortal(existingStage.visible_in_client_portal ?? false)
      } else {
        setStageName("")
        setInterviewFormat("")
        setSelectedInterviewerIds([])
        setVisibleInClientPortal(false)
      }
    }
  }, [isOpen, searchId, existingStage])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const loadInterviewerOptions = async () => {
    const options: InterviewerOption[] = []

    // Load all firm team members (profiles)
    if (firmId) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('firm_id', firmId)
        .order('first_name', { ascending: true })

      if (profiles) {
        profiles.forEach((p: any) => {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim()
          if (name) {
            options.push({
              id: `team-${p.id}`,
              name,
              subtitle: p.email || undefined,
              group: 'team',
            })
          }
        })
      }
    }

    // Load client contacts for this search
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, title, email')
      .eq('search_id', searchId)
      .order('is_primary', { ascending: false })

    if (contacts) {
      contacts.forEach((c: any) => {
        if (c.name) {
          options.push({
            id: c.id,
            name: c.name,
            subtitle: c.title || c.email || undefined,
            group: 'contact',
          })
        }
      })
    }

    // Load panelists for this search (wrapped in try-catch in case table doesn't exist yet)
    try {
      const { data: panelists } = await supabase
        .from('panelists')
        .select('id, name, title, email')
        .eq('search_id', searchId)
        .order('created_at', { ascending: true })

      if (panelists) {
        panelists.forEach((p: any) => {
          if (p.name) {
            options.push({
              id: `panelist-${p.id}`,
              name: p.name,
              subtitle: p.title || p.email || undefined,
              group: 'panelist',
            })
          }
        })
      }
    } catch (err) {
      console.warn('Panelists table may not exist yet:', err)
    }

    setInterviewerOptions(options)
  }

  const toggleInterviewer = (id: string) => {
    setSelectedInterviewerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const removeInterviewer = (id: string) => {
    setSelectedInterviewerIds(prev => prev.filter(i => i !== id))
  }

  const getInterviewerName = (id: string) => {
    return interviewerOptions.find(o => o.id === id)?.name || id
  }

  const teamOptions = interviewerOptions.filter(o => o.group === 'team')
  const contactOptions = interviewerOptions.filter(o => o.group === 'contact')
  const panelistOptions = interviewerOptions.filter(o => o.group === 'panelist')

  const handleAddPanelist = async () => {
    if (!newPanelistName.trim() || !newPanelistEmail.trim()) return
    setIsSavingPanelist(true)
    try {
      const { data, error } = await supabase
        .from('panelists')
        .insert({
          search_id: searchId,
          name: newPanelistName.trim(),
          title: newPanelistTitle.trim() || null,
          email: newPanelistEmail.trim(),
        })
        .select()
        .single()

      if (error) throw error

      const newOption: InterviewerOption = {
        id: `panelist-${data.id}`,
        name: data.name,
        subtitle: data.title || data.email || undefined,
        group: 'panelist',
      }
      setInterviewerOptions(prev => [...prev, newOption])
      setSelectedInterviewerIds(prev => [...prev, newOption.id])
      setNewPanelistName('')
      setNewPanelistTitle('')
      setNewPanelistEmail('')
      setShowAddPanelist(false)
    } catch (err) {
      console.error('Error adding panelist:', err)
      alert('Failed to add panelist')
    } finally {
      setIsSavingPanelist(false)
    }
  }

  const isEditing = !!existingStage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Strip team- and panelist- prefixes for storage
      const cleanIds = selectedInterviewerIds.map(id => id.replace(/^(team|panelist)-/, ''))

      const stageData: Record<string, any> = {
        name: stageName,
        visible_in_client_portal: visibleInClientPortal,
        interview_format: interviewFormat || null,
        interviewer_ids: cleanIds.length > 0 ? cleanIds : null,
        interviewer_contact_id: cleanIds.length > 0 ? cleanIds[0] : null,
      }

      let saveError: any = null

      if (isEditing) {
        const { error } = await supabase
          .from('stages')
          .update(stageData)
          .eq('id', existingStage.id)
        saveError = error
      } else {
        const { error } = await supabase
          .from('stages')
          .insert({
            search_id: searchId,
            stage_order: currentStagesCount,
            ...stageData,
          })
        saveError = error
      }

      // If save failed, retry without columns that may not exist yet
      if (saveError) {
        console.warn('Full save failed, retrying with basic fields:', saveError.message)
        const basicData: Record<string, any> = {
          name: stageName,
          interview_format: interviewFormat || null,
          interviewer_contact_id: cleanIds.length > 0 ? cleanIds[0] : null,
        }

        if (isEditing) {
          const { error } = await supabase
            .from('stages')
            .update(basicData)
            .eq('id', existingStage.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('stages')
            .insert({
              search_id: searchId,
              stage_order: currentStagesCount,
              ...basicData,
            })
          if (error) throw error
        }
      }

      // Reset form
      setStageName("")
      setInterviewFormat("")
      setSelectedInterviewerIds([])
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

          {/* Multi-select Interviewer Dropdown */}
          <div>
            <Label className="text-text-primary">Interviewers</Label>
            <div ref={dropdownRef} className="relative mt-1">
              {/* Selected tags + trigger */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full min-h-[40px] px-3 py-2 rounded-md border border-ds-border bg-white text-left text-sm flex items-center gap-2 flex-wrap focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {selectedInterviewerIds.length === 0 ? (
                  <span className="text-text-muted">Select interviewers...</span>
                ) : (
                  selectedInterviewerIds.map(id => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-navy/10 text-navy"
                    >
                      {getInterviewerName(id)}
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); removeInterviewer(id) }}
                        className="hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </span>
                  ))
                )}
                <ChevronDown className="w-4 h-4 text-text-muted ml-auto flex-shrink-0" />
              </button>

              {/* Dropdown list */}
              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-ds-border rounded-md shadow-lg max-h-[240px] overflow-y-auto">
                  {teamOptions.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-orange bg-bg-section border-b border-ds-border sticky top-0">
                        Team
                      </div>
                      {teamOptions.map(option => {
                        const isSelected = selectedInterviewerIds.includes(option.id)
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleInterviewer(option.id)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-section transition-colors ${isSelected ? 'bg-navy/5' : ''}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-navy border-navy' : 'border-ds-border'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-text-primary truncate">{option.name}</div>
                              {option.subtitle && <div className="text-xs text-text-muted truncate">{option.subtitle}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}

                  {contactOptions.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-orange bg-bg-section border-b border-ds-border sticky top-0">
                        Client Contacts
                      </div>
                      {contactOptions.map(option => {
                        const isSelected = selectedInterviewerIds.includes(option.id)
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleInterviewer(option.id)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-section transition-colors ${isSelected ? 'bg-navy/5' : ''}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-navy border-navy' : 'border-ds-border'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-text-primary truncate">{option.name}</div>
                              {option.subtitle && <div className="text-xs text-text-muted truncate">{option.subtitle}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}

                  {panelistOptions.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-orange bg-bg-section border-b border-ds-border sticky top-0">
                        Panelists
                      </div>
                      {panelistOptions.map(option => {
                        const isSelected = selectedInterviewerIds.includes(option.id)
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleInterviewer(option.id)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-section transition-colors ${isSelected ? 'bg-navy/5' : ''}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-navy border-navy' : 'border-ds-border'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-text-primary truncate">{option.name}</div>
                              {option.subtitle && <div className="text-xs text-text-muted truncate">{option.subtitle}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}

                  {/* Add Panelist inline */}
                  <div className="border-t border-ds-border">
                    {showAddPanelist ? (
                      <div className="p-3 space-y-2 bg-bg-section">
                        <p className="text-xs font-bold text-navy uppercase tracking-wide">New Panelist</p>
                        <input
                          type="text"
                          placeholder="Name *"
                          value={newPanelistName}
                          onChange={(e) => setNewPanelistName(e.target.value)}
                          className="w-full h-8 px-2 text-sm border border-ds-border rounded bg-white text-text-primary"
                        />
                        <input
                          type="text"
                          placeholder="Title"
                          value={newPanelistTitle}
                          onChange={(e) => setNewPanelistTitle(e.target.value)}
                          className="w-full h-8 px-2 text-sm border border-ds-border rounded bg-white text-text-primary"
                        />
                        <input
                          type="email"
                          placeholder="Email *"
                          value={newPanelistEmail}
                          onChange={(e) => setNewPanelistEmail(e.target.value)}
                          className="w-full h-8 px-2 text-sm border border-ds-border rounded bg-white text-text-primary"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleAddPanelist}
                            disabled={isSavingPanelist || !newPanelistName.trim() || !newPanelistEmail.trim()}
                            className="flex-1 h-7 text-xs font-semibold bg-navy text-white rounded disabled:opacity-50"
                          >
                            {isSavingPanelist ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAddPanelist(false); setNewPanelistName(''); setNewPanelistTitle(''); setNewPanelistEmail('') }}
                            className="flex-1 h-7 text-xs font-semibold border border-ds-border rounded text-text-primary bg-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddPanelist(true)}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-bg-section transition-colors text-orange font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add Panelist
                      </button>
                    )}
                  </div>

                  {teamOptions.length === 0 && contactOptions.length === 0 && panelistOptions.length === 0 && !showAddPanelist && (
                    <div className="px-3 py-4 text-sm text-text-muted text-center">
                      No team members or contacts found
                    </div>
                  )}
                </div>
              )}
            </div>
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
