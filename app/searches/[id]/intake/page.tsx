'use client'

import { useState } from 'react'
import {
  getQuestionsForOrgType,
  OrgType,
  QuestionAttribute,
  IntakeQuestion,
  ORG_TYPE_LABELS,
  ATTRIBUTE_LABELS,
} from '@/lib/intake-questions'

interface OrgSnapshot {
  orgType: OrgType | null
  numEmployees: string
  numDirectReports: string
  revenueOrBudget: string
  reportingTo: string
  isBackfill: boolean
  backfillReason: string
  snapshotExtras: Record<string, string>
}

interface IntakeBriefData {
  snapshot: OrgSnapshot
  selectedQuestionIds: string[]
  questionNotes: Record<string, string>
  aiRecommendedIds: string[]
  aiRationale: Record<string, string>
  jdSignals: string[]
  status: 'draft' | 'in_progress' | 'complete'
}

interface IntakeBriefProps {
  searchId: string
  searchTitle: string
  jobDescription?: string
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

export default function IntakeBrief({ searchId, searchTitle, jobDescription }: IntakeBriefProps) {
  const [data, setData] = useState<IntakeBriefData>({
    snapshot: {
      orgType: null,
      numEmployees: '',
      numDirectReports: '',
      revenueOrBudget: '',
      reportingTo: '',
      isBackfill: false,
      backfillReason: '',
      snapshotExtras: {},
    },
    selectedQuestionIds: [],
    questionNotes: {},
    aiRecommendedIds: [],
    aiRationale: {},
    jdSignals: [],
    status: 'draft',
  })

  const [expandedAttributes, setExpandedAttributes] = useState<Set<QuestionAttribute>>(
    new Set(['decision_making', 'failure_pattern'])
  )
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'setup' | 'questions' | 'session'>('setup')

  const orgType = data.snapshot.orgType
  const questionPool = orgType ? getQuestionsForOrgType(orgType) : []

  const questionsByAttribute = Object.keys(ATTRIBUTE_LABELS).reduce((acc, attr) => {
    const attribute = attr as QuestionAttribute
    const questions = questionPool.filter((q) => q.attribute === attribute)
    if (questions.length > 0) acc[attribute] = questions
    return acc
  }, {} as Record<QuestionAttribute, IntakeQuestion[]>)

  const isSelected = (id: string) => data.selectedQuestionIds.includes(id)
  const isAIRecommended = (id: string) => data.aiRecommendedIds.includes(id)

  const toggleQuestion = (id: string) => {
    setData((prev) => ({
      ...prev,
      selectedQuestionIds: prev.selectedQuestionIds.includes(id)
        ? prev.selectedQuestionIds.filter((qId) => qId !== id)
        : [...prev.selectedQuestionIds, id],
    }))
  }

  const toggleAttribute = (attr: QuestionAttribute) => {
    setExpandedAttributes((prev) => {
      const next = new Set(prev)
      next.has(attr) ? next.delete(attr) : next.add(attr)
      return next
    })
  }

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateNote = (id: string, note: string) => {
    setData((prev) => ({
      ...prev,
      questionNotes: { ...prev.questionNotes, [id]: note },
    }))
  }

  const updateSnapshot = (field: keyof OrgSnapshot, value: any) => {
    setData((prev) => ({
      ...prev,
      snapshot: { ...prev.snapshot, [field]: value },
    }))
  }

  const updateSnapshotExtra = (key: string, value: string) => {
    setData((prev) => ({
      ...prev,
      snapshot: {
        ...prev.snapshot,
        snapshotExtras: { ...prev.snapshot.snapshotExtras, [key]: value },
      },
    }))
  }

  const generateRecommendations = async () => {
    if (!orgType) return
    setIsGenerating(true)
    try {
      const response = await fetch('/api/intake-brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription || null,
          orgType,
          searchContext: searchTitle,
        }),
      })
      const result = await response.json()
      if (result.recommendedIds) {
        setData((prev) => ({
          ...prev,
          aiRecommendedIds: result.recommendedIds,
          aiRationale: result.rationale || {},
          jdSignals: result.jdSignals || [],
          selectedQuestionIds: result.recommendedIds,
        }))
        setActiveTab('questions')
      }
    } catch (err) {
      console.error('Failed to generate recommendations:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedQuestions = data.selectedQuestionIds
    .map((id) => questionPool.find((q) => q.id === id))
    .filter(Boolean) as IntakeQuestion[]

  const selectedByAttribute = Object.keys(ATTRIBUTE_LABELS).reduce((acc, attr) => {
    const attribute = attr as QuestionAttribute
    const questions = selectedQuestions.filter((q) => q.attribute === attribute)
    if (questions.length > 0) acc[attribute] = questions
    return acc
  }, {} as Record<QuestionAttribute, IntakeQuestion[]>)

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Intake Brief</p>
            <h1 className="text-xl font-bold text-[#1F3C62]">{searchTitle}</h1>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            data.status === 'complete' ? 'bg-green-100 text-green-700' :
            data.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {data.status === 'complete' ? 'Complete' : data.status === 'in_progress' ? 'In Progress' : 'Draft'}
          </span>
        </div>
        <div className="flex gap-6 mt-5">
          {[
            { id: 'setup', label: 'Setup' },
            { id: 'questions', label: `Questions${data.selectedQuestionIds.length > 0 ? ` (${data.selectedQuestionIds.length})` : ''}` },
            { id: 'session', label: 'Session Guide' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-[#1F3C62] text-[#1F3C62]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {activeTab === 'setup' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-semibold text-[#1F3C62] uppercase tracking-widest mb-4">Organization Snapshot</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Organization Type</label>
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
                    { field: 'numDirectReports', label: 'Direct Reports to This Role', placeholder: 'e.g. 4, 8-10' },
                    { field: 'reportingTo', label: 'Reports To', placeholder: 'e.g. CEO, COO' },
                    { field: 'revenueOrBudget', label: 'Revenue / Budget', placeholder: 'e.g. $50M revenue' },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                      <input
                        type="text"
                        value={(data.snapshot as any)[field]}
                        onChange={(e) => updateSnapshot(field as keyof OrgSnapshot, e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62]"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => updateSnapshot('isBackfill', !data.snapshot.isBackfill)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${data.snapshot.isBackfill ? 'bg-[#1F3C62]' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${data.snapshot.isBackfill ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <label className="text-sm font-medium text-gray-700">This is a backfill</label>
                  </div>
                  {data.snapshot.isBackfill && (
                    <textarea
                      value={data.snapshot.backfillReason}
                      onChange={(e) => updateSnapshot('backfillReason', e.target.value)}
                      placeholder="What happened to the last person — the real story"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62] resize-none mt-2"
                    />
                  )}
                </div>
                {orgType && ORG_TYPE_SNAPSHOT_EXTRAS[orgType] && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{ORG_TYPE_LABELS[orgType]} — Additional Context</p>
                    <div className="grid grid-cols-2 gap-4">
                      {ORG_TYPE_SNAPSHOT_EXTRAS[orgType].map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                          <input
                            type="text"
                            value={data.snapshot.snapshotExtras[field.key] || ''}
                            onChange={(e) => updateSnapshotExtra(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
            {orgType && (
              <section>
                <div className="bg-[#1F3C62] rounded-xl p-6 text-white">
                  <h3 className="font-semibold text-base mb-1">{jobDescription ? 'Build your question guide from the JD' : 'Build your question guide'}</h3>
                  <p className="text-sm text-blue-200 leading-relaxed">
                    {jobDescription ? "The AI reads the JD and recommends which questions will surface what it's not saying." : 'Browse the full question library and select what matters for this search.'}
                  </p>
                  <div className="flex gap-3 mt-4">
                    {jobDescription && (
                      <button onClick={generateRecommendations} disabled={isGenerating} className="bg-white text-[#1F3C62] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60">
                        {isGenerating ? 'Reading the JD...' : 'Generate Question Guide'}
                      </button>
                    )}
                    <button onClick={() => setActiveTab('questions')} className="border border-white/30 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                      Browse Question Library
                    </button>
                  </div>
                </div>
                {data.jdSignals.length > 0 && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">What the JD is telling us</p>
                    <ul className="space-y-2">
                      {data.jdSignals.map((signal, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                          <span className="mt-0.5 text-amber-500">→</span>
                          {signal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
            {orgType && (
              <div className="flex justify-end">
                <button onClick={() => setActiveTab('questions')} className="bg-[#1F3C62] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#162d4a] transition-colors">
                  Review Questions →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-6">
            {!orgType && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
                Select an organization type in Setup to see relevant questions.
              </div>
            )}
            {orgType && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{data.selectedQuestionIds.length} questions selected</span>
                  {data.aiRecommendedIds.length > 0 && (
                    <button onClick={() => setData(prev => ({ ...prev, selectedQuestionIds: [...new Set([...prev.selectedQuestionIds, ...prev.aiRecommendedIds])] }))} className="text-xs text-[#1F3C62] font-medium hover:underline">
                      Select all AI recommendations
                    </button>
                  )}
                </div>
                {data.aiRecommendedIds.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
                    <span className="text-sm text-blue-800"><span className="font-semibold">{data.aiRecommendedIds.length} questions recommended</span> based on the JD — highlighted below</span>
                  </div>
                )}
                <div className="space-y-3">
                  {(Object.keys(questionsByAttribute) as QuestionAttribute[]).map((attribute) => {
                    const questions = questionsByAttribute[attribute]
                    const selectedCount = questions.filter((q) => isSelected(q.id)).length
                    const isExpanded = expandedAttributes.has(attribute)
                    return (
                      <div key={attribute} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <button onClick={() => toggleAttribute(attribute)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-[#1F3C62] text-sm">{ATTRIBUTE_LABELS[attribute]}</span>
                            {selectedCount > 0 && <span className="bg-[#1F3C62] text-white text-xs px-2 py-0.5 rounded-full">{selectedCount}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{questions.length} questions</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-100 divide-y divide-gray-50">
                            {questions.map((question) => (
                              <QuestionRow
                                key={question.id}
                                question={question}
                                isSelected={isSelected(question.id)}
                                isRecommended={isAIRecommended(question.id)}
                                rationale={data.aiRationale[question.id]}
                                note={data.questionNotes[question.id] || ''}
                                noteExpanded={expandedNotes.has(question.id)}
                                onToggle={() => toggleQuestion(question.id)}
                                onToggleNote={() => toggleNote(question.id)}
                                onUpdateNote={(note) => updateNote(question.id, note)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {data.selectedQuestionIds.length > 0 && (
                  <div className="flex justify-end">
                    <button onClick={() => setActiveTab('session')} className="bg-[#1F3C62] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#162d4a] transition-colors">
                      Open Session Guide →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'session' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1F3C62]">Session Guide</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedQuestions.length} questions · Use during your intake conversation</p>
              </div>
              <button onClick={() => window.print()} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Print Guide</button>
            </div>
            {selectedQuestions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">No questions selected. <button onClick={() => setActiveTab('questions')} className="text-[#1F3C62] font-medium hover:underline">Go to Questions →</button></p>
              </div>
            ) : (
              <div className="space-y-4">
                {(Object.keys(selectedByAttribute) as QuestionAttribute[]).map((attribute) => (
                  <div key={attribute} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-[#1F3C62] px-6 py-3">
                      <h3 className="text-white text-xs font-semibold uppercase tracking-widest">{ATTRIBUTE_LABELS[attribute]}</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedByAttribute[attribute].map((question, idx) => (
                        <div key={question.id} className="px-6 py-5">
                          <div className="flex items-start gap-4">
                            <span className="text-xs font-mono text-gray-300 mt-0.5 w-4 flex-shrink-0">{idx + 1}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 leading-relaxed">{question.text}</p>
                              {question.isProbe && <span className="inline-block mt-1.5 text-xs text-amber-600 font-medium">High signal</span>}
                              <div className="mt-3">
                                {!expandedNotes.has(question.id) && !data.questionNotes[question.id] ? (
                                  <button onClick={() => toggleNote(question.id)} className="text-xs text-gray-400 hover:text-[#1F3C62] transition-colors">+ Add notes</button>
                                ) : (
                                  <textarea
                                    value={data.questionNotes[question.id] || ''}
                                    onChange={(e) => updateNote(question.id, e.target.value)}
                                    placeholder="Notes from the conversation..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F3C62] resize-none bg-[#FAF9F7]"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface QuestionRowProps {
  question: IntakeQuestion
  isSelected: boolean
  isRecommended: boolean
  rationale?: string
  note: string
  noteExpanded: boolean
  onToggle: () => void
  onToggleNote: () => void
  onUpdateNote: (note: string) => void
}

function QuestionRow({ question, isSelected, isRecommended, rationale, note, noteExpanded, onToggle, onToggleNote, onUpdateNote }: QuestionRowProps) {
  return (
    <div className={`px-6 py-4 transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>
      <div className="flex items-start gap-4">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#1F3C62] border-[#1F3C62]' : 'border-gray-300 hover:border-[#1F3C62]'}`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-800 leading-relaxed">{question.text}</p>
            {isRecommended && <span className="flex-shrink-0 mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">AI</span>}
            {question.isProbe && <span className="flex-shrink-0 mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">probe</span>}
          </div>
          {rationale && <p className="text-xs text-blue-600 mt-1.5 leading-relaxed">{rationale}</p>}
          {isSelected && (
            <div className="mt-2">
              {!noteExpanded && !note ? (
                <button onClick={onToggleNote} className="text-xs text-gray-400 hover:text-[#1F3C62] transition-colors">+ Notes</button>
              ) : (
                <textarea
                  value={note}
                  onChange={(e) => onUpdateNote(e.target.value)}
                  placeholder="Pre-call context or reminders..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#1F3C62] resize-none bg-white"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}