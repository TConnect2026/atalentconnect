'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, FileText, Loader2, Plus, RefreshCw, Replace, Trash2, Upload, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Mirrors the shape used by IntakePanel. Keeping this in sync manually is
// fine for v1 — both files live next door and change together.
interface ClientContact {
  name: string
  title: string
  email: string
  phone: string
  role: string
}
interface SuggestedQuestion { id: string; question: string; answer: string }
interface NoteEntry { id: string; text: string }

export interface IntakeSlideOverForm {
  // Basics
  position_title: string
  reports_to_name: string
  reports_to_title: string
  reports_to_email: string
  reports_to_phone: string
  client_contacts: ClientContact[]
  direct_reports_count: string
  direct_reports_who: string
  position_location: string
  work_arrangement: string
  compensation_base: string
  compensation_bonus: string
  compensation_equity: string
  compensation_relocation: string
  reason_for_opening: string
  target_start_date: string
  launch_date: string
  target_close_date: string

  // Context — scaffolding
  context_why_open: string
  context_success_12mo: string
  context_hard_not_on_jd: string
  context_failure_profile: string
  context_dont_ask_client: string
  context_suggested: SuggestedQuestion[]
  context_notes: NoteEntry[]
}

interface IntakeSlideOverProps {
  isOpen: boolean
  onClose: () => void
  searchId: string
  search: any
  form: IntakeSlideOverForm
  updateForm: (patch: Partial<IntakeSlideOverForm>) => void
  // Client contact helpers — keep array operations colocated with the parent
  addClientContact: () => void
  removeClientContact: (i: number) => void
  updateClientContact: (i: number, patch: Partial<ClientContact>) => void
  // Role options for the contact dropdown
  contactRoleOptions: Array<{ value: string; label: string }>
  // JD upload — owned by the parent so the documents row state stays in one place
  jdDoc: { id: string; name: string; file_url: string } | null
  isUploadingJd: boolean
  jdUploadError: string | null
  onUploadJd: (file: File) => void | Promise<void>
  onDeleteJd: () => void | Promise<void>
  // Optional banner shown when the slide-over auto-opens on new-search creation
  showSkipToFields?: boolean
}

const inputCls =
  'w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy'
