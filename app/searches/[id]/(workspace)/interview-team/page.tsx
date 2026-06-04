"use client"

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Users, Copy, Check } from "lucide-react"

const supabase = createClient()

interface Panelist {
  id: string
  search_id: string
  name: string
  title: string | null
  email: string | null
  notes: string | null
  linkedin_url: string | null
}

interface FormState {
  name: string
  title: string
  email: string
  notes: string
  linkedin_url: string
}

const EMPTY_FORM: FormState = { name: '', title: '', email: '', notes: '', linkedin_url: '' }

// Small ghost icon button that copies `value` to the clipboard and briefly
// swaps to a check before reverting. Renders nothing when there's no value.
function CopyButton({ value, label }: { value: string | null | undefined; label: string }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch (err) {
          console.error('Copy failed:', err)
        }
      }}
      className="p-1 rounded text-text-muted hover:text-navy transition-colors flex-shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function InterviewTeamPage() {
  const params = useParams()
  const searchId = params.id as string

  const [panelists, setPanelists] = useState<Panelist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('panelists')
      .select('id, search_id, name, title, email, notes, linkedin_url')
      .eq('search_id', searchId)
      .order('name', { ascending: true })
    if (error) console.error('Interview Team load error:', error)
    setPanelists((data || []) as Panelist[])
    setIsLoading(false)
  }, [searchId])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (p: Panelist) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      title: p.title || '',
      email: p.email || '',
      notes: p.notes || '',
      linkedin_url: p.linkedin_url || '',
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    const title = form.title.trim()
    if (!name || !title) {
      setFormError('Name and title are required')
      return
    }
    setIsSaving(true)
    setFormError(null)
    try {
      const payload = {
        search_id: searchId,
        name,
        title,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
      }
      const res = await fetch('/api/panelists', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Failed to save team member (${res.status})`)
      }
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      setEditingId(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save team member')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (p: Panelist) => {
    if (!confirm(`Remove ${p.name || 'this team member'} from the interview team?`)) return
    try {
      const res = await fetch('/api/panelists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, search_id: searchId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Failed to remove team member (${res.status})`)
      }
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove team member')
    }
  }

  const canSubmit = !!form.name.trim() && !!form.title.trim()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Interview Team</h1>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all flex-shrink-0"
          style={{ backgroundColor: '#D97757' }}
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-text-muted">Loading…</div>
      ) : panelists.length === 0 ? (
        <div className="rounded-lg border border-ds-border bg-white px-5 py-10 text-center">
          <Users className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-semibold text-navy">No interviewers yet</p>
          <p className="text-xs text-text-muted mt-1">Add the people who will interview candidates for this search.</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[1.4fr_1.4fr_1.6fr_0.8fr_1.6fr_auto] gap-3 items-center px-1 pb-2 border-b border-ds-border text-xs font-semibold text-text-muted uppercase tracking-wide">
            <div className="min-w-0 truncate text-left">Name</div>
            <div className="min-w-0 truncate text-left">Title</div>
            <div className="min-w-0 truncate text-left">Email</div>
            <div className="min-w-0 truncate text-left">LinkedIn</div>
            <div className="min-w-0 truncate text-left">Notes</div>
            <div className="flex items-center justify-end gap-1 invisible" aria-hidden>
              <span className="p-1.5"><Pencil className="w-3.5 h-3.5" /></span>
              <span className="p-1.5"><Trash2 className="w-3.5 h-3.5" /></span>
            </div>
          </div>
          <div className="divide-y divide-ds-border">
            {panelists.map((p) => (
              <div key={p.id} className="group">
                <div className="grid grid-cols-[1.4fr_1.4fr_1.6fr_0.8fr_1.6fr_auto] gap-3 items-center py-2.5 px-1">
                  <div className="min-w-0 font-bold text-navy truncate" title={p.name}>{p.name}</div>
                  <div className="min-w-0 text-navy text-sm truncate" title={p.title || undefined}>{p.title}</div>
                  <div className="flex items-center justify-start gap-1 min-w-0">
                    {p.email ? (
                      <>
                        <span className="text-sm text-navy truncate" title={p.email}>{p.email}</span>
                        <CopyButton value={p.email} label="email" />
                      </>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </div>
                  <div className="flex items-center justify-start gap-1 min-w-0">
                    {p.linkedin_url ? (
                      <>
                        <span className="text-sm text-text-muted">LinkedIn</span>
                        <CopyButton value={p.linkedin_url} label="LinkedIn URL" />
                      </>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </div>
                  <div className="flex items-center justify-start gap-1 min-w-0">
                    {p.notes ? (
                      <button
                        type="button"
                        onClick={() => setExpandedNotesId(expandedNotesId === p.id ? null : p.id)}
                        title={p.notes}
                        className="w-full min-w-0 text-left text-sm text-navy truncate hover:underline"
                      >
                        {p.notes}
                      </button>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-md text-text-muted hover:text-navy hover:bg-bg-section transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p)} title="Remove" className="p-1.5 rounded-md text-text-muted hover:text-red-600 hover:bg-bg-section transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {expandedNotesId === p.id && p.notes && (
                  <div className="px-1 pb-3 text-sm text-navy whitespace-pre-wrap">{p.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) { setForm(EMPTY_FORM); setEditingId(null); setFormError(null) }
        }}
      >
        <DialogContent className="max-w-[460px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-navy">{editingId ? 'Edit team member' : 'Add team member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5">
            <div>
              <Label className="text-xs font-semibold text-navy">Name <span className="text-red-500">*</span></Label>
              <Input autoFocus value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); if (formError) setFormError(null) }} placeholder="Jane Smith" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-navy">Title <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); if (formError) setFormError(null) }} placeholder="VP of Engineering" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-navy">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-navy">LinkedIn URL</Label>
              <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="linkedin.com/in/janesmith" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-navy">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Context for confirmations, scheduling notes, etc." className="mt-1" />
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="button" className="bg-navy text-white" onClick={handleSave} disabled={isSaving || !canSubmit}>
                {isSaving ? 'Saving...' : editingId ? 'Save' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
