"use client"

import { useState, useEffect } from "react"
import { Search, Stage, Candidate, Interview, Document, Contact } from "@/types"
import { ClientCandidatePanel } from "@/components/client/client-candidate-panel"
import { supabase } from "@/lib/supabase"
import {
  FileText, BookOpen, ExternalLink, ChevronDown, ChevronUp, Download,
  CalendarClock, Video, PhoneCall, Building2, Users as UsersIcon,
  MapPin, NotebookPen, Target, FolderOpen
} from "lucide-react"

interface ClientDashboardProps {
  search: Search
  stages: Stage[]
  candidates: Candidate[]
  interviews: Interview[]
  documents?: Document[]
  accessLevel: 'full_access' | 'limited_access'
  clientEmail: string
  clientName: string
  contacts?: Contact[]
  portalShowPositionDetails?: boolean
  portalShowContacts?: boolean
  portalShowInterviewPlan?: boolean
  portalShowNotes?: boolean
  hideContextBar?: boolean
}

// Same color progression as recruiter pipeline
const STAGE_HEADERS = [
  '#C8B873', // warm yellow
  '#9BBF8A', // light sage
  '#6DAE6D', // medium green
  '#4E9B52', // stronger green
  '#3A8943', // deep green
  '#2B7535', // rich green
  '#1D6128', // deepest green
]

const getStageColors = (index: number, total: number) => {
  if (total <= 1) return { header: STAGE_HEADERS[0], bg: '#FFFFFF' }
  const scaled = (index / (total - 1)) * (STAGE_HEADERS.length - 1)
  const i = Math.min(Math.round(scaled), STAGE_HEADERS.length - 1)
  return { header: STAGE_HEADERS[i], bg: '#FFFFFF' }
}

const getFormatLabel = (format: string | undefined) => {
  if (!format) return null
  switch (format.toLowerCase()) {
    case 'video': return 'Video'
    case 'phone': return 'Phone'
    case 'in_person': case 'in-person': return 'In Person'
    case 'onsite': return 'Onsite'
    default: return format
  }
}

const getFormatIcon = (format: string | undefined) => {
  if (!format) return null
  switch (format.toLowerCase()) {
    case 'video': return <Video className="w-3 h-3" />
    case 'phone': return <PhoneCall className="w-3 h-3" />
    case 'in_person': case 'in-person': case 'onsite': return <Building2 className="w-3 h-3" />
    default: return null
  }
}

interface StageInterviewer {
  id: string
  name: string
  title?: string
  email?: string
}

