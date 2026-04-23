"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
  FileText,
  Upload,
  Loader2,
  Plus,
  X,
  Sparkles,
  ChevronRight,
  FileDown,
  ClipboardList,
  Users,
  NotebookPen,
  Target,
} from "lucide-react"

interface IntakePanelProps {
  searchId: string
  search: any
}

interface GuideQuestion {
  question: string
  rationale: string
  notes: string
}

type GuideCategory = 'the_role' | 'the_context' | 'the_candidate' | 'the_process'

interface ConversationGuide {
  the_role: GuideQuestion[]
  the_context: GuideQuestion[]
  the_candidate: GuideQuestion[]
  the_process: GuideQuestion[]
}

interface InterviewRound {
  stage_name: string
  interviewers: string
  evaluating: string
}

type ClientContactRole = 'hiring_manager' | 'decision_maker' | 'stakeholder' | 'coordinator' | ''

interface ClientContact {
  name: string
  title: string
  email: string
  phone: string
  role: ClientContactRole
}

const CLIENT_CONTACT_ROLE_OPTIONS: Array<{ value: ClientContactRole; label: string }> = [
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'stakeholder', label: 'Stakeholder' },
  { value: 'coordinator', label: 'Coordinator' },
]

interface PipelineForm {
  // PART 1 — Essentials
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

  // PART 2 — AI briefing
  company_briefing: string
  company_context_notes: string

  // PART 3 — Conversation guide
  conversation_guide: ConversationGuide

  // PART 4 — Interview plan
  interview_rounds: InterviewRound[]
  final_decision_maker: string
  other_candidates_in_process: string
}

const EMPTY_GUIDE: ConversationGuide = {
  the_role: [],
  the_context: [],
  the_candidate: [],
  the_process: [],
}

const CATEGORY_LABELS: Record<GuideCategory, string> = {
  the_role: 'THE ROLE',
  the_context: 'THE CONTEXT',
  the_candidate: 'THE CANDIDATE',
  the_process: 'THE PROCESS',
}

function initialForm(search: any): PipelineForm {
  return {
    position_title: search?.position_title || '',
    reports_to_name: '',
    reports_to_title: search?.reports_to || '',
    reports_to_email: '',
    reports_to_phone: '',
    client_contacts: [],
    direct_reports_count: '',
    direct_reports_who: '',
    position_location: search?.position_location || '',
    work_arrangement: search?.work_arrangement || '',
    compensation_base: search?.compensation_range || '',
    compensation_bonus: '',
    compensation_equity: '',
    compensation_relocation: '',
    reason_for_opening: '',
    target_start_date: '',
    launch_date: search?.launch_date || '',
    target_close_date: search?.target_fill_date || '',
    company_briefing: '',
    company_context_notes: '',
    conversation_guide: EMPTY_GUIDE,
    interview_rounds: [],
    final_decision_maker: '',
    other_candidates_in_process: '',
  }
}

