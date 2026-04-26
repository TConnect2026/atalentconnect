"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { useAuth } from "@/lib/auth-context"
import {
  FileText,
  Upload,
  Loader2,
  Plus,
  X,
  Sparkles,
  FileDown,
  ChevronRight,
  ClipboardList,
  Users,
  Target,
  Briefcase,
  Building2,
  UserCheck,
  CalendarCheck,
  PenLine,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"

interface IntakePanelProps {
  searchId: string
  search: any
}

interface GuideQuestion {
  question: string
  rationale: string
  notes: string
  isCustom?: boolean
}

interface RecruiterQuestion {
  question: string
  notes: string
}

type GuideCategory = 'the_role' | 'the_context' | 'the_candidate' | 'the_process'

interface ConversationGuide {
  the_role: GuideQuestion[]
  the_context: GuideQuestion[]
  the_candidate: GuideQuestion[]
  the_process: GuideQuestion[]
}

type InterviewerAccessLevel = 'full_access' | 'limited_access'

interface Interviewer {
  name: string
  title: string
  email: string
  linkedin_url: string
  access_level: InterviewerAccessLevel
}

interface InterviewRound {
  stage_name: string
  interviewers: Interviewer[]
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

  // PART 3 — Conversation guide (AI-generated + user-added custom questions per category)
  conversation_guide: ConversationGuide
  // Recruiter Notes category — free-form questions the recruiter adds themselves
  recruiter_questions: RecruiterQuestion[]

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

type IntakeCategoryKey = GuideCategory | 'recruiter_notes'

interface IntakeCategoryConfig {
  key: IntakeCategoryKey
  label: string
  description: string
  icon: LucideIcon
}

const INTAKE_CATEGORIES: IntakeCategoryConfig[] = [
  { key: 'the_role', label: 'The Role', description: "What this person will do, own, and be measured on", icon: Briefcase },
  { key: 'the_context', label: 'The Context', description: "Why this role exists, what happened before, what's changing", icon: Building2 },
  { key: 'the_candidate', label: 'The Candidate', description: 'Must-haves, nice-to-haves, dealbreakers, culture, soft skills', icon: UserCheck },
  { key: 'the_process', label: 'The Process', description: 'Timeline, decision-making, competing priorities', icon: CalendarCheck },
  { key: 'recruiter_notes', label: 'Recruiter Notes', description: "Your own questions and observations", icon: PenLine },
]

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
    recruiter_questions: [],
    interview_rounds: [],
    final_decision_maker: '',
    other_candidates_in_process: '',
  }
}

// Map form keys to the section they live in so the per-section "Saved"
// indicator can light up wherever the user just typed.
const ESSENTIALS_KEYS: ReadonlySet<keyof PipelineForm> = new Set([
  'position_title', 'reports_to_name', 'reports_to_title', 'reports_to_email', 'reports_to_phone',
  'client_contacts', 'direct_reports_count', 'direct_reports_who',
  'position_location', 'work_arrangement',
  'compensation_base', 'compensation_bonus', 'compensation_equity', 'compensation_relocation',
  'reason_for_opening', 'target_start_date', 'launch_date', 'target_close_date',
])
const INTERVIEW_PLAN_KEYS: ReadonlySet<keyof PipelineForm> = new Set([
  'interview_rounds', 'final_decision_maker', 'other_candidates_in_process',
])
const INTAKE_BRIEF_KEYS: ReadonlySet<keyof PipelineForm> = new Set([
  'company_briefing', 'company_context_notes', 'conversation_guide', 'recruiter_questions',
])

