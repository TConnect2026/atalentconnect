'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  Briefcase,
  Building2,
  Users2,
  Heart,
  GitBranch,
  UserCheck,
  AlertTriangle,
  EyeOff,
  Sparkles,
  DollarSign,
  Calendar,
  Handshake,
  ClipboardCheck,
  IdCard,
} from 'lucide-react'
import {
  OrgType,
  QuestionAttribute,
  ORG_TYPE_LABELS,
  ATTRIBUTE_LABELS,
} from '@/lib/intake-questions'

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntakeQuestion {
  id: string
  section: QuestionAttribute
  text: string
  notes: string
  rationale?: string | null
  source: 'library' | 'ai_generated' | 'custom'
  isProbe?: boolean
  order: number
}

interface OrgSnapshot {
  orgType: OrgType | null
  numEmployees: string
  revenueOrBudget: string
  reportingTo: string
  notes: string
  extras: Record<string, string>
  // Role Basics — captured at the top of the Questions tab
  roleBasics?: RoleBasics
}

interface RoleBasics {
  officialTitle: string
  isBackfill: boolean
  reportsTo: string
  numDirectReports: string
  directReportTitles: string[]
  roleLocation: string
  workArrangement: 'remote' | 'hybrid' | 'onsite' | ''
  openToRelocation: boolean
  internalCandidate: boolean
  launchDate: string
  targetCloseDate: string
}

interface CompanyResearch {
  company_name: string
  industry: string | null
  sub_industry: string | null
  description: string | null
  headquarters: string | null
  employee_count: string | null
  revenue_or_budget: string | null
  founded: string | null
  org_type_signal: string | null
  org_type_reasoning: string | null
  ownership: string | null
  funding: {
    stage: string | null
    total_raised: string | null
    key_investors: string | null
    last_round: string | null
  } | null
  leadership: { name: string; title: string; tenure: string | null }[]
  culture_signals: string[]
  recent_news: string[]
  risks_and_context: string[]
  competitors: string[]
  confidence: string | null
}

interface IntakeBriefRecord {
  id?: string
  search_id: string
  firm_id: string
  created_by: string
  company_name: string
  company_research: CompanyResearch | null
  org_type: OrgType | null
  snapshot: OrgSnapshot
  questions: IntakeQuestion[]
  jd_signals: string[]
  job_description_text: string | null
  generation_path: string | null
  status: string
}

type Step = 'start' | 'researching' | 'disambiguate' | 'path_choice' | 'generating' | 'editing'

interface CompanyCandidate {
  company_name: string
  industry: string
  headquarters: string
  description: string
  employee_count?: string
  distinguisher?: string
}

const ORG_TYPE_SNAPSHOT_EXTRAS: Record<OrgType, { key: string; label: string }[]> = {
  startup: [
    { key: 'funding_stage', label: 'Funding Stage' },
    { key: 'investors', label: 'Key Investors' },
    { key: 'founder_as_ceo', label: 'Founder as CEO?' },
    { key: 'layoffs_reorgs', label: 'Previous Layoffs / Reorgs?' },
  ],
  growth_pe: [
    { key: 'pe_firm', label: 'PE Firm' },
    { key: 'hold_period', label: 'Where in Hold Period' },
    { key: 'recent_acquisition', label: 'Recent Acquisition / Merger?' },
    { key: 'exit_thesis', label: 'Exit Thesis' },
  ],
  established_private: [
    { key: 'generation', label: '1st or 2nd Generation Ownership' },
    { key: 'founder_active', label: 'Founder Still Active?' },
    { key: 'family_in_leadership', label: 'Family Members in Leadership?' },
    { key: 'succession_plan', label: 'Succession Plan in Play?' },
  ],
  public_company: [
    { key: 'market_cap', label: 'Market Cap / Trajectory' },
    { key: 'ceo_tenure', label: 'CEO Tenure' },
    { key: 'activist_investors', label: 'Activist Investor Activity?' },
    { key: 'earnings_timing', label: 'Pre / Post Earnings?' },
  ],
  nonprofit: [
    { key: 'primary_funding', label: 'Primary Funding Sources' },
    { key: 'board_size', label: 'Board Size' },
    { key: 'annual_budget', label: 'Annual Budget' },
    { key: 'programs', label: 'Core Programs' },
  ],
  public_sector: [
    { key: 'funding_sources', label: 'Primary Funding Sources' },
    { key: 'government_dependency', label: '% Government Dependent' },
    { key: 'pending_policy', label: 'Pending Policy / Legislation Impact?' },
    { key: 'key_relationships', label: 'Key Government Relationships' },
  ],
}

const SECTION_ORDER: QuestionAttribute[] = [
  'business_context',
  'governance_leadership',
  'team_culture',
  'mission_alignment',
  'decision_making',
  'great_candidate',
  'failure_pattern',
  'hidden_disqualifier',
  'working_style',
  'success_picture',
  'compensation',
  'timeline_process',
  'before_market',
]