export function ClientDashboard({
  search,
  stages,
  candidates,
  interviews,
  documents = [],
  accessLevel,
  clientEmail,
  clientName,
  contacts = [],
  portalShowPositionDetails = true,
  portalShowContacts = false,
  portalShowInterviewPlan = true,
  portalShowNotes = false,
  hideContextBar = false,
}: ClientDashboardProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [showCandidatePanel, setShowCandidatePanel] = useState(false)
  const [selectedCandidateStage, setSelectedCandidateStage] = useState<Stage | null>(null)
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
  const [interviewPlanExpanded, setInterviewPlanExpanded] = useState(false)
  const [stageInterviewers, setStageInterviewers] = useState<Record<string, StageInterviewer[]>>({})
  const [latestActivities, setLatestActivities] = useState<Record<string, { content: string; author_name?: string; created_at: string }>>({})

  // Load interviewers per stage and latest activities
  useEffect(() => {
    loadStageInterviewers()
    loadLatestActivities()
  }, [search.id, stages])

  const loadStageInterviewers = async () => {
    // Load contact_stages junction + contact details
    const stageIds = stages.map(s => s.id)
    if (stageIds.length === 0) return

    try {
      const { data } = await supabase
        .from('contact_stages')
        .select('stage_id, contact_id, contacts(id, name, title, email)')
        .in('stage_id', stageIds)

      if (data) {
        const map: Record<string, StageInterviewer[]> = {}
        for (const row of data as any[]) {
          const sid = row.stage_id
          if (!map[sid]) map[sid] = []
          if (row.contacts) {
            map[sid].push({
              id: row.contacts.id,
              name: row.contacts.name,
              title: row.contacts.title || undefined,
              email: row.contacts.email || undefined,
            })
          }
        }
        setStageInterviewers(map)
      }
    } catch (err) {
      console.error('Error loading stage interviewers:', err)
      // Fallback: try to build from stages with interviewer_ids
      const map: Record<string, StageInterviewer[]> = {}
      for (const stage of stages as any[]) {
        const ids = stage.interviewer_ids || (stage.interviewer_contact_id ? [stage.interviewer_contact_id] : [])
        if (ids.length > 0) {
          map[stage.id] = ids.map((id: string) => {
            const contact = contacts.find(c => c.id === id)
            return contact ? { id, name: contact.name, title: contact.title, email: contact.email } : { id, name: 'Unknown' }
          }).filter((i: StageInterviewer) => i.name !== 'Unknown')
        }
      }
      setStageInterviewers(map)
    }
  }

  const loadLatestActivities = async () => {
    try {
      const { data } = await supabase
        .from('candidate_activity')
        .select('candidate_id, content, author_name, created_at')
        .eq('search_id', search.id)
        .eq('activity_type', 'note')
        .order('created_at', { ascending: false })

      if (data) {
        const map: Record<string, { content: string; author_name?: string; created_at: string }> = {}
        for (const act of data) {
          if (!map[act.candidate_id]) {
            map[act.candidate_id] = { content: act.content, author_name: act.author_name, created_at: act.created_at }
          }
        }
        setLatestActivities(map)
      }
    } catch (err) {
      console.error('Error loading activities:', err)
    }
  }

  // Filter to only active candidates (exclude archived, declined, withdrew)
  const activeCandidates = candidates.filter(c =>
    !c.status || c.status === 'active'
  )

  // Only show documents marked visible in client portal
  const portalDocs = documents.filter(doc => doc.visible_to_portal)

  // Position Spec: only show when status is Final (approved) AND visible_to_portal
  const positionSpec = search.position_spec_status === 'approved'
    ? portalDocs.find(doc => doc.type === 'position_spec' || doc.type === 'job_description')
    : null

  // Interview guides from search documents (portal-visible only)
  const interviewGuides = portalDocs.filter(doc => doc.type === 'interview_guide')

  // Other documents the recruiter has uploaded (portal-visible only)
  const otherDocs = portalDocs.filter(doc =>
    doc.type !== 'position_spec' && doc.type !== 'job_description' && doc.type !== 'interview_guide'
  )

  // Get interviewer display name — show "You" if this is the logged-in client
  const getInterviewerDisplayName = (interviewer: StageInterviewer) => {
    if (interviewer.email && interviewer.email.toLowerCase() === clientEmail.toLowerCase()) {
      return 'You'
    }
    return interviewer.name
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      <div className="flex-1 px-6 sm:px-10 py-5">

        {/* Compact context bar — logo, position info, resources (hidden when parent renders its own) */}
        {!hideContextBar && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-5 pb-4 border-b border-ds-border text-sm">
            {/* Company logo / name */}
            {search.client_logo_url ? (
              <img
                src={search.client_logo_url}
                alt={search.company_name}
                className="h-7 max-w-[120px] object-contain flex-shrink-0"
              />
            ) : (
              <span className="font-bold text-navy flex-shrink-0">{search.company_name}</span>
            )}

            <span className="text-ds-border select-none">|</span>
            <span className="font-semibold text-navy">{search.position_title}</span>

            {portalShowPositionDetails && search.reports_to && (
              <>
                <span className="text-ds-border select-none">|</span>
                <span className="text-text-secondary">
                  <span className="font-semibold text-navy">Reports To:</span> {search.reports_to}
                </span>
              </>
            )}

            {portalShowPositionDetails && search.position_location && (
              <>
                <span className="text-ds-border select-none">|</span>
                <span className="text-text-secondary inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {search.position_location}
                </span>
              </>
            )}

            {/* Resources — inline links */}
            {(positionSpec || interviewGuides.length > 0 || otherDocs.length > 0) && (
              <>
                <span className="text-ds-border select-none">|</span>
                <span className="font-semibold text-navy">Resources:</span>
                {positionSpec && (
                  <a
                    href={positionSpec.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-navy hover:text-orange transition-colors font-medium"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Position Spec
                    <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                  </a>
                )}
                {interviewGuides.map(guide => (
                  <a
                    key={guide.id}
                    href={guide.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-navy hover:text-orange transition-colors font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {guide.name || 'Interview Guide'}
                    <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                  </a>
                ))}
                {otherDocs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-navy hover:text-orange transition-colors font-medium"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {doc.name}
                    <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                  </a>
                ))}
              </>
            )}
          </div>
        )}

        {portalShowContacts && contacts.length > 0 && (
          <div className="mb-5 rounded-lg border border-ds-border bg-white overflow-hidden">
            <div className="px-5 py-2.5 bg-navy flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">Client Contacts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ds-border bg-[#FAFAFA]">
                    <th className="px-2 sm:px-4 py-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Name</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Title</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Email</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(contact => (
                    <tr key={contact.id} className="border-b border-ds-border last:border-b-0">
                      <td className="px-2 sm:px-4 py-2 text-text-primary font-medium">{contact.name}</td>
                      <td className="px-2 sm:px-4 py-2 text-text-secondary">{contact.title || '—'}</td>
                      <td className="px-2 sm:px-4 py-2 text-text-secondary">{contact.email}</td>
                      <td className="px-2 sm:px-4 py-2 text-text-secondary">{contact.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {portalShowNotes && search.notes && (
          <div className="mb-5 rounded-lg border border-ds-border bg-white overflow-hidden">
            <div className="px-5 py-2.5 bg-navy flex items-center gap-2">
              <NotebookPen className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">Notes</h3>
            </div>
            <div className="px-5 py-4 text-sm text-text-primary whitespace-pre-wrap">
              {search.notes}
            </div>
          </div>
        )}

        {/* Documents — all visible search documents as downloadable links */}
        {(positionSpec || interviewGuides.length > 0 || otherDocs.length > 0) && (
          <div className="mb-5 rounded-lg border border-ds-border bg-white overflow-hidden">
            <div className="px-5 py-2.5 bg-navy flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">Documents</h3>
            </div>
            <div className="px-5 py-3 space-y-2">
              {positionSpec && (
                <div className="flex items-center justify-between">
                  <a
                    href={positionSpec.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-orange transition-colors"
                  >
                    <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                    Position Spec
                    <ExternalLink className="w-3 h-3 opacity-40" />
                  </a>
                  <a
                    href={positionSpec.file_url}
                    download
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-navy transition-colors rounded hover:bg-bg-section"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {interviewGuides.map(guide => (
                <div key={guide.id} className="flex items-center justify-between">
                  <a
                    href={guide.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-orange transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-text-muted flex-shrink-0" />
                    {guide.name || 'Interview Guide'}
                    <ExternalLink className="w-3 h-3 opacity-40" />
                  </a>
                  <a
                    href={guide.file_url}
                    download
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-navy transition-colors rounded hover:bg-bg-section"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
              {otherDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-orange transition-colors"
                  >
                    <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                    {doc.name}
                    <ExternalLink className="w-3 h-3 opacity-40" />
                  </a>
                  <a
                    href={doc.file_url}
                    download
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-navy transition-colors rounded hover:bg-bg-section"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interview Plan — collapsible, collapsed by default */}
        {portalShowInterviewPlan && stages.length > 0 && (
          <div className="mb-5 rounded-lg border border-ds-border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setInterviewPlanExpanded(prev => !prev)}
              className="w-full px-5 py-2.5 bg-[#64748B] flex items-center justify-between rounded-t-lg"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white">Interview Plan</h3>
                <span className="text-xs text-white/60">({stages.length} stages)</span>
              </div>
              {interviewPlanExpanded
                ? <ChevronUp className="w-4 h-4 text-white/70" />
                : <ChevronDown className="w-4 h-4 text-white/70" />
              }
            </button>

            {interviewPlanExpanded && (
              <div>
                {/* Table header */}
                <div className="grid grid-cols-[28px_1fr] sm:grid-cols-[28px_1fr_0.7fr_0.8fr] gap-2 px-3 sm:px-4 py-2 border-b border-ds-border bg-[#FAFAFA]">
                  <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">#</span>
                  <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Stage</span>
                  <span className="hidden sm:block text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Format</span>
                  <span className="hidden sm:block text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Panelists</span>
                </div>
                {/* Stage rows */}
                {stages.map((stage, index) => {
                  const stageData = stage as any
                  const format = stageData.interview_format || stageData.format
                  const formatLabel = getFormatLabel(format)
                  const panelMembers = stageInterviewers[stage.id] || []

                  return (
                    <div
                      key={stage.id}
                      className="grid grid-cols-[28px_1fr] sm:grid-cols-[28px_1fr_0.7fr_0.8fr] gap-2 px-3 sm:px-4 py-2 border-b border-ds-border last:border-b-0 items-center"
                    >
                      <span className="text-sm font-medium text-text-secondary">{index + 1}</span>
                      <span className="text-sm font-medium text-text-primary truncate">{stage.name}</span>
                      <span className="hidden sm:block text-sm text-text-secondary">{formatLabel || '—'}</span>
                      <div className="hidden sm:block text-sm text-text-secondary">
                        {panelMembers.length === 0 ? (
                          <span>—</span>
                        ) : (
                          <span className="truncate block">
                            {panelMembers.map(m => getInterviewerDisplayName(m)).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Kanban Pipeline — full width */}
        <div className="mb-6">
          {activeCandidates.length === 0 ? (
            <div className="bg-white rounded-xl border border-ds-border p-8 sm:p-16 text-center">
              <p className="text-text-muted text-base">No active candidates yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div
                className="grid gap-4 min-w-max"
                style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))` }}
              >
                {stages.map((stage, index) => {
                  const stageCandidates = activeCandidates.filter(c => c.stage_id === stage.id)
                  const colors = getStageColors(index, stages.length)
                  const stageData = stage as any
                  const format = stageData.interview_format || stageData.format
                  const formatLabel = getFormatLabel(format)
                  const formatIcon = getFormatIcon(format)
                  const panelMembers = stageInterviewers[stage.id] || []
                  const isExpanded = expandedStageId === stage.id

                  return (
                    <div key={stage.id} className="rounded-xl border border-ds-border shadow-sm min-w-[220px] bg-white">
                      {/* Column header — colored */}
                      <div
                        className="rounded-t-xl px-4 py-3 flex items-center gap-2"
                        style={{ backgroundColor: colors.header }}
                      >
                        <span className="font-bold text-white text-sm flex-1 truncate">{stage.name}</span>
                        {formatLabel && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/80 bg-white/15 rounded px-1.5 py-0.5">
                            {formatIcon}
                            {formatLabel}
                          </span>
                        )}
                        <span className="text-xs text-white/80 bg-white/15 rounded-full px-2 py-0.5 font-medium">
                          {stageCandidates.length}
                        </span>
                        {/* Panel dropdown arrow */}
                        {portalShowInterviewPlan && panelMembers.length > 0 && (
                          <button
                            onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                            className="p-0.5 rounded hover:bg-white/20 text-white/80 transition-colors"
                            title="View interview panel"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Expanded interview panel */}
                      {isExpanded && panelMembers.length > 0 && (
                        <div className="px-3 py-2 bg-bg-section border-b border-ds-border">
                          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                            <UsersIcon className="w-3 h-3 inline mr-1" />
                            Interview Panel
                          </p>
                          <div className="space-y-1">
                            {panelMembers.map(member => (
                              <div key={member.id} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[9px] font-bold text-navy">
                                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-navy truncate">
                                    {getInterviewerDisplayName(member)}
                                  </p>
                                  {member.title && (
                                    <p className="text-[10px] text-text-muted truncate">{member.title}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Candidate cards */}
                      <div className="p-3 space-y-2.5 min-h-[100px]">
                        {stageCandidates.length === 0 ? (
                          <p className="text-sm text-text-muted text-center py-6">No candidates</p>
                        ) : (
                          stageCandidates.map(candidate => {
                            const cand = candidate as any
                            const nextUpDate = cand.next_up_date
                            const nextUpStageId = cand.next_up_stage_id
                            const nextUpStageName = nextUpStageId
                              ? stages.find(s => s.id === nextUpStageId)?.name
                              : null
                            const latestNote = latestActivities[candidate.id]

                            return (
                              <button
                                key={candidate.id}
                                onClick={() => {
                                  setSelectedCandidate(candidate)
                                  setSelectedCandidateStage(stage)
                                  setShowCandidatePanel(true)
                                }}
                                className="w-full text-left border border-ds-border rounded-lg p-3 sm:p-3.5 hover:border-navy hover:shadow-md transition-all cursor-pointer bg-white"
                              >
                                <p className="font-bold text-sm text-navy truncate">
                                  {candidate.first_name} {candidate.last_name}
                                </p>
                                {(candidate.current_title || candidate.current_company) && (
                                  <p className="text-xs text-text-muted truncate mt-0.5">
                                    {candidate.current_title}
                                    {candidate.current_title && candidate.current_company && ' at '}
                                    {candidate.current_company}
                                  </p>
                                )}
                                {/* Next Up */}
                                {nextUpDate && (
                                  <div className="flex items-center gap-1 mt-1.5">
                                    <CalendarClock className="w-3 h-3 text-orange flex-shrink-0" />
                                    <span className="text-[11px] font-semibold text-orange truncate">
                                      {nextUpStageName && `${nextUpStageName} — `}
                                      {new Date(nextUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {(() => { const t = new Date(nextUpDate); return t.getHours() || t.getMinutes() ? ` at ${t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '' })()}
                                    </span>
                                  </div>
                                )}
                                {/* Latest activity note */}
                                {latestNote && latestNote.content && (
                                  <p className="text-[11px] text-text-secondary line-clamp-1 mt-1">
                                    {latestNote.content}
                                  </p>
                                )}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-ds-border py-6 mt-auto">
        <div className="text-center">
          <p className="text-xs text-text-muted">
            Powered by{" "}
            <a
              href="https://atalentconnect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              @talentconnect
            </a>
          </p>
        </div>
      </footer>

      {/* Candidate Detail Panel */}
      <ClientCandidatePanel
        candidate={selectedCandidate}
        isOpen={showCandidatePanel}
        onClose={() => {
          setShowCandidatePanel(false)
          setSelectedCandidate(null)
          setSelectedCandidateStage(null)
          // Reload activities when panel closes (may have new notes)
          loadLatestActivities()
        }}
        accessLevel={accessLevel}
        clientEmail={clientEmail}
        clientName={clientName}
        searchId={search.id}
        currentStage={selectedCandidateStage}
        documents={documents}
        stages={stages}
        interviews={interviews}
        contacts={contacts}
      />
    </div>
  )
}
