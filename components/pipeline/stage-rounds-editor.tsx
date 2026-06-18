"use client"

// Interview Stages editor (the /interview-stages view). Reads/writes the REAL
// stages table (the same rows the pipeline uses) via /api/stages — replacing
// the old interview_rounds JSON island. Interviewers are panelists (same id
// space as the pipeline); access level is NOT a stage concern (it lives on the
// portal invitation / contact). Reorder is intentionally out of scope here.

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import Link from "next/link"
import { Users, X, Plus, Trash2, Check, ChevronRight } from "lucide-react"

const supabase = createClient()

type Stage = {
  id: string
  name: string
  stage_order: number
  interview_format: string | null
  interviewer_ids: string[] | null
  purpose_type: 'focused' | 'general' | null
  purpose_text: string | null
  evaluating: string | null
}
type Panelist = { id: string; name: string; title: string | null }
type Draft = {
  name: string
  interview_format: string | null
  interviewer_ids: string[]
  purpose_type: 'focused' | 'general' | null
  purpose_text: string
  evaluating: string
}

const FORMATS: { value: string; label: string }[] = [
  { value: 'in_person', label: 'In person' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'other', label: 'Other' },
]

export function StageRoundsEditor() {
  const params = useParams()
  const searchId = params?.id as string

  const [stages, setStages] = useState<Stage[]>([])
  const [panelists, setPanelists] = useState<Panelist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: stageRows }, { data: panelRows }] = await Promise.all([
      supabase
        .from('stages')
        .select('id, name, stage_order, interview_format, interviewer_ids, purpose_type, purpose_text, evaluating')
        .eq('search_id', searchId)
        .order('stage_order', { ascending: true }),
      supabase
        .from('panelists')
        .select('id, name, title')
        .eq('search_id', searchId)
        .order('name', { ascending: true }),
    ])
    setStages((stageRows || []) as Stage[])
    setPanelists((panelRows || []) as Panelist[])
    setIsLoading(false)
  }, [searchId])

  useEffect(() => { load() }, [load])

  const openStage = (s: Stage) => {
    setActiveStageId(s.id)
    setDraft({
      name: s.name,
      interview_format: s.interview_format,
      interviewer_ids: Array.isArray(s.interviewer_ids) ? s.interviewer_ids : [],
      purpose_type: s.purpose_type ?? null,
      purpose_text: s.purpose_text || '',
      evaluating: s.evaluating || '',
    })
  }

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const saveDraft = async () => {
    if (!activeStageId || !draft) return
    const original = stages.find((s) => s.id === activeStageId)
    setIsSaving(true)
    try {
      const res = await fetch('/api/stages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeStageId,
          name: draft.name.trim() || original?.name || 'Untitled stage',
          interview_format: draft.interview_format,
          interviewer_ids: draft.interviewer_ids,
          purpose_type: draft.purpose_type,
          purpose_text: draft.purpose_text.trim() || null,
          evaluating: draft.evaluating.trim() || null,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || 'Failed to save stage')
      }
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save stage')
    } finally {
      setIsSaving(false)
    }
  }

  const closePanel = async () => {
    await saveDraft()
    setActiveStageId(null)
    setDraft(null)
  }

  const addStage = async () => {
    setBusy(true)
    try {
      const nextOrder = Math.max(0, ...stages.map((s) => s.stage_order)) + 1
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_id: searchId, name: 'New stage', stage_order: nextOrder, visible_in_client_portal: false }),
      })
      const row = await res.json()
      if (!res.ok) throw new Error(row?.error || 'Failed to add stage')
      await load()
      openStage(row as Stage)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add stage')
    } finally {
      setBusy(false)
    }
  }

  const removeStage = async (s: Stage) => {
    if (!confirm(`Delete the "${s.name}" stage? This can't be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/stages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || 'Failed to delete stage')
      }
      if (activeStageId === s.id) { setActiveStageId(null); setDraft(null) }
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete stage')
    } finally {
      setBusy(false)
    }
  }

  const activeStage = stages.find((s) => s.id === activeStageId)
  const activeIndex = stages.findIndex((s) => s.id === activeStageId)
  const selectedPanelists = draft ? draft.interviewer_ids.map((id) => panelists.find((p) => p.id === id)).filter((p): p is Panelist => !!p) : []
  const availablePanelists = draft ? panelists.filter((p) => !draft.interviewer_ids.includes(p.id)) : []

  if (isLoading) {
    return <div className="p-6 text-sm text-text-muted">Loading…</div>
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">Interview Stages</h1>
        <button
          type="button"
          onClick={addStage}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-navy hover:bg-navy/90 disabled:opacity-60 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add stage
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {stages.length === 0 && (
          <p className="text-sm text-text-muted">No stages yet. Click “Add stage” to create one.</p>
        )}
        {stages.map((s, i) => {
          const isEntry = s.stage_order === 0
          const count = Array.isArray(s.interviewer_ids) ? s.interviewer_ids.length : 0
          if (isEntry) {
            // Entry bucket — shown but not an editable interview round.
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-3 rounded-md border border-dashed border-ds-border bg-bg-section">
                <span className="text-sm font-semibold text-navy truncate">{s.name}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Entry stage</span>
              </div>
            )
          }
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => openStage(s)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md border border-ds-border bg-white hover:bg-bg-section hover:border-navy/30 transition-colors text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy truncate">{s.name || `Round ${i + 1}`}</span>
                  {s.purpose_type && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-navy/10 text-navy">
                      {s.purpose_type === 'focused' ? 'Focused' : 'General'}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-text-muted truncate">
                  {count > 0 ? `${count} interviewer${count === 1 ? '' : 's'}` : 'No interviewers'}
                  {s.purpose_text ? ` · ${s.purpose_text}` : ''}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
            </button>
          )
        })}
      </div>

      {/* ── Stage editor slide-over ── */}
      {activeStage && draft && (
        <>
          <div className="fixed inset-0 top-[56px] bg-black/30 z-[60]" onClick={closePanel} />
          <div className="fixed top-[56px] right-0 bottom-0 w-full sm:w-[45%] sm:min-w-[420px] max-w-[640px] bg-white z-[70] shadow-2xl flex flex-col">
            <header className="px-6 py-4 bg-navy flex items-center justify-between gap-3 flex-shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 min-w-0">
                <Users className="w-5 h-5 text-white flex-shrink-0" />
                {/* FIX: real stage name, with the same fallback the list uses. */}
                <span className="truncate">{draft.name.trim() || `Round ${activeIndex + 1}`}</span>
              </h3>
              <button type="button" onClick={closePanel} className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0" aria-label="Save & close">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Stage name */}
              <div>
                <label className="text-xs font-semibold text-navy">Stage name</label>
                <input
                  className="mt-1 w-full h-10 px-3 rounded-md border border-ds-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Hiring Manager Interview"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="text-xs font-semibold text-navy">Purpose</label>
                <div className="mt-1 flex flex-wrap items-center gap-2 mb-2">
                  {(['focused', 'general'] as const).map((opt) => {
                    const selected = draft.purpose_type === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => patch({ purpose_type: selected ? null : opt })}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                          selected ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-ds-border hover:bg-bg-section'
                        }`}
                      >
                        {opt === 'focused' ? 'Focused' : 'General'}
                      </button>
                    )
                  })}
                </div>
                <input
                  className="w-full h-10 px-3 rounded-md border border-ds-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="One sentence: what this round is for"
                  value={draft.purpose_text}
                  onChange={(e) => patch({ purpose_text: e.target.value })}
                />
              </div>

              {/* What they're evaluating */}
              <div>
                <label className="text-xs font-semibold text-navy">What they&apos;re evaluating</label>
                <textarea
                  className="mt-1 w-full px-3 py-2 rounded-md border border-ds-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  rows={3}
                  placeholder="What this round is designed to assess"
                  value={draft.evaluating}
                  onChange={(e) => patch({ evaluating: e.target.value })}
                />
              </div>

              {/* Format */}
              <div>
                <label className="text-xs font-semibold text-navy">Format</label>
                <div className="mt-1 flex gap-2">
                  {FORMATS.map((opt) => {
                    const active = draft.interview_format === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => patch({ interview_format: active ? null : opt.value })}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                          active ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-ds-border hover:bg-bg-section'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Interviewers — panelists (Interview Team roster) */}
              <div>
                <label className="text-xs font-semibold text-navy">Interviewers</label>
                {selectedPanelists.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedPanelists.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-navy/10 text-xs font-medium text-navy">
                        {p.name}
                        <button
                          type="button"
                          onClick={() => patch({ interviewer_ids: draft.interviewer_ids.filter((id) => id !== p.id) })}
                          className="text-navy/60 hover:text-navy"
                          aria-label={`Remove ${p.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {panelists.length === 0 ? (
                  <p className="mt-1 text-xs text-text-muted">
                    No team members yet. Add them on the{' '}
                    <Link href={`/searches/${searchId}/interview-team`} className="font-semibold text-navy hover:underline">Interview Team</Link>{' '}page.
                  </p>
                ) : availablePanelists.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {availablePanelists.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => patch({ interviewer_ids: [...draft.interviewer_ids, p.id] })}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-ds-border text-xs font-medium text-navy hover:bg-bg-section"
                      >
                        <Plus className="w-3 h-3" /> {p.name}{p.title ? ` · ${p.title}` : ''}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">All team members added.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-ds-border flex items-center justify-between gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => activeStage && removeStage(activeStage)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 disabled:opacity-60 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove stage
              </button>
              <button
                type="button"
                onClick={closePanel}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold text-white bg-navy hover:bg-navy/90 disabled:opacity-60 transition-colors"
              >
                <Check className="w-4 h-4" /> {isSaving ? 'Saving…' : 'Done'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