const SECTION_ICONS: Record<QuestionAttribute, React.ComponentType<{ className?: string }>> = {
  business_context: Briefcase,
  governance_leadership: Building2,
  team_culture: Users2,
  mission_alignment: Heart,
  decision_making: GitBranch,
  great_candidate: UserCheck,
  failure_pattern: AlertTriangle,
  hidden_disqualifier: EyeOff,
  working_style: Handshake,
  success_picture: Sparkles,
  compensation: DollarSign,
  timeline_process: Calendar,
  before_market: ClipboardCheck,
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IntakeBriefPage() {
  const params = useParams()
  const { profile } = useAuth()
  const searchId = params.id as string

  const [search, setSearch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [step, setStep] = useState<Step>('start')
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyLocation, setCompanyLocation] = useState('')
  const [research, setResearch] = useState<CompanyResearch | null>(null)
  const [companyCandidates, setCompanyCandidates] = useState<CompanyCandidate[]>([])
  const [researchError, setResearchError] = useState<string | null>(null)
  // jdText / jdFileName are repurposed to carry the uploaded position spec.
  // The brief record still stores the content under job_description_text; the
  // generate API reads it the same way it always did.
  const [jdText, setJdText] = useState('')
  const [jdFileName, setJdFileName] = useState<string | null>(null)
  const [jdFileExt, setJdFileExt] = useState<string | null>(null)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // The full brief data
  const [brief, setBrief] = useState<IntakeBriefRecord | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Editing state
  const [activeTab, setActiveTab] = useState<'snapshot' | 'questions' | 'session'>('questions')
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // ─── Load existing data ──────────────────────────────────────────────────

  useEffect(() => {
    loadData()
  }, [searchId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load search
      const { data: searchData } = await supabase
        .from('searches')
        .select('*')
        .eq('id', searchId)
        .single()

      if (searchData) {
        setSearch(searchData)
        setCompanyName(searchData.company_name || '')
      }

      // Check for existing brief
      const { data: briefData } = await supabase
        .from('intake_briefs')
        .select('*')
        .eq('search_id', searchId)
        .single()

      if (briefData) {
        setBrief(briefData as IntakeBriefRecord)
        setResearch(briefData.company_research)
        setCompanyName(briefData.company_name || searchData?.company_name || '')
        setJdText(briefData.job_description_text || '')
        setStep('editing')
      }
    } catch (err) {
      console.error('Error loading intake brief:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Autosave ────────────────────────────────────────────────────────────

  const autosave = useCallback(
    (updatedBrief: IntakeBriefRecord) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          const payload = {
            company_name: updatedBrief.company_name,
            company_research: updatedBrief.company_research,
            org_type: updatedBrief.org_type,
            snapshot: updatedBrief.snapshot,
            questions: updatedBrief.questions,
            jd_signals: updatedBrief.jd_signals,
            job_description_text: updatedBrief.job_description_text,
            generation_path: updatedBrief.generation_path,
            status: updatedBrief.status,
            updated_at: new Date().toISOString(),
          }

          if (updatedBrief.id) {
            const { error } = await supabase
              .from('intake_briefs')
              .update(payload)
              .eq('id', updatedBrief.id)
            if (error) {
              console.error('Autosave UPDATE failed:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                briefId: updatedBrief.id,
              })
              throw error
            }
          } else {
            const { data, error } = await supabase
              .from('intake_briefs')
              .insert({
                ...payload,
                search_id: searchId,
                firm_id: profile?.firm_id || '',
                created_by: profile?.id || '',
              })
              .select('id')
              .single()
            if (error) {
              console.error('Autosave INSERT failed:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                searchId,
                firmId: profile?.firm_id,
              })
              throw error
            }
            if (data) {
              updatedBrief.id = data.id
              setBrief({ ...updatedBrief })
            }
          }
          setSaveStatus('saved')
        } catch (err: any) {
          console.error('Autosave error:', {
            message: err?.message,
            code: err?.code,
            details: err?.details,
            hint: err?.hint,
            stack: err?.stack,
          })
          setSaveStatus('error')
        }
      }, 800)
    },
    [searchId, profile]
  )

  const updateBrief = useCallback(
    (updater: (prev: IntakeBriefRecord) => IntakeBriefRecord) => {
      setBrief((prev) => {
        if (!prev) return prev
        const updated = updater(prev)
        autosave(updated)
        return updated
      })
    },
    [autosave]
  )

  // ─── Company Research ────────────────────────────────────────────────────

  const runResearch = async (confirmedCompany?: CompanyCandidate) => {
    if (!companyName.trim() && !confirmedCompany) return
    setStep('researching')
    setResearchError(null)
    try {
      const res = await fetch('/api/intake-brief/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyWebsite: companyWebsite.trim() || undefined,
          companyLocation: companyLocation.trim() || undefined,
          confirmedCompany: confirmedCompany || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.ambiguous && data.candidates?.length > 1) {
        setCompanyCandidates(data.candidates)
        setStep('disambiguate')
        return
      }

      setResearch(data.research)
      setStep('path_choice')
    } catch (err: any) {
      setResearchError(err.message || 'Research failed')
      setStep('start')
    }
  }

  const confirmCompany = (candidate: CompanyCandidate) => {
    runResearch(candidate)
  }

  // ─── Generate Brief ─────────────────────────────────────────────────────

  const generateBrief = async (withJD: boolean) => {
    if (!research) return
    setStep('generating')
    setGenerationError(null)

    const orgType = research.org_type_signal || 'established_private'

    try {
      const res = await fetch('/api/intake-brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: research.company_name || companyName,
          companyResearch: research,
          jobDescription: withJD ? jdText : null,
          orgType,
          positionTitle: search?.position_title || '',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Build the snapshot from suggestions
      const suggestions = data.snapshotSuggestions || {}
      const snapshot: OrgSnapshot = {
        orgType: orgType as OrgType,
        numEmployees: suggestions.numEmployees || research.employee_count || '',
        revenueOrBudget: suggestions.revenueOrBudget || research.revenue_or_budget || '',
        reportingTo: suggestions.reportingTo || '',
        notes: '',
        extras: suggestions.extras || {},
        roleBasics: {
          officialTitle: search?.position_title || '',
          isBackfill: false,
          reportsTo: suggestions.reportingTo || '',
          numDirectReports: '',
          directReportTitles: [],
          roleLocation: search?.position_location || '',
          workArrangement: (search?.work_arrangement as 'remote' | 'hybrid' | 'onsite' | undefined) || '',
          openToRelocation: !!search?.open_to_relocation,
          internalCandidate: false,
          launchDate: '',
          targetCloseDate: '',
        },
      }

      const newBrief: IntakeBriefRecord = {
        search_id: searchId,
        firm_id: profile?.firm_id || '',
        created_by: profile?.id || '',
        company_name: research.company_name || companyName,
        company_research: research,
        org_type: orgType as OrgType,
        snapshot,
        questions: data.questions || [],
        jd_signals: data.signals || [],
        job_description_text: withJD ? jdText : null,
        generation_path: withJD ? 'with_jd' : 'without_jd',
        status: 'ready',
      }

      setBrief(newBrief)
      autosave(newBrief)
      setStep('editing')
    } catch (err: any) {
      setGenerationError(err.message || 'Generation failed')
      setStep('path_choice')
    }
  }

  // Regenerate questions on an existing brief — preserves company research,
  // snapshot, role basics, JD, and brief id. Only the questions array and
  // jd_signals are replaced. Custom edits to questions are lost.
  const regenerateBrief = async () => {
    if (!brief) return
    const confirmed = window.confirm(
      'Regenerate this intake brief?\n\nThis will rebuild the questions to include all current sections (Role Basics, Compensation, Timeline, etc.). Your snapshot, notes, and Role Basics will be preserved, but any custom edits or additions to questions will be lost.'
    )
    if (!confirmed) return

    setIsRegenerating(true)
    setGenerationError(null)
    try {
      const res = await fetch('/api/intake-brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: brief.company_name,
          companyResearch: brief.company_research,
          jobDescription: brief.job_description_text,
          orgType: brief.snapshot.orgType || brief.org_type || 'established_private',
          positionTitle: brief.snapshot.roleBasics?.officialTitle || search?.position_title || '',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      updateBrief((prev) => ({
        ...prev,
        questions: data.questions || [],
        jd_signals: data.signals || prev.jd_signals,
      }))
    } catch (err: any) {
      setGenerationError(err.message || 'Regeneration failed')
    } finally {
      setIsRegenerating(false)
    }
  }

  // ─── Question Operations ─────────────────────────────────────────────────

  const updateQuestion = useCallback(
    (questionId: string, updates: Partial<IntakeQuestion>) => {
      updateBrief((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === questionId ? { ...q, ...updates } : q
        ),
      }))
    },
    [updateBrief]
  )

  const deleteQuestion = useCallback(
    (questionId: string) => {
      updateBrief((prev) => ({
        ...prev,
        questions: prev.questions.filter((q) => q.id !== questionId),
      }))
    },
    [updateBrief]
  )

  const addQuestion = useCallback(
    (section: QuestionAttribute) => {
      const newQ: IntakeQuestion = {
        id: `custom_${Date.now()}`,
        section,
        text: '',
        notes: '',
        rationale: null,
        source: 'custom',
        isProbe: false,
        order: (brief?.questions.length || 0) + 1,
      }
      updateBrief((prev) => ({
        ...prev,
        questions: [...prev.questions, newQ],
      }))
      setEditingQuestionId(newQ.id)
    },
    [updateBrief, brief]
  )

  const moveQuestion = useCallback(
    (fromId: string, toId: string) => {
      updateBrief((prev) => {
        const questions = [...prev.questions]
        const fromIdx = questions.findIndex((q) => q.id === fromId)
        const toIdx = questions.findIndex((q) => q.id === toId)
        if (fromIdx === -1 || toIdx === -1) return prev

        // If moving between sections, update the section
        const toSection = questions[toIdx].section
        const moved = { ...questions[fromIdx], section: toSection }
        questions.splice(fromIdx, 1)
        questions.splice(toIdx, 0, moved)

        // Reassign order
        questions.forEach((q, i) => (q.order = i))
        return { ...prev, questions }
      })
    },
    [updateBrief]
  )

  const updateSnapshot = useCallback(
    (field: keyof OrgSnapshot, value: any) => {
      updateBrief((prev) => ({
        ...prev,
        snapshot: { ...prev.snapshot, [field]: value },
        org_type: field === 'orgType' ? value : prev.org_type,
      }))
    },
    [updateBrief]
  )

  const updateSnapshotExtra = useCallback(
    (key: string, value: string) => {
      updateBrief((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          extras: { ...prev.snapshot.extras, [key]: value },
        },
      }))
    },
    [updateBrief]
  )

  const updateRoleBasics = useCallback(
    <K extends keyof RoleBasics>(field: K, value: RoleBasics[K]) => {
      updateBrief((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          roleBasics: {
            officialTitle: '',
            isBackfill: false,
            reportsTo: '',
            numDirectReports: '',
            directReportTitles: [],
            roleLocation: '',
            workArrangement: '',
            openToRelocation: false,
            internalCandidate: false,
            launchDate: '',
            targetCloseDate: '',
            ...prev.snapshot.roleBasics,
            [field]: value,
          },
        },
      }))
    },
    [updateBrief]
  )

  // ─── Derived data ────────────────────────────────────────────────────────

  const questionsBySection = brief
    ? SECTION_ORDER.reduce((acc, section) => {
        const qs = brief.questions
          .filter((q) => q.section === section)
          .sort((a, b) => a.order - b.order)
        if (qs.length > 0) acc[section] = qs
        return acc
      }, {} as Record<QuestionAttribute, IntakeQuestion[]>)
    : ({} as Record<QuestionAttribute, IntakeQuestion[]>)

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  // ─── Step: Start ─────────────────────────────────────────────────────────

  if (step === 'start') {
    return (
      <div className="min-h-screen bg-[#FAF9F7]">
        <Header searchTitle={search?.position_title} companyName={search?.company_name} />
        <div className="max-w-2xl mx-auto px-8 py-12">
          <button
            onClick={() => window.location.href = `/searches/${searchId}/pipeline`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1F3C62] mb-8 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Search Details
          </button>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#1F3C62] mb-2">Start Your Intake Brief</h2>
            <p className="text-[#1F3C62] text-sm">We'll research the company and build a tailored intake conversation guide.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runResearch() }}
                  placeholder="e.g. Stripe, Acme Corp, City of Portland"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#1F3C62]"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">
                    Website <span className="text-[#1F3C62]/60 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="e.g. stripe.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">
                    Location <span className="text-[#1F3C62]/60 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={companyLocation}
                    onChange={(e) => setCompanyLocation(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') runResearch() }}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62]"
                  />
                </div>
              </div>
            </div>
            {researchError && (
              <p className="text-red-500 text-sm mb-4">{researchError}</p>
            )}
            <button
              onClick={() => runResearch()}
              disabled={!companyName.trim()}
              className="w-full bg-[#1F3C62] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#162d4a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Research Company
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step: Researching ───────────────────────────────────────────────────

  if (step === 'researching') {
    return (
      <div className="min-h-screen bg-[#FAF9F7]">
        <Header searchTitle={search?.position_title} companyName={search?.company_name} />
        <div className="max-w-2xl mx-auto px-8 py-16">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-4">
              <svg className="w-6 h-6 text-[#1F3C62] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#1F3C62] mb-1">Researching {companyName}</h3>
            <p className="text-sm text-gray-400">Searching for company info, leadership, news, and context...</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step: Disambiguate ──────────────────────────────────────────────────

  if (step === 'disambiguate' && companyCandidates.length > 0) {
    return (
      <div className="min-h-screen bg-[#FAF9F7]">
        <Header searchTitle={search?.position_title} companyName={search?.company_name} />
        <div className="max-w-2xl mx-auto px-8 py-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-[#1F3C62] mb-1">Which company?</h2>
            <p className="text-sm text-[#1F3C62]">We found multiple companies matching "{companyName}". Select the right one.</p>
          </div>
          <div className="space-y-3">
            {companyCandidates.map((candidate, i) => (
              <button
                key={i}
                onClick={() => confirmCompany(candidate)}
                className="w-full bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-[#1F3C62] hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1F3C62] text-base group-hover:text-[#1F3C62]">{candidate.company_name}</h3>
                    <p className="text-sm text-[#1F3C62] mt-0.5">
                      {[candidate.industry, candidate.headquarters].filter(Boolean).join(' · ')}
                      {candidate.employee_count ? ` · ${candidate.employee_count}` : ''}
                    </p>
                    <p className="text-sm text-[#111111] mt-2 leading-relaxed">{candidate.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-[#1F3C62] flex-shrink-0 mt-1 ml-4 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setStep('start'); setCompanyCandidates([]) }}
            className="mt-6 text-sm text-gray-400 hover:text-[#1F3C62] transition-colors mx-auto block"
          >
            ← Try a different search
          </button>
        </div>
      </div>
    )
  }

  // ─── Step: Path Choice (Position Spec upload or skip) ───────────────────

  const handlePositionSpecUpload = async (file: File) => {
    setPdfError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setPdfError(`Unsupported file type: .${ext}. Please upload a PDF, DOCX, or DOC file.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfError('File too large (max 10MB)')
      return
    }

    setIsExtractingPdf(true)
    setJdFileName(file.name)
    setJdFileExt(ext)

    try {
      // 1. Upload to Supabase storage under the documents bucket.
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

      // 2. Record a documents row (service-role route — bypasses RLS).
      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: searchId,
          name: file.name,
          type: 'position_spec',
          file_url: publicUrl,
        }),
      })
      if (!docRes.ok) {
        const err = await docRes.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to save position spec to documents')
      }

      // 3. Extract text for AI (PDF only — DOCX/DOC land in docs for reference).
      if (ext === 'pdf') {
        const formData = new FormData()
        formData.append('file', file)
        const extractRes = await fetch('/api/intake-brief/extract-pdf', {
          method: 'POST',
          body: formData,
        })
        const data = await extractRes.json()
        if (data.error) throw new Error(data.error)
        setJdText(data.text)
      }
    } catch (err: any) {
      setPdfError(err.message || 'Failed to upload position spec')
      setJdFileName(null)
      setJdFileExt(null)
    } finally {
      setIsExtractingPdf(false)
    }
  }

  if (step === 'path_choice' && research) {
    const hasSpecFile = !!jdFileName
    const hasSpecText = !!jdText.trim()
    const nonPdfNotice = hasSpecFile && jdFileExt && jdFileExt !== 'pdf'

    return (
      <div className="min-h-screen bg-[#FAF9F7]">
        <Header searchTitle={search?.position_title} companyName={search?.company_name} />
        <div className="max-w-3xl mx-auto px-8 py-10">
          {/* Company research card */}
          <CompanyResearchCard research={research} />

          <h2 className="mt-8 mb-3 text-lg font-bold text-[#1F3C62]">Does the client have a position spec?</h2>

          {/* Path choice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Position Spec */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
              <div className="flex-1">
                <h3 className="font-bold text-[#1F3C62] text-base mb-1">Upload Position Spec</h3>
                <p className="text-sm text-[#1F3C62] leading-relaxed mb-4">
                  PDF, DOCX, or DOC. Saved to the search&apos;s documents and analyzed by the AI alongside the company intel.
                </p>

                <div className="mb-2">
                  {/* Upload zone */}
                  {!hasSpecFile && !isExtractingPdf && (
                    <label className="block mb-2 cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 text-center hover:border-[#1F3C62] hover:bg-blue-50/30 transition-colors">
                        <svg className="w-5 h-5 mx-auto mb-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                        </svg>
                        <span className="text-sm font-medium text-[#1F3C62]">Choose file (PDF, DOCX, DOC)</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) await handlePositionSpecUpload(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}

                  {/* Uploading / extracting */}
                  {isExtractingPdf && (
                    <div className="border border-gray-200 rounded-lg px-4 py-3 mb-2 flex items-center gap-3 bg-gray-50">
                      <svg className="w-4 h-4 text-[#1F3C62] animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-600">Uploading {jdFileName}...</span>
                    </div>
                  )}

                  {pdfError && (
                    <p className="text-red-500 text-xs mb-2">{pdfError}</p>
                  )}

                  {/* Uploaded file badge */}
                  {hasSpecFile && !isExtractingPdf && (
                    <div className="mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {jdFileName}
                        <button
                          onClick={() => { setJdText(''); setJdFileName(null); setJdFileExt(null) }}
                          className="ml-1 text-blue-400 hover:text-blue-600"
                        >
                          ✕
                        </button>
                      </div>
                      {nonPdfNotice && (
                        <p className="mt-2 text-xs text-amber-700">
                          Saved to documents. Text extraction isn&apos;t supported for .{jdFileExt} — the AI will generate from company intel only. Upload a PDF for the spec to feed the AI.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => generateBrief(hasSpecText)}
                disabled={!hasSpecFile || isExtractingPdf}
                className="w-full bg-[#1F3C62] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#162d4a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue with Spec
              </button>
            </div>

            {/* Continue without one */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
              <div className="flex-1">
                <h3 className="font-bold text-[#1F3C62] text-base mb-1">Continue without one</h3>
                <p className="text-sm text-[#1F3C62] leading-relaxed mb-4">
                  Generate the intake guide from company intel alone. Common for new engagements where the spec doesn&apos;t exist yet.
                </p>
              </div>
              <button
                onClick={() => generateBrief(false)}
                className="w-full border-2 border-[#1F3C62] text-[#1F3C62] py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
              >
                Continue without Spec
              </button>
            </div>
          </div>

          {generationError && (
            <p className="text-red-500 text-sm mt-4 text-center">{generationError}</p>
          )}
        </div>
      </div>
    )
  }

  // ─── Step: Generating ────────────────────────────────────────────────────

  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-[#FAF9F7]">
        <Header searchTitle={search?.position_title} companyName={search?.company_name} />
        <div className="max-w-2xl mx-auto px-8 py-16">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-4">
              <svg className="w-6 h-6 text-[#1F3C62] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#1F3C62] mb-1">Building Your Intake Brief</h3>
            <p className="text-sm text-gray-400">Selecting and generating tailored questions for {research?.company_name || companyName}...</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step: Editing ───────────────────────────────────────────────────────

  if (step === 'editing' && brief) {
    const orgType = brief.snapshot.orgType

    return (
      <div className="min-h-screen bg-[#FAF9F7]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-widest mb-1">Intake Brief</p>
              <h1 className="text-xl font-bold text-[#1F3C62]">
                {search?.position_title}{search?.company_name ? ` — ${search.company_name}` : ''}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <SaveIndicator status={saveStatus} />
              <button
                onClick={regenerateBrief}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-[#1F3C62] hover:text-[#1F3C62] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rebuild questions to include all current sections"
              >
                {isRegenerating ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                brief.status === 'complete' ? 'bg-green-100 text-green-700' :
                brief.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {brief.status === 'complete' ? 'Complete' : brief.status === 'in_progress' ? 'In Progress' : 'Ready'}
              </span>
            </div>
          </div>
          {generationError && (
            <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {generationError}
            </div>
          )}
          <div className="flex gap-6 mt-5">
            {([
              { id: 'snapshot', label: 'Company & Snapshot' },
              { id: 'questions', label: `Questions (${brief.questions.length})` },
              { id: 'session', label: 'Session Guide' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-[#1F3C62] text-[#1F3C62]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* ─── Tab: Company & Snapshot ─────────────────────────────────── */}
          {activeTab === 'snapshot' && (
            <div className="space-y-8">
              {/* Company research summary */}
              {brief.company_research && (
                <CompanyResearchCard research={brief.company_research} />
              )}

              {/* JD Signals */}
              {brief.jd_signals.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
                    {brief.generation_path === 'with_jd' ? 'What the JD is telling us' : 'What the research tells us'}
                  </p>
                  <ul className="space-y-2">
                    {brief.jd_signals.map((signal, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                        <span className="mt-0.5 text-amber-500 flex-shrink-0">→</span>
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Org Snapshot Form */}
              <section>
                <h2 className="text-sm font-semibold text-[#1F3C62] uppercase tracking-widest mb-4">Organization Snapshot</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">Organization Type</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => updateSnapshot('orgType', type)}
                          className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                            orgType === type ? 'bg-[#1F3C62] text-white border-[#1F3C62]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1F3C62] hover:text-[#1F3C62]'
                          }`}
                        >
                          {ORG_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { field: 'numEmployees', label: 'Number of Employees', placeholder: 'e.g. 50, 200-500' },
                      { field: 'reportingTo', label: 'Reports To', placeholder: 'e.g. CEO, COO' },
                      { field: 'revenueOrBudget', label: 'Revenue / Budget', placeholder: 'e.g. $50M revenue' },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">{label}</label>
                        <input
                          type="text"
                          value={(brief.snapshot as any)[field] || ''}
                          onChange={(e) => updateSnapshot(field as keyof OrgSnapshot, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62]"
                        />
                      </div>
                    ))}
                  </div>
                  {orgType && ORG_TYPE_SNAPSHOT_EXTRAS[orgType] && (
                    <div>
                      <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-3">{ORG_TYPE_LABELS[orgType]} — Additional Context</p>
                      <div className="grid grid-cols-2 gap-4">
                        {ORG_TYPE_SNAPSHOT_EXTRAS[orgType].map((field) => (
                          <div key={field.key}>
                            <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">{field.label}</label>
                            <input
                              type="text"
                              value={brief.snapshot.extras?.[field.key] || ''}
                              onChange={(e) => updateSnapshotExtra(field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider">Notes</label>
                      {brief.snapshot.notes?.trim() && (
                        <button
                          onClick={() => {
                            addQuestion('business_context')
                            // Set the text of the newly added question to the notes content
                            updateBrief((prev) => {
                              const lastQ = prev.questions[prev.questions.length - 1]
                              if (lastQ && lastQ.source === 'custom' && !lastQ.text) {
                                return {
                                  ...prev,
                                  questions: prev.questions.map((q) =>
                                    q.id === lastQ.id ? { ...q, text: brief.snapshot.notes, rationale: 'Added from snapshot notes' } : q
                                  ),
                                }
                              }
                              return prev
                            })
                          }}
                          className="text-xs text-[#1F3C62] font-medium hover:underline"
                        >
                          + Add to intake form
                        </button>
                      )}
                    </div>
                    <textarea
                      value={brief.snapshot.notes || ''}
                      onChange={(e) => updateSnapshot('notes', e.target.value)}
                      placeholder="Anything else the recruiter should know going in — context, hunches, things the client said off the record..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62] resize-none"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ─── Tab: Questions ──────────────────────────────────────────── */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              {/* Role Basics — structured form, always at top */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-[#1F3C62]">
                  <IdCard className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-white text-lg">Role Basics</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Official Title</label>
                      <input
                        type="text"
                        value={brief.snapshot.roleBasics?.officialTitle || ''}
                        onChange={(e) => updateRoleBasics('officialTitle', e.target.value)}
                        placeholder="e.g. VP of Engineering"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Backfill or New Role</label>
                      <div className="flex items-center gap-3 h-[38px]">
                        <button
                          onClick={() => updateRoleBasics('isBackfill', !brief.snapshot.roleBasics?.isBackfill)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${brief.snapshot.roleBasics?.isBackfill ? 'bg-[#1F3C62]' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${brief.snapshot.roleBasics?.isBackfill ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm font-medium text-[#111111]">{brief.snapshot.roleBasics?.isBackfill ? 'Backfill' : 'New role'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Reports To</label>
                    <input
                      type="text"
                      value={brief.snapshot.roleBasics?.reportsTo || ''}
                      onChange={(e) => updateRoleBasics('reportsTo', e.target.value)}
                      placeholder="e.g. Christine Sow, President & CEO"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Number of Direct Reports</label>
                    <input
                      type="text"
                      value={brief.snapshot.roleBasics?.numDirectReports || ''}
                      onChange={(e) => updateRoleBasics('numDirectReports', e.target.value)}
                      placeholder="e.g. 4, 8-10"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Direct Report Titles</label>
                    <div className="space-y-2">
                      {(brief.snapshot.roleBasics?.directReportTitles || []).map((title, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                              const next = [...(brief.snapshot.roleBasics?.directReportTitles || [])]
                              next[i] = e.target.value
                              updateRoleBasics('directReportTitles', next)
                            }}
                            placeholder="e.g. VP of HR"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62]"
                          />
                          <button
                            onClick={() => {
                              const next = (brief.snapshot.roleBasics?.directReportTitles || []).filter((_, idx) => idx !== i)
                              updateRoleBasics('directReportTitles', next)
                            }}
                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const next = [...(brief.snapshot.roleBasics?.directReportTitles || []), '']
                          updateRoleBasics('directReportTitles', next)
                        }}
                        className="text-xs text-[#1F3C62] font-medium hover:underline"
                      >
                        + Add another
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Location of Role</label>
                      <input
                        type="text"
                        value={brief.snapshot.roleBasics?.roleLocation || ''}
                        onChange={(e) => updateRoleBasics('roleLocation', e.target.value)}
                        placeholder="e.g. New York, NY"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Work Arrangement</label>
                      <div className="flex gap-2">
                        {(['remote', 'hybrid', 'onsite'] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => updateRoleBasics('workArrangement', brief.snapshot.roleBasics?.workArrangement === opt ? '' : opt)}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                              brief.snapshot.roleBasics?.workArrangement === opt
                                ? 'bg-[#1F3C62] text-white border-[#1F3C62]'
                                : 'bg-white text-[#111111] border-gray-200 hover:border-[#1F3C62]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Launch Date</label>
                      <input
                        type="date"
                        value={brief.snapshot.roleBasics?.launchDate || ''}
                        onChange={(e) => updateRoleBasics('launchDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-1.5">Target Close Date</label>
                      <input
                        type="date"
                        value={brief.snapshot.roleBasics?.targetCloseDate || ''}
                        onChange={(e) => updateRoleBasics('targetCloseDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!brief.snapshot.roleBasics?.openToRelocation}
                        onChange={(e) => updateRoleBasics('openToRelocation', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#1F3C62] focus:ring-[#1F3C62]"
                      />
                      <span className="text-sm font-medium text-[#111111]">Open to relocation</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!brief.snapshot.roleBasics?.internalCandidate}
                        onChange={(e) => updateRoleBasics('internalCandidate', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#1F3C62] focus:ring-[#1F3C62]"
                      />
                      <span className="text-sm font-medium text-[#111111]">Internal candidate exists</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#1F3C62]">{brief.questions.length} questions · Drag to reorder · Click to edit</p>
              </div>
              {SECTION_ORDER.map((section) => {
                const qs = questionsBySection[section]
                const SectionIcon = SECTION_ICONS[section]
                if (!qs && !brief.questions.some((q) => q.section === section)) {
                  // Show add button for empty sections
                  return (
                    <div key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 bg-[#1F3C62]">
                        <div className="flex items-center gap-3">
                          <SectionIcon className="w-5 h-5 text-white" />
                          <h3 className="font-bold text-white text-lg">{ATTRIBUTE_LABELS[section]}</h3>
                        </div>
                        <button
                          onClick={() => addQuestion(section)}
                          className="text-xs text-white font-medium hover:underline"
                        >
                          + Add question
                        </button>
                      </div>
                    </div>
                  )
                }
                if (!qs) return null
                return (
                  <div key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 bg-[#1F3C62]">
                      <div className="flex items-center gap-3">
                        <SectionIcon className="w-5 h-5 text-white" />
                        <h3 className="font-bold text-white text-lg">{ATTRIBUTE_LABELS[section]}</h3>
                        <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{qs.length}</span>
                      </div>
                      <button
                        onClick={() => addQuestion(section)}
                        className="text-xs text-white font-medium hover:underline"
                      >
                        + Add question
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {qs.map((question) => (
                        <EditableQuestionRow
                          key={question.id}
                          question={question}
                          isEditing={editingQuestionId === question.id}
                          isDraggedOver={dragOverId === question.id}
                          onStartEdit={() => setEditingQuestionId(question.id)}
                          onStopEdit={() => setEditingQuestionId(null)}
                          onUpdate={(updates) => updateQuestion(question.id, updates)}
                          onDelete={() => deleteQuestion(question.id)}
                          onDragStart={() => setDraggedId(question.id)}
                          onDragOver={() => setDragOverId(question.id)}
                          onDragEnd={() => {
                            if (draggedId && dragOverId && draggedId !== dragOverId) {
                              moveQuestion(draggedId, dragOverId)
                            }
                            setDraggedId(null)
                            setDragOverId(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ─── Tab: Session Guide ─────────────────────────────────────── */}
          {activeTab === 'session' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#1F3C62]">Session Guide</h2>
                  <p className="text-sm text-[#1F3C62] mt-0.5">{brief.questions.length} questions · Use during your intake conversation</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      updateBrief((prev) => ({ ...prev, status: prev.status === 'in_progress' ? 'ready' : 'in_progress' }))
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      brief.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {brief.status === 'in_progress' ? 'In Session' : 'Start Session'}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Print
                  </button>
                </div>
              </div>

              {/* Snapshot reference card — what the recruiter sees during the call */}
              {(() => {
                const rb = brief.snapshot.roleBasics
                const reportsToDisplay = rb?.reportsTo || brief.snapshot.reportingTo
                return (
              <div className="bg-[#1F3C62] rounded-xl p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Quick Reference</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  {brief.company_name && (
                    <div>
                      <p className="text-blue-300 text-xs">Company</p>
                      <p className="font-medium">{brief.company_name}</p>
                    </div>
                  )}
                  {rb?.officialTitle && (
                    <div>
                      <p className="text-blue-300 text-xs">Title</p>
                      <p className="font-medium">{rb.officialTitle}</p>
                    </div>
                  )}
                  {rb && (
                    <div>
                      <p className="text-blue-300 text-xs">Role Type</p>
                      <p className="font-medium">{rb.isBackfill ? 'Backfill' : 'New role'}</p>
                    </div>
                  )}
                  {brief.snapshot.orgType && (
                    <div>
                      <p className="text-blue-300 text-xs">Org Type</p>
                      <p className="font-medium">{ORG_TYPE_LABELS[brief.snapshot.orgType]}</p>
                    </div>
                  )}
                  {brief.snapshot.numEmployees && (
                    <div>
                      <p className="text-blue-300 text-xs">Employees</p>
                      <p className="font-medium">{brief.snapshot.numEmployees}</p>
                    </div>
                  )}
                  {reportsToDisplay && (
                    <div>
                      <p className="text-blue-300 text-xs">Reports To</p>
                      <p className="font-medium">{reportsToDisplay}</p>
                    </div>
                  )}
                  {rb?.numDirectReports && (
                    <div>
                      <p className="text-blue-300 text-xs">Direct Reports</p>
                      <p className="font-medium">{rb.numDirectReports}</p>
                    </div>
                  )}
                  {rb?.roleLocation && (
                    <div>
                      <p className="text-blue-300 text-xs">Location</p>
                      <p className="font-medium">{rb.roleLocation}</p>
                    </div>
                  )}
                  {rb?.workArrangement && (
                    <div>
                      <p className="text-blue-300 text-xs">Work Arrangement</p>
                      <p className="font-medium capitalize">{rb.workArrangement}</p>
                    </div>
                  )}
                  {rb?.launchDate && (
                    <div>
                      <p className="text-blue-300 text-xs">Launch Date</p>
                      <p className="font-medium">{rb.launchDate}</p>
                    </div>
                  )}
                  {rb?.targetCloseDate && (
                    <div>
                      <p className="text-blue-300 text-xs">Target Close</p>
                      <p className="font-medium">{rb.targetCloseDate}</p>
                    </div>
                  )}
                  {brief.snapshot.revenueOrBudget && (
                    <div>
                      <p className="text-blue-300 text-xs">Revenue / Budget</p>
                      <p className="font-medium">{brief.snapshot.revenueOrBudget}</p>
                    </div>
                  )}
                  {brief.snapshot.orgType && ORG_TYPE_SNAPSHOT_EXTRAS[brief.snapshot.orgType]?.map((extraField) => {
                    const val = brief.snapshot.extras?.[extraField.key]
                    if (!val) return null
                    return (
                      <div key={extraField.key}>
                        <p className="text-blue-300 text-xs">{extraField.label}</p>
                        <p className="font-medium">{val}</p>
                      </div>
                    )
                  })}
                </div>
                {rb?.directReportTitles && rb.directReportTitles.filter(Boolean).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-blue-300 text-xs mb-1">Direct Report Titles</p>
                    <p className="text-sm text-blue-100 leading-relaxed">{rb.directReportTitles.filter(Boolean).join(' · ')}</p>
                  </div>
                )}
                {rb && (rb.openToRelocation || rb.internalCandidate) && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {rb.openToRelocation && <span className="text-xs bg-white/10 px-2 py-1 rounded">Open to relocation</span>}
                    {rb.internalCandidate && <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-1 rounded">Internal candidate exists</span>}
                  </div>
                )}
                {brief.snapshot.notes && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-blue-300 text-xs mb-1">Notes</p>
                    <p className="text-sm text-blue-100 leading-relaxed whitespace-pre-wrap">{brief.snapshot.notes}</p>
                  </div>
                )}
                {brief.company_research?.description && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-blue-300 text-xs mb-1">Company</p>
                    <p className="text-sm text-blue-100 leading-relaxed">{brief.company_research.description}</p>
                  </div>
                )}
                {brief.company_research && brief.company_research.risks_and_context && brief.company_research.risks_and_context.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-blue-300 text-xs mb-1">Watch For</p>
                    {brief.company_research.risks_and_context.map((r, i) => (
                      <p key={i} className="text-sm text-blue-100">→ {r}</p>
                    ))}
                  </div>
                )}
              </div>
                )
              })()}

              {brief.jd_signals.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Signals to Probe</p>
                  {brief.jd_signals.map((signal, i) => (
                    <p key={i} className="text-sm text-amber-800">→ {signal}</p>
                  ))}
                </div>
              )}

              {/* Questions by section */}
              <div className="space-y-4">
                {SECTION_ORDER.map((section) => {
                  const qs = questionsBySection[section]
                  if (!qs) return null
                  return (
                    <div key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-[#1F3C62] px-6 py-3">
                        <h3 className="text-white text-xs font-semibold uppercase tracking-widest">{ATTRIBUTE_LABELS[section]}</h3>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {qs.map((question, idx) => (
                          <div key={question.id} className="px-6 py-5">
                            <div className="flex items-start gap-4">
                              <span className="text-xs font-mono text-[#1F3C62] mt-0.5 w-4 flex-shrink-0">{idx + 1}</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800 leading-relaxed">{question.text}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  {question.isProbe && <span className="text-xs text-amber-600 font-medium">High signal</span>}
                                  {question.source === 'ai_generated' && <span className="text-xs text-blue-600 font-medium">AI generated</span>}
                                  {question.source === 'custom' && <span className="text-xs text-green-600 font-medium">Custom</span>}
                                </div>
                                {question.rationale && (
                                  <p className="text-xs text-[#1F3C62] mt-1 italic">{question.rationale}</p>
                                )}
                                <div className="mt-3">
                                  <textarea
                                    value={question.notes}
                                    onChange={(e) => updateQuestion(question.id, { notes: e.target.value })}
                                    placeholder="Notes from the conversation..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62] resize-none bg-[#FAF9F7]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mark complete */}
              <div className="flex justify-end">
                <button
                  onClick={() => updateBrief((prev) => ({ ...prev, status: prev.status === 'complete' ? 'ready' : 'complete' }))}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    brief.status === 'complete'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-[#1F3C62] text-white hover:bg-[#162d4a]'
                  }`}
                >
                  {brief.status === 'complete' ? 'Marked Complete' : 'Mark Complete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Header({ searchTitle, companyName }: { searchTitle?: string; companyName?: string }) {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-5">
      <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-widest mb-1">Intake Brief</p>
      <h1 className="text-xl font-bold text-[#1F3C62]">
        {searchTitle || 'New Search'}{companyName ? ` — ${companyName}` : ''}
      </h1>
    </div>
  )
}

function SaveIndicator({ status }: { status: 'saved' | 'saving' | 'error' | null }) {
  if (!status) return null
  return (
    <span className={`text-xs font-medium ${
      status === 'saving' ? 'text-gray-400' :
      status === 'saved' ? 'text-green-500' :
      'text-red-500'
    }`}>
      {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save error'}
    </span>
  )
}

function CompanyResearchCard({ research }: { research: CompanyResearch }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-[#1F3C62] text-lg">{research.company_name}</h3>
            <p className="text-sm text-[#1F3C62]">{[research.industry, research.headquarters].filter(Boolean).join(' · ')}</p>
          </div>
          {research.org_type_signal && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {ORG_TYPE_LABELS[research.org_type_signal as OrgType] || research.org_type_signal}
            </span>
          )}
        </div>
        {research.description && <p className="text-sm text-gray-700 leading-relaxed mb-4">{research.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {research.employee_count && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-[#1F3C62] font-semibold">Employees</p>
              <p className="text-gray-800 font-medium">{research.employee_count}</p>
            </div>
          )}
          {research.revenue_or_budget && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-[#1F3C62] font-semibold">Revenue/Budget</p>
              <p className="text-gray-800 font-medium">{research.revenue_or_budget}</p>
            </div>
          )}
          {research.ownership && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-[#1F3C62] font-semibold">Ownership</p>
              <p className="text-gray-800 font-medium">{research.ownership}</p>
            </div>
          )}
          {research.founded && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-[#1F3C62] font-semibold">Founded</p>
              <p className="text-gray-800 font-medium">{research.founded}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-xs text-[#1F3C62] font-medium hover:underline"
        >
          {expanded ? 'Show less' : 'Show full research'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-6 space-y-4">
          {research.funding && (research.funding.stage || research.funding.total_raised) && (
            <div>
              <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">Funding</p>
              <div className="text-sm text-gray-700 space-y-1">
                {research.funding.stage && <p>Stage: {research.funding.stage}</p>}
                {research.funding.total_raised && <p>Total raised: {research.funding.total_raised}</p>}
                {research.funding.key_investors && <p>Investors: {research.funding.key_investors}</p>}
                {research.funding.last_round && <p>Last round: {research.funding.last_round}</p>}
              </div>
            </div>
          )}
          {research.leadership?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">Leadership</p>
              <div className="space-y-1">
                {research.leadership.map((l, i) => (
                  <p key={i} className="text-sm text-gray-700">{l.name} — {l.title}{l.tenure ? ` (${l.tenure})` : ''}</p>
                ))}
              </div>
            </div>
          )}
          {research.culture_signals?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">Culture Signals</p>
              {research.culture_signals.map((s, i) => (
                <p key={i} className="text-sm text-gray-700">→ {s}</p>
              ))}
            </div>
          )}
          {research.recent_news?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">Recent News</p>
              {research.recent_news.map((n, i) => (
                <p key={i} className="text-sm text-gray-700">→ {n}</p>
              ))}
            </div>
          )}
          {research.risks_and_context?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Risks & Context</p>
              {research.risks_and_context.map((r, i) => (
                <p key={i} className="text-sm text-amber-800">→ {r}</p>
              ))}
            </div>
          )}
          {research.competitors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#1F3C62] uppercase tracking-wider mb-2">Competitors</p>
              <p className="text-sm text-gray-700">{research.competitors.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Editable Question Row ───────────────────────────────────────────────────

interface EditableQuestionRowProps {
  question: IntakeQuestion
  isEditing: boolean
  isDraggedOver: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdate: (updates: Partial<IntakeQuestion>) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
}

function EditableQuestionRow({
  question,
  isEditing,
  isDraggedOver,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: EditableQuestionRowProps) {
  const [localText, setLocalText] = useState(question.text)
  const [localNotes, setLocalNotes] = useState(question.notes)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Sync local state when question changes externally
  useEffect(() => {
    setLocalText(question.text)
    setLocalNotes(question.notes)
  }, [question.text, question.notes])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus()
      textRef.current.setSelectionRange(textRef.current.value.length, textRef.current.value.length)
    }
  }, [isEditing])

  const commitText = () => {
    if (localText !== question.text) {
      onUpdate({ text: localText })
    }
    onStopEdit()
  }

  const commitNotes = () => {
    if (localNotes !== question.notes) {
      onUpdate({ notes: localNotes })
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver()
      }}
      onDragEnd={onDragEnd}
      className={`group px-6 py-4 transition-colors ${
        isDraggedOver ? 'bg-blue-50 border-t-2 border-blue-300' : 'hover:bg-gray-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div className="mt-1.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              ref={textRef}
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  commitText()
                }
                if (e.key === 'Escape') {
                  setLocalText(question.text)
                  onStopEdit()
                }
              }}
              rows={2}
              className="w-full px-3 py-2 border border-[#1F3C62] rounded-lg text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F3C62]/20 resize-none"
            />
          ) : (
            <div onClick={onStartEdit} className="cursor-text">
              <p className="text-sm text-[#111111] leading-relaxed">{question.text || <span className="text-gray-400 italic">Click to add question text...</span>}</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            {question.source === 'library' && <span className="text-xs text-[#1F3C62] font-semibold">Library</span>}
            {question.source === 'ai_generated' && <span className="text-xs text-blue-500 font-medium">AI</span>}
            {question.source === 'custom' && <span className="text-xs text-green-500 font-medium">Custom</span>}
            {question.isProbe && <span className="text-xs text-amber-500 font-medium">probe</span>}
            {question.rationale && !isEditing && (
              <span className="text-xs text-[#1F3C62] italic truncate max-w-md">{question.rationale}</span>
            )}
          </div>

          {/* Notes */}
          {(question.notes || isEditing) && (
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={commitNotes}
              placeholder="Pre-call context or notes..."
              rows={1}
              className="w-full mt-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#1F3C62] resize-none bg-gray-50"
            />
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded hover:bg-red-50"
          title="Delete question"
        >
          <svg className="w-4 h-4 text-red-400 hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
