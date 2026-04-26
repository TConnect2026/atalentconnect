"use client"

import { useState, useEffect, useRef } from "react"
import { Candidate, Stage, Interview, Document, CandidateAttachment, Contact } from "@/types"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { CandidateStageTimeline, TimelineStage } from "@/components/pipeline/candidate-stage-timeline"
import {
  X, FileText, ExternalLink, Linkedin, Send, ThumbsUp, ThumbsDown,
  HelpCircle, CalendarClock, MessageSquare, Paperclip
} from "lucide-react"

// Same stage colors as kanban
const STAGE_HEADERS = [
  '#C8B873', '#9BBF8A', '#6DAE6D', '#4E9B52', '#3A8943', '#2B7535', '#1D6128',
]
const getStageColor = (index: number, total: number) => {
  if (total <= 1) return STAGE_HEADERS[0]
  const scaled = (index / (total - 1)) * (STAGE_HEADERS.length - 1)
  return STAGE_HEADERS[Math.min(Math.round(scaled), STAGE_HEADERS.length - 1)]
}

interface ClientFeedback {
  id: string
  reviewer_name: string
  reviewer_email: string
  recommendation: 'advance' | 'hold' | 'concern'
  notes: string | null
  feedback_file_url: string | null
  created_at: string
}

interface PanelistFeedbackItem {
  id: string
  panelist_name: string
  panelist_email: string
  rating: 'thumbs_up' | 'thumbs_down' | 'maybe'
  recommendation: 'advance' | 'do_not_advance' | 'need_more_info'
  comments: string | null
  submitted_at: string
}

interface ActivityItem {
  id: string
  activity_type: string
  content?: string | null
  author_name?: string | null
  visibility_level?: string | null
  created_at: string
}

interface ClientCandidatePanelProps {
  candidate: Candidate | null
  isOpen: boolean
  onClose: () => void
  accessLevel: 'full_access' | 'limited_access'
  clientEmail: string
  clientName: string
  searchId: string
  currentStage?: Stage | null
  documents?: Document[]
  stages?: Stage[]
  interviews?: Interview[]
  contacts?: Contact[]
}

