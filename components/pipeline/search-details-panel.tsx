"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { Pencil, Plus, Trash2, Users, Copy, Check, Eye, EyeOff, ClipboardList, Target, NotebookPen } from "lucide-react"

interface ClientContact {
  id: string
  name: string
  title: string
  email: string
  phone: string
  is_primary: boolean
  role: string
}

interface SearchDetailsPanelProps {
  searchId: string
  search: any
  onUpdate?: () => void
  notes?: string
  onNotesChange?: (value: string) => void
  isSavingNotes?: boolean
  stages?: any[]
  searchContacts?: any[]
  firmId?: string
  onNavigateToInterviewPlan?: () => void
  scrollTo?: string
}

export function SearchDetailsPanel({ searchId, search, onUpdate, notes, onNotesChange, isSavingNotes, stages = [], onNavigateToInterviewPlan, scrollTo }: SearchDetailsPanelProps) {
  const [editingSection, setEditingSection] = useState<'position_details' | 'client_contacts' | 'notes' | null>(null)
  const isEditing = editingSection === 'position_details'
  const isEditingContacts = editingSection === 'client_contacts'
  const isEditingNotes = editingSection === 'notes'
  const positionDetailsRef = useRef<HTMLDivElement>(null)
  const clientContactsRef = useRef<HTMLDivElement>(null)

  // Scroll to section when scrollTo prop changes
  useEffect(() => {
    if (scrollTo === 'position_details' && positionDetailsRef.current) {
      positionDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (scrollTo === 'client_contacts' && clientContactsRef.current) {
      clientContactsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [scrollTo])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Client contacts state
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [isSavingContact, setIsSavingContact] = useState(false)

  const [togglingPortal, setTogglingPortal] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (value: string, fieldName: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 1500)
  }

  const togglePortalVisibility = async (field: string, currentValue: boolean) => {
    setTogglingPortal(field)
    try {
      const { error } = await supabase
        .from('searches')
        .update({ [field]: !currentValue, updated_at: new Date().toISOString() })
        .eq('id', searchId)
      if (error) {
        console.error('Error toggling portal visibility:', error)
      } else {
        onUpdate?.()
      }
    } catch (err) {
      console.error('Error toggling portal visibility:', err)
    } finally {
      setTogglingPortal(null)
    }
  }

  const [form, setForm] = useState({
    company_name: search?.company_name || "",
    position_title: search?.position_title || "",
    role_type: search?.role_type || "",
    replacing: search?.replacing || "",
    reports_to: search?.reports_to || "",
    reports_to_title: search?.reports_to_title || "",
    reports_to_email: search?.reports_to_email || "",
    reports_to_phone: search?.reports_to_phone || "",
    position_location: search?.position_location || "",
    work_arrangement: search?.work_arrangement || "",
    open_to_relocation: search?.open_to_relocation || false,
    compensation_range: search?.compensation_range || "",
  })

  const updateField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Core fields that exist in the searches table
      const coreFields: Record<string, any> = {
        company_name: form.company_name,
        position_title: form.position_title,
        reports_to: form.reports_to || null,
        reports_to_title: form.reports_to_title || null,
        reports_to_email: form.reports_to_email || null,
        reports_to_phone: form.reports_to_phone || null,
        position_location: form.position_location || null,
        work_arrangement: form.work_arrangement || null,
        open_to_relocation: form.open_to_relocation,
        compensation_range: form.compensation_range || null,
        updated_at: new Date().toISOString(),
      }

      // Extended fields that may not exist yet
      const extendedFields: Record<string, any> = {
        role_type: form.role_type || null,
        replacing: form.role_type === 'backfill' ? (form.replacing || null) : null,
      }

      const { error: coreError } = await supabase
        .from('searches')
        .update(coreFields)
        .eq('id', searchId)

      if (coreError) {
        console.error('Core save error:', JSON.stringify(coreError), 'code:', coreError.code, 'message:', coreError.message, 'details:', coreError.details, 'hint:', coreError.hint)
        throw new Error(coreError.message || JSON.stringify(coreError))
      }

      // Try extended fields — don't block if columns don't exist yet
      const { error: extError } = await supabase
        .from('searches')
        .update(extendedFields)
        .eq('id', searchId)

      if (extError) {
        console.warn('Extended fields save skipped (columns may not exist yet):', extError.message || JSON.stringify(extError))
      }

      setEditingSection(null)
      onUpdate?.()
    } catch (err: any) {
      console.error('Error saving search details:', err?.message || JSON.stringify(err))
      setError(err?.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      company_name: search?.company_name || "",
      position_title: search?.position_title || "",
      role_type: search?.role_type || "",
      replacing: search?.replacing || "",
      reports_to: search?.reports_to || "",
      reports_to_title: search?.reports_to_title || "",
      reports_to_email: search?.reports_to_email || "",
      reports_to_phone: search?.reports_to_phone || "",
      position_location: search?.position_location || "",
      work_arrangement: search?.work_arrangement || "",
      open_to_relocation: search?.open_to_relocation || false,
      compensation_range: search?.compensation_range || "",
    })
    setError(null)
    setEditingSection(null)
  }

  const saveRoleType = async (value: string) => {
    try {
      const { error, data } = await supabase
        .from('searches')
        .update({ role_type: value, updated_at: new Date().toISOString() })
        .eq('id', searchId)
        .select()
      if (error) {
        console.error('saveRoleType error:', error.code, error.message, error.details, error.hint)
      } else {
        console.log('saveRoleType success:', value, data)
      }
    } catch (err: any) {
      console.error('saveRoleType catch:', err?.message || JSON.stringify(err))
    }
  }

  const saveReplacing = async (value: string) => {
    try {
      const { error } = await supabase
        .from('searches')
        .update({ replacing: value || null, updated_at: new Date().toISOString() })
        .eq('id', searchId)
      if (error) console.warn('saveReplacing skipped (column may not exist):', error.message)
    } catch (err: any) {
      console.warn('saveReplacing error:', err?.message || JSON.stringify(err))
    }
  }

  // Interview Plan summary helpers
  const getInterviewerCount = (stage: any): number => {
    const ids = stage.interviewer_ids || (stage.interviewer_contact_id ? [stage.interviewer_contact_id] : [])
    return ids.length
  }

  // Load client contacts from the contacts table
  useEffect(() => {
    const loadContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('search_id', searchId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Error loading contacts:', error)
        return
      }
      if (data) {
        setContacts(data.map((c: any) => ({
          id: c.id,
          name: c.name || '',
          title: c.title || '',
          email: c.email || '',
          phone: c.phone || '',
          is_primary: c.is_primary || false,
          role: c.role || '',
        })))
      }
    }
    loadContacts()
  }, [searchId])


  const addContact = async () => {
    setIsSavingContact(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          search_id: searchId,
          name: '',
          email: '',
          is_primary: false,
          access_level: 'full_access',
        })
        .select()
        .single()
      if (error) throw error
      if (data) {
        setContacts(prev => [...prev, {
          id: data.id,
          name: '',
          title: '',
          email: '',
          phone: '',
          is_primary: false,
          role: '',
        }])
      }
    } catch (err) {
      console.error('Error adding contact:', err)
      alert('Failed to add contact. Check console for details.')
    } finally {
      setIsSavingContact(false)
    }
  }

  const saveContactField = async (contactId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', contactId)
      if (error) console.error('Error saving contact field:', error)
    } catch (err) {
      console.error('Error saving contact field:', err)
    }
  }

  const updateContactLocal = (index: number, field: keyof ClientContact, value: any) => {
    setContacts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleContactBlur = (index: number, field: string, value: any) => {
    const contact = contacts[index]
    if (contact?.id) {
      saveContactField(contact.id, field, value)
    }
  }

  const handleTypeChange = async (index: number, type: string) => {
    const contact = contacts[index]
    if (!contact?.id) return

    if (type === 'primary') {
      // Set this one as primary, unset others
      setContacts(prev => prev.map((c, i) => ({
        ...c,
        is_primary: i === index,
        role: i === index ? c.role : c.role,
      })))
      // Clear is_primary on all contacts for this search, then set this one
      await supabase
        .from('contacts')
        .update({ is_primary: false })
        .eq('search_id', searchId)
      await supabase
        .from('contacts')
        .update({ is_primary: true, role: contact.role || null })
        .eq('id', contact.id)
    } else if (type === 'secondary') {
      updateContactLocal(index, 'is_primary', false)
      updateContactLocal(index, 'role', '')
      await supabase
        .from('contacts')
        .update({ is_primary: false, role: null })
        .eq('id', contact.id)
    } else if (type === 'other') {
      updateContactLocal(index, 'is_primary', false)
      updateContactLocal(index, 'role', 'other')
      await supabase
        .from('contacts')
        .update({ is_primary: false, role: 'other' })
        .eq('id', contact.id)
    }
  }

  const getContactType = (contact: ClientContact): string => {
    if (contact.is_primary) return 'primary'
    if (contact.role === 'other') return 'other'
    return 'secondary'
  }

  const deleteContact = async (index: number) => {
    const contact = contacts[index]
    if (!confirm('Delete this contact?')) return
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id)
      if (error) throw error
      setContacts(prev => prev.filter((_, i) => i !== index))
    } catch (err) {
      console.error('Error deleting contact:', err)
      alert('Failed to delete contact')
    }
  }

  return (
    <div className="relative space-y-3" style={{ paddingBottom: editingSection ? '72px' : '0px' }}>
      {/* Sticky Save/Cancel Bar (bottom, only when editing any section) */}
      {editingSection && (
        <div className="bg-white border-t border-ds-border" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', zIndex: 50, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex justify-end gap-3 px-6 py-4 max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (editingSection === 'position_details') handleCancel()
                else setEditingSection(null)
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (editingSection === 'position_details') handleSave()
                else setEditingSection(null)
              }}
              disabled={isSaving || (editingSection === 'position_details' && (!form.company_name.trim() || !form.position_title.trim()))}
              className="bg-navy text-white font-bold"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* ===== THE ROLE ===== */}
      <div ref={positionDetailsRef} className="rounded-lg border border-ds-border overflow-hidden">
        <div className="px-5 py-3 bg-[#64748B] flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-white" />
            <h3 className="text-base font-bold text-white">Position Details</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePortalVisibility('portal_show_position_details', search?.portal_show_position_details ?? true)}
              disabled={togglingPortal === 'portal_show_position_details'}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title={(search?.portal_show_position_details ?? true) ? 'Visible in Client Portal' : 'Hidden from Client Portal'}
            >
              {(search?.portal_show_position_details ?? true) ? (
                <Eye className="w-4 h-4 text-green-300" />
              ) : (
                <EyeOff className="w-4 h-4 text-white/50" />
              )}
            </button>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setEditingSection('position_details')}
                className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 bg-white/90 hover:bg-white transition-colors" style={{ color: '#D97757' }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>
        </div>
      <div className="bg-bg-page p-5 space-y-5">

        {/* Role Type — always interactive */}
        <div className="flex items-center gap-4 flex-wrap">
          <Label className="text-base font-bold text-navy flex-shrink-0">Role Type</Label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="role_type"
                checked={form.role_type === 'new_role'}
                onChange={() => {
                  updateField('role_type', 'new_role')
                  saveRoleType('new_role')
                }}
                className="accent-navy"
              />
              <span className="text-sm text-text-primary">New Role</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="role_type"
                checked={form.role_type === 'backfill'}
                onChange={() => {
                  updateField('role_type', 'backfill')
                  saveRoleType('backfill')
                }}
                className="accent-navy"
              />
              <span className="text-sm text-text-primary">Backfill</span>
            </label>
          </div>
        </div>

        {/* Reports To — structured row */}
        <div>
          <Label className="text-base font-bold text-navy mb-1.5 block">Reports To</Label>
          <div className="grid grid-cols-[1fr_1fr_1fr_0.6fr] gap-2">
            {isEditing ? (
              <>
                <input
                  value={form.reports_to}
                  onChange={(e) => updateField('reports_to', e.target.value)}
                  placeholder="Name"
                  className="h-8 px-2 text-sm border border-ds-border rounded bg-white focus:border-navy focus:outline-none transition-colors"
                />
                <input
                  value={form.reports_to_title}
                  onChange={(e) => updateField('reports_to_title', e.target.value)}
                  placeholder="Title"
                  className="h-8 px-2 text-sm border border-ds-border rounded bg-white focus:border-navy focus:outline-none transition-colors"
                />
                <input
                  value={form.reports_to_email}
                  onChange={(e) => updateField('reports_to_email', e.target.value)}
                  placeholder="Email"
                  className="h-8 px-2 text-sm border border-ds-border rounded bg-white focus:border-navy focus:outline-none transition-colors"
                />
                <input
                  value={form.reports_to_phone}
                  onChange={(e) => updateField('reports_to_phone', e.target.value)}
                  placeholder="Phone"
                  className="h-8 px-2 text-sm border border-ds-border rounded bg-white focus:border-navy focus:outline-none transition-colors"
                />
              </>
            ) : (
              <>
                <div className="h-8 px-2 flex items-center justify-between text-sm text-text-primary border border-ds-border rounded bg-white group">
                  <span className="truncate">{search.reports_to || <span className="text-text-muted">—</span>}</span>
                  {search.reports_to && (
                    <button onClick={() => copyToClipboard(search.reports_to, 'name')} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0 text-text-muted hover:text-navy" title="Copy">
                      {copiedField === 'name' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <div className="h-8 px-2 flex items-center justify-between text-sm text-text-primary border border-ds-border rounded bg-white group">
                  <span className="truncate">{search.reports_to_title || <span className="text-text-muted">—</span>}</span>
                  {search.reports_to_title && (
                    <button onClick={() => copyToClipboard(search.reports_to_title, 'title')} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0 text-text-muted hover:text-navy" title="Copy">
                      {copiedField === 'title' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <div className="h-8 px-2 flex items-center justify-between text-sm text-text-primary border border-ds-border rounded bg-white group">
                  <span className="truncate">{search.reports_to_email || <span className="text-text-muted">—</span>}</span>
                  {search.reports_to_email && (
                    <button onClick={() => copyToClipboard(search.reports_to_email, 'email')} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0 text-text-muted hover:text-navy" title="Copy">
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <div className="h-8 px-2 flex items-center justify-between text-sm text-text-primary border border-ds-border rounded bg-white group">
                  <span className="truncate">{search.reports_to_phone || <span className="text-text-muted">—</span>}</span>
                  {search.reports_to_phone && (
                    <button onClick={() => copyToClipboard(search.reports_to_phone, 'phone')} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0 text-text-muted hover:text-navy" title="Copy">
                      {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_0.6fr] gap-2 mt-0.5">
            <span className="text-[10px] text-text-primary px-2">Name</span>
            <span className="text-[10px] text-text-primary px-2">Title</span>
            <span className="text-[10px] text-text-primary px-2">Email</span>
            <span className="text-[10px] text-text-primary px-2">Phone</span>
          </div>
        </div>

        {/* Position Location | Work Arrangement | Open to Relocation */}
        <div className="grid grid-cols-3 gap-5">
          <div>
            <Label className="text-base font-bold text-navy">Position Location</Label>
            {isEditing ? (
              <Input
                value={form.position_location}
                onChange={(e) => updateField('position_location', e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-sm"
              />
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-sm text-text-primary">{search.position_location || '—'}</span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-base font-bold text-navy">Work Arrangement</Label>
            {isEditing ? (
              <select
                value={form.work_arrangement}
                onChange={(e) => updateField('work_arrangement', e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-ds-border bg-white rounded-md focus:outline-none text-sm text-black"
              >
                <option value="" disabled>Select arrangement...</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-sm text-text-primary capitalize">{search.work_arrangement || '—'}</span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-base font-bold text-navy">Relocation</Label>
            <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
              <Checkbox
                id="open-to-relocation"
                checked={isEditing ? form.open_to_relocation : (search.open_to_relocation || false)}
                onCheckedChange={isEditing ? (checked) => updateField('open_to_relocation', checked as boolean) : undefined}
                disabled={!isEditing}
              />
              <Label htmlFor="open-to-relocation" className={`font-normal text-sm text-text-primary ml-2 ${isEditing ? 'cursor-pointer' : ''}`}>
                Open to Relocation
              </Label>
            </div>
          </div>
        </div>

        {/* Compensation Details (full width) */}
        <div>
          <Label className="text-base font-bold text-navy">Compensation Details</Label>
          <span className="text-xs text-text-primary ml-2">Base, bonus, equity, relocation, etc.</span>
          {isEditing ? (
            <Textarea
              value={form.compensation_range}
              onChange={(e) => updateField('compensation_range', e.target.value)}
              placeholder="e.g. Base: $250k-$300k, Bonus: 30-40%, Equity: 0.5-1.0%"
              rows={3}
              className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[80px]">
              <span className="text-sm text-text-primary whitespace-pre-wrap">{search.compensation_range || '—'}</span>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ===== CLIENT CONTACTS ===== */}
      <div ref={clientContactsRef} className="rounded-lg border border-ds-border overflow-hidden">
        {/* Section Header — navy bar */}
        <div className="px-5 py-3 bg-[#64748B] flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white" />
            <h3 className="text-base font-bold text-white">Client Contacts</h3>
            {contacts.length > 0 && (
              <span className="text-xs text-white/60">({contacts.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePortalVisibility('portal_show_contacts', search?.portal_show_contacts ?? false)}
              disabled={togglingPortal === 'portal_show_contacts'}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title={(search?.portal_show_contacts ?? false) ? 'Visible in Client Portal' : 'Hidden from Client Portal'}
            >
              {(search?.portal_show_contacts ?? false) ? (
                <Eye className="w-4 h-4 text-green-300" />
              ) : (
                <EyeOff className="w-4 h-4 text-white/50" />
              )}
            </button>
            {!isEditingContacts && (
              <button
                type="button"
                onClick={() => setEditingSection('client_contacts')}
                className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 bg-white/90 hover:bg-white transition-colors" style={{ color: '#D97757' }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="bg-bg-page">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_0.8fr_1.5fr_0.7fr_0.8fr_28px] gap-2 px-4 py-2 border-b border-ds-border bg-bg-page">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Name</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Title</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Email</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Phone</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Relation</span>
            <span></span>
          </div>

          {/* Contact Rows */}
          {contacts.length === 0 ? (
            <div
              className={`grid grid-cols-[1fr_0.8fr_1.5fr_0.7fr_0.8fr_28px] gap-2 px-4 py-1.5 items-center transition-colors ${isEditingContacts ? 'cursor-pointer hover:bg-[#FAFAFA]' : ''}`}
              onClick={isEditingContacts ? addContact : undefined}
            >
              <span className="h-8 px-2 flex items-center text-sm text-text-muted">Jane Smith</span>
              <span className="h-8 px-2 flex items-center text-sm text-text-muted">VP Engineering</span>
              <span className="h-8 px-2 flex items-center text-sm text-text-muted">jane@company.com</span>
              <span className="h-8 px-2 flex items-center text-sm text-text-muted">555-0100</span>
              <span className="h-8 px-2 flex items-center text-sm text-text-muted">Hiring Mgr</span>
              <span></span>
            </div>
          ) : (
            contacts.map((contact, idx) => (
              <div
                key={contact.id}
                className="grid grid-cols-[1fr_0.8fr_1.5fr_0.7fr_0.8fr_28px] gap-2 px-4 py-1.5 border-b border-ds-border last:border-b-0 items-center hover:bg-[#FAFAFA] transition-colors"
              >
                <input
                  value={contact.name}
                  onChange={(e) => updateContactLocal(idx, 'name', e.target.value)}
                  onBlur={(e) => handleContactBlur(idx, 'name', e.target.value)}
                  placeholder={isEditingContacts ? "Name" : ""}
                  readOnly={!isEditingContacts}
                  className={isEditingContacts ? "h-8 px-2 text-sm border border-transparent rounded bg-transparent hover:border-ds-border focus:border-navy focus:bg-white focus:outline-none transition-colors" : "h-8 px-2 text-sm border-none bg-transparent text-text-primary cursor-default outline-none"}
                />
                <input
                  value={contact.title}
                  onChange={(e) => updateContactLocal(idx, 'title', e.target.value)}
                  onBlur={(e) => handleContactBlur(idx, 'title', e.target.value || null)}
                  placeholder={isEditingContacts ? "Title" : ""}
                  readOnly={!isEditingContacts}
                  className={isEditingContacts ? "h-8 px-2 text-sm border border-transparent rounded bg-transparent hover:border-ds-border focus:border-navy focus:bg-white focus:outline-none transition-colors" : "h-8 px-2 text-sm border-none bg-transparent text-text-primary cursor-default outline-none"}
                />
                <input
                  value={contact.email}
                  onChange={(e) => updateContactLocal(idx, 'email', e.target.value)}
                  onBlur={(e) => handleContactBlur(idx, 'email', e.target.value)}
                  placeholder={isEditingContacts ? "email@company.com" : ""}
                  readOnly={!isEditingContacts}
                  className={isEditingContacts ? "h-8 px-2 text-sm border border-transparent rounded bg-transparent hover:border-ds-border focus:border-navy focus:bg-white focus:outline-none transition-colors" : "h-8 px-2 text-sm border-none bg-transparent text-text-primary cursor-default outline-none"}
                />
                <input
                  value={contact.phone}
                  onChange={(e) => updateContactLocal(idx, 'phone', e.target.value)}
                  onBlur={(e) => handleContactBlur(idx, 'phone', e.target.value || null)}
                  placeholder={isEditingContacts ? "Phone" : ""}
                  readOnly={!isEditingContacts}
                  className={isEditingContacts ? "h-8 px-2 text-sm border border-transparent rounded bg-transparent hover:border-ds-border focus:border-navy focus:bg-white focus:outline-none transition-colors" : "h-8 px-2 text-sm border-none bg-transparent text-text-primary cursor-default outline-none"}
                />
                <input
                  value={contact.role}
                  onChange={(e) => updateContactLocal(idx, 'role', e.target.value)}
                  onBlur={(e) => handleContactBlur(idx, 'role', e.target.value || null)}
                  placeholder={isEditingContacts ? "e.g. Hiring Mgr, Board" : ""}
                  readOnly={!isEditingContacts}
                  className={isEditingContacts ? "h-8 px-2 text-sm border border-transparent rounded bg-transparent hover:border-ds-border focus:border-navy focus:bg-white focus:outline-none transition-colors" : "h-8 px-2 text-sm border-none bg-transparent text-text-primary cursor-default outline-none"}
                />
                {isEditingContacts ? (
                  <button
                    type="button"
                    onClick={() => deleteContact(idx)}
                    className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    title="Delete contact"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))
          )}

          {/* Add Contact Button — only in edit mode */}
          {isEditingContacts && (
            <div className="px-4 py-3 border-t border-ds-border">
              <button
                type="button"
                onClick={addContact}
                disabled={isSavingContact}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {isSavingContact ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== INTERVIEW PLAN (Summary) ===== */}
      <div className="rounded-lg border border-ds-border overflow-hidden">
        {/* Section Header — navy bar */}
        <div className="px-5 py-3 bg-[#64748B] flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-white" />
            <h3 className="text-base font-bold text-white">Interview Plan</h3>
            {stages.length > 0 && (
              <span className="text-xs text-white/60">({stages.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePortalVisibility('portal_show_interview_plan', search?.portal_show_interview_plan ?? true)}
              disabled={togglingPortal === 'portal_show_interview_plan'}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title={(search?.portal_show_interview_plan ?? true) ? 'Visible in Client Portal' : 'Hidden from Client Portal'}
            >
              {(search?.portal_show_interview_plan ?? true) ? (
                <Eye className="w-4 h-4 text-green-300" />
              ) : (
                <EyeOff className="w-4 h-4 text-white/50" />
              )}
            </button>
            {onNavigateToInterviewPlan && (
              <button
                type="button"
                onClick={onNavigateToInterviewPlan}
                className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 bg-white/90 hover:bg-white transition-colors" style={{ color: '#D97757' }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Compact Summary Table */}
        <div className="bg-bg-page">
          {/* Table Header */}
          <div className="grid grid-cols-[28px_1fr_0.7fr_0.6fr_36px] gap-2 px-4 py-2 border-b border-ds-border bg-bg-page">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">#</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Stage</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Panelists</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Format</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide text-center">Vis</span>
          </div>

          {/* Stage Rows */}
          {stages.length === 0 ? (
            <div
              className="px-4 py-5 text-center text-sm text-text-muted cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={onNavigateToInterviewPlan}
            >
              No stages yet. Click to add interview stages.
            </div>
          ) : (
            stages.map((stage, index) => {
              const count = getInterviewerCount(stage)
              return (
                <div
                  key={stage.id}
                  onClick={onNavigateToInterviewPlan}
                  className="grid grid-cols-[28px_1fr_0.7fr_0.6fr_36px] gap-2 px-4 py-2 border-b border-ds-border last:border-b-0 items-center hover:bg-[#FAFAFA] cursor-pointer transition-colors group"
                >
                  <span className="text-sm font-medium text-text-secondary">{index + 1}</span>
                  <span className="text-sm font-medium text-text-primary truncate">{stage.name}</span>
                  <span className="text-sm text-text-secondary">
                    {count === 0 ? '—' : `${count} panelist${count !== 1 ? 's' : ''}`}
                  </span>
                  <span className="text-sm text-text-secondary truncate">{stage.interview_format || '—'}</span>
                  <div className="flex justify-center">
                    {stage.visible_in_client_portal ? (
                      <Eye className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {/* Notes */}
      {onNotesChange && (
        <div className="rounded-lg border border-ds-border overflow-hidden">
          <div className="px-5 py-3 bg-[#64748B] flex items-center justify-between rounded-t-lg">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-4 h-4 text-white" />
              <h3 className="text-base font-bold text-white">Notes</h3>
            </div>
            <div className="flex items-center gap-2">
              {isSavingNotes && <span className="text-[11px] text-white/60 mr-1">Saving...</span>}
              <button
                type="button"
                onClick={() => togglePortalVisibility('portal_show_notes', search?.portal_show_notes ?? false)}
                disabled={togglingPortal === 'portal_show_notes'}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title={(search?.portal_show_notes ?? false) ? 'Visible in Client Portal' : 'Hidden from Client Portal'}
              >
                {(search?.portal_show_notes ?? false) ? (
                  <Eye className="w-4 h-4 text-green-300" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white/50" />
                )}
              </button>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={() => setEditingSection('notes')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 bg-white/90 hover:bg-white transition-colors" style={{ color: '#D97757' }}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
          </div>
          {isEditingNotes ? (
            <textarea
              value={notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add notes about this search..."
              className="w-full h-40 px-4 py-3 text-sm border-0 bg-white focus:outline-none resize-y"
            />
          ) : (
            <div className="w-full min-h-[160px] px-4 py-3 text-sm bg-bg-page whitespace-pre-wrap text-text-primary">
              {notes || <span className="text-text-muted">No notes yet.</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
