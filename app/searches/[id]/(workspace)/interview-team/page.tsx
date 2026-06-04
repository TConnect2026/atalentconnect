"use client"

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Users } from "lucide-react"

const supabase = createClient()

interface Panelist {
  id: string
  search_id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
}

interface FormState {
  name: string
  title: string
  email: string
  phone: string
  linkedin_url: string
}

const EMPTY_FORM: FormState = { name: '', title: '', email: '', phone: '', linkedin_url: '' }

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

  const load = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('panelists')
      .select('id, search_id, name, title, email, phone, linkedin_url')
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
      phone: p.phone || '',
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
        phone: form.phone.trim() || null,
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
          <p className="text-sm text-text-muted mt-1">Interview team.</p>
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
        <div className="divide-y divide-ds-border">
          {panelists.map((p) => (
            <div key={p.id} className="group flex items-start justify-between gap-3 py-3">
              <div className="min-w-0 text-sm text-navy leading-relaxed space-y-0.5">
                <p className="font-bold">{p.name}</p>
                {p.title && <p>{p.title}</p>}
                {p.email && <p>{p.email}</p>}
                {p.phone && <p>{p.phone}</p>}
                {p.linkedin_url && <p className="break-all">{p.linkedin_url}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-md text-text-muted hover:text-navy hover:bg-bg-section transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(p)} title="Remove" className="p-1.5 rounded-md text-text-muted hover:text-red-600 hover:bg-bg-section transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
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
              <Label className="text-xs font-semibold text-navy">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(415)-555-0142" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-navy">LinkedIn URL</Label>
              <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="linkedin.com/in/janesmith" className="mt-1" />
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