export function ClientCandidatePanel({
  candidate,
  isOpen,
  onClose,
  accessLevel,
  clientEmail,
  clientName,
  searchId,
  currentStage,
  documents = [],
  stages = [],
  interviews = [],
  contacts = [],
}: ClientCandidatePanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'activity' | 'docs' | 'feedback'>('summary')
  const [previousFeedback, setPreviousFeedback] = useState<ClientFeedback[]>([])
  const [panelistFeedback, setPanelistFeedback] = useState<PanelistFeedbackItem[]>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [candidateAttachments, setCandidateAttachments] = useState<CandidateAttachment[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)

  // Note submission
  const [noteText, setNoteText] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Feedback submission
  const [feedbackRating, setFeedbackRating] = useState<'thumbs_up' | 'thumbs_down' | 'maybe' | null>(null)
  const [feedbackRecommendation, setFeedbackRecommendation] = useState<'advance' | 'do_not_advance' | 'need_more_info' | null>(null)
  const [feedbackComments, setFeedbackComments] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  useEffect(() => {
    if (isOpen && candidate) {
      setActiveTab('summary')
      setFeedbackSubmitted(false)
      setFeedbackRating(null)
      setFeedbackRecommendation(null)
      setFeedbackComments('')
      loadPreviousFeedback()
      loadPanelistFeedback()
      loadCandidateAttachments()
      loadActivities()
    }
  }, [isOpen, candidate])

  const loadPreviousFeedback = async () => {
    if (!candidate) return
    setIsLoadingFeedback(true)
    try {
      const { data, error } = await supabase
        .from('client_feedback')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      const filteredFeedback = (data || []).filter(feedback => {
        if (accessLevel === 'full_access') return true
        return feedback.reviewer_email === clientEmail
      })
      setPreviousFeedback(filteredFeedback)
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  const loadCandidateAttachments = async () => {
    if (!candidate) return
    try {
      const { data } = await supabase
        .from('candidate_attachments')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('uploaded_at', { ascending: false })
      setCandidateAttachments((data || []).filter((a: CandidateAttachment) => a.visibility === 'full_access'))
    } catch (err) {
      console.error('Error loading candidate attachments:', err)
    }
  }

  const loadPanelistFeedback = async () => {
    if (!candidate) return
    try {
      const { data, error } = await supabase
        .from('panelist_feedback')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('submitted_at', { ascending: false })

      if (!error) setPanelistFeedback(data || [])
    } catch (err) {
      console.error('Error loading panelist feedback:', err)
    }
  }

  const loadActivities = async () => {
    if (!candidate) return
    setIsLoadingActivities(true)
    try {
      const { data, error } = await supabase
        .from('candidate_activity')
        .select('id, activity_type, content, author_name, visibility_level, created_at')
        .eq('candidate_id', candidate.id)
        .in('visibility_level', ['full_access', 'limited_access'])
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback without visibility filter
        const { data: fallbackData } = await supabase
          .from('candidate_activity')
          .select('id, activity_type, content, author_name, visibility_level, created_at')
          .eq('candidate_id', candidate.id)
          .order('created_at', { ascending: false })
        setActivities(fallbackData || [])
      } else {
        setActivities(data || [])
      }
    } catch (err) {
      console.error('Error loading activities:', err)
    } finally {
      setIsLoadingActivities(false)
    }
  }

  const handleNoteSubmit = async () => {
    if (!noteText.trim() || !candidate) return
    setIsSubmittingNote(true)
    try {
      const res = await fetch('/api/candidate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate.id,
          search_id: searchId,
          activity_type: 'note',
          content: noteText.trim(),
          author_name: clientName || clientEmail,
          visibility_level: 'full_access',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add note')
      setNoteText('')
      loadActivities()
    } catch (err) {
      console.error('Error submitting note:', err)
      alert('Failed to add note')
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleNoteSubmit()
    }
    // @mention trigger
    if (e.key === '@') {
      setShowMentionDropdown(true)
      setMentionFilter('')
    }
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNoteText(value)

    // Check for @mention
    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex >= 0 && showMentionDropdown) {
      const afterAt = value.substring(lastAtIndex + 1)
      if (afterAt.includes(' ') || afterAt.includes('\n')) {
        setShowMentionDropdown(false)
      } else {
        setMentionFilter(afterAt.toLowerCase())
      }
    }
  }

  const insertMention = (name: string) => {
    const lastAtIndex = noteText.lastIndexOf('@')
    if (lastAtIndex >= 0) {
      const before = noteText.substring(0, lastAtIndex)
      setNoteText(`${before}@${name} `)
    }
    setShowMentionDropdown(false)
    noteTextareaRef.current?.focus()
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackRating || !feedbackRecommendation || !candidate) return
    setIsSubmittingFeedback(true)
    try {
      const res = await fetch('/api/client/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate.id,
          search_id: searchId,
          reviewer_name: clientName || 'Client',
          reviewer_email: clientEmail,
          recommendation: feedbackRecommendation === 'advance' ? 'advance'
            : feedbackRecommendation === 'do_not_advance' ? 'concern' : 'hold',
          notes: feedbackComments.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback')
      setFeedbackSubmitted(true)
      setFeedbackRating(null)
      setFeedbackRecommendation(null)
      setFeedbackComments('')
      loadPreviousFeedback()
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Failed to submit feedback')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  if (!isOpen || !candidate) return null

  // Build timeline with stage colors
  const timelineStages: TimelineStage[] = stages.map((stage, i) => {
    const currentStageIndex = stages.findIndex(s => s.id === candidate.stage_id)
    const iv = interviews.find(v => v.stage_id === stage.id && v.candidate_id === candidate.id)
    let status: 'completed' | 'current' | 'future' = 'future'
    if (i < currentStageIndex) status = 'completed'
    else if (stage.id === candidate.stage_id) status = 'current'
    return {
      id: stage.id,
      name: stage.name,
      status,
      date: iv?.scheduled_at || null,
      color: getStageColor(i, stages.length),
    }
  })

  // Interview guides
  const interviewGuides: Array<{ name: string; url: string }> = []
  if (currentStage?.interview_guide_url) {
    interviewGuides.push({ name: `${currentStage.name} Guide`, url: currentStage.interview_guide_url })
  }
  documents.filter(doc => doc.type === 'interview_guide').forEach(doc => {
    interviewGuides.push({ name: doc.name, url: doc.file_url })
  })

  // Mentionable contacts
  const mentionableContacts = contacts.filter(c => {
    if (!mentionFilter) return true
    return c.name.toLowerCase().includes(mentionFilter)
  }).slice(0, 5)

  const allFeedback = [...panelistFeedback.map(f => ({
    id: f.id,
    name: f.panelist_name,
    email: f.panelist_email,
    rating: f.rating,
    recommendation: f.recommendation,
    comments: f.comments,
    date: f.submitted_at,
    type: 'panelist' as const,
  })), ...previousFeedback.map(f => ({
    id: f.id,
    name: f.reviewer_name,
    email: f.reviewer_email,
    rating: null as string | null,
    recommendation: f.recommendation === 'advance' ? 'advance'
      : f.recommendation === 'concern' ? 'do_not_advance' : 'need_more_info',
    comments: f.notes,
    date: f.created_at,
    type: 'client' as const,
  }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

  const getRatingIcon = (rating: string | null) => {
    if (rating === 'thumbs_up') return <ThumbsUp className="w-4 h-4 text-green-600" />
    if (rating === 'thumbs_down') return <ThumbsDown className="w-4 h-4 text-red-500" />
    if (rating === 'maybe') return <HelpCircle className="w-4 h-4 text-yellow-500" />
    return null
  }

  const getRecommendationBadge = (rec: string) => {
    if (rec === 'advance') return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">Advance</span>
    if (rec === 'do_not_advance' || rec === 'concern') return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-600">Do Not Advance</span>
    return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-100 text-yellow-700">Need More Info</span>
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-ds-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-navy truncate">
                {candidate.first_name} {candidate.last_name}
              </h2>
              {(candidate.current_title || candidate.current_company) && (
                <p className="text-text-secondary mt-0.5 truncate">
                  {candidate.current_title}
                  {candidate.current_title && candidate.current_company && ' at '}
                  {candidate.current_company}
                </p>
              )}
              {/* Quick links */}
              <div className="flex items-center gap-3 mt-2">
                {candidate.resume_url && (
                  <a
                    href={candidate.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-orange transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Resume
                    <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                  </a>
                )}
                {candidate.linkedin_url && (
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-orange transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    LinkedIn
                    <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-section text-text-muted hover:text-navy transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interview Progress */}
        {timelineStages.length > 0 && (
          <div className="px-6 py-3 border-b border-ds-border flex-shrink-0 bg-bg-section">
            <CandidateStageTimeline stages={timelineStages} variant="panel" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-ds-border flex-shrink-0">
          {([
            { id: 'summary' as const, label: 'Summary' },
            { id: 'activity' as const, label: 'Activity' },
            { id: 'docs' as const, label: `Docs${candidateAttachments.length + interviewGuides.length > 0 ? ` (${candidateAttachments.length + interviewGuides.length + (candidate.resume_url ? 1 : 0)})` : ''}` },
            { id: 'feedback' as const, label: `Feedback${allFeedback.length > 0 ? ` (${allFeedback.length})` : ''}` },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-navy border-b-2 border-orange'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* === SUMMARY TAB === */}
          {activeTab === 'summary' && (
            <div className="p-6 space-y-5">
              {/* AI Summary */}
              {candidate.summary ? (
                <div>
                  <h3 className="text-sm font-bold text-navy mb-2">Summary</h3>
                  <div className="bg-bg-section rounded-lg border border-ds-border p-4">
                    <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{candidate.summary}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-bg-section rounded-lg border border-ds-border p-6 text-center">
                  <p className="text-sm text-text-muted">No summary available yet</p>
                </div>
              )}

              {/* Profile info */}
              {(candidate.location || candidate.email || candidate.phone) && (
                <div>
                  <h3 className="text-sm font-bold text-navy mb-2">Profile</h3>
                  <div className="bg-bg-section rounded-lg border border-ds-border p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {candidate.location && (
                        <div>
                          <p className="text-[10px] font-semibold text-text-muted uppercase">Location</p>
                          <p className="text-sm text-text-primary mt-0.5">{candidate.location}</p>
                        </div>
                      )}
                      {candidate.email && (
                        <div>
                          <p className="text-[10px] font-semibold text-text-muted uppercase">Email</p>
                          <p className="text-sm text-text-primary mt-0.5">{candidate.email}</p>
                        </div>
                      )}
                      {candidate.phone && (
                        <div>
                          <p className="text-[10px] font-semibold text-text-muted uppercase">Phone</p>
                          <p className="text-sm text-text-primary mt-0.5">{candidate.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Compensation - Full Access Only */}
              {accessLevel === 'full_access' && (candidate.current_compensation || candidate.compensation_expectations) && (
                <div>
                  <h3 className="text-sm font-bold text-navy mb-2">Compensation</h3>
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                    <p className="text-sm text-amber-900">
                      <span className="font-medium">Current:</span> {candidate.current_compensation || 'Not provided'}
                    </p>
                    <p className="text-sm text-amber-900 mt-1">
                      <span className="font-medium">Target:</span> {candidate.compensation_expectations || 'Not provided'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === ACTIVITY TAB === */}
          {activeTab === 'activity' && (
            <div className="p-6">
              {/* Note composer */}
              <div className="mb-5 relative">
                <div className="border border-ds-border rounded-lg bg-white focus-within:border-navy transition-colors">
                  <textarea
                    ref={noteTextareaRef}
                    value={noteText}
                    onChange={handleNoteChange}
                    onKeyDown={handleNoteKeyDown}
                    placeholder={`Add a note... Use @ to mention a contact`}
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm resize-none focus:outline-none rounded-t-lg"
                  />
                  <div className="flex items-center justify-between px-3 py-1.5 border-t border-ds-border bg-bg-section rounded-b-lg">
                    <span className="text-[10px] text-text-muted">Press Enter to send, Shift+Enter for new line</span>
                    <button
                      onClick={handleNoteSubmit}
                      disabled={!noteText.trim() || isSubmittingNote}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-orange hover:bg-orange-hover rounded disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      {isSubmittingNote ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
                {/* @mention dropdown */}
                {showMentionDropdown && mentionableContacts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-ds-border shadow-lg z-10 max-h-40 overflow-y-auto">
                    {mentionableContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => insertMention(contact.name)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-bg-section transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-navy">
                            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-navy">{contact.name}</p>
                          {contact.title && <p className="text-[10px] text-text-muted">{contact.title}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity timeline */}
              {isLoadingActivities ? (
                <p className="text-sm text-text-muted text-center py-8">Loading activity...</p>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-text-muted">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map(activity => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-navy">
                          {(activity.author_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-navy">{activity.author_name || 'System'}</span>
                          <span className="text-[10px] text-text-muted">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">{activity.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === DOCS TAB === */}
          {activeTab === 'docs' && (
            <div className="p-6 space-y-2">
              {candidate.resume_url && (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-bg-section transition-colors border border-ds-border"
                >
                  <FileText className="w-5 h-5 text-navy" />
                  <span className="text-sm font-medium text-navy flex-1">Resume</span>
                  <ExternalLink className="w-4 h-4 text-text-muted" />
                </a>
              )}
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-bg-section transition-colors border border-ds-border"
                >
                  <Linkedin className="w-5 h-5 text-navy" />
                  <span className="text-sm font-medium text-navy flex-1">LinkedIn Profile</span>
                  <ExternalLink className="w-4 h-4 text-text-muted" />
                </a>
              )}
              {candidateAttachments.map(att => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-bg-section transition-colors border border-ds-border"
                >
                  <Paperclip className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm font-medium text-navy flex-1 truncate">{att.file_name}</span>
                  <ExternalLink className="w-4 h-4 text-text-muted" />
                </a>
              ))}
              {interviewGuides.map((guide, idx) => (
                <a
                  key={idx}
                  href={guide.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-bg-section transition-colors border border-ds-border"
                >
                  <FileText className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm font-medium text-navy flex-1 truncate">{guide.name}</span>
                  <ExternalLink className="w-4 h-4 text-text-muted" />
                </a>
              ))}
              {!candidate.resume_url && !candidate.linkedin_url && candidateAttachments.length === 0 && interviewGuides.length === 0 && (
                <div className="text-center py-8">
                  <Paperclip className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-text-muted">No documents available</p>
                </div>
              )}
            </div>
          )}

          {/* === FEEDBACK TAB === */}
          {activeTab === 'feedback' && (
            <div className="p-4 sm:p-6">
              {/* Submit feedback form */}
              {!feedbackSubmitted ? (
                <div className="mb-6 bg-bg-section rounded-lg border border-ds-border p-4">
                  <h3 className="text-sm font-bold text-navy mb-3">Your Feedback</h3>

                  {/* Rating */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-2">Rating</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        { value: 'thumbs_up' as const, icon: ThumbsUp, label: 'Strong', color: 'green' },
                        { value: 'maybe' as const, icon: HelpCircle, label: 'Maybe', color: 'yellow' },
                        { value: 'thumbs_down' as const, icon: ThumbsDown, label: 'Pass', color: 'red' },
                      ]).map(opt => {
                        const Icon = opt.icon
                        const isSelected = feedbackRating === opt.value
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setFeedbackRating(opt.value)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              isSelected
                                ? opt.color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                                : opt.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-red-500 bg-red-50 text-red-600'
                                : 'border-ds-border bg-white text-text-secondary hover:border-gray-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-2">Recommendation</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        { value: 'advance' as const, label: 'Advance', color: 'green' },
                        { value: 'need_more_info' as const, label: 'Need More Info', color: 'yellow' },
                        { value: 'do_not_advance' as const, label: 'Do Not Advance', color: 'red' },
                      ]).map(opt => {
                        const isSelected = feedbackRecommendation === opt.value
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setFeedbackRecommendation(opt.value)}
                            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              isSelected
                                ? opt.color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                                : opt.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-red-500 bg-red-50 text-red-600'
                                : 'border-ds-border bg-white text-text-secondary hover:border-gray-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-2">Comments</p>
                    <textarea
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      placeholder="Share your thoughts on this candidate..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-ds-border focus:border-navy focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackRating || !feedbackRecommendation || isSubmittingFeedback}
                    className="w-full py-2 text-sm font-semibold text-white bg-orange hover:bg-orange-hover rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              ) : (
                <div className="mb-6 bg-green-50 rounded-lg border border-green-200 p-4 text-center">
                  <p className="text-sm font-semibold text-green-700">Feedback submitted successfully!</p>
                  <button
                    onClick={() => setFeedbackSubmitted(false)}
                    className="text-xs text-green-600 hover:text-green-800 mt-1 underline"
                  >
                    Submit additional feedback
                  </button>
                </div>
              )}

              {/* All feedback */}
              {isLoadingFeedback ? (
                <p className="text-sm text-text-muted text-center py-4">Loading feedback...</p>
              ) : allFeedback.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-text-muted">No feedback submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-navy">
                    {accessLevel === 'full_access' ? 'All Feedback' : 'Your Previous Feedback'}
                  </h3>
                  {allFeedback.map(fb => (
                    <div key={fb.id} className="p-4 bg-white rounded-lg border border-ds-border">
                      <div className="flex items-center gap-2 mb-2">
                        {fb.rating && getRatingIcon(fb.rating)}
                        <span className="text-sm font-semibold text-navy flex-1">
                          {fb.email === clientEmail ? 'You' : fb.name}
                        </span>
                        {getRecommendationBadge(fb.recommendation)}
                      </div>
                      {fb.comments && (
                        <p className="text-sm text-text-primary mt-1">{fb.comments}</p>
                      )}
                      <p className="text-[10px] text-text-muted mt-2">{formatDate(fb.date)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