const labelCls = 'block text-xs font-bold text-navy mb-1'

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function IntakeSlideOver({
  isOpen,
  onClose,
  searchId,
  search,
  form,
  updateForm,
  addClientContact,
  removeClientContact,
  updateClientContact,
  contactRoleOptions,
  jdDoc,
  isUploadingJd,
  jdUploadError,
  onUploadJd,
  onDeleteJd,
  showSkipToFields,
}: IntakeSlideOverProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const jdFileInputRef = useRef<HTMLInputElement | null>(null)

  // Global Escape close
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const regenerateSuggestions = async () => {
    const existing = form.context_suggested
    if (existing.length > 0) {
      const answered = existing.some((q) => q.answer.trim().length > 0)
      if (answered && !confirm('Regenerate replaces current suggestions, including any answers you typed. Continue?')) return
    }
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/intake/suggested-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId,
          context: {
            company_name: search?.company_name,
            position_title: form.position_title || search?.position_title,
            company_description: search?.company_description,
            company_industry: search?.company_industry,
            company_news: search?.company_news,
            reason_for_opening: form.reason_for_opening,
            reports_to_title: form.reports_to_title,
            position_location: form.position_location,
            work_arrangement: form.work_arrangement,
            context_why_open: form.context_why_open,
            context_success_12mo: form.context_success_12mo,
            context_hard_not_on_jd: form.context_hard_not_on_jd,
            context_failure_profile: form.context_failure_profile,
            context_dont_ask_client: form.context_dont_ask_client,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Request failed')
      const next: SuggestedQuestion[] = (data.questions || []).map((q: string) => ({
        id: randomId(),
        question: q,
        answer: '',
      }))
      updateForm({ context_suggested: next })
    } catch (err: any) {
      setGenerateError(err?.message || 'Failed to generate suggestions')
    } finally {
      setIsGenerating(false)
    }
  }

  const updateSuggestedAnswer = (id: string, answer: string) => {
    updateForm({
      context_suggested: form.context_suggested.map((q) => (q.id === id ? { ...q, answer } : q)),
    })
  }

  const removeSuggested = (id: string) => {
    updateForm({ context_suggested: form.context_suggested.filter((q) => q.id !== id) })
  }

  const addNote = () => {
    updateForm({ context_notes: [...form.context_notes, { id: randomId(), text: '' }] })
  }

  const updateNote = (id: string, text: string) => {
    updateForm({ context_notes: form.context_notes.map((n) => (n.id === id ? { ...n, text } : n)) })
  }

  const removeNote = (id: string) => {
    updateForm({ context_notes: form.context_notes.filter((n) => n.id !== id) })
  }

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-label="Intake"
        className={`absolute right-0 top-0 bottom-0 w-[68%] min-w-[480px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="px-6 py-4 bg-navy flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-xl font-bold text-white">Intake</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">

          {showSkipToFields && (
            <div className="px-6 py-2 bg-[#FAF9F7] border-b border-ds-border">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-text-muted hover:text-navy transition-colors"
              >
                Just need the basics? Skip to fields →
              </button>
            </div>
          )}

          {/* ─── Section 1: Basics ─── */}
          <section className="px-6 py-5 border-b-4 border-ds-border bg-[#FAF9F7]">
            <h4 className="text-base font-bold text-navy mb-3">Basics</h4>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className={labelCls}>Search Launch Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.launch_date}
                  onChange={(e) => updateForm({ launch_date: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Target Start Date</label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD or e.g. Q4 2026"
                  className={inputCls}
                  value={form.target_start_date}
                  onChange={(e) => updateForm({ target_start_date: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Target Close Date</label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD or e.g. Q4 2026"
                  className={inputCls}
                  value={form.target_close_date}
                  onChange={(e) => updateForm({ target_close_date: e.target.value })}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className={labelCls}>Position Title</label>
              <input
                className={inputCls}
                value={form.position_title}
                onChange={(e) => updateForm({ position_title: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className={labelCls}>Reports To</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input placeholder="Name" className={inputCls} value={form.reports_to_name} onChange={(e) => updateForm({ reports_to_name: e.target.value })} />
                <input placeholder="Title" className={inputCls} value={form.reports_to_title} onChange={(e) => updateForm({ reports_to_title: e.target.value })} />
                <input placeholder="Email" className={inputCls} value={form.reports_to_email} onChange={(e) => updateForm({ reports_to_email: e.target.value })} />
                <input placeholder="Phone" className={inputCls} value={form.reports_to_phone} onChange={(e) => updateForm({ reports_to_phone: e.target.value })} />
              </div>
            </div>

            <div className="mb-3">
              <label className={labelCls}>Client Contacts</label>
              <div className="space-y-2">
                {form.client_contacts.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                    <input placeholder="Name" className={inputCls} value={c.name} onChange={(e) => updateClientContact(i, { name: e.target.value })} />
                    <input placeholder="Title" className={inputCls} value={c.title} onChange={(e) => updateClientContact(i, { title: e.target.value })} />
                    <input placeholder="Email" className={inputCls} value={c.email} onChange={(e) => updateClientContact(i, { email: e.target.value })} />
                    <input placeholder="Phone" className={inputCls} value={c.phone} onChange={(e) => updateClientContact(i, { phone: e.target.value })} />
                    <select className={inputCls} value={c.role} onChange={(e) => updateClientContact(i, { role: e.target.value })}>
                      <option value="">Select role…</option>
                      {contactRoleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeClientContact(i)} aria-label="Remove contact" className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addClientContact} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-navy bg-white hover:bg-navy hover:text-white transition-colors">
                  <Plus className="w-3 h-3" /> Add Contact
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className={labelCls}>Direct Reports (count)</label>
                <input type="number" min="0" className={inputCls} value={form.direct_reports_count} onChange={(e) => updateForm({ direct_reports_count: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Direct Reports (who are they)</label>
                <input className={inputCls} value={form.direct_reports_who} onChange={(e) => updateForm({ direct_reports_who: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <label className={labelCls}>Position Location</label>
                <input className={inputCls} placeholder="City, State" value={form.position_location} onChange={(e) => updateForm({ position_location: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Work Arrangement</label>
                <select className="w-44 px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy" value={form.work_arrangement} onChange={(e) => updateForm({ work_arrangement: e.target.value })}>
                  <option value="">Select…</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className={labelCls}>Compensation</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input placeholder="Base range" className={inputCls} value={form.compensation_base} onChange={(e) => updateForm({ compensation_base: e.target.value })} />
                <input placeholder="Bonus" className={inputCls} value={form.compensation_bonus} onChange={(e) => updateForm({ compensation_bonus: e.target.value })} />
                <input placeholder="Equity" className={inputCls} value={form.compensation_equity} onChange={(e) => updateForm({ compensation_equity: e.target.value })} />
                <input placeholder="Relocation" className={inputCls} value={form.compensation_relocation} onChange={(e) => updateForm({ compensation_relocation: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Reason for Opening</label>
              <select className="w-48 px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy" value={form.reason_for_opening} onChange={(e) => updateForm({ reason_for_opening: e.target.value })}>
                <option value="">Select…</option>
                <option value="new_role">New role</option>
                <option value="backfill">Backfill</option>
                <option value="restructure">Restructure</option>
              </select>
            </div>
          </section>

          {/* JD upload — sits between Basics and Context. The JD informs
              the AI suggestions in Context. */}
          <section className="px-6 py-4 border-b border-ds-border">
            <div className="flex flex-wrap items-center gap-3">
              {jdDoc ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white bg-navy hover:bg-navy/90 transition-colors max-w-[320px]"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{jdDoc.name}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px] z-50 shadow-lg">
                    <DropdownMenuItem onSelect={() => window.open(jdDoc.file_url, '_blank', 'noopener,noreferrer')} className="text-sm cursor-pointer">
                      <Eye className="w-4 h-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => jdFileInputRef.current?.click()} className="text-sm cursor-pointer">
                      <Replace className="w-4 h-4 mr-2" /> Replace
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDeleteJd()} className="text-sm cursor-pointer text-red-600 focus:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  type="button"
                  onClick={() => jdFileInputRef.current?.click()}
                  disabled={isUploadingJd}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-navy border-2 border-navy bg-white hover:bg-navy hover:text-white transition-colors disabled:opacity-60"
                >
                  {isUploadingJd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploadingJd ? 'Uploading…' : 'Upload JD'}
                </button>
              )}
              <span className="text-xs text-text-muted">
                Optional. The JD informs AI-suggested questions.
              </span>
            </div>
            {jdUploadError && <p className="text-xs text-red-600 mt-2">{jdUploadError}</p>}
            <input
              ref={jdFileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) await onUploadJd(file)
                e.target.value = ''
              }}
            />
          </section>

          {/* ─── Section 2: Context ─── */}
          <section className="px-6 py-5 space-y-6">
            <h4 className="text-base font-bold text-navy">Context</h4>

            {/* (a) Scaffolding */}
            <div className="space-y-5">
              {[
                { key: 'context_why_open', label: 'Why is this role open?' },
                { key: 'context_success_12mo', label: 'What does success look like at 12 months?' },
                { key: 'context_hard_not_on_jd', label: "What's hard about this role that isn't on the JD?" },
                { key: 'context_failure_profile', label: 'What would make someone fail in this seat?' },
                { key: 'context_dont_ask_client', label: "Anything we shouldn't ask the client directly?" },
              ].map((q) => (
                <div key={q.key}>
                  <h5 className="text-sm font-semibold text-navy mb-1.5">{q.label}</h5>
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={(form as any)[q.key] || ''}
                    onChange={(e) => updateForm({ [q.key]: e.target.value } as any)}
                    placeholder="Your notes…"
                  />
                </div>
              ))}
            </div>

            {/* (b) AI-suggested questions */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h5 className="text-sm font-bold text-navy uppercase tracking-wide">Suggested for this search</h5>
                <button
                  type="button"
                  onClick={regenerateSuggestions}
                  disabled={isGenerating}
                  aria-label="Regenerate suggestions"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-navy border border-ds-border hover:bg-bg-section disabled:opacity-60 transition-colors"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {isGenerating ? 'Generating…' : 'Refresh'}
                </button>
              </div>

              {generateError && (
                <p className="text-xs text-red-600 mb-2">{generateError}</p>
              )}

              {form.context_suggested.length === 0 && !isGenerating && (
                <p className="text-xs text-text-muted italic">No suggestions yet. Click Refresh to generate.</p>
              )}

              <div className="space-y-4">
                {form.context_suggested.map((sq) => (
                  <div key={sq.id}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h5 className="text-sm font-semibold text-navy">{sq.question}</h5>
                      <button
                        type="button"
                        onClick={() => removeSuggested(sq.id)}
                        aria-label="Remove suggestion"
                        className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={sq.answer}
                      onChange={(e) => updateSuggestedAnswer(sq.id, e.target.value)}
                      placeholder="Your notes…"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* (c) Recruiter notes */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h5 className="text-sm font-bold text-navy uppercase tracking-wide">Your notes</h5>
                <button
                  type="button"
                  onClick={addNote}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-navy border border-navy hover:bg-navy hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add note
                </button>
              </div>

              {form.context_notes.length === 0 && (
                <p className="text-xs text-text-muted italic">No notes yet.</p>
              )}

              <div className="space-y-3">
                {form.context_notes.map((n) => (
                  <div key={n.id} className="flex items-start gap-2">
                    <textarea
                      rows={2}
                      className={`${inputCls} flex-1`}
                      value={n.text}
                      onChange={(e) => updateNote(n.id, e.target.value)}
                      placeholder="Question, observation, anything you want to keep"
                    />
                    <button
                      type="button"
                      onClick={() => removeNote(n.id)}
                      aria-label="Remove note"
                      className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Reminder: Interview Plan is captured separately because it
                evolves dynamically across the search. */}
            <p className="text-xs text-text-muted italic pt-2 border-t border-ds-border">
              Interview Plan lives on the page — captured separately because it evolves.
            </p>
          </section>

        </div>
      </aside>
    </div>
  )
}
