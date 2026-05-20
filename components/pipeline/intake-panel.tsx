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
  ArrowRight,
  MoreVertical,
  type LucideIcon,
} from "lucide-react"
import { Eye, Pencil, Replace, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface IntakePanelProps {
  searchId: string
  search: any
  // pageMode controls which sub-section renders and whether the outer
  // "The Search" wrapper is shown. Default (undefined) keeps legacy
  // workspace rendering with both sections. When set, only the matching
  // sub-section renders and the outer wrapper is dropped — used when
  // hosting on a dedicated route under the workspace layout.
  pageMode?: 'search_details' | 'interview_plan'
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

type ClientContactRole =
  | 'hiring_manager'
  | 'executive_sponsor'
  | 'hr_talent_partner'
  | 'executive_assistant'
  | 'finance_ap'
  | 'other'
  | ''

interface ClientContact {
  name: string
  title: string
  email: string
  phone: string
  role: ClientContactRole
}

// Phone formatter. Defaults to progressive US (XXX)-XXX-XXXX. If the user
// starts the value with "+", we treat it as international and pass through
// (only stripping characters that don't belong in any phone number).
function formatPhone(input: string): string {
  if (input.trimStart().startsWith('+')) {
    return input.replace(/[^\d+\s\-()]/g, '')
  }
  const digits = input.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`
}

const CLIENT_CONTACT_ROLE_OPTIONS: Array<{ value: ClientContactRole; label: string }> = [
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'executive_sponsor', label: 'Executive Sponsor' },
  { value: 'hr_talent_partner', label: 'HR / Talent Partner' },
  { value: 'executive_assistant', label: 'Executive Assistant' },
  { value: 'finance_ap', label: 'Finance / AP' },
  { value: 'other', label: 'Other' },
]

interface PipelineForm {
  // PART 1 — Essentials
  position_title: string
  reports_to: string
  client_contacts: ClientContact[]
  direct_reports: Array<{ name: string; title: string }>
  position_location: string
  work_arrangement: string
  compensation: string
  reason_for_opening: string
  launch_date: string
  target_close_date: string
  // Company-level fields. HQ Address, LinkedIn, and Website live on the
  // Company Intel page now — not surfaced here, not mirrored from here.
  open_to_relocation: boolean

  // Context — captured in the Intake slide-over only. Not shown on the
  // Search Details page. Five scaffolding questions + AI suggestions +
  // recruiter-added notes.
  context_why_open: string
  context_success_12mo: string
  context_hard_not_on_jd: string
  context_failure_profile: string
  context_dont_ask_client: string
  context_suggested: Array<{ id: string; question: string; answer: string }>
  context_notes: Array<{ id: string; text: string }>

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
    reports_to: search?.reports_to || '',
    client_contacts: [],
    direct_reports: Array.isArray(search?.direct_reports) ? search.direct_reports : [],
    position_location: search?.position_location || '',
    work_arrangement: search?.work_arrangement || '',
    // Compensation is now a single free-text field. Fall back to the
    // legacy compensation_range column if `compensation` isn't set yet.
    compensation: search?.compensation || search?.compensation_range || '',
    reason_for_opening: '',
    launch_date: search?.launch_date || '',
    target_close_date: search?.target_fill_date || '',
    open_to_relocation: !!search?.open_to_relocation,
    context_why_open: '',
    context_success_12mo: '',
    context_hard_not_on_jd: '',
    context_failure_profile: '',
    context_dont_ask_client: '',
    context_suggested: [],
    context_notes: [],
    company_briefing: '',
    company_context_notes: '',
    conversation_guide: EMPTY_GUIDE,
    recruiter_questions: [],
    interview_rounds: [],
    final_decision_maker: '',
    other_candidates_in_process: '',
  }
}

// FieldRow — the inline-edit pattern primitive used across Search Details.
// Renders one of three states based on inputs:
//   - hidden (isEmpty && !isEditing)
//   - display (hover shows pencil; click anywhere enters edit)
//   - edit (renders editContent; row-level keydown/blur handlers attached)
function FieldRow({
  isEmpty,
  isEditing,
  onStartEdit,
  rowHandlers,
  displayContent,
  editContent,
}: {
  isEmpty: boolean
  isEditing: boolean
  onStartEdit: () => void
  rowHandlers: { onKeyDown: React.KeyboardEventHandler<HTMLDivElement>; onBlur: React.FocusEventHandler<HTMLDivElement> }
  displayContent: React.ReactNode
  editContent: React.ReactNode
}) {
  if (isEmpty && !isEditing) return null

  if (isEditing) {
    return (
      <div tabIndex={-1} {...rowHandlers}>
        {editContent}
      </div>
    )
  }

  return (
    <div
      onClick={onStartEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartEdit() } }}
      className="group cursor-pointer flex items-start justify-between gap-2 px-2 py-1.5 -mx-2 rounded-md hover:bg-bg-section transition-colors"
    >
      <div className="flex-1 min-w-0">{displayContent}</div>
      <Pencil className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" aria-hidden />
    </div>
  )
}

// Map form keys to the section they live in so the per-section "Saved"
// indicator can light up wherever the user just typed.
const ESSENTIALS_KEYS: ReadonlySet<keyof PipelineForm> = new Set([
  'position_title', 'reports_to',
  'client_contacts', 'direct_reports',
  'position_location', 'work_arrangement',
  'compensation',
  'reason_for_opening', 'launch_date', 'target_close_date',
  'open_to_relocation',
  'context_why_open', 'context_success_12mo', 'context_hard_not_on_jd',
  'context_failure_profile', 'context_dont_ask_client',
  'context_suggested', 'context_notes',
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

export function IntakePanel({ searchId, search, pageMode }: IntakePanelProps) {
  const showSearchDetails = !pageMode || pageMode === 'search_details'
  const showInterviewPlan = !pageMode || pageMode === 'interview_plan'
  const { profile } = useAuth()
  const [briefId, setBriefId] = useState<string | null>(null)
  const [form, setForm] = useState<PipelineForm>(initialForm(search))
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [positionSpecDoc, setPositionSpecDoc] = useState<{ id: string; name: string; file_url: string } | null>(null)
  const [isUploadingSpec, setIsUploadingSpec] = useState(false)
  const [specUploadError, setSpecUploadError] = useState<string | null>(null)

  const specFileInputRef = useRef<HTMLInputElement | null>(null)

  // Client Contacts now live in the `contacts` table (not snapshot_extras).
  interface DbContact {
    id: string
    name: string | null
    title: string | null
    email: string | null
    phone: string | null
    role: string | null
    notes: string | null
  }
  const [dbContacts, setDbContacts] = useState<DbContact[]>([])

  // Compensation attachments (documents.category = 'compensation').
  interface CompensationDoc { id: string; name: string; file_url: string }
  const [compensationDocs, setCompensationDocs] = useState<CompensationDoc[]>([])
  const [isUploadingComp, setIsUploadingComp] = useState(false)
  const [compUploadError, setCompUploadError] = useState<string | null>(null)
  const compFileInputRef = useRef<HTMLInputElement | null>(null)
  // Local draft for the textarea — commits on blur, not on every keystroke.
  const [compensationDraft, setCompensationDraft] = useState('')
  // Keep the draft in sync if the underlying form value changes (e.g.
  // initial load or external reset). Only resyncs when form.compensation
  // differs from what's already in the draft so we don't trample edits.

  // Free-form Context narrative (searches.context_narrative). Opened in the
  // Beyond the Boilerplate slide-over. Blur autosaves directly to the
  // searches row and briefly flashes a "Saved" indicator.
  const [contextDraft, setContextDraft] = useState<string>(search?.context_narrative || '')
  const [isBoilerplateOpen, setIsBoilerplateOpen] = useState(false)
  const [contextSavedFlash, setContextSavedFlash] = useState(false)
  // Close the slide-over on Esc.
  useEffect(() => {
    if (!isBoilerplateOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsBoilerplateOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isBoilerplateOpen])

  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [briefingError, setBriefingError] = useState<string | null>(null)
  const [questionsError, setQuestionsError] = useState<string | null>(null)

  const [activeCategory, setActiveCategory] = useState<IntakeCategoryKey | null>(null)
  const [activeRoundIndex, setActiveRoundIndex] = useState<number | null>(null)

  // Inline-edit single-row state: only one row can be in edit mode at a time.
  // Esc rolls back to the snapshot captured at edit start. Blur (focus
  // leaving the row) or Enter (outside textareas) commits.
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const editSnapshotRef = useRef<Partial<PipelineForm>>({})
  const startRowEdit = useCallback((rowKey: string, snapshot: Partial<PipelineForm>) => {
    editSnapshotRef.current = snapshot
    setEditingRow(rowKey)
  }, [])
  const cancelRowEdit = useCallback(() => {
    if (Object.keys(editSnapshotRef.current).length > 0) {
      updateFormRef.current?.(editSnapshotRef.current)
    }
    editSnapshotRef.current = {}
    setEditingRow(null)
  }, [])
  const commitRowEdit = useCallback(() => {
    editSnapshotRef.current = {}
    setEditingRow(null)
  }, [])
  const rowEditHandlers = {
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelRowEdit()
      } else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault()
        ;(e.target as HTMLElement).blur()
        commitRowEdit()
      }
    },
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        commitRowEdit()
      }
    },
  }
  // Allow the cancel callback to call updateForm without making the
  // useCallback list it as a dependency (updateForm is recreated on every
  // form change). Ref keeps it stable.
  const updateFormRef = useRef<((patch: Partial<PipelineForm>) => void) | null>(null)
  const [firmMembers, setFirmMembers] = useState<Array<{ id: string; first_name: string; last_name: string; email: string; role: string }>>([])
  // Track the most recently edited question/field so the "Saved" indicator
  // can surface on the specific card the user just touched.
  const [lastEditedField, setLastEditedField] = useState<string | null>(null)
  type SectionKey = 'essentials' | 'interview_plan' | 'intake_brief'
  const [lastEditedSection, setLastEditedSection] = useState<SectionKey | null>(null)

  // Search team — separate table (search_team_members), not part of the
  // intake form blob. One row per (search_id, user_id) with a role.
  type TeamRole = 'Lead' | 'Associate' | 'Researcher' | 'Partner' | 'Other'
  const TEAM_ROLES: TeamRole[] = ['Lead', 'Associate', 'Researcher', 'Partner', 'Other']
  interface TeamMember { id: string; user_id: string; role: TeamRole }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showAddTeamForm, setShowAddTeamForm] = useState(false)
  const [addTeamUserId, setAddTeamUserId] = useState('')
  const [addTeamRole, setAddTeamRole] = useState<TeamRole>('Associate')
  const [addTeamError, setAddTeamError] = useState<string | null>(null)
  const [isSavingTeam, setIsSavingTeam] = useState(false)

  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const briefIdRef = useRef<string | null>(null)
  const isBootstrapping = useRef(true)

  // ─── Load existing brief + position spec ───────────────────────────────

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const [{ data: briefRow }, { data: docRows }, { data: compDocRows }] = await Promise.all([
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
          supabase
            .from('documents')
            .select('id, name, file_url')
            .eq('search_id', searchId)
            .eq('category', 'compensation')
            .order('created_at', { ascending: false }),
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
        if (Array.isArray(compDocRows)) {
          setCompensationDocs(compDocRows as CompensationDoc[])
        }
        // Seed the textarea draft from whatever just loaded into the form.
        const initialComp = savedForm?.compensation || search?.compensation || search?.compensation_range || ''
        setCompensationDraft(initialComp)
        // Seed Context narrative from the searches row.
        setContextDraft(search?.context_narrative || '')
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
          // Target Close Date accepts freeform text (e.g. "Q4 2026"); the
          // searches.target_fill_date column is DATE, so only mirror values
          // that look like an ISO date. Freeform still persists in
          // snapshot_extras.pipeline_form.target_close_date.
          const onlyIsoDate = (v: string) =>
            v && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null
          const searchesPatch = {
            position_title: nullIfEmpty(next.position_title),
            reports_to: nullIfEmpty(next.reports_to),
            position_location: nullIfEmpty(next.position_location),
            work_arrangement: nullIfEmpty(next.work_arrangement),
            compensation: nullIfEmpty(next.compensation),
            launch_date: onlyIsoDate(next.launch_date),
            target_fill_date: onlyIsoDate(next.target_close_date),
            open_to_relocation: !!next.open_to_relocation,
            // Direct reports — array of { name, title }. Mirror as-is to JSONB.
            direct_reports: next.direct_reports.filter((d) => d.name?.trim() || d.title?.trim()),
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
  // Keep the row-edit Esc handler able to call updateForm without re-wiring
  // its useCallback on every render.
  updateFormRef.current = updateForm

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

  // Load search team members.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('search_team_members')
        .select('id, user_id, role')
        .eq('search_id', searchId)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error) {
        console.error('IntakePanel team members load error:', error)
        return
      }
      setTeamMembers((data || []) as TeamMember[])
    })()
    return () => {
      cancelled = true
    }
  }, [searchId])

  // Load client contacts. If the optional `notes`/`role` columns haven't
  // been migrated yet, retry without them so the page still renders.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cols = ['id, name, title, email, phone, role, notes', 'id, name, title, email, phone, role', 'id, name, title, email, phone']
      for (const sel of cols) {
        const { data, error } = await supabase
          .from('contacts')
          .select(sel)
          .eq('search_id', searchId)
          .order('created_at', { ascending: true })
        if (cancelled) return
        if (!error) {
          setDbContacts((data || []) as unknown as DbContact[])
          return
        }
        const isMissingCol = error.code === '42703' || /column .* does not exist/i.test(error.message || '')
        if (!isMissingCol) {
          console.error('IntakePanel contacts load error:', error.message, error.code, error.details, error.hint)
          return
        }
        console.warn('Contacts table missing columns — falling back. Run pending SQL migrations:', error.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchId])

  // ─── Client contact handlers (DB-backed) ───────────────────────────────

  const addDbContact = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .insert({ search_id: searchId, name: '', title: '', email: '', phone: '', role: '', notes: '' })
      .select('id, name, title, email, phone, role, notes')
      .single()
    if (error) {
      console.error('Error adding contact:', error)
      return
    }
    if (data) setDbContacts((prev) => [...prev, data as DbContact])
  }

  // Update a single field in local state only — DB write happens on blur.
  const updateDbContactLocal = (id: string, patch: Partial<DbContact>) => {
    setDbContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  // Persist the field that just blurred. We send the whole patch each time
  // so we're not racing with other field blurs.
  const commitDbContactField = async (id: string, patch: Partial<DbContact>) => {
    const { error } = await supabase.from('contacts').update(patch).eq('id', id)
    if (error) console.error('Error updating contact:', error)
  }

  const removeDbContact = async (id: string) => {
    const target = dbContacts.find((c) => c.id === id)
    if (!target) return
    const label = target.name?.trim() || target.email?.trim() || 'this contact'
    if (!confirm(`Remove ${label}?`)) return
    const prev = dbContacts
    setDbContacts((curr) => curr.filter((c) => c.id !== id))
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) {
      console.error('Error deleting contact:', error)
      setDbContacts(prev)
    }
  }

  const teamMemberName = (userId: string) => {
    const m = firmMembers.find((fm) => fm.id === userId)
    if (!m) return userId
    return [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || m.email
  }

  const addTeamMember = async () => {
    setAddTeamError(null)
    if (!addTeamUserId) {
      setAddTeamError('Choose a team member')
      return
    }
    if (teamMembers.some((tm) => tm.user_id === addTeamUserId)) {
      setAddTeamError('That person is already on the team')
      return
    }
    if (addTeamRole === 'Lead' && teamMembers.some((tm) => tm.role === 'Lead')) {
      setAddTeamError("This search already has a Lead. Change the existing Lead's role first.")
      return
    }
    setIsSavingTeam(true)
    try {
      const { data, error } = await supabase
        .from('search_team_members')
        .insert({ search_id: searchId, user_id: addTeamUserId, role: addTeamRole })
        .select('id, user_id, role')
        .single()
      if (error) throw error
      setTeamMembers((prev) => [...prev, data as TeamMember])
      setShowAddTeamForm(false)
      setAddTeamUserId('')
      setAddTeamRole('Associate')
    } catch (err: any) {
      setAddTeamError(err?.message || 'Failed to add team member')
    } finally {
      setIsSavingTeam(false)
    }
  }

  const removeTeamMember = async (id: string) => {
    const member = teamMembers.find((tm) => tm.id === id)
    if (!member) return
    if (!confirm(`Remove ${teamMemberName(member.user_id)} from the team?`)) return
    const prev = teamMembers
    setTeamMembers((cur) => cur.filter((tm) => tm.id !== id))
    const { error } = await supabase.from('search_team_members').delete().eq('id', id)
    if (error) {
      console.error('Error removing team member:', error)
      setTeamMembers(prev)
    }
  }

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

  // ─── Compensation attachments ──────────────────────────────────────────

  const handleCompUpload = async (file: File) => {
    setCompUploadError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg'].includes(ext)) {
      setCompUploadError(`Unsupported type: .${ext}. Use PDF, DOCX, or image.`)
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setCompUploadError('File too large (max 15MB)')
      return
    }
    setIsUploadingComp(true)
    try {
      const storedName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const firmId = search?.firm_id || profile?.firm_id || 'unknown-firm'
      const filePath = `${firmId}/${searchId}/compensation/${storedName}`
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .upload(filePath, file)
      if (storageErr) throw new Error(storageErr.message || 'Storage upload failed')
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { data: row, error: insertErr } = await supabase
        .from('documents')
        .insert({
          search_id: searchId,
          name: file.name,
          category: 'compensation',
          file_url: publicUrl,
        })
        .select('id, name, file_url')
        .single()
      if (insertErr || !row) throw new Error(insertErr?.message || 'Failed to record document')
      setCompensationDocs((prev) => [row as CompensationDoc, ...prev])
    } catch (err: any) {
      setCompUploadError(err?.message || 'Upload failed')
    } finally {
      setIsUploadingComp(false)
    }
  }

  const handleCompDelete = async (doc: CompensationDoc) => {
    if (!confirm(`Remove "${doc.name}"?`)) return
    const prev = compensationDocs
    setCompensationDocs((curr) => curr.filter((d) => d.id !== doc.id))
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) {
      console.error('Error deleting compensation doc:', error)
      setCompensationDocs(prev)
    }
  }

  const handleSpecDelete = async () => {
    if (!positionSpecDoc) return
    if (!confirm(`Delete position spec "${positionSpecDoc.name}"?`)) return
    const prev = positionSpecDoc
    setPositionSpecDoc(null)
    const { error } = await supabase.from('documents').delete().eq('id', prev.id)
    if (error) {
      console.error('Error deleting position spec:', error)
      setPositionSpecDoc(prev)
    }
  }

  // Commit Context narrative directly to the searches row on blur. Empty
  // string is stored as null so we don't bloat the column with whitespace.
  // On success, briefly flash a "Saved" indicator in the slide-over header.
  const commitContextNarrative = async (value: string) => {
    const next = value.trim() ? value : null
    const current = (search?.context_narrative as string | null | undefined) ?? null
    if (next === current) return
    const { error } = await supabase
      .from('searches')
      .update({ context_narrative: next })
      .eq('id', searchId)
    if (error) {
      console.error('Error saving context narrative:', error.message, error.code, error.details, error.hint)
      return
    }
    setContextSavedFlash(true)
    setTimeout(() => setContextSavedFlash(false), 1500)
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

  const addInterviewerFromContact = (roundIndex: number, contactId: string) => {
    const c = dbContacts.find((dc) => dc.id === contactId)
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

  const inputCls = "w-full px-3 py-2 border border-ds-border rounded-md bg-white text-sm font-medium text-black placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:border-navy"
  const labelCls = "block text-sm font-bold text-navy mb-1.5"
  const subCardCls = "bg-white rounded-md border border-ds-border overflow-hidden"
  // Lighter blue (--navy-light = #2A4F7E) for sub-section banners so they
  // read as children of the outer "The Search" navy header.
  // Warm grey, one step darker than the page bg (#FAF9F7), so the
  // sub-section band reads as a sibling — not a sub-header competing
  // with the navy "The Search" page header above it.
  const subBannerCls = "px-5 py-2.5 bg-[#EFEDE8] border-b border-ds-border flex items-center gap-2"
  const subBannerTitleCls = "text-base font-bold text-navy"

  // Small inline indicator that appears in the section the user just edited.
  const renderSectionSaveIndicator = (section: SectionKey) => {
    if (lastEditedSection !== section) return null
    if (saveStatus === 'saving') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-text-muted">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
        </span>
      )
    }
    if (saveStatus === 'saved') {
      return <span className="text-xs font-medium text-green-700">Saved</span>
    }
    if (saveStatus === 'error') {
      return (
        <span className="text-xs font-medium text-red-700" title={saveErrorDetail || undefined}>
          Save failed
        </span>
      )
    }
    return null
  }

  // Page-mode hosts the panel on its own route; the workspace layout
  // already supplies the page header, so we skip our own outer wrapper.
  const OuterWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (pageMode) {
      return <div className="p-6 space-y-4 max-w-5xl mx-auto">{children}</div>
    }
    return (
      <section data-section="the_search" className="bg-bg-page rounded-lg border border-ds-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-navy">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-white" />
            The Search
          </h2>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </section>
    )
  }

  return (
    <>
    <OuterWrapper>
      {/* ─── ESSENTIALS / Search Details ─── */}
      {showSearchDetails && (
      <section data-section="essentials" className={pageMode ? '' : subCardCls}>
        {!pageMode && (
          <div className={`${subBannerCls} justify-between`}>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-navy" />
              <h3 className={subBannerTitleCls}>Search Details</h3>
            </div>
            {renderSectionSaveIndicator('essentials')}
          </div>
        )}
        {pageMode && (
          <div className="flex justify-end mb-2 min-h-[16px]">
            {renderSectionSaveIndicator('essentials')}
          </div>
        )}
        {(() => {
          // The Search Brief is "populated" if any meaningful field has
          // content. Local state is the source of truth because every field
          // autosaves to local state on the same blur that writes the DB.
          const populatedDirectReports = form.direct_reports.filter(
            (dr) => (dr.name || '').trim() || (dr.title || '').trim()
          )
          const isPopulated =
            !!positionSpecDoc ||
            !!(form.reports_to || '').trim() ||
            !!(form.reason_for_opening || '').trim() ||
            !!(form.position_location || '').trim() ||
            !!(form.work_arrangement || '').trim() ||
            !!(form.compensation || '').trim() ||
            !!(contextDraft || '').trim() ||
            populatedDirectReports.length > 0 ||
            dbContacts.length > 0 ||
            compensationDocs.length > 0

          if (isLoading) {
            return <div className="p-6 text-sm text-text-muted">Loading…</div>
          }

          const reasonLabel = (v: string) =>
            ({ new_role: 'New role', backfill: 'Backfill', restructure: 'Restructure' } as Record<string, string>)[v] || ''
          const workArrLabel = (v: string) =>
            ({ onsite: 'Onsite', hybrid: 'Hybrid', remote: 'Remote' } as Record<string, string>)[v] || ''
          const roleLabel = (v: string | null) =>
            v ? CLIENT_CONTACT_ROLE_OPTIONS.find((o) => o.value === v)?.label || '' : ''

          if (!isPopulated) {
            // ─── Empty-state landing: single CTA, generous breathing room ───
            return (
              <div className="flex flex-col items-center justify-center text-center min-h-[60vh] px-6">
                <button
                  type="button"
                  onClick={() => setIsBoilerplateOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-base font-semibold text-white bg-navy hover:bg-navy/90 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate Search Brief
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="mt-3 text-sm text-text-muted max-w-md">
                  Build your search brief. Pulls context from Company Intel, the JD,
                  and the search fields.
                </p>
              </div>
            )
          }

          // ─── Populated read view: structured display + Edit button ───
          const locationFilled =
            !!(form.position_location || '').trim() || !!(form.work_arrangement || '').trim()
          const empty = <span className="text-text-muted">—</span>
          return (
            <div className={pageMode ? 'space-y-4' : 'p-5 space-y-4 bg-bg-page'}>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsBoilerplateOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-navy border-2 border-navy bg-white hover:bg-navy hover:text-white transition-colors"
                >
                  Edit Search Brief
                </button>
              </div>

              {/* JD card (read view) */}
              <div className="flex items-start gap-3 p-5 rounded-md border border-ds-border bg-white">
                <FileText className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-navy">Job Description</h3>
                  {positionSpecDoc ? (
                    <a
                      href={positionSpecDoc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-black hover:text-navy hover:underline mt-1 inline-block truncate max-w-full"
                    >
                      {positionSpecDoc.name}
                    </a>
                  ) : (
                    <p className="text-xs text-text-muted mt-1">No JD uploaded</p>
                  )}
                </div>
              </div>

              {/* SEARCH DETAILS header */}
              <div className="pt-2">
                <div className="text-base font-bold uppercase tracking-wider text-navy">
                  Search Details
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Table stakes. The stuff every search has.
                </p>
              </div>

              {/* Structured fields — read rows */}
              <div className="bg-white border border-ds-border rounded-md p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Client Contacts</div>
                  <div className="text-sm text-black">
                    {dbContacts.length === 0
                      ? empty
                      : (
                        <ul className="space-y-1">
                          {dbContacts.map((c) => (
                            <li key={c.id}>
                              <span className="font-semibold">{c.name || '—'}</span>
                              {c.title && <span className="text-text-muted"> · {c.title}</span>}
                              {c.role && <span className="text-text-muted"> · {roleLabel(c.role)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Position Reports To</div>
                  <div className="text-sm text-black">{(form.reports_to || '').trim() || empty}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Reason for Opening</div>
                  <div className="text-sm text-black">{reasonLabel(form.reason_for_opening) || empty}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Direct Reports</div>
                  <div className="text-sm text-black">
                    {populatedDirectReports.length === 0
                      ? empty
                      : (
                        <ul className="space-y-1">
                          {populatedDirectReports.map((dr, i) => (
                            <li key={i}>
                              <span className="font-semibold">{dr.name || '—'}</span>
                              {dr.title && <span className="text-text-muted"> · {dr.title}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Position Location</div>
                  <div className="text-sm text-black">
                    {locationFilled ? (
                      <>
                        {(form.position_location || '').trim() || empty}
                        {(form.work_arrangement || '').trim() && (
                          <span className="text-text-muted"> · {workArrLabel(form.work_arrangement)}</span>
                        )}
                        <span className="text-text-muted"> · Open to Reloc: {form.open_to_relocation ? 'Yes' : 'No'}</span>
                      </>
                    ) : empty}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Compensation Details</div>
                  <div className="text-sm text-black">
                    {(form.compensation || '').trim()
                      ? <p className="whitespace-pre-wrap">{form.compensation}</p>
                      : empty}
                    {compensationDocs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {compensationDocs.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-page border border-ds-border text-xs text-navy hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            {doc.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Beyond the Boilerplate (read view) — only shown if filled */}
              {(contextDraft || '').trim() && (
                <div className="bg-white border border-ds-border rounded-md p-5">
                  <div className="text-base font-bold uppercase tracking-wider text-navy">
                    Beyond the Boilerplate
                  </div>
                  <p className="text-sm text-black whitespace-pre-wrap mt-2">{contextDraft}</p>
                </div>
              )}
            </div>
          )
        })()}
      </section>
      )}

      {/* ─── INTERVIEW PLAN ─── */}
      {showInterviewPlan && (
      <section data-section="interview_plan" className={pageMode ? '' : subCardCls}>
        {!pageMode && (
          <div className={`${subBannerCls} justify-between`}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-navy" />
              <h3 className={subBannerTitleCls}>Interview Plan</h3>
            </div>
            {renderSectionSaveIndicator('interview_plan')}
          </div>
        )}
        {pageMode && (
          <div className="flex justify-end mb-2 min-h-[16px]">
            {renderSectionSaveIndicator('interview_plan')}
          </div>
        )}
        <div className={pageMode ? 'space-y-3' : 'p-5 space-y-3'}>

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
      )}

      {/* ─── INTAKE BRIEF (category cards) — hidden; superseded by the
            slide-over Intake Brief launched from Essentials. Kept in tree
            for now in case we want to revert. ─── */}
      {false && (
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
      )}
    </OuterWrapper>

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
                            addInterviewerFromContact(roundIdx, v.slice(8))
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
                        {dbContacts.length > 0 && (
                          <optgroup label="From Client Contacts">
                            {dbContacts.map((c) => (
                              <option key={c.id} value={`contact:${c.id}`} disabled={!c.name}>
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

      <input
        ref={specFileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) await handleSpecUpload(file)
          e.target.value = ''
        }}
      />

      {/* ─── Search Brief slide-over — full editing surface.
            Mounted on the Search Brief page only; opens from empty-state
            CTA or the populated-state "Edit Search Brief" button. ─── */}
      {showSearchDetails && (
      <div className={`fixed inset-0 z-50 ${isBoilerplateOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isBoilerplateOpen}>
        <div
          onClick={() => setIsBoilerplateOpen(false)}
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${isBoilerplateOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          role="dialog"
          aria-label="Search Brief"
          className={`absolute right-0 top-0 bottom-0 w-[680px] max-w-[95vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isBoilerplateOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <header className="px-6 py-4 bg-navy flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-white">Search Brief</h3>
              {contextSavedFlash && (
                <span className="text-xs font-semibold text-white/80">Saved</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsBoilerplateOpen(false)}
              aria-label="Close"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-bg-page">

            {/* a. JD card */}
            {positionSpecDoc ? (
              <div className="flex items-start gap-3 p-5 rounded-md border border-ds-border bg-white">
                <FileText className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-navy">Job Description</h3>
                  <a
                    href={positionSpecDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-black hover:text-navy hover:underline mt-1 inline-block truncate max-w-full"
                  >
                    {positionSpecDoc.name}
                  </a>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="JD actions"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-navy hover:bg-bg-section transition-colors self-center"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px] z-50 shadow-lg">
                    <DropdownMenuItem onSelect={() => window.open(positionSpecDoc.file_url, '_blank', 'noopener,noreferrer')} className="text-sm cursor-pointer">
                      <Eye className="w-4 h-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => specFileInputRef.current?.click()} className="text-sm cursor-pointer">
                      <Replace className="w-4 h-4 mr-2" /> Replace
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleSpecDelete} className="text-sm cursor-pointer text-red-600 focus:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-5 rounded-md border border-ds-border bg-white">
                <FileText className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-navy">Job Description</h3>
                </div>
                <button
                  type="button"
                  onClick={() => specFileInputRef.current?.click()}
                  disabled={isUploadingSpec}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-navy hover:bg-navy/90 disabled:opacity-60 transition-colors self-center"
                >
                  {isUploadingSpec ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploadingSpec ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            )}
            {specUploadError && <p className="text-xs text-red-600">{specUploadError}</p>}

            {/* b. Generate Question Set CTA + subtitle (renamed from
                   Generate Search Brief; same styling) */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => alert('Question set generation coming soon')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-navy hover:bg-navy/90 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate Question Set →
              </button>
              <p className="text-xs text-text-muted">
                Generate a tailored question set to guide your client conversation.
                Pulls context from Company Intel, the JD, and the fields below.
              </p>
            </div>

            {/* c. SEARCH DETAILS header */}
            <div className="pt-2">
              <div className="text-base font-bold uppercase tracking-wider text-navy">
                Search Details
              </div>
              <p className="text-xs text-text-muted mt-1">
                Table stakes. The stuff every search has.
              </p>
            </div>

            {/* d.1 Client Contacts */}
            <section className="bg-white border border-ds-border rounded-md p-5">
              <h3 className="text-lg font-bold text-navy mb-3">Client Contacts</h3>
              <div className="space-y-3">
                {dbContacts.length === 0 && (
                  <p className="text-xs text-text-muted italic">No client contacts yet.</p>
                )}
                {dbContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="relative border border-ds-border rounded-md p-3 bg-bg-page space-y-2"
                  >
                    <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                      <input
                        placeholder="Name"
                        className={inputCls}
                        value={contact.name || ''}
                        onChange={(e) => updateDbContactLocal(contact.id, { name: e.target.value })}
                        onBlur={(e) => commitDbContactField(contact.id, { name: e.target.value.trim() || null })}
                      />
                      <input
                        placeholder="Title"
                        className={inputCls}
                        value={contact.title || ''}
                        onChange={(e) => updateDbContactLocal(contact.id, { title: e.target.value })}
                        onBlur={(e) => commitDbContactField(contact.id, { title: e.target.value.trim() || null })}
                      />
                      <select
                        className={`w-full min-w-0 px-2 py-2 border border-ds-border rounded-md bg-white text-xs focus:outline-none focus:border-navy ${
                          contact.role ? 'font-medium text-black' : 'font-normal text-gray-400'
                        }`}
                        value={contact.role || ''}
                        onChange={(e) => {
                          const v = e.target.value
                          updateDbContactLocal(contact.id, { role: v })
                          commitDbContactField(contact.id, { role: v || null })
                        }}
                      >
                        <option value="">Role on Search…</option>
                        {CLIENT_CONTACT_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeDbContact(contact.id)}
                        aria-label="Remove contact"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-[2fr_1fr_2fr] gap-2">
                      <input
                        placeholder="Email"
                        className={inputCls}
                        value={contact.email || ''}
                        onChange={(e) => updateDbContactLocal(contact.id, { email: e.target.value })}
                        onBlur={(e) => commitDbContactField(contact.id, { email: e.target.value.trim() || null })}
                      />
                      <input
                        placeholder="Phone"
                        inputMode="tel"
                        className={inputCls}
                        value={contact.phone || ''}
                        onChange={(e) => updateDbContactLocal(contact.id, { phone: formatPhone(e.target.value) })}
                        onBlur={(e) => commitDbContactField(contact.id, { phone: e.target.value.trim() || null })}
                      />
                      <input
                        placeholder="Notes"
                        className={inputCls}
                        value={contact.notes || ''}
                        onChange={(e) => updateDbContactLocal(contact.id, { notes: e.target.value })}
                        onBlur={(e) => commitDbContactField(contact.id, { notes: e.target.value.trim() || null })}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDbContact}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-navy bg-white hover:bg-navy hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Contact
                </button>
              </div>
            </section>

            {/* d.2–d.5 Structured fields */}
            <section className="bg-white border border-ds-border rounded-md p-5 space-y-4">
              {/* Position Reports To + Reason for Opening, 50/50 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Position Reports To</label>
                  <input
                    className={inputCls}
                    placeholder="Name and title"
                    value={form.reports_to}
                    onChange={(e) => updateForm({ reports_to: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Reason for Opening</label>
                  <select
                    className={inputCls}
                    value={form.reason_for_opening}
                    onChange={(e) => updateForm({ reason_for_opening: e.target.value })}
                  >
                    <option value="">Select…</option>
                    <option value="new_role">New role</option>
                    <option value="backfill">Backfill</option>
                    <option value="restructure">Restructure</option>
                  </select>
                </div>
              </div>

              {/* Direct Reports — repeatable name + title rows */}
              <div>
                <label className={labelCls}>Direct Reports</label>
                <div className="space-y-2">
                  {(() => {
                    const list = form.direct_reports.length > 0
                      ? form.direct_reports
                      : [{ name: '', title: '' }]
                    const setField = (i: number, field: 'name' | 'title', value: string) => {
                      const next = form.direct_reports.length > 0
                        ? [...form.direct_reports]
                        : []
                      while (i >= next.length) next.push({ name: '', title: '' })
                      next[i] = { ...next[i], [field]: value }
                      updateForm({ direct_reports: next })
                    }
                    return list.map((dr, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <input
                          placeholder="Name"
                          className={inputCls}
                          value={dr.name}
                          onChange={(e) => setField(i, 'name', e.target.value)}
                        />
                        <input
                          placeholder="Title"
                          className={inputCls}
                          value={dr.title}
                          onChange={(e) => setField(i, 'title', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => updateForm({ direct_reports: form.direct_reports.filter((_, idx) => idx !== i) })}
                          aria-label="Remove direct report"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  })()}
                  <button
                    type="button"
                    onClick={() => updateForm({ direct_reports: [...form.direct_reports, { name: '', title: '' }] })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-navy bg-white hover:bg-navy hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add direct report
                  </button>
                </div>
              </div>

              {/* Location · Work Arrangement · Open to Reloc */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-4 items-end">
                <div>
                  <label className={labelCls}>Position Location</label>
                  <input
                    className={inputCls}
                    placeholder="City, State"
                    value={form.position_location}
                    onChange={(e) => updateForm({ position_location: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Work Arrangement</label>
                  <select
                    className={inputCls}
                    value={form.work_arrangement}
                    onChange={(e) => updateForm({ work_arrangement: e.target.value })}
                  >
                    <option value="">Select…</option>
                    <option value="onsite">Onsite</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Open to Reloc</label>
                  <div className="inline-flex rounded-md border border-ds-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateForm({ open_to_relocation: true })}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${form.open_to_relocation ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-bg-section'}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm({ open_to_relocation: false })}
                      className={`px-3 py-2 text-sm font-medium transition-colors border-l border-ds-border ${!form.open_to_relocation ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-bg-section'}`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* d.6 Compensation */}
            <section className="bg-white border border-ds-border rounded-md p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-navy">Compensation Details</h3>
                <button
                  type="button"
                  onClick={() => compFileInputRef.current?.click()}
                  disabled={isUploadingComp}
                  title="Attach Total Rewards or compensation documents"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-navy bg-white hover:bg-navy hover:text-white disabled:opacity-60 transition-colors"
                >
                  {isUploadingComp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  {isUploadingComp ? 'Uploading…' : 'Attach'}
                </button>
              </div>
              <textarea
                rows={6}
                className={`${inputCls} resize-y`}
                placeholder="All compensation details. Attach total rewards if available."
                value={compensationDraft}
                onChange={(e) => setCompensationDraft(e.target.value)}
                onBlur={() => {
                  if (compensationDraft !== form.compensation) {
                    updateForm({ compensation: compensationDraft })
                  }
                }}
              />
              {compUploadError && <p className="text-xs text-red-600 mt-2">{compUploadError}</p>}
              {compensationDocs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {compensationDocs.map((doc) => (
                    <span
                      key={doc.id}
                      className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-bg-page border border-ds-border text-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-navy flex-shrink-0" />
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy hover:underline truncate max-w-[240px]"
                      >
                        {doc.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCompDelete(doc)}
                        aria-label="Remove attachment"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={compFileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) await handleCompUpload(file)
                  e.target.value = ''
                }}
              />
            </section>

            {/* f. BEYOND THE BOILERPLATE — free-form narrative */}
            <div className="pt-2">
              <div className="text-base font-bold uppercase tracking-wider text-navy">
                Beyond the Boilerplate
              </div>
              <p className="text-xs text-text-muted mt-1">
                The real conversation. Culture, decision-making, tradeoffs, why
                this role is really open, what didn't work last time, what
                success looks like at 90 days.
              </p>
              <textarea
                rows={10}
                className={`${inputCls} resize-y mt-2`}
                placeholder="Capture the deeper context here..."
                value={contextDraft}
                onChange={(e) => setContextDraft(e.target.value)}
                onBlur={() => commitContextNarrative(contextDraft)}
              />
            </div>

          </div>
        </aside>
      </div>
      )}
    </>
  )
}