function inferSection(patch: Partial<PipelineForm>): 'essentials' | 'interview_plan' | 'intake_brief' | null {
  for (const k of Object.keys(patch) as Array<keyof PipelineForm>) {
    if (ESSENTIALS_KEYS.has(k)) return 'essentials'
    if (INTERVIEW_PLAN_KEYS.has(k)) return 'interview_plan'
    if (INTAKE_BRIEF_KEYS.has(k)) return 'intake_brief'
  }
  return null
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

  const [activeCategory, setActiveCategory] = useState<IntakeCategoryKey | null>(null)
  const [activeRoundIndex, setActiveRoundIndex] = useState<number | null>(null)
  const [firmMembers, setFirmMembers] = useState<Array<{ id: string; first_name: string; last_name: string; email: string; role: string }>>([])
  // Track the most recently edited question/field so the "Saved" indicator
  // can surface on the specific card the user just touched.
  const [lastEditedField, setLastEditedField] = useState<string | null>(null)
  type SectionKey = 'essentials' | 'interview_plan' | 'intake_brief'
  const [lastEditedSection, setLastEditedSection] = useState<SectionKey | null>(null)

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
            .select('id, snapshot_extras')
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

        const savedForm = briefRow?.snapshot_extras?.pipeline_form
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
          // Actual intake_briefs columns in this DB:
          //   id, search_id, firm_id, org_type, num_employees, num_direct_reports,
          //   revenue_or_budget, reporting_to, is_backfill, backfill_reason,
          //   snapshot_extras, selected_question_ids, question_notes,
          //   ai_recommended_question_ids, ai_recommendation_rationale,
          //   brief_summary, status, created_at, updated_at
          //
          // The pipeline intake is a richer form than what the structured
          // columns cover, so we serialize the entire PipelineForm into the
          // snapshot_extras JSONB. Upsert on search_id handles both insert
          // and update paths.
          // Mirror essentials fields onto the canonical `searches` row so
          // the rest of the app (context bar, dashboards, search list) sees
          // the same values without reaching into the JSONB blob.
          const nullIfEmpty = (v: string) => (v && v.trim() ? v : null)
          const searchesPatch = {
            position_title: nullIfEmpty(next.position_title),
            reports_to: nullIfEmpty(next.reports_to_title),
            position_location: nullIfEmpty(next.position_location),
            work_arrangement: nullIfEmpty(next.work_arrangement),
            compensation_range: nullIfEmpty(next.compensation_base),
            launch_date: nullIfEmpty(next.launch_date),
            target_fill_date: nullIfEmpty(next.target_close_date),
            updated_at: new Date().toISOString(),
          }

          const [briefRes, searchesRes] = await Promise.all([
            supabase
              .from('intake_briefs')
              .upsert(
                {
                  search_id: searchId,
                  firm_id: profile.firm_id,
                  snapshot_extras: { pipeline_form: next },
                  status: 'in_progress',
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'search_id' }
              )
              .select('id')
              .single(),
            supabase
              .from('searches')
              .update(searchesPatch)
              .eq('id', searchId),
          ])
          if (briefRes.error) throw briefRes.error
          if (searchesRes.error) throw searchesRes.error
          if (briefRes.data?.id) {
            briefIdRef.current = briefRes.data.id
            setBriefId(briefRes.data.id)
          }
          setSaveStatus('saved')
        } catch (err: any) {
          console.error('IntakePanel save error:', err?.message || err, err?.details, err?.hint)
          setSaveErrorDetail(err?.message || 'Save failed')
          setSaveStatus('error')
        }
      }, 1000)
    },
    [profile?.firm_id, profile?.id, search?.company_name, searchId]
  )

  const updateForm = useCallback(
    (patch: Partial<PipelineForm>) => {
      const section = inferSection(patch)
      if (section) setLastEditedSection(section)
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

  // Load firm members so they can be picked as interviewers (typically
  // the recruiter doing the exploratory call is the first interviewer).
  useEffect(() => {
    if (!profile?.firm_id) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('firm_id', profile.firm_id)
        .order('first_name', { ascending: true })
      if (cancelled) return
      if (error) {
        console.error('IntakePanel firm members load error:', error)
        return
      }
      setFirmMembers(data || [])
    })()
    return () => {
      cancelled = true
    }
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
    const nextIndex = form.interview_rounds.length
    updateForm({
      interview_rounds: [
        ...form.interview_rounds,
        { stage_name: '', interviewers: [], evaluating: '' },
      ],
    })
    // Open the slide-out panel for the newly created round so the user can
    // fill in its details without having to click the row manually.
    setActiveRoundIndex(nextIndex)
  }

  const updateRound = (i: number, patch: Partial<InterviewRound>) => {
    updateForm({
      interview_rounds: form.interview_rounds.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    })
  }

  const removeRound = (i: number) => {
    updateForm({ interview_rounds: form.interview_rounds.filter((_, idx) => idx !== i) })
  }

  // Interviewer helpers — operate on a specific round's interviewer list.
  // Guards against legacy string-shaped interviewers values from earlier schemas.
  const getRoundInterviewers = (round: InterviewRound): Interviewer[] =>
    Array.isArray(round.interviewers) ? round.interviewers : []

  const addInterviewerToRound = (roundIndex: number, interviewer: Interviewer) => {
    const current = getRoundInterviewers(form.interview_rounds[roundIndex])
    updateRound(roundIndex, { interviewers: [...current, interviewer] })
  }

  const removeInterviewer = (roundIndex: number, interviewerIndex: number) => {
    const current = getRoundInterviewers(form.interview_rounds[roundIndex])
    updateRound(roundIndex, { interviewers: current.filter((_, idx) => idx !== interviewerIndex) })
  }

  const updateInterviewer = (roundIndex: number, interviewerIndex: number, patch: Partial<Interviewer>) => {
    const current = getRoundInterviewers(form.interview_rounds[roundIndex])
    updateRound(roundIndex, {
      interviewers: current.map((iv, idx) => (idx === interviewerIndex ? { ...iv, ...patch } : iv)),
    })
  }

  const addInterviewerFromContact = (roundIndex: number, contactIndex: number) => {
    const c = form.client_contacts[contactIndex]
    if (!c) return
    addInterviewerToRound(roundIndex, {
      name: c.name || '',
      title: c.title || '',
      email: c.email || '',
      linkedin_url: '',
      access_level: 'full_access',
    })
  }

  const addInterviewerFromFirmMember = (roundIndex: number, memberId: string) => {
    const m = firmMembers.find((fm) => fm.id === memberId)
    if (!m) return
    const name = [m.first_name, m.last_name].filter(Boolean).join(' ').trim()
    addInterviewerToRound(roundIndex, {
      name,
      title: m.role || '',
      email: m.email || '',
      linkedin_url: '',
      access_level: 'full_access',
    })
  }

  const [interviewerDraft, setInterviewerDraft] = useState<{ roundIndex: number; interviewer: Interviewer } | null>(null)
  const startNewInterviewer = (roundIndex: number) => {
    setInterviewerDraft({
      roundIndex,
      interviewer: { name: '', title: '', email: '', linkedin_url: '', access_level: 'full_access' },
    })
  }
  const cancelNewInterviewer = () => setInterviewerDraft(null)
  const saveNewInterviewer = () => {
    if (!interviewerDraft) return
    if (!interviewerDraft.interviewer.name.trim()) return
    addInterviewerToRound(interviewerDraft.roundIndex, interviewerDraft.interviewer)
    setInterviewerDraft(null)
  }

  // ─── Notes updater for a specific question ─────────────────────────────

  const updateQuestionNotes = (cat: GuideCategory, i: number, notes: string) => {
    setLastEditedField(`guide:${cat}:${i}`)
    const next: ConversationGuide = {
      ...form.conversation_guide,
      [cat]: form.conversation_guide[cat].map((q, idx) => (idx === i ? { ...q, notes } : q)),
    }
    updateForm({ conversation_guide: next })
  }

  const updateGuideQuestion = (cat: GuideCategory, i: number, patch: Partial<GuideQuestion>) => {
    setLastEditedField(`guide:${cat}:${i}`)
    const next: ConversationGuide = {
      ...form.conversation_guide,
      [cat]: form.conversation_guide[cat].map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    }
    updateForm({ conversation_guide: next })
  }

  const addCustomGuideQuestion = (cat: GuideCategory) => {
    const next: ConversationGuide = {
      ...form.conversation_guide,
      [cat]: [
        ...form.conversation_guide[cat],
        { question: '', rationale: '', notes: '', isCustom: true },
      ],
    }
    updateForm({ conversation_guide: next })
  }

  const removeGuideQuestion = (cat: GuideCategory, i: number) => {
    const next: ConversationGuide = {
      ...form.conversation_guide,
      [cat]: form.conversation_guide[cat].filter((_, idx) => idx !== i),
    }
    updateForm({ conversation_guide: next })
  }

  // ─── Recruiter Notes helpers ───────────────────────────────────────────

  const addRecruiterQuestion = () => {
    updateForm({
      recruiter_questions: [...form.recruiter_questions, { question: '', notes: '' }],
    })
  }

  const updateRecruiterQuestion = (i: number, patch: Partial<RecruiterQuestion>) => {
    setLastEditedField(`recruiter:${i}`)
    updateForm({
      recruiter_questions: form.recruiter_questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    })
  }

  const removeRecruiterQuestion = (i: number) => {
    updateForm({ recruiter_questions: form.recruiter_questions.filter((_, idx) => idx !== i) })
  }

  // ─── Category progress ─────────────────────────────────────────────────

  const categoryCounts = (key: IntakeCategoryKey): { answered: number; total: number } => {
    if (key === 'recruiter_notes') {
      const items = form.recruiter_questions
      return {
        answered: items.filter((q) => q.notes.trim().length > 0).length,
        total: items.length,
      }
    }
    const items = form.conversation_guide[key]
    return {
      answered: items.filter((q) => q.notes.trim().length > 0).length,
      total: items.length,
    }
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

  // Small inline indicator that appears in the section the user just edited.
  const renderSectionSaveIndicator = (section: SectionKey) => {
    if (lastEditedSection !== section) return null
    if (saveStatus === 'saving') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-white/80">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
        </span>
      )
    }
    if (saveStatus === 'saved') {
      return <span className="text-xs font-medium text-green-300">Saved</span>
    }
    if (saveStatus === 'error') {
      return (
        <span className="text-xs font-medium text-red-300" title={saveErrorDetail || undefined}>
          Save failed
        </span>
      )
    }
    return null
  }

  return (
    <section data-section="the_search" className="bg-bg-page rounded-lg border border-ds-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-navy">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-white" />
          The Search
        </h2>
      </div>
      <div className="p-6 space-y-4">
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
        <div className={`${subBannerCls} justify-between`}>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-white" />
            <h3 className={subBannerTitleCls}>Essentials</h3>
          </div>
          {renderSectionSaveIndicator('essentials')}
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
        <div className={`${subBannerCls} justify-between`}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white" />
            <h3 className={subBannerTitleCls}>Interview Plan</h3>
          </div>
          {renderSectionSaveIndicator('interview_plan')}
        </div>
        <div className="p-5 space-y-3">

        <div className="space-y-2">
          {form.interview_rounds.map((round, i) => {
            const ivs = getRoundInterviewers(round)
            const count = ivs.length
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveRoundIndex(i)}
                className="w-full flex items-center gap-3 p-3 border border-ds-border rounded-md bg-white hover:bg-bg-page text-left transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-navy-light text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy truncate">
                    {round.stage_name || `Round ${i + 1}`}
                  </div>
                  <div className="text-xs text-text-muted">
                    {count} {count === 1 ? 'panelist' : 'panelists'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
              </button>
            )
          })}
          <button
            type="button"
            onClick={addInterviewRound}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-navy bg-white hover:bg-navy hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" /> Add round
          </button>
        </div>
        </div>
      </section>

      {/* ─── INTAKE BRIEF (category cards) ─── */}
      <section data-section="intake_brief" className={subCardCls}>
        <div className="flex items-center justify-between bg-navy-light text-white">
          <div className="flex-1 flex items-center gap-2 px-5 py-2.5">
            <PenLine className="w-4 h-4 text-white" />
            <h3 className={subBannerTitleCls}>Intake Brief</h3>
          </div>
          <div className="flex items-center gap-3 mr-3">
            {renderSectionSaveIndicator('intake_brief')}
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white border border-white/40 bg-white/10 hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export as PDF
            </button>
          </div>
        </div>

        <div className="p-5">
          {(isGeneratingQuestions || questionsError) && (
            <div className="mb-3">
              {isGeneratingQuestions && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating questions…
                </div>
              )}
              {questionsError && (
                <div className="text-sm text-red-600 flex items-center justify-between gap-3">
                  <span>{questionsError}</span>
                  <button onClick={fetchQuestions} className="text-xs font-semibold text-navy hover:underline">Retry</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTAKE_CATEGORIES.map((cfg) => {
              const { answered, total } = categoryCounts(cfg.key)
              const isComplete = total > 0 && answered === total
              const Icon = cfg.icon
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => setActiveCategory(cfg.key)}
                  className="flex items-start gap-3 p-4 bg-white border border-ds-border rounded-lg text-left transition-colors hover:bg-bg-page hover:border-navy"
                >
                  <Icon className="w-6 h-6 text-navy flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-navy">{cfg.label}</div>
                    <div className="text-xs text-text-muted mt-0.5 leading-snug">{cfg.description}</div>
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      {isComplete ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600 font-semibold">Complete</span>
                        </>
                      ) : cfg.key === 'recruiter_notes' && total === 0 ? (
                        <span className="text-text-muted">No questions yet</span>
                      ) : (
                        <span className="text-text-muted">{answered}/{total} answered</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      </div>

      {/* ─── Intake Brief category slide-out panel ─── */}
      {(() => {
        const activeCfg = activeCategory ? INTAKE_CATEGORIES.find((c) => c.key === activeCategory) : null
        const isOpen = !!activeCategory
        const ActiveIcon = activeCfg?.icon
        const closePanel = () => setActiveCategory(null)

        // Derive the questions rendered in the panel based on the active
        // category. For AI categories, they come from conversation_guide;
        // for recruiter_notes, they come from recruiter_questions.
        const aiCat = activeCategory && activeCategory !== 'recruiter_notes'
          ? (activeCategory as GuideCategory)
          : null
        const aiQuestions = aiCat ? form.conversation_guide[aiCat] : []

        return (
          <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
            {/* Backdrop */}
            <div
              onClick={closePanel}
              className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Panel */}
            <aside
              className={`absolute right-0 top-0 bottom-0 w-[45%] min-w-[420px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
              role="dialog"
              aria-label={activeCfg?.label}
            >
              {activeCfg && (
                <>
                  <header className="px-6 py-4 bg-navy flex items-center justify-between gap-3 flex-shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {ActiveIcon && <ActiveIcon className="w-5 h-5 text-white" />}
                      {activeCfg.label}
                    </h3>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-lg font-bold text-navy">{activeCfg.description}</p>

                    {/* AI-generated categories */}
                    {aiCat && aiQuestions.length === 0 && !isGeneratingQuestions && (
                      <button
                        type="button"
                        onClick={fetchQuestions}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline"
                      >
                        <Sparkles className="w-4 h-4" /> Generate questions
                      </button>
                    )}

                    {aiCat && isGeneratingQuestions && aiQuestions.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating questions…
                      </div>
                    )}

                    {aiCat && aiQuestions.map((q, i) => {
                      const fieldKey = `guide:${aiCat}:${i}`
                      const showSaved = saveStatus === 'saved' && lastEditedField === fieldKey
                      return (
                        <div key={i} className="border border-ds-border rounded-md bg-bg-page p-3 space-y-2">
                          {q.isCustom ? (
                            <textarea
                              rows={1}
                              placeholder="Your question…"
                              value={q.question}
                              onChange={(e) => updateGuideQuestion(aiCat, i, { question: e.target.value })}
                              className="w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary font-semibold focus:outline-none focus:border-navy"
                            />
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-navy leading-snug">{q.question}</p>
                              {q.rationale && (
                                <p className="text-xs text-text-muted -mt-1">({q.rationale})</p>
                              )}
                            </>
                          )}
                          <textarea
                            rows={3}
                            placeholder="Notes from the call…"
                            value={q.notes}
                            onChange={(e) => updateQuestionNotes(aiCat, i, e.target.value)}
                            className="w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy"
                          />
                          <div className="flex items-center justify-between gap-2 min-h-[18px]">
                            {q.isCustom ? (
                              <button
                                type="button"
                                onClick={() => removeGuideQuestion(aiCat, i)}
                                className="text-xs font-semibold text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            ) : <span />}
                            {showSaved && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                <CheckCircle2 className="w-3 h-3" /> Saved
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {aiCat && (
                      <button
                        type="button"
                        onClick={() => addCustomGuideQuestion(aiCat)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border-2 border-dashed border-ds-border text-sm font-semibold text-navy hover:border-navy hover:bg-bg-page transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add your own question
                      </button>
                    )}

                    {/* Recruiter Notes category */}
                    {activeCategory === 'recruiter_notes' && (
                      <>
                        {form.recruiter_questions.length === 0 && (
                          <p className="text-sm text-text-muted">No questions yet. Add one below.</p>
                        )}
                        {form.recruiter_questions.map((q, i) => {
                          const fieldKey = `recruiter:${i}`
                          const showSaved = saveStatus === 'saved' && lastEditedField === fieldKey
                          return (
                            <div key={i} className="border border-ds-border rounded-md bg-bg-page p-3 space-y-2">
                              <textarea
                                rows={1}
                                placeholder="Your question…"
                                value={q.question}
                                onChange={(e) => updateRecruiterQuestion(i, { question: e.target.value })}
                                className="w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary font-semibold focus:outline-none focus:border-navy"
                              />
                              <textarea
                                rows={3}
                                placeholder="Notes…"
                                value={q.notes}
                                onChange={(e) => updateRecruiterQuestion(i, { notes: e.target.value })}
                                className="w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-navy"
                              />
                              <div className="flex items-center justify-between gap-2 min-h-[18px]">
                                <button
                                  type="button"
                                  onClick={() => removeRecruiterQuestion(i)}
                                  className="text-xs font-semibold text-red-600 hover:underline"
                                >
                                  Remove
                                </button>
                                {showSaved && (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                    <CheckCircle2 className="w-3 h-3" /> Saved
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        <button
                          type="button"
                          onClick={addRecruiterQuestion}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border-2 border-dashed border-ds-border text-sm font-semibold text-navy hover:border-navy hover:bg-bg-page transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Add your own question
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </aside>
          </div>
        )
      })()}

      {/* ─── Interview Plan round slide-out panel ─── */}
      {(() => {
        const isOpen = activeRoundIndex !== null
        const roundIdx = activeRoundIndex ?? -1
        const round = roundIdx >= 0 ? form.interview_rounds[roundIdx] : undefined
        const closePanel = () => {
          setActiveRoundIndex(null)
          cancelNewInterviewer()
        }
        const ivs = round ? getRoundInterviewers(round) : []

        return (
          <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
            {/* Backdrop */}
            <div
              onClick={closePanel}
              className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Panel */}
            <aside
              className={`absolute right-0 top-0 bottom-0 w-[45%] min-w-[420px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
              role="dialog"
              aria-label={round ? `Round ${roundIdx + 1}` : undefined}
            >
              {round && (
                <>
                  <header className="px-6 py-4 bg-navy flex items-center justify-between gap-3 flex-shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-white" />
                      Round {roundIdx + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                      <label className={labelCls}>Stage name</label>
                      <input
                        className={inputCls}
                        placeholder="e.g. Hiring Manager Interview"
                        value={round.stage_name}
                        onChange={(e) => updateRound(roundIdx, { stage_name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>What they&apos;re evaluating</label>
                      <textarea
                        rows={3}
                        className={inputCls}
                        placeholder="What this round is designed to assess…"
                        value={round.evaluating}
                        onChange={(e) => updateRound(roundIdx, { evaluating: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Interviewers</label>
                      <div className="space-y-1.5 mb-2">
                        {ivs.length === 0 && (
                          <p className="text-sm text-text-muted">No interviewers yet.</p>
                        )}
                        {ivs.map((iv, ivi) => (
                          <div key={ivi} className="flex items-start gap-2 px-3 py-2 border border-ds-border rounded-md bg-bg-page">
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="text-sm font-semibold text-navy truncate">{iv.name || '—'}</div>
                              {iv.title && <div className="text-xs text-text-muted truncate">{iv.title}</div>}
                              {iv.email && (
                                <div className="text-xs text-text-secondary truncate">
                                  <a href={`mailto:${iv.email}`} className="hover:underline">{iv.email}</a>
                                </div>
                              )}
                              {iv.linkedin_url && (
                                <div className="text-xs text-text-secondary truncate">
                                  <a href={iv.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-orange">
                                    LinkedIn
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <select
                                value={iv.access_level}
                                onChange={(e) => updateInterviewer(roundIdx, ivi, { access_level: e.target.value as InterviewerAccessLevel })}
                                className={`text-[11px] font-semibold rounded-full px-2 py-1 border-none focus:outline-none ${
                                  iv.access_level === 'full_access'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                <option value="full_access">Full Access</option>
                                <option value="limited_access">Limited Access</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => removeInterviewer(roundIdx, ivi)}
                                aria-label="Remove interviewer"
                                className="text-text-muted hover:text-red-600 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <select
                        value=""
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === '__new__') {
                            startNewInterviewer(roundIdx)
                          } else if (v.startsWith('firm:')) {
                            addInterviewerFromFirmMember(roundIdx, v.slice(5))
                          } else if (v.startsWith('contact:')) {
                            addInterviewerFromContact(roundIdx, parseInt(v.slice(8), 10))
                          }
                          e.target.value = ''
                        }}
                        className={inputCls}
                      >
                        <option value="">+ Add interviewer…</option>
                        {firmMembers.length > 0 && (
                          <optgroup label="From Recruiting Team">
                            {firmMembers.map((m) => {
                              const name = [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || m.email
                              return (
                                <option key={m.id} value={`firm:${m.id}`}>
                                  {name}{m.role ? ` — ${m.role}` : ''}
                                </option>
                              )
                            })}
                          </optgroup>
                        )}
                        {form.client_contacts.length > 0 && (
                          <optgroup label="From Client Contacts">
                            {form.client_contacts.map((c, ci) => (
                              <option key={ci} value={`contact:${ci}`} disabled={!c.name}>
                                {c.name || '(unnamed contact)'}{c.title ? ` — ${c.title}` : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="__new__">+ Add new interviewer…</option>
                      </select>

                      {interviewerDraft?.roundIndex === roundIdx && (
                        <div className="mt-2 border border-ds-border rounded-md p-3 bg-bg-page space-y-2">
                          <div className="text-xs font-bold text-navy">New interviewer</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              placeholder="Name"
                              className={inputCls}
                              value={interviewerDraft.interviewer.name}
                              onChange={(e) => setInterviewerDraft({ ...interviewerDraft, interviewer: { ...interviewerDraft.interviewer, name: e.target.value } })}
                            />
                            <input
                              placeholder="Title"
                              className={inputCls}
                              value={interviewerDraft.interviewer.title}
                              onChange={(e) => setInterviewerDraft({ ...interviewerDraft, interviewer: { ...interviewerDraft.interviewer, title: e.target.value } })}
                            />
                            <input
                              placeholder="Email"
                              className={inputCls}
                              value={interviewerDraft.interviewer.email}
                              onChange={(e) => setInterviewerDraft({ ...interviewerDraft, interviewer: { ...interviewerDraft.interviewer, email: e.target.value } })}
                            />
                            <input
                              placeholder="LinkedIn URL"
                              className={inputCls}
                              value={interviewerDraft.interviewer.linkedin_url}
                              onChange={(e) => setInterviewerDraft({ ...interviewerDraft, interviewer: { ...interviewerDraft.interviewer, linkedin_url: e.target.value } })}
                            />
                            <select
                              value={interviewerDraft.interviewer.access_level}
                              onChange={(e) => setInterviewerDraft({ ...interviewerDraft, interviewer: { ...interviewerDraft.interviewer, access_level: e.target.value as InterviewerAccessLevel } })}
                              className={inputCls}
                            >
                              <option value="full_access">Full Access</option>
                              <option value="limited_access">Limited Access</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={cancelNewInterviewer}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold text-navy hover:bg-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveNewInterviewer}
                              disabled={!interviewerDraft.interviewer.name.trim()}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-navy hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove Round ${roundIdx + 1}?`)) {
                            removeRound(roundIdx)
                            closePanel()
                          }
                        }}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove this round
                      </button>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        )
      })()}
    </section>
  )
}