export function IntakePanel({ searchId, search }: IntakePanelProps) {
  const { profile } = useAuth()
  const [briefId, setBriefId] = useState<string | null>(null)
  const [form, setForm] = useState<PipelineForm>(initialForm(search))
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [positionSpecDoc, setPositionSpecDoc] = useState<{ id: string; name: string; file_url: string } | null>(null)
  const [isUploadingSpec, setIsUploadingSpec] = useState(false)
  const [specSkipped, setSpecSkipped] = useState(false)
  const [specUploadError, setSpecUploadError] = useState<string | null>(null)

  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [briefingError, setBriefingError] = useState<string | null>(null)
  const [questionsError, setQuestionsError] = useState<string | null>(null)

  const [isNotesExpanded, setIsNotesExpanded] = useState(true)
  const notesExpandedInitialized = useRef(false)

  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const briefIdRef = useRef<string | null>(null)
  const isBootstrapping = useRef(true)

  // ─── Load existing brief + position spec ───────────────────────────────

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const [{ data: briefRow }, { data: docRows }] = await Promise.all([
          supabase
            .from('intake_briefs')
            .select('id, snapshot')
            .eq('search_id', searchId)
            .maybeSingle(),
          supabase
            .from('documents')
            .select('id, name, file_url')
            .eq('search_id', searchId)
            .eq('type', 'position_spec')
            .order('created_at', { ascending: false })
            .limit(1),
        ])
        if (cancelled) return

        if (briefRow?.id) {
          setBriefId(briefRow.id)
          briefIdRef.current = briefRow.id
        }

        const savedForm = briefRow?.snapshot?.pipeline_form
        if (savedForm) {
          setForm({ ...initialForm(search), ...savedForm })
        } else {
          setForm(initialForm(search))
        }

        if (Array.isArray(docRows) && docRows.length > 0) {
          setPositionSpecDoc(docRows[0])
        }
      } catch (err) {
        console.error('IntakePanel load error:', err)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          isBootstrapping.current = false
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [searchId])

  // ─── Auto-save (debounced) ─────────────────────────────────────────────

  const [saveErrorDetail, setSaveErrorDetail] = useState<string | null>(null)

  const scheduleSave = useCallback(
    (next: PipelineForm) => {
      if (isBootstrapping.current) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        // Wait for profile to load — firm_id is NOT NULL on intake_briefs.
        if (!profile?.firm_id) {
          setSaveStatus('idle')
          return
        }
        setSaveStatus('saving')
        setSaveErrorDetail(null)
        try {
          // Upsert on search_id (which has a unique index) handles both
          // first-time creation and updates, including the case where another
          // flow (e.g. /intake page) already created a row for this search.
          // Send only the columns we actually need to write. company_name has
          // a DB default and doesn't need to be resent on every autosave, and
          // it was also missing from PostgREST's schema cache on some envs.
          const { data, error } = await supabase
            .from('intake_briefs')
            .upsert(
              {
                search_id: searchId,
                firm_id: profile.firm_id,
                created_by: profile.id,
                snapshot: { pipeline_form: next },
                status: 'in_progress',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'search_id' }
            )
            .select('id')
            .single()
          if (error) throw error
          if (data?.id) {
            briefIdRef.current = data.id
            setBriefId(data.id)
          }
          setSaveStatus('saved')
        } catch (err: any) {
          console.error('IntakePanel save error:', err?.message || err, err?.details, err?.hint)
          setSaveErrorDetail(err?.message || 'Save failed')
          setSaveStatus('error')
        }
      }, 600)
    },
    [profile?.firm_id, profile?.id, search?.company_name, searchId]
  )

  const updateForm = useCallback(
    (patch: Partial<PipelineForm>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  // ─── AI generation: briefing + questions ───────────────────────────────

  const fetchBriefing = useCallback(async () => {
    if (isGeneratingBriefing) return
    setIsGeneratingBriefing(true)
    setBriefingError(null)
    try {
      const res = await fetch('/api/intake-brief/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: search?.company_name,
          companyData: search,
          news: search?.company_news,
          positionTitle: search?.position_title,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to generate briefing')
      updateForm({ company_briefing: data.briefing || '' })
    } catch (err: any) {
      setBriefingError(err?.message || 'Failed to generate briefing')
    } finally {
      setIsGeneratingBriefing(false)
    }
  }, [isGeneratingBriefing, search, updateForm])

  const fetchQuestions = useCallback(async () => {
    if (isGeneratingQuestions) return
    setIsGeneratingQuestions(true)
    setQuestionsError(null)
    try {
      const res = await fetch('/api/intake-brief/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: search?.company_name,
          companyData: search,
          news: search?.company_news,
          positionTitle: search?.position_title,
          positionSpec: null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to generate questions')
      const cats = data.categories || {}
      const guide: ConversationGuide = {
        the_role: (cats.the_role || []).map((q: any) => ({ question: q.question, rationale: q.rationale || '', notes: '' })),
        the_context: (cats.the_context || []).map((q: any) => ({ question: q.question, rationale: q.rationale || '', notes: '' })),
        the_candidate: (cats.the_candidate || []).map((q: any) => ({ question: q.question, rationale: q.rationale || '', notes: '' })),
        the_process: (cats.the_process || []).map((q: any) => ({ question: q.question, rationale: q.rationale || '', notes: '' })),
      }
      updateForm({ conversation_guide: guide })
    } catch (err: any) {
      setQuestionsError(err?.message || 'Failed to generate questions')
    } finally {
      setIsGeneratingQuestions(false)
    }
  }, [isGeneratingQuestions, search, updateForm])

  // One-shot: set the Intake Notes default based on whether the recruiter
  // has already recorded notes. Auto-generated briefing text alone doesn't
  // count as "has content" — we only look at user-entered fields.
  useEffect(() => {
    if (isLoading) return
    if (notesExpandedInitialized.current) return
    notesExpandedInitialized.current = true
    const hasContextNotes = !!form.company_context_notes?.trim()
    const hasQuestionNotes = ([
      ...form.conversation_guide.the_role,
      ...form.conversation_guide.the_context,
      ...form.conversation_guide.the_candidate,
      ...form.conversation_guide.the_process,
    ]).some((q) => q.notes?.trim().length > 0)
    if (hasContextNotes || hasQuestionNotes) setIsNotesExpanded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // If the first save was skipped because the profile hadn't loaded yet,
  // flush the current form once firm_id becomes available.
  useEffect(() => {
    if (!profile?.firm_id) return
    if (isBootstrapping.current) return
    if (saveStatus === 'idle' && !briefIdRef.current) {
      scheduleSave(form)
    }
    // We only want this to fire when profile shows up, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.firm_id])

  // Auto-generate briefing first. Questions fire after the briefing call
  // resolves — staggering avoids the dev server's webpack runtime getting
  // confused by two simultaneous first-compile API requests.
  useEffect(() => {
    if (isLoading) return
    if (!search?.company_description) return
    if (!form.company_briefing && !isGeneratingBriefing && !briefingError) {
      fetchBriefing()
    }
  }, [
    isLoading,
    search?.company_description,
    form.company_briefing,
    isGeneratingBriefing,
    briefingError,
    fetchBriefing,
  ])

  useEffect(() => {
    if (isLoading) return
    if (!search?.company_description) return
    if (isGeneratingBriefing) return
    if (!form.company_briefing) return
    const totalQs =
      form.conversation_guide.the_role.length +
      form.conversation_guide.the_context.length +
      form.conversation_guide.the_candidate.length +
      form.conversation_guide.the_process.length
    if (totalQs === 0 && !isGeneratingQuestions && !questionsError) {
      fetchQuestions()
    }
  }, [
    isLoading,
    search?.company_description,
    form.company_briefing,
    form.conversation_guide,
    isGeneratingBriefing,
    isGeneratingQuestions,
    questionsError,
    fetchQuestions,
  ])

  // ─── Position spec upload ──────────────────────────────────────────────

  const handleSpecUpload = async (file: File) => {
    setSpecUploadError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setSpecUploadError(`Unsupported type: .${ext}. Use PDF, DOCX, or DOC.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setSpecUploadError('File too large (max 10MB)')
      return
    }
    setIsUploadingSpec(true)
    try {
      const storedName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const firmId = search?.firm_id || profile?.firm_id || 'unknown-firm'
      const filePath = `${firmId}/${searchId}/position-spec/${storedName}`
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .upload(filePath, file)
      if (storageErr) throw new Error(storageErr.message || 'Storage upload failed')
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: searchId,
          name: file.name,
          type: 'position_spec',
          file_url: publicUrl,
        }),
      })
      const row = await res.json()
      if (!res.ok) throw new Error(row?.error || 'Failed to record document')
      setPositionSpecDoc({ id: row.id, name: file.name, file_url: publicUrl })
    } catch (err: any) {
      setSpecUploadError(err?.message || 'Upload failed')
    } finally {
      setIsUploadingSpec(false)
    }
  }

  // ─── Interview rounds helpers ──────────────────────────────────────────

  // ─── Client contacts helpers ───────────────────────────────────────────

  const addClientContact = () => {
    updateForm({
      client_contacts: [
        ...form.client_contacts,
        { name: '', title: '', email: '', phone: '', role: '' },
      ],
    })
  }

  const updateClientContact = (i: number, patch: Partial<ClientContact>) => {
    updateForm({
      client_contacts: form.client_contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    })
  }

  const removeClientContact = (i: number) => {
    updateForm({ client_contacts: form.client_contacts.filter((_, idx) => idx !== i) })
  }

  // ─── Interview round helpers ───────────────────────────────────────────

  const addInterviewRound = () => {
    updateForm({
      interview_rounds: [
        ...form.interview_rounds,
        { stage_name: '', interviewers: '', evaluating: '' },
      ],
    })
  }

  const updateRound = (i: number, patch: Partial<InterviewRound>) => {
    updateForm({
      interview_rounds: form.interview_rounds.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    })
  }

  const removeRound = (i: number) => {
    updateForm({ interview_rounds: form.interview_rounds.filter((_, idx) => idx !== i) })
  }

  // ─── Notes updater for a specific question ─────────────────────────────

  const updateQuestionNotes = (cat: GuideCategory, i: number, notes: string) => {
    const next: ConversationGuide = {
      ...form.conversation_guide,
      [cat]: form.conversation_guide[cat].map((q, idx) => (idx === i ? { ...q, notes } : q)),
    }
    updateForm({ conversation_guide: next })
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading intake…
      </div>
    )
  }

  const inputCls = "w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy"
  const labelCls = "block text-xs font-bold text-navy mb-1"
  const subCardCls = "bg-white rounded-md border border-ds-border overflow-hidden"
  // Lighter blue (--navy-light = #2A4F7E) for sub-section banners so they
  // read as children of the outer "The Search" navy header.
  const subBannerCls = "px-5 py-2.5 bg-navy-light flex items-center gap-2"
  const subBannerTitleCls = "text-base font-bold text-white"

  return (
    <section data-section="the_search" className="bg-bg-page rounded-lg border border-ds-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-navy">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-white" />
          The Search
        </h2>
      </div>
      <div className="p-6 space-y-4">
      {/* Save status */}
      <div className="flex justify-end items-center gap-2 text-xs text-text-muted -mb-2 -mt-2 min-h-[16px]">
        {saveStatus === 'saving' && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
        {saveStatus === 'saved' && <span className="text-green-600">Saved</span>}
        {saveStatus === 'error' && (
          <span className="text-red-600" title={saveErrorDetail || undefined}>
            Save failed{saveErrorDetail ? `: ${saveErrorDetail}` : ''}
          </span>
        )}
      </div>

      {/* Position Spec prompt */}
      {positionSpecDoc ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-sm">
          <FileText className="w-4 h-4 text-blue-700" />
          <span className="font-semibold text-blue-900">Position spec:</span>
          <a href={positionSpecDoc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline truncate">{positionSpecDoc.name}</a>
        </div>
      ) : !specSkipped ? (
        <div className="px-3 py-2 rounded-md border border-ds-border bg-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-text-primary">Upload a position spec if the client has one.</span>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await handleSpecUpload(file)
                    e.target.value = ''
                  }}
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-navy hover:bg-navy/90 transition-colors">
                  {isUploadingSpec ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {isUploadingSpec ? 'Uploading…' : 'Upload spec'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setSpecSkipped(true)}
                className="text-xs font-semibold text-navy hover:underline"
              >
                Continue without one
              </button>
            </div>
          </div>
          {specUploadError && <p className="text-xs text-red-600 mt-1">{specUploadError}</p>}
        </div>
      ) : null}

      {/* ─── ESSENTIALS ─── */}
      <section data-section="essentials" className={subCardCls}>
        <div className={subBannerCls}>
          <ClipboardList className="w-4 h-4 text-white" />
          <h3 className={subBannerTitleCls}>Essentials</h3>
        </div>
        <div className="p-5 space-y-3">

        <div>
          <label className={labelCls}>Position Title</label>
          <input className={inputCls} value={form.position_title} onChange={(e) => updateForm({ position_title: e.target.value })} />
        </div>

        <div>
          <label className={labelCls}>Reports To</label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input placeholder="Name" className={inputCls} value={form.reports_to_name} onChange={(e) => updateForm({ reports_to_name: e.target.value })} />
            <input placeholder="Title" className={inputCls} value={form.reports_to_title} onChange={(e) => updateForm({ reports_to_title: e.target.value })} />
            <input placeholder="Email" className={inputCls} value={form.reports_to_email} onChange={(e) => updateForm({ reports_to_email: e.target.value })} />
            <input placeholder="Phone" className={inputCls} value={form.reports_to_phone} onChange={(e) => updateForm({ reports_to_phone: e.target.value })} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Client Contacts</label>
          <div className="space-y-2">
            {form.client_contacts.map((contact, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <input placeholder="Name" className={inputCls} value={contact.name} onChange={(e) => updateClientContact(i, { name: e.target.value })} />
                <input placeholder="Title" className={inputCls} value={contact.title} onChange={(e) => updateClientContact(i, { title: e.target.value })} />
                <input placeholder="Email" className={inputCls} value={contact.email} onChange={(e) => updateClientContact(i, { email: e.target.value })} />
                <input placeholder="Phone" className={inputCls} value={contact.phone} onChange={(e) => updateClientContact(i, { phone: e.target.value })} />
                <select
                  className={inputCls}
                  value={contact.role}
                  onChange={(e) => updateClientContact(i, { role: e.target.value as ClientContactRole })}
                >
                  <option value="">Select role…</option>
                  {CLIENT_CONTACT_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeClientContact(i)}
                  aria-label="Remove contact"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addClientContact}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-navy bg-white hover:bg-navy hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Contact
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Direct Reports (how many)</label>
            <input type="number" min="0" className={inputCls} value={form.direct_reports_count} onChange={(e) => updateForm({ direct_reports_count: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Direct Reports (who are they)</label>
            <textarea rows={1} className={inputCls} value={form.direct_reports_who} onChange={(e) => updateForm({ direct_reports_who: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Position Location</label>
            <input className={inputCls} value={form.position_location} onChange={(e) => updateForm({ position_location: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Work Arrangement</label>
            <select className={inputCls} value={form.work_arrangement} onChange={(e) => updateForm({ work_arrangement: e.target.value })}>
              <option value="">Select…</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Compensation</label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input placeholder="Base range" className={inputCls} value={form.compensation_base} onChange={(e) => updateForm({ compensation_base: e.target.value })} />
            <input placeholder="Bonus" className={inputCls} value={form.compensation_bonus} onChange={(e) => updateForm({ compensation_bonus: e.target.value })} />
            <input placeholder="Equity" className={inputCls} value={form.compensation_equity} onChange={(e) => updateForm({ compensation_equity: e.target.value })} />
            <input placeholder="Relocation" className={inputCls} value={form.compensation_relocation} onChange={(e) => updateForm({ compensation_relocation: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Reason for Opening</label>
            <select className={inputCls} value={form.reason_for_opening} onChange={(e) => updateForm({ reason_for_opening: e.target.value })}>
              <option value="">Select…</option>
              <option value="new_role">New role</option>
              <option value="backfill">Backfill</option>
              <option value="restructure">Restructure</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Target Start Date</label>
            <input type="date" className={inputCls} value={form.target_start_date} onChange={(e) => updateForm({ target_start_date: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Search Launch Date</label>
            <input type="date" className={inputCls} value={form.launch_date} onChange={(e) => updateForm({ launch_date: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Target Close Date</label>
            <input type="date" className={inputCls} value={form.target_close_date} onChange={(e) => updateForm({ target_close_date: e.target.value })} />
          </div>
        </div>
        </div>
      </section>

      {/* ─── INTERVIEW PLAN ─── */}
      <section data-section="interview_plan" className={subCardCls}>
        <div className={subBannerCls}>
          <Users className="w-4 h-4 text-white" />
          <h3 className={subBannerTitleCls}>Interview Plan</h3>
        </div>
        <div className="p-5 space-y-3">

        <div className="space-y-3">
          {form.interview_rounds.map((round, i) => (
            <div key={i} className="border border-ds-border rounded-md bg-white p-3 space-y-2 relative">
              <button
                type="button"
                onClick={() => removeRound(i)}
                className="absolute top-2 right-2 text-text-muted hover:text-red-600"
                aria-label="Remove round"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold text-navy">Round {i + 1}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input placeholder="Stage name" className={inputCls} value={round.stage_name} onChange={(e) => updateRound(i, { stage_name: e.target.value })} />
                <input placeholder="Interviewers" className={inputCls} value={round.interviewers} onChange={(e) => updateRound(i, { interviewers: e.target.value })} />
                <input placeholder="What they're evaluating" className={inputCls} value={round.evaluating} onChange={(e) => updateRound(i, { evaluating: e.target.value })} />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addInterviewRound}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-navy bg-white hover:bg-navy hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" /> Add round
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div>
            <label className={labelCls}>Who makes the final decision?</label>
            <input className={inputCls} value={form.final_decision_maker} onChange={(e) => updateForm({ final_decision_maker: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Other candidates already in process?</label>
            <textarea rows={1} className={inputCls} value={form.other_candidates_in_process} onChange={(e) => updateForm({ other_candidates_in_process: e.target.value })} />
          </div>
        </div>
        </div>
      </section>

      {/* ─── INTAKE BRIEF (collapsible) ─── */}
      <section data-section="intake_brief" className={subCardCls}>
        <div className="flex items-center justify-between bg-navy-light text-white">
          <button
            type="button"
            onClick={() => setIsNotesExpanded((v) => !v)}
            aria-expanded={isNotesExpanded}
            className="flex-1 flex items-center gap-2 px-5 py-2.5 text-left"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${isNotesExpanded ? 'rotate-90' : ''}`}
            />
            <NotebookPen className="w-4 h-4 text-white" />
            <h3 className={subBannerTitleCls}>Intake Brief</h3>
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-1.5 mx-3 px-3 py-1 rounded-md text-xs font-semibold text-white border border-white/40 bg-white/10 hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export as PDF
          </button>
        </div>

        {isNotesExpanded && (
          <div className="p-6 space-y-5">
            {/* Company Context */}
            <div>
              <h4 className="text-xs font-bold text-navy tracking-widest mb-2">COMPANY CONTEXT</h4>
              <div className="border-l-4 border-navy pl-4 py-3 bg-white rounded-r-md">
                {isGeneratingBriefing ? (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating briefing…
                  </div>
                ) : form.company_briefing ? (
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{form.company_briefing}</p>
                ) : briefingError ? (
                  <div className="text-sm text-red-600 flex items-center justify-between gap-3">
                    <span>{briefingError}</span>
                    <button onClick={fetchBriefing} className="text-xs font-semibold text-navy hover:underline">Retry</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={fetchBriefing}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline"
                  >
                    <Sparkles className="w-4 h-4" /> Generate briefing
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                placeholder="Notes on company context…"
                value={form.company_context_notes}
                onChange={(e) => updateForm({ company_context_notes: e.target.value })}
                className="mt-2 w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy"
              />
            </div>

            {/* Conversation Guide */}
            <div>
              <h4 className="text-xs font-bold text-navy tracking-widest mb-2">CONVERSATION GUIDE</h4>
              {isGeneratingQuestions ? (
                <div className="flex items-center gap-2 text-sm text-text-muted py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating questions…
                </div>
              ) : questionsError ? (
                <div className="text-sm text-red-600 flex items-center justify-between gap-3 py-2">
                  <span>{questionsError}</span>
                  <button onClick={fetchQuestions} className="text-xs font-semibold text-navy hover:underline">Retry</button>
                </div>
              ) : (
                <div className="space-y-5">
                  {(Object.keys(CATEGORY_LABELS) as GuideCategory[]).map((cat) => {
                    const questions = form.conversation_guide[cat]
                    if (!questions.length) return null
                    return (
                      <div key={cat}>
                        <h5 className="text-[11px] font-bold text-navy tracking-widest mb-2">{CATEGORY_LABELS[cat]}</h5>
                        <ol className="space-y-3 list-decimal list-inside">
                          {questions.map((q, i) => (
                            <li key={i} className="text-sm text-text-primary">
                              <span className="font-semibold">{q.question}</span>
                              {q.rationale && <span className="ml-1 text-text-muted font-normal">({q.rationale})</span>}
                              <textarea
                                rows={2}
                                placeholder="Notes from the call…"
                                value={q.notes}
                                onChange={(e) => updateQuestionNotes(cat, i, e.target.value)}
                                className="mt-1.5 ml-6 w-[calc(100%-1.5rem)] px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy"
                              />
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  })}
                  {form.conversation_guide.the_role.length === 0 &&
                    form.conversation_guide.the_context.length === 0 &&
                    form.conversation_guide.the_candidate.length === 0 &&
                    form.conversation_guide.the_process.length === 0 && (
                      <button
                        type="button"
                        onClick={fetchQuestions}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline"
                      >
                        <Sparkles className="w-4 h-4" /> Generate questions
                      </button>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Final CTA — placeholder for position details generation */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-navy/60 cursor-not-allowed"
          title="Coming soon"
        >
          <Sparkles className="w-4 h-4" />
          Generate Position Details
        </button>
      </div>
      </div>
    </section>
  )
}
