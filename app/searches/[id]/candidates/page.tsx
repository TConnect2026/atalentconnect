"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback, Fragment } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, X, MapPin, Phone, Mail, Linkedin, FileText,
  Camera, Sparkles, Paperclip, Upload, Trash2,
  ExternalLink, Video, PhoneCall, Users as UsersIcon,
  MessageSquare, ThumbsUp, ThumbsDown, Pencil, Check, Send, RefreshCw, CalendarClock, AlertCircle, Plus,
  Archive, RotateCcw, ChevronDown, MoreVertical, FastForward, Pause, Play,
  Search, Building2, Handshake, Trophy, CircleDot, ClipboardCheck, Download,
  Eye, EyeOff, Loader2, CheckCircle2
} from "lucide-react"
import { CandidateStageTimeline, TimelineStage } from "@/components/pipeline/candidate-stage-timeline"
import { ScheduleDateDialog } from "@/components/pipeline/schedule-date-dialog"
import { SearchContextBar } from "@/components/layout/search-context-bar"
import { CandidateCard } from "@/components/candidates/candidate-card"
import { StageHeader } from "@/components/candidates/stage-header"
import type { Candidate as CandidateT, Interview as InterviewT, Document as DocumentT } from "@/types"

// Local DB-shape types
interface PipelineSearch {
  id: string
  company_name: string
  position_title: string
  [key: string]: string | boolean | number | null | undefined | unknown[]
}

interface PipelineStage {
  id: string
  search_id: string
  name: string
  stage_order: number
  interview_format?: string | null
  format?: string | null
  visible_in_client_portal?: boolean
  visible_in_portal?: boolean
}

interface PipelineCandidate {
  id: string
  search_id: string
  stage_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  linkedin_url?: string | null
  current_company?: string | null
  current_title?: string | null
  resume_url?: string | null
  summary?: string | null
  recruiter_notes?: string | null
  general_notes?: string | null
  photo_url?: string | null
  location?: string | null
  candidate_order?: number
  status?: string | null
  next_up_date?: string | null
  next_up_stage_id?: string | null
  visible_in_portal?: boolean
  created_at?: string
  updated_at?: string
}

interface ActivityItem {
  id: string
  activity_type: string
  content?: string | null
  file_url?: string | null
  file_name?: string | null
  visibility_level?: string | null
  author_name?: string | null
  follow_up_date?: string | null
  created_at: string
}

interface AttachmentItem {
  id: string
  candidate_id: string
  file_name: string
  file_url: string
  label?: string | null
  visibility?: string | null
  uploaded_at: string
}

interface FeedbackItem {
  id: string
  reviewer_name?: string | null
  recommendation?: string | null
  notes?: string | null
  created_at: string
}

interface PanelistFeedbackItem {
  id: string
  panelist_name?: string | null
  rating?: string | null
  recommendation?: string | null
  comments?: string | null
  submitted_at: string
}

interface PipelineInterview {
  id: string
  candidate_id: string
  stage_id: string
  scheduled_at: string | null
  status: string
  interviewer_name?: string | null
  prep_notes?: string | null
  interview_guide_id?: string | null
}

interface PipelineDocument {
  id: string
  search_id: string
  name: string
  type: string
  file_url: string
  created_at: string
}

const PROSPECTS_STAGE_ORDER = -1

export default function CandidatesPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const searchId = params.id as string

  // Data
  const [search, setSearch] = useState<PipelineSearch | null>(null)
  const [interviewStages, setInterviewStages] = useState<PipelineStage[]>([])
  const [prospectStageId, setProspectStageId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([])
  const [searchDocuments, setSearchDocuments] = useState<PipelineDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Add candidate dialog
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newLinkedin, setNewLinkedin] = useState('')
  const [newYoutube, setNewYoutube] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [newAdditionalLinks, setNewAdditionalLinks] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null)
  const [newStageId, setNewStageId] = useState<string | null>(null)
  const [newSummary, setNewSummary] = useState('')
  const [isGeneratingNewSummary, setIsGeneratingNewSummary] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedOnce, setParsedOnce] = useState(false)
  const [isResumeDragOver, setIsResumeDragOver] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  // Slide panel state
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null)
  const [panelTab, setPanelTab] = useState<'summary' | 'activity' | 'documents' | 'feedback'>('summary')
  const [panelSummary, setPanelSummary] = useState('')
  const [isEditingPanelSummary, setIsEditingPanelSummary] = useState(false)
  const [isGeneratingPanelSummary, setIsGeneratingPanelSummary] = useState(false)
  const [isSavingPanelSummary, setIsSavingPanelSummary] = useState(false)
  const [panelActivities, setPanelActivities] = useState<ActivityItem[]>([])
  const [panelAttachments, setPanelAttachments] = useState<AttachmentItem[]>([])
  const [panelFeedback, setPanelFeedback] = useState<FeedbackItem[]>([])
  const [panelPanelistFeedback, setPanelPanelistFeedback] = useState<PanelistFeedbackItem[]>([])
  const [isUploadingPanelDoc, setIsUploadingPanelDoc] = useState(false)
  const [isPanelLoading, setIsPanelLoading] = useState(false)

  // Panel inline editing
  const [isEditingHeader, setIsEditingHeader] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [isSavingHeader, setIsSavingHeader] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [activityNoteText, setActivityNoteText] = useState('')
  const [activityFollowUpDate, setActivityFollowUpDate] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [editingPanelNoteId, setEditingPanelNoteId] = useState<string | null>(null)
  const [editingPanelNoteText, setEditingPanelNoteText] = useState('')
  const [isSavingPanelNote, setIsSavingPanelNote] = useState(false)
  const panelResumeInputRef = useRef<HTMLInputElement>(null)

  // Latest activity per candidate (for kanban card preview)
  const [latestActivities, setLatestActivities] = useState<Record<string, ActivityItem>>({})

  // Drag state
  const [dragCandidateId, setDragCandidateId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Interview scheduling state
  const [candidateInterviews, setCandidateInterviews] = useState<Record<string, PipelineInterview[]>>({})
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleDialogCandidate, setScheduleDialogCandidate] = useState<PipelineCandidate | null>(null)
  const [scheduleDialogStageId, setScheduleDialogStageId] = useState<string | null>(null)
  const [scheduleDialogStageName, setScheduleDialogStageName] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)

  // Inline card editing state
  const [editingNextUpId, setEditingNextUpId] = useState<string | null>(null)
  const [editingNextUpValue, setEditingNextUpValue] = useState('')
  const [editingNextUpTime, setEditingNextUpTime] = useState('')
  const [editingNextUpStageId, setEditingNextUpStageId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  // Archive & card menu
  const [showArchived, setShowArchived] = useState(false)
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null)

  // Close card menu on outside click
  useEffect(() => {
    if (!cardMenuOpen) return
    const handleClick = () => setCardMenuOpen(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [cardMenuOpen])

  useEffect(() => {
    loadData()
  }, [searchId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [searchRes, stagesRes, candidatesRes, activitiesRes, interviewsRes, docsRes] = await Promise.all([
        supabase.from("searches").select("*").eq("id", searchId).single(),
        supabase.from("stages").select("*").eq("search_id", searchId).order("stage_order", { ascending: true }),
        supabase.from("candidates").select("*").eq("search_id", searchId).order("created_at", { ascending: true }),
        supabase.from("candidate_activity").select("id, candidate_id, activity_type, content, author_name, follow_up_date, created_at").eq("search_id", searchId).eq("activity_type", "note").order("created_at", { ascending: false }),
        supabase.from("interviews").select("id, candidate_id, stage_id, scheduled_at, status, interviewer_name, prep_notes").eq("search_id", searchId).neq("status", "cancelled"),
        supabase.from("documents").select("*").eq("search_id", searchId).order("created_at", { ascending: false }),
      ])
      setSearch(searchRes.data as PipelineSearch | null)
      setCandidates((candidatesRes.data || []) as PipelineCandidate[])
      setSearchDocuments((docsRes.data || []) as PipelineDocument[])

      // Build map of latest activity per candidate
      const actMap: Record<string, ActivityItem> = {}
      for (const act of (activitiesRes.data || []) as (ActivityItem & { candidate_id: string })[]) {
        if (!actMap[act.candidate_id]) {
          actMap[act.candidate_id] = act
        }
      }
      setLatestActivities(actMap)

      // Build map of interviews grouped by candidate
      const intMap: Record<string, PipelineInterview[]> = {}
      for (const iv of (interviewsRes.data || []) as PipelineInterview[]) {
        if (!intMap[iv.candidate_id]) intMap[iv.candidate_id] = []
        intMap[iv.candidate_id].push(iv)
      }
      setCandidateInterviews(intMap)

      if (stagesRes.error) {
        console.error("Stages query error:", stagesRes.error)
      }
      const allStages = (stagesRes.data || []) as PipelineStage[]

      // Find or create a system "Prospect" stage (order = -1)
      const systemStages = allStages.filter((s: PipelineStage) => s.stage_order != null && s.stage_order < 0)
      let prospect = systemStages[0]
      if (!prospect) {
        // Create via server-side API to bypass RLS
        const stageRes = await fetch('/api/stages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            search_id: searchId,
            name: 'Prospect',
            stage_order: PROSPECTS_STAGE_ORDER,
            visible_in_client_portal: false,
          }),
        })
        if (stageRes.ok) {
          const newStage = await stageRes.json()
          prospect = newStage as PipelineStage
        }
      }
      setProspectStageId(prospect?.id || null)

      // Interview stages = all stages except system stages (order < 0)
      const systemIds = new Set(systemStages.map((s: PipelineStage) => s.id))
      setInterviewStages(allStages.filter((s: PipelineStage) => !systemIds.has(s.id)))
    } catch (err) {
      console.error("Error loading pipeline data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // ---- Columns ----
  // Light yellow prospect, then progressively deeper greens. White backgrounds.
  const STAGE_HEADERS = [
    '#C8B873', // Prospect — warm yellow
    '#9BBF8A', // light sage
    '#6DAE6D', // medium green
    '#4E9B52', // stronger green
    '#3A8943', // deep green
    '#2B7535', // rich green
    '#1D6128', // deepest green
  ]
  const getStageColors = (index: number, total: number) => {
    if (total <= 1) return { header: STAGE_HEADERS[0], bg: '#FAF9F7' }
    const scaled = (index / (total - 1)) * (STAGE_HEADERS.length - 1)
    const i = Math.min(Math.round(scaled), STAGE_HEADERS.length - 1)
    return { header: STAGE_HEADERS[i], bg: '#FAF9F7' }
  }

  // Stage icon — driven by interview format first, then name fallback
  const getStageIcon = (name: string, format?: string) => {
    // Format takes priority
    if (format) {
      const f = format.toLowerCase()
      if (f === 'phone') return <PhoneCall className="w-3.5 h-3.5" />
      if (f === 'video') return <Video className="w-3.5 h-3.5" />
      if (f === 'in_person' || f === 'in-person' || f === 'onsite') return <Building2 className="w-3.5 h-3.5" />
    }
    // Fallback to name keywords
    const n = name.toLowerCase()
    if (n.includes('prospect') || n.includes('sourcing')) return <Search className="w-3.5 h-3.5" />
    if (n.includes('phone') || n.includes('screen')) return <PhoneCall className="w-3.5 h-3.5" />
    if (n.includes('video')) return <Video className="w-3.5 h-3.5" />
    if (n.includes('onsite') || n.includes('on-site') || n.includes('in-person') || n.includes('office') || n.includes('panel')) return <Building2 className="w-3.5 h-3.5" />
    if (n.includes('offer')) return <Handshake className="w-3.5 h-3.5" />
    if (n.includes('placed') || n.includes('hired') || n.includes('accepted') || n.includes('closed')) return <Trophy className="w-3.5 h-3.5" />
    if (n.includes('final') || n.includes('reference') || n.includes('check')) return <ClipboardCheck className="w-3.5 h-3.5" />
    return <CircleDot className="w-3.5 h-3.5" />
  }

  const columns: { id: string; name: string; format?: string; visible_in_portal?: boolean; is_prospect?: boolean }[] = [
    ...(prospectStageId ? [{ id: prospectStageId, name: 'Prospect', is_prospect: true }] : []),
    ...interviewStages.map(s => ({
      id: s.id,
      name: s.name,
      format: (s.interview_format || s.format || '') as string,
      visible_in_portal: s.visible_in_portal ?? false,
    })),
  ]
  const getColumnCandidates = (stageId: string) => candidates.filter(c => c.stage_id === stageId && c.status !== 'archived')
  const archivedCandidates = candidates.filter(c => c.status === 'archived')

  const getStageBadge = (stageId: string) => {
    const colIndex = columns.findIndex(c => c.id === stageId)
    if (colIndex === -1) return { name: 'Unknown', color: '#6B7280' }
    return { name: columns[colIndex].name, color: getStageColors(colIndex, columns.length).header }
  }

  const getFormatIcon = (format: string) => {
    switch (format?.toLowerCase()) {
      case 'video': return <Video className="w-3 h-3" />
      case 'phone': return <PhoneCall className="w-3 h-3" />
      case 'in_person': case 'in-person': case 'onsite': return <UsersIcon className="w-3 h-3" />
      default: return null
    }
  }

  const getFormatLabel = (format: string) => {
    switch (format?.toLowerCase()) {
      case 'video': return 'Video'
      case 'phone': return 'Phone'
      case 'in_person': case 'in-person': return 'In Person'
      case 'onsite': return 'Onsite'
      default: return format
    }
  }

  // ---- Drag and Drop ----
  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDragCandidateId(candidateId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!dragCandidateId) return
    const candidate = candidates.find(c => c.id === dragCandidateId)
    if (!candidate || candidate.stage_id === targetStageId) {
      setDragCandidateId(null)
      return
    }
    // Optimistic update
    setCandidates(prev => prev.map(c => c.id === dragCandidateId ? { ...c, stage_id: targetStageId } : c))
    const movedCandidate = { ...candidate, stage_id: targetStageId }
    const movedId = dragCandidateId
    setDragCandidateId(null)
    try {
      const { error } = await supabase.from('candidates').update({ stage_id: targetStageId, updated_at: new Date().toISOString() }).eq('id', movedId)
      if (error) throw error
      // If target is not Prospect, open schedule dialog
      if (targetStageId !== prospectStageId) {
        const targetStage = interviewStages.find(s => s.id === targetStageId)
        if (targetStage) {
          setScheduleDialogCandidate(movedCandidate)
          setScheduleDialogStageId(targetStageId)
          setScheduleDialogStageName(targetStage.name)
          setScheduleDialogOpen(true)
        }
      }
    } catch (err) {
      console.error('Error moving candidate:', err)
      loadData()
    }
  }

  const handleDragEnd = () => {
    setDragCandidateId(null)
    setDragOverColumn(null)
  }

  // ---- Timeline helpers ----
  const buildTimelineStages = (candidate: PipelineCandidate): TimelineStage[] => {
    // Only include interview stages (not Prospect)
    const candidateIvs = candidateInterviews[candidate.id] || []
    const currentStageIndex = interviewStages.findIndex(s => s.id === candidate.stage_id)

    return interviewStages.map((stage, i) => {
      const iv = candidateIvs.find(v => v.stage_id === stage.id)
      let status: 'completed' | 'current' | 'future'
      if (candidate.stage_id === prospectStageId) {
        status = 'future'
      } else if (i < currentStageIndex) {
        status = 'completed'
      } else if (stage.id === candidate.stage_id) {
        status = 'current'
      } else {
        status = 'future'
      }
      // Get the kanban column color for this stage (offset by 1 to skip Prospect)
      const colIndex = columns.findIndex(c => c.id === stage.id)
      const stageColor = colIndex >= 0 ? getStageColors(colIndex, columns.length).header : null
      return {
        id: stage.id,
        name: stage.name,
        status,
        date: iv?.scheduled_at || null,
        color: stageColor,
        interviewerName: iv?.interviewer_name || null,
      }
    })
  }

  const handleScheduleInterview = async (date: string, time: string, interviewerName: string, guideId: string | null) => {
    if (!scheduleDialogCandidate || !scheduleDialogStageId) return
    setIsScheduling(true)
    try {
      const scheduledAt = time ? `${date}T${time}:00` : `${date}T00:00:00`
      // Check if interview already exists for this candidate + stage
      const existing = (candidateInterviews[scheduleDialogCandidate.id] || []).find(
        iv => iv.stage_id === scheduleDialogStageId
      )
      let res: Response
      if (existing) {
        res = await fetch('/api/interviews', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existing.id,
            scheduled_at: scheduledAt,
            interviewer_name: interviewerName || existing.interviewer_name || '',
            interview_guide_id: guideId,
          }),
        })
      } else {
        res = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_id: scheduleDialogCandidate.id,
            search_id: searchId,
            stage_id: scheduleDialogStageId,
            scheduled_at: scheduledAt,
            status: 'scheduled',
            interviewer_name: interviewerName || '',
            interview_guide_id: guideId,
          }),
        })
      }
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to schedule interview')
      setScheduleDialogOpen(false)
      loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule interview'
      console.error('Error scheduling interview:', msg)
      alert(msg)
    } finally {
      setIsScheduling(false)
    }
  }

  const openScheduleForStage = (stageId: string, stageName: string, existingDate?: string | null, existingInterviewer?: string | null) => {
    if (!selectedCandidate) return
    setScheduleDialogCandidate(selectedCandidate)
    setScheduleDialogStageId(stageId)
    setScheduleDialogStageName(stageName)
    setScheduleDialogOpen(true)
  }

  // ---- Inline card handlers ----
  const saveNextUpDate = async (candidateId: string) => {
    if (!editingNextUpValue) {
      setEditingNextUpId(null)
      return
    }
    const nextUp = editingNextUpTime
      ? `${editingNextUpValue}T${editingNextUpTime}:00`
      : `${editingNextUpValue}T00:00:00`
    const stageId = editingNextUpStageId || null
    try {
      const { error } = await supabase.from('candidates').update({ next_up_date: nextUp, next_up_stage_id: stageId, updated_at: new Date().toISOString() }).eq('id', candidateId)
      if (error) throw error
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, next_up_date: nextUp, next_up_stage_id: stageId } : c))
    } catch {
      alert('Failed to save date')
    }
    setEditingNextUpId(null)
  }

  const clearNextUpDate = async (candidateId: string) => {
    try {
      const { error } = await supabase.from('candidates').update({ next_up_date: null, next_up_stage_id: null, updated_at: new Date().toISOString() }).eq('id', candidateId)
      if (error) throw error
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, next_up_date: null, next_up_stage_id: null } : c))
    } catch {
      alert('Failed to clear date')
    }
  }

  const saveCardNote = async (candidateId: string, activityId: string) => {
    if (!editingNoteText.trim()) {
      setEditingNoteId(null)
      return
    }
    try {
      const { error } = await supabase.from('candidate_activity').update({ content: editingNoteText.trim() }).eq('id', activityId)
      if (error) throw error
      setLatestActivities(prev => {
        const existing = prev[candidateId]
        if (!existing || existing.id !== activityId) return prev
        return { ...prev, [candidateId]: { ...existing, content: editingNoteText.trim() } }
      })
    } catch {
      alert('Failed to update note')
    }
    setEditingNoteId(null)
  }

  const deleteCardNote = async (candidateId: string, activityId: string) => {
    try {
      const { error } = await supabase.from('candidate_activity').delete().eq('id', activityId)
      if (error) throw error
      // Remove from latest activities and reload to get the new latest
      setLatestActivities(prev => {
        const updated = { ...prev }
        delete updated[candidateId]
        return updated
      })
      // Reload panel data if this candidate's panel is open
      if (selectedCandidate?.id === candidateId) {
        loadPanelData(selectedCandidate)
      }
    } catch {
      alert('Failed to delete note')
    }
  }

  // ---- Card actions: Advance / Hold / Archive / Restore ----
  const advanceCandidate = async (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate) return
    const currentIndex = columns.findIndex(c => c.id === candidate.stage_id)
    if (currentIndex === -1 || currentIndex >= columns.length - 1) return // already at last stage
    const nextStage = columns[currentIndex + 1]
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage_id: nextStage.id, status: 'active' } : c))
    try {
      const { error } = await supabase.from('candidates').update({ stage_id: nextStage.id, status: 'active', updated_at: new Date().toISOString() }).eq('id', candidateId)
      if (error) throw error
      // Open schedule dialog if advancing to an interview stage
      if (nextStage.id !== prospectStageId) {
        const movedCandidate = { ...candidate, stage_id: nextStage.id }
        setScheduleDialogCandidate(movedCandidate)
        setScheduleDialogStageId(nextStage.id)
        setScheduleDialogStageName(nextStage.name)
        setScheduleDialogOpen(true)
      }
    } catch {
      alert('Failed to advance candidate')
      loadData()
    }
  }

  const holdCandidate = async (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate) return
    const newStatus = candidate.status === 'on_hold' ? 'active' : 'on_hold'
    try {
      const { error } = await supabase.from('candidates').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', candidateId)
      if (error) throw error
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c))
    } catch {
      alert('Failed to update candidate')
    }
  }

  const archiveCandidate = async (candidateId: string) => {
    try {
      const { error } = await supabase.from('candidates').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', candidateId)
      if (error) throw error
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: 'archived' } : c))
      if (selectedCandidate?.id === candidateId) setSelectedCandidate(null)
    } catch {
      alert('Failed to archive candidate')
    }
  }

  const toggleStagePortalVisibility = async (stageId: string, next: boolean) => {
    setInterviewStages(prev => prev.map(s => s.id === stageId ? { ...s, visible_in_portal: next } : s))
    try {
      const { error } = await supabase
        .from('stages')
        .update({ visible_in_portal: next })
        .eq('id', stageId)
      if (error) throw error
    } catch (err) {
      console.error('Failed to toggle stage portal visibility:', err)
      alert('Failed to update stage visibility')
      setInterviewStages(prev => prev.map(s => s.id === stageId ? { ...s, visible_in_portal: !next } : s))
    }
  }

  const toggleCandidatePortalVisibility = async (candidateId: string, next: boolean) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, visible_in_portal: next } : c))
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ visible_in_portal: next, updated_at: new Date().toISOString() })
        .eq('id', candidateId)
      if (error) throw error
    } catch (err) {
      console.error('Failed to toggle candidate portal visibility:', err)
      alert('Failed to update candidate visibility')
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, visible_in_portal: !next } : c))
    }
  }

  const restoreCandidate = async (candidateId: string, targetStageId: string) => {
    try {
      const { error } = await supabase.from('candidates').update({ status: 'active', stage_id: targetStageId, updated_at: new Date().toISOString() }).eq('id', candidateId)
      if (error) throw error
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: 'active', stage_id: targetStageId } : c))
    } catch {
      alert('Failed to restore candidate')
    }
  }

  // ---- Add Candidate ----
  const resetForm = () => {
    setNewFirstName(''); setNewLastName(''); setNewCompany(''); setNewTitle('')
    setNewLocation(''); setNewPhone(''); setNewEmail(''); setNewLinkedin('')
    setNewYoutube(''); setNewWebsite(''); setNewAdditionalLinks('')
    setNewNotes(''); setNewPhotoFile(null); setNewPhotoPreview(null)
    setNewResumeFile(null); setNewStageId(null); setNewSummary('')
    setIsGeneratingNewSummary(false)
    setIsParsingResume(false); setParseError(null); setParsedOnce(false)
    setIsResumeDragOver(false)
  }

  // Send PDF to parse-resume route and auto-fill form fields
  const handleResumeFile = async (file: File) => {
    setParseError(null)
    setNewResumeFile(file)

    if (file.type !== 'application/pdf') {
      // Accept doc/docx for storage but skip parsing
      setParsedOnce(false)
      return
    }

    setIsParsingResume(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/candidates/parse-resume', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to parse resume')

      // Only overwrite empty fields — preserve anything the recruiter already typed
      if (data.first_name && !newFirstName) setNewFirstName(data.first_name)
      if (data.last_name && !newLastName) setNewLastName(data.last_name)
      if (data.current_title && !newTitle) setNewTitle(data.current_title)
      if (data.current_company && !newCompany) setNewCompany(data.current_company)
      if (data.linkedin_url && !newLinkedin) setNewLinkedin(data.linkedin_url)
      if (data.location && !newLocation) setNewLocation(data.location)
      if (data.email && !newEmail) setNewEmail(data.email)
      if (data.phone && !newPhone) setNewPhone(data.phone)
      setParsedOnce(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Parse resume failed:', err)
      setParseError(msg)
    } finally {
      setIsParsingResume(false)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setNewPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateNewSummary = async () => {
    if (!newResumeFile) return
    setIsGeneratingNewSummary(true)
    try {
      // Upload resume first to get a URL
      const fileExt = newResumeFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const formData = new FormData()
      formData.append('file', newResumeFile)
      formData.append('bucket', 'candidateresumes')
      formData.append('path', fileName)
      const uploadRes = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { publicUrl } = await uploadRes.json()

      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: 'new', resumeUrl: publicUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary')
      setNewSummary(data.summary)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to generate summary: ${msg}`)
    } finally {
      setIsGeneratingNewSummary(false)
    }
  }

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFirstName.trim() || !newLastName.trim()) return
    if (!prospectStageId) { alert('Pipeline is still loading. Please try again.'); return }
    setIsSubmitting(true)

    try {
      const targetStageId = newStageId || prospectStageId!

      let photoUrl: string | null = null
      let resumeUrl: string | null = null

      // Upload files via server-side API (bypasses storage RLS)
      if (newPhotoFile) {
        const fileExt = newPhotoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const formData = new FormData()
        formData.append('file', newPhotoFile)
        formData.append('bucket', 'candidate-photos')
        formData.append('path', fileName)
        const uploadRes = await fetch('/api/upload-file', { method: 'POST', body: formData })
        if (uploadRes.ok) {
          const { publicUrl } = await uploadRes.json()
          photoUrl = publicUrl
        }
      }

      if (newResumeFile) {
        const fileExt = newResumeFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const formData = new FormData()
        formData.append('file', newResumeFile)
        formData.append('bucket', 'candidateresumes')
        formData.append('path', fileName)
        const uploadRes = await fetch('/api/upload-file', { method: 'POST', body: formData })
        if (uploadRes.ok) {
          const { publicUrl } = await uploadRes.json()
          resumeUrl = publicUrl
        }
      }

      // Insert candidate via server-side API (bypasses RLS)
      const insertRes = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: searchId,
          stage_id: targetStageId,
          first_name: newFirstName.trim(),
          last_name: newLastName.trim(),
          email: newEmail.trim() || '',
          phone: newPhone.trim() || null,
          current_company: newCompany.trim() || null,
          current_title: newTitle.trim() || null,
          location: newLocation.trim() || null,
          linkedin_url: newLinkedin.trim() || null,
          youtube_url: newYoutube.trim() || null,
          website_url: newWebsite.trim() || null,
          additional_links: newAdditionalLinks.trim() || null,
          recruiter_notes: newNotes.trim() || null,
          summary: newSummary.trim() || null,
          photo_url: photoUrl,
          resume_url: resumeUrl,
          status: 'active',
        }),
      })
      const result = await insertRes.json()
      if (!insertRes.ok) throw new Error(result.error || 'Failed to add candidate')

      resetForm()
      setIsAddOpen(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Add candidate error:', err)
      alert(`Failed to add candidate: ${msg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- Panel data loading ----
  const loadPanelData = useCallback(async (candidate: PipelineCandidate) => {
    setIsPanelLoading(true)
    setPanelSummary(candidate.summary || '')
    setIsEditingPanelSummary(false)
    setPanelTab('activity')
    try {
      const [activityRes, attachRes, feedbackRes, panelistRes] = await Promise.all([
        supabase.from('candidate_activity').select('*').eq('candidate_id', candidate.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('candidate_attachments').select('*').eq('candidate_id', candidate.id).order('uploaded_at', { ascending: false }),
        supabase.from('client_feedback').select('*').eq('candidate_id', candidate.id).order('created_at', { ascending: false }),
        supabase.from('panelist_feedback').select('*').eq('candidate_id', candidate.id).order('submitted_at', { ascending: false }),
      ])
      setPanelActivities((activityRes.data || []) as ActivityItem[])
      setPanelAttachments((attachRes.data || []) as AttachmentItem[])
      setPanelFeedback((feedbackRes.data || []) as FeedbackItem[])
      setPanelPanelistFeedback((panelistRes.data || []) as PanelistFeedbackItem[])
    } catch (err) {
      console.error('Error loading panel data:', err)
    } finally {
      setIsPanelLoading(false)
    }
  }, [])

  const openPanel = (candidate: PipelineCandidate) => {
    setSelectedCandidate(candidate)
    setIsEditingHeader(false)
    setIsEditingNotes(false)
    setActivityNoteText('')
    setActivityFollowUpDate('')
    loadPanelData(candidate)
  }

  // ---- Panel handlers ----
  const generatePanelSummary = async () => {
    if (!selectedCandidate?.resume_url) return
    setIsGeneratingPanelSummary(true)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: selectedCandidate.id, resumeUrl: selectedCandidate.resume_url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary')
      setPanelSummary(data.summary)
      setIsEditingPanelSummary(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to generate summary: ${msg}`)
    } finally {
      setIsGeneratingPanelSummary(false)
    }
  }

  const savePanelSummary = async () => {
    if (!selectedCandidate) return
    setIsSavingPanelSummary(true)
    try {
      const { error } = await supabase.from('candidates').update({ summary: panelSummary.trim() || null, updated_at: new Date().toISOString() }).eq('id', selectedCandidate.id)
      if (error) throw error
      setSelectedCandidate(prev => prev ? { ...prev, summary: panelSummary.trim() || null } : prev)
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, summary: panelSummary.trim() || null } : c))
      setIsEditingPanelSummary(false)
    } catch { alert('Failed to save summary') }
    finally { setIsSavingPanelSummary(false) }
  }

  const handlePanelDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedCandidate) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be less than 25MB'); return }
    setIsUploadingPanelDoc(true)
    try {
      const ext = file.name.split('.').pop()
      const fn = `${searchId}/${selectedCandidate.id}/doc-${Date.now()}.${ext}`
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'documents')
      formData.append('path', fn)
      const uploadRes = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { publicUrl } = await uploadRes.json()
      const { data, error } = await supabase.from('candidate_attachments').insert({
        candidate_id: selectedCandidate.id,
        file_name: file.name,
        file_url: publicUrl,
        label: file.name,
        visibility: 'full_access',
      }).select().single()
      if (error) throw error
      setPanelAttachments(prev => [data as AttachmentItem, ...prev])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to upload document: ${msg}`)
    } finally { setIsUploadingPanelDoc(false); e.target.value = '' }
  }

  const deletePanelAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase.from('candidate_attachments').delete().eq('id', attachmentId)
      if (error) throw error
      setPanelAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch { alert('Failed to delete document') }
  }

  // ---- Panel inline editing handlers ----
  const startEditHeader = () => {
    if (!selectedCandidate) return
    setEditFirstName(selectedCandidate.first_name || '')
    setEditLastName(selectedCandidate.last_name || '')
    setEditTitle(selectedCandidate.current_title || '')
    setEditCompany(selectedCandidate.current_company || '')
    setEditEmail(selectedCandidate.email || '')
    setEditPhone(selectedCandidate.phone || '')
    setEditLinkedin(selectedCandidate.linkedin_url || '')
    setEditLocation(selectedCandidate.location || '')
    setIsEditingHeader(true)
  }

  const cancelEditHeader = () => {
    setIsEditingHeader(false)
  }

  const saveHeader = async () => {
    if (!selectedCandidate || !editFirstName.trim() || !editLastName.trim()) return
    setIsSavingHeader(true)
    try {
      const updates = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        current_title: editTitle.trim() || null,
        current_company: editCompany.trim() || null,
        email: editEmail.trim() || '',
        phone: editPhone.trim() || null,
        linkedin_url: editLinkedin.trim() || null,
        location: editLocation.trim() || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('candidates').update(updates).eq('id', selectedCandidate.id)
      if (error) throw error
      const updatedCandidate = { ...selectedCandidate, ...updates }
      setSelectedCandidate(updatedCandidate)
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...updates } : c))
      setIsEditingHeader(false)
    } catch {
      alert('Failed to save changes')
    } finally {
      setIsSavingHeader(false)
    }
  }

  const handlePanelResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedCandidate) return
    setIsUploadingResume(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'candidateresumes')
      formData.append('path', fileName)
      const uploadRes = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { publicUrl } = await uploadRes.json()
      const { error } = await supabase.from('candidates').update({ resume_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', selectedCandidate.id)
      if (error) throw error
      setSelectedCandidate(prev => prev ? { ...prev, resume_url: publicUrl } : prev)
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, resume_url: publicUrl } : c))
    } catch {
      alert('Failed to upload resume')
    } finally {
      setIsUploadingResume(false)
      e.target.value = ''
    }
  }

  const saveNotes = async () => {
    if (!selectedCandidate) return
    setIsSavingNotes(true)
    try {
      const { error } = await supabase.from('candidates').update({ recruiter_notes: editNotes.trim() || null, updated_at: new Date().toISOString() }).eq('id', selectedCandidate.id)
      if (error) throw error
      setSelectedCandidate(prev => prev ? { ...prev, recruiter_notes: editNotes.trim() || null } : prev)
      setIsEditingNotes(false)
    } catch {
      alert('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const submitActivityNote = async () => {
    if (!activityNoteText.trim() || !selectedCandidate) return
    setIsSubmittingNote(true)
    const authorName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : null
    const followUp = activityFollowUpDate || null
    try {
      const res = await fetch('/api/candidate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: selectedCandidate.id,
          search_id: searchId,
          activity_type: 'note',
          content: activityNoteText.trim(),
          visibility_level: 'team_only',
          created_by: profile?.id || null,
          author_name: authorName,
          follow_up_date: followUp,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add note')
      const newActivity: ActivityItem = {
        ...(data as ActivityItem),
        author_name: (data as ActivityItem).author_name || authorName,
        follow_up_date: (data as ActivityItem).follow_up_date || followUp,
      }
      setPanelActivities(prev => [newActivity, ...prev])
      // Update kanban card preview
      setLatestActivities(prev => ({ ...prev, [selectedCandidate.id]: newActivity }))
      setActivityNoteText('')
      setActivityFollowUpDate('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add note'
      alert(msg)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const savePanelNote = async (activityId: string) => {
    if (!editingPanelNoteText.trim()) {
      setEditingPanelNoteId(null)
      return
    }
    setIsSavingPanelNote(true)
    try {
      const { error } = await supabase.from('candidate_activity').update({ content: editingPanelNoteText.trim() }).eq('id', activityId)
      if (error) throw error
      setPanelActivities(prev => prev.map(a => a.id === activityId ? { ...a, content: editingPanelNoteText.trim() } : a))
      // Also update kanban card preview if this is the latest activity
      if (selectedCandidate) {
        setLatestActivities(prev => {
          const existing = prev[selectedCandidate.id]
          if (!existing || existing.id !== activityId) return prev
          return { ...prev, [selectedCandidate.id]: { ...existing, content: editingPanelNoteText.trim() } }
        })
      }
      setEditingPanelNoteId(null)
    } catch {
      alert('Failed to update note')
    } finally {
      setIsSavingPanelNote(false)
    }
  }

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // ---- Loading / Not Found ----
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-bg-page"><p className="text-navy">Loading pipeline...</p></div>
  }
  if (!search) {
    return <div className="min-h-screen flex items-center justify-center bg-bg-page"><p className="text-navy">Search not found</p></div>
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {/* ===== CONTEXT BAR ===== */}
      <SearchContextBar
        searchId={searchId}
        companyName={search.company_name}
        positionTitle={search.position_title}
        clientLogoUrl={(search as Record<string, unknown>).client_logo_url as string | null}
        launchDate={(search as Record<string, unknown>).launch_date as string | null}
        targetFillDate={(search as Record<string, unknown>).target_fill_date as string | null}
        status={(search as Record<string, unknown>).status as string | null}
        activePage="pipeline"
        onDatesUpdated={loadData}
      />

      {/* ===== PAGE TITLE + ADD CANDIDATE ===== */}
      <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center gap-2 sm:gap-4">
        <h1 className="text-2xl font-bold text-navy">Candidate Pipeline</h1>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all"
          style={{ backgroundColor: '#D97757' }}
        >
          <Plus className="w-4 h-4" />
          Add Candidate
        </button>
      </div>

      {/* ===== SEARCH DOCUMENTS ===== */}
      {searchDocuments.length > 0 && (
        <div className="px-4 sm:px-6 pb-3">
          <div className="bg-white rounded-lg border border-ds-border px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-navy" />
              <span className="text-xs font-semibold text-navy uppercase tracking-wider">Search Documents</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {searchDocuments.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-section border border-ds-border text-sm text-navy hover:border-navy/40 hover:shadow-sm transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-orange flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{doc.name}</span>
                  <Download className="w-3 h-3 text-text-muted flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== KANBAN BOARD ===== */}
      <div className="relative px-4 sm:px-6 py-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', height: archivedCandidates.length > 0 && showArchived ? 'calc(100vh - 200px)' : 'calc(100vh - 145px)' }}>
        <div className="inline-flex h-full">
          {columns.map((col, idx) => {
            const colCandidates = getColumnCandidates(col.id)
            const isDragOver = dragOverColumn === col.id

            return (
              <Fragment key={col.id}>
                {idx > 0 && (
                  <div
                    aria-hidden
                    className="w-px self-stretch mx-3"
                    style={{ backgroundColor: 'rgba(31, 60, 98, 0.12)' }}
                  />
                )}
                <div
                  className="flex-shrink-0 w-[260px] sm:w-[280px] min-w-[260px] sm:min-w-[280px] flex flex-col transition-colors rounded-[12px]"
                  style={{
                    backgroundColor: isDragOver ? 'rgba(31, 60, 98, 0.04)' : 'transparent',
                  }}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                {/* Column Header — navy bar */}
                <div className="flex-shrink-0 mb-3">
                  <StageHeader
                    variant="bar"
                    name={col.name}
                    count={colCandidates.length}
                    leadingIcon={getStageIcon(col.name, col.format)}
                    trailing={
                      !col.is_prospect ? (
                        <button
                          onClick={() => toggleStagePortalVisibility(col.id, !col.visible_in_portal)}
                          className="p-1 rounded text-white hover:bg-white/15 transition-colors"
                          title={col.visible_in_portal ? 'Visible in client portal — click to hide' : 'Hidden from client portal — click to show'}
                        >
                          {col.visible_in_portal
                            ? <Eye className="w-3.5 h-3.5" />
                            : <EyeOff className="w-3.5 h-3.5 opacity-70" />
                          }
                        </button>
                      ) : undefined
                    }
                  />
                </div>

                {/* Cards */}
                <div className="px-0 pb-3 space-y-3 flex-1 overflow-y-auto min-h-[100px]">
                  {colCandidates.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-6">No candidates</p>
                  ) : (
                    colCandidates.map((candidate) => {
                      const candIvs = candidateInterviews[candidate.id] || []
                      const isOnHold = candidate.status === 'on_hold'
                      const cardInterviews = candIvs
                        .filter(iv => !!iv.scheduled_at)
                        .map(iv => ({
                          id: iv.id,
                          candidate_id: iv.candidate_id,
                          scheduled_at: iv.scheduled_at as string,
                          interviewer_name: iv.interviewer_name || '',
                          stage_id: iv.stage_id,
                          status: iv.status,
                          interviewers: [],
                        })) as unknown as InterviewT[]

                      return (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate as unknown as CandidateT}
                        interviews={cardInterviews}
                        documents={searchDocuments as unknown as DocumentT[]}
                        draggable
                        onDragStart={(e) => handleDragStart(e, candidate.id)}
                        onDragEnd={handleDragEnd}
                        isDragging={dragCandidateId === candidate.id}
                        onClick={() => openPanel(candidate)}
                        muted={isOnHold}
                        showContact
                        nextInterviewOnly
                        badges={
                          <>
                            {isOnHold && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600">
                                <Pause className="w-2.5 h-2.5" /> Hold
                              </span>
                            )}
                            {candidate.visible_in_portal && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-navy/10 text-navy">
                                <Eye className="w-2.5 h-2.5" /> In portal
                              </span>
                            )}
                          </>
                        }
                        headerAction={
                          <div className="relative">
                            <button
                              onClick={() => setCardMenuOpen(cardMenuOpen === candidate.id ? null : candidate.id)}
                              className="p-1 rounded text-navy/50 hover:text-navy hover:bg-navy/5 transition-colors"
                              aria-label="Card actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {cardMenuOpen === candidate.id && (
                              <div
                                className="absolute right-0 top-7 w-44 bg-white rounded-[8px] py-1 z-20 shadow-lg"
                                style={{ border: '0.5px solid rgba(31, 60, 98, 0.12)' }}
                              >
                                {columns.findIndex(c => c.id === candidate.stage_id) < columns.length - 1 && (
                                  <button
                                    onClick={() => { setCardMenuOpen(null); advanceCandidate(candidate.id) }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-navy hover:bg-bg-section text-left"
                                  >
                                    <FastForward className="w-3 h-3" /> Advance
                                  </button>
                                )}
                                <button
                                  onClick={() => { setCardMenuOpen(null); holdCandidate(candidate.id) }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-navy hover:bg-bg-section text-left"
                                >
                                  {isOnHold
                                    ? <><Play className="w-3 h-3" /> Remove Hold</>
                                    : <><Pause className="w-3 h-3" /> Hold</>
                                  }
                                </button>
                                <button
                                  onClick={() => { setCardMenuOpen(null); toggleCandidatePortalVisibility(candidate.id, !candidate.visible_in_portal) }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-navy hover:bg-bg-section text-left"
                                >
                                  {candidate.visible_in_portal
                                    ? <><EyeOff className="w-3 h-3" /> Hide from portal</>
                                    : <><Eye className="w-3 h-3" /> Show in portal</>
                                  }
                                </button>
                                <button
                                  onClick={() => { setCardMenuOpen(null); archiveCandidate(candidate.id) }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 text-left"
                                >
                                  <Archive className="w-3 h-3" /> Archive
                                </button>
                              </div>
                            )}
                          </div>
                        }
                      />
                      )
                    })
                  )}
                </div>
                </div>
              </Fragment>
            )
          })}
        </div>

      </div>

      {/* ===== ARCHIVED SECTION ===== */}
      {archivedCandidates.length > 0 && (
        <div className="px-4 sm:px-6 pb-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-navy transition-colors py-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-0' : '-rotate-90'}`} />
            Archived ({archivedCandidates.length})
          </button>
          {showArchived && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {archivedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="bg-white rounded-[12px] p-4 opacity-70"
                  style={{ border: '0.5px solid rgba(31, 60, 98, 0.12)' }}
                >
                  <div className="flex items-start gap-3">
                    {candidate.photo_url ? (
                      <img src={candidate.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: '#9CA3AF' }}
                      >
                        {(candidate.first_name?.[0] || '').toUpperCase()}
                        {(candidate.last_name?.[0] || '').toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy break-words">
                        {candidate.first_name} {candidate.last_name}
                      </p>
                      {(candidate.current_title || candidate.current_company) && (
                        <p className="text-xs text-navy/60 break-words mt-0.5">
                          {candidate.current_title}
                          {candidate.current_title && candidate.current_company && ' · '}
                          {candidate.current_company}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Restore dropdown */}
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) restoreCandidate(candidate.id, e.target.value)
                      }}
                      className="flex-1 text-xs px-2 py-1 rounded border border-ds-border bg-white text-text-primary focus:outline-none focus:border-navy"
                    >
                      <option value="" disabled>Restore to...</option>
                      {prospectStageId && <option value={prospectStageId}>Prospect</option>}
                      {interviewStages.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <RotateCcw className="w-3 h-3 text-text-muted flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ADD CANDIDATE DIALOG ===== */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[560px] bg-white max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-navy">Add Candidate</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCandidate} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Resume upload — parse + auto-fill */}
              <div>
                <label
                  onDragEnter={(e) => { e.preventDefault(); setIsResumeDragOver(true) }}
                  onDragOver={(e) => { e.preventDefault(); setIsResumeDragOver(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsResumeDragOver(false) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsResumeDragOver(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) void handleResumeFile(file)
                  }}
                  className={`flex flex-col items-center justify-center rounded-[12px] py-6 px-4 cursor-pointer transition-colors text-center ${
                    isResumeDragOver ? 'bg-navy/5' : 'bg-bg-section hover:bg-navy/5'
                  }`}
                  style={{
                    border: `2px dashed ${isResumeDragOver ? '#1F3C62' : 'rgba(31, 60, 98, 0.25)'}`,
                  }}
                >
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleResumeFile(file)
                    }}
                  />
                  {isParsingResume ? (
                    <>
                      <Loader2 className="w-6 h-6 text-navy animate-spin" />
                      <p className="text-sm font-medium text-navy mt-2">Parsing resume…</p>
                      <p className="text-xs text-text-muted mt-0.5">Auto-filling the form — this takes a few seconds</p>
                    </>
                  ) : newResumeFile ? (
                    <>
                      <div className="flex items-center gap-2">
                        {parsedOnce ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-navy" />
                        )}
                        <span className="text-sm font-medium text-navy">{newResumeFile.name}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {parsedOnce
                          ? 'Parsed — review the fields below, edit as needed'
                          : newResumeFile.type === 'application/pdf'
                            ? 'Attached — will be uploaded on save'
                            : 'Attached (auto-parsing only works on PDFs — fill fields manually)'}
                        {' · '}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); resumeInputRef.current?.click() }}
                          className="underline hover:text-navy"
                        >
                          replace
                        </button>
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-navy/60" />
                      <p className="text-sm font-medium text-navy mt-2">Drop resume or click to upload</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        PDF auto-fills the form. DOC and DOCX also accepted for storage.
                      </p>
                    </>
                  )}
                </label>
                {parseError && (
                  <p className="text-xs text-red-600 mt-2">
                    Couldn&apos;t parse the resume: {parseError}. Fill the fields manually below — the file will still be saved on the candidate.
                  </p>
                )}
              </div>

              {/* Photo */}
              <div className="flex justify-center">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="w-20 h-20 rounded-full border-2 border-dashed border-ds-border flex items-center justify-center overflow-hidden hover:border-navy/30 transition-colors bg-bg-section">
                  {newPhotoPreview ? (
                    <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-text-muted" />
                  )}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">First Name *</Label>
                  <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="John" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Last Name *</Label>
                  <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Smith" required className="mt-1" />
                </div>
              </div>

              {/* Company / Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">Current Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="VP of Engineering" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Current Company</Label>
                  <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Acme Corp" className="mt-1" />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">Email</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jane@example.com" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Phone</Label>
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="555-123-4567" className="mt-1" />
                </div>
              </div>

              {/* LinkedIn */}
              <div>
                <Label className="text-xs font-semibold text-navy">LinkedIn URL</Label>
                <Input value={newLinkedin} onChange={(e) => setNewLinkedin(e.target.value)} placeholder="linkedin.com/in/..." className="mt-1" />
              </div>

              {/* YouTube + Website */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">YouTube URL</Label>
                  <Input value={newYoutube} onChange={(e) => setNewYoutube(e.target.value)} placeholder="youtube.com/@..." className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Personal Website</Label>
                  <Input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} placeholder="janesmith.com" className="mt-1" />
                </div>
              </div>

              {/* Additional Links */}
              <div>
                <Label className="text-xs font-semibold text-navy">Additional Links</Label>
                <p className="text-xs text-text-muted mt-0.5 mb-1">Paste any relevant URLs (one per line) — GitHub, portfolio, writing, etc.</p>
                <Textarea
                  value={newAdditionalLinks}
                  onChange={(e) => setNewAdditionalLinks(e.target.value)}
                  placeholder={'github.com/...\nmedium.com/...'}
                  rows={3}
                />
              </div>

              {/* Stage */}
              <div>
                <Label className="text-xs font-semibold text-navy">Stage</Label>
                <select
                  value={newStageId || prospectStageId || ''}
                  onChange={(e) => setNewStageId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-ds-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {prospectStageId && <option value={prospectStageId}>Prospect</option>}
                  {interviewStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* AI Summary — optional deep summary from the parsed resume */}
              {newResumeFile && !newSummary && !isGeneratingNewSummary && (
                <button
                  type="button"
                  onClick={handleGenerateNewSummary}
                  disabled={isGeneratingNewSummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-ds-border bg-white hover:bg-bg-section transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate AI summary from resume
                </button>
              )}

              {/* AI Summary panel */}
              {(newSummary || isGeneratingNewSummary) && (
                <div>
                  <Label className="text-xs font-semibold text-navy">AI Summary</Label>
                  <p className="text-xs text-text-muted mt-0.5 mb-1">Review and edit before saving</p>
                  <Textarea
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="Summary will appear here..."
                    rows={5}
                  />
                </div>
              )}

              {/* Extra fields (collapsed by default) */}
              <details className="group">
                <summary className="text-xs font-semibold text-text-muted cursor-pointer hover:text-text-primary">
                  More fields (location, notes)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-navy">Location</Label>
                    <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="City, State" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-navy">Internal Notes</Label>
                    <p className="text-xs text-text-muted mt-0.5 mb-1">Private — only visible to your team</p>
                    <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Add any context, sourcing notes, or first impressions..." rows={3} />
                  </div>
                </div>
              </details>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-ds-border flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setIsAddOpen(false) }} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-navy text-white">{isSubmitting ? 'Adding...' : 'Add Candidate'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== CANDIDATE EXPAND PANEL ===== */}
      {selectedCandidate && (
        <>
          <div className="fixed inset-0 top-[56px] bg-black/30 z-[60] transition-opacity" onClick={() => setSelectedCandidate(null)} />
          <input ref={panelResumeInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handlePanelResumeUpload} />

          <div className="fixed top-[56px] right-0 bottom-0 w-full sm:w-[45%] sm:min-w-[420px] max-w-[680px] bg-white z-[70] shadow-2xl flex flex-col">
            {/* Header — editable */}
            <div className="px-6 py-4 flex-shrink-0 bg-white border-b border-ds-border">
              {isEditingHeader ? (
                /* ---- EDIT MODE ---- */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-muted">Edit Candidate</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={cancelEditHeader} className="px-2.5 py-1 rounded text-xs font-medium text-text-muted hover:text-navy">Cancel</button>
                      <button onClick={saveHeader} disabled={isSavingHeader} className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold text-white bg-navy hover:bg-navy/90 disabled:opacity-50">
                        <Check className="w-3 h-3" /> {isSavingHeader ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} placeholder="First name" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                    <input value={editLastName} onChange={e => setEditLastName(e.target.value)} placeholder="Last name" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                    <input value={editCompany} onChange={e => setEditCompany(e.target.value)} placeholder="Company" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editLinkedin} onChange={e => setEditLinkedin(e.target.value)} placeholder="LinkedIn URL" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                    <input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Location" className="px-2.5 py-1.5 rounded text-sm bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none placeholder:text-text-muted" />
                  </div>
                </div>
              ) : (
                /* ---- VIEW MODE ---- */
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {selectedCandidate.photo_url ? (
                        <img src={selectedCandidate.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-navy/20 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold bg-navy">
                          {(selectedCandidate.first_name?.[0] || '').toUpperCase()}{(selectedCandidate.last_name?.[0] || '').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-navy truncate">{selectedCandidate.first_name} {selectedCandidate.last_name}</h2>
                        {(selectedCandidate.current_title || selectedCandidate.current_company) && (
                          <p className="text-sm text-text-secondary truncate">
                            {selectedCandidate.current_title}{selectedCandidate.current_title && selectedCandidate.current_company && ' at '}{selectedCandidate.current_company}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={startEditHeader} className="p-1.5 rounded hover:bg-bg-section transition-colors" title="Edit candidate">
                        <Pencil className="w-4 h-4 text-text-muted" />
                      </button>
                      <button onClick={() => setSelectedCandidate(null)} className="p-1.5 rounded hover:bg-bg-section transition-colors">
                        <X className="w-5 h-5 text-navy" />
                      </button>
                    </div>
                  </div>
                  {/* Quick links */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {selectedCandidate.resume_url ? (
                      <a href={selectedCandidate.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-navy/30 text-xs font-medium text-navy hover:bg-navy hover:text-white transition-colors">
                        <FileText className="w-3 h-3" /> Resume
                      </a>
                    ) : (
                      <button onClick={() => panelResumeInputRef.current?.click()} disabled={isUploadingResume} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-text-muted border border-dashed border-ds-border hover:border-navy hover:text-navy transition-colors disabled:opacity-50">
                        <Upload className="w-3 h-3" /> {isUploadingResume ? 'Uploading...' : 'Upload Resume'}
                      </button>
                    )}
                    {selectedCandidate.resume_url && (
                      <button onClick={() => panelResumeInputRef.current?.click()} disabled={isUploadingResume} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-text-muted hover:text-navy transition-colors disabled:opacity-50" title="Replace resume">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                    {selectedCandidate.linkedin_url && (
                      <a href={selectedCandidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-navy/30 text-xs font-medium text-navy hover:bg-navy hover:text-white transition-colors">
                        <Linkedin className="w-3 h-3" /> LinkedIn
                      </a>
                    )}
                    {selectedCandidate.email && selectedCandidate.email !== '' && (
                      <a href={`mailto:${selectedCandidate.email}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-text-secondary hover:text-navy transition-colors">
                        <Mail className="w-3 h-3" /> {selectedCandidate.email}
                      </a>
                    )}
                    {selectedCandidate.phone && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-text-muted">
                        <Phone className="w-3 h-3" /> {selectedCandidate.phone}
                      </span>
                    )}
                    {(() => {
                      const badge = getStageBadge(selectedCandidate.stage_id)
                      return <span className="ml-auto inline-block px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: badge.color }}>{badge.name}</span>
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Interview Timeline */}
            {interviewStages.length > 0 && selectedCandidate.stage_id !== prospectStageId && (
              <div className="px-6 py-3 border-b border-ds-border bg-bg-section/50 flex-shrink-0">
                <h4 className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Interview Progress</h4>
                <CandidateStageTimeline
                  stages={buildTimelineStages(selectedCandidate)}
                  variant="panel"
                  onStageClick={openScheduleForStage}
                />
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-ds-border flex-shrink-0">
              {([
                { id: 'activity' as const, label: 'Activity' },
                { id: 'summary' as const, label: 'Summary' },
                { id: 'documents' as const, label: `Docs${panelAttachments.length > 0 ? ` (${panelAttachments.length})` : ''}` },
                { id: 'feedback' as const, label: `Feedback${(panelFeedback.length + panelPanelistFeedback.length) > 0 ? ` (${panelFeedback.length + panelPanelistFeedback.length})` : ''}` },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPanelTab(tab.id)}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    panelTab === tab.id
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
              {isPanelLoading ? (
                <div className="flex items-center justify-center py-12"><p className="text-sm text-text-muted">Loading...</p></div>
              ) : (
                <>
                  {/* === SUMMARY TAB === */}
                  {panelTab === 'summary' && (
                    <div className="p-6 space-y-5">
                      {/* Summary */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-navy">Summary</h4>
                          <div className="flex items-center gap-2">
                            {!isEditingPanelSummary && (
                              <>
                                <button
                                  onClick={generatePanelSummary}
                                  disabled={!selectedCandidate.resume_url || isGeneratingPanelSummary}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-navy border border-ds-border bg-white hover:bg-bg-section transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  {isGeneratingPanelSummary ? 'Generating...' : panelSummary ? 'Regenerate' : 'Generate Summary'}
                                </button>
                                {panelSummary && (
                                  <button onClick={() => setIsEditingPanelSummary(true)} className="text-xs font-medium text-text-muted hover:text-text-primary">Edit</button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {isEditingPanelSummary ? (
                          <div className="space-y-2">
                            <textarea
                              value={panelSummary}
                              onChange={(e) => setPanelSummary(e.target.value)}
                              rows={8}
                              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none resize-y"
                              placeholder="Enter candidate summary..."
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => { setPanelSummary(selectedCandidate.summary || ''); setIsEditingPanelSummary(false) }} className="px-3 py-1.5 rounded text-xs font-semibold text-text-muted hover:text-text-primary">Cancel</button>
                              <Button size="sm" onClick={savePanelSummary} disabled={isSavingPanelSummary} className="bg-navy text-white text-xs font-bold">{isSavingPanelSummary ? 'Saving...' : 'Save'}</Button>
                            </div>
                          </div>
                        ) : panelSummary ? (
                          <div className="bg-bg-section rounded-lg p-4">
                            <p className="text-sm text-text-primary whitespace-pre-wrap">{panelSummary}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-text-muted italic">
                            {selectedCandidate.resume_url ? 'Click "Generate Summary" to create an AI summary from the resume' : 'Upload a resume to generate a summary'}
                          </p>
                        )}
                      </div>

                      {/* Contact / Details */}
                      {(selectedCandidate.location || selectedCandidate.phone) && (
                        <div>
                          <h4 className="text-sm font-bold text-navy mb-2">Details</h4>
                          <div className="bg-bg-section rounded-lg p-4 space-y-2">
                            {selectedCandidate.location && (
                              <div className="flex items-center gap-2 text-sm text-text-primary"><MapPin className="w-3.5 h-3.5 text-text-muted" />{selectedCandidate.location}</div>
                            )}
                            {selectedCandidate.phone && (
                              <div className="flex items-center gap-2 text-sm text-text-primary"><Phone className="w-3.5 h-3.5 text-text-muted" />{selectedCandidate.phone}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Internal Notes — editable */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-navy">Internal Notes</h4>
                          {!isEditingNotes && (
                            <button onClick={() => { setEditNotes(selectedCandidate.recruiter_notes || ''); setIsEditingNotes(true) }} className="text-xs font-medium text-text-muted hover:text-text-primary">
                              {selectedCandidate.recruiter_notes ? 'Edit' : 'Add notes'}
                            </button>
                          )}
                        </div>
                        {isEditingNotes ? (
                          <div className="space-y-2">
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none resize-y"
                              placeholder="Add sourcing notes, context, or first impressions..."
                              autoFocus
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => setIsEditingNotes(false)} className="px-3 py-1.5 rounded text-xs font-semibold text-text-muted hover:text-text-primary">Cancel</button>
                              <Button size="sm" onClick={saveNotes} disabled={isSavingNotes} className="bg-navy text-white text-xs font-bold">{isSavingNotes ? 'Saving...' : 'Save'}</Button>
                            </div>
                          </div>
                        ) : selectedCandidate.recruiter_notes ? (
                          <div className="bg-bg-section rounded-lg p-4">
                            <p className="text-sm text-text-primary whitespace-pre-wrap">{selectedCandidate.recruiter_notes}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-text-muted italic">No notes yet</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* === ACTIVITY TAB === */}
                  {panelTab === 'activity' && (
                    <div className="p-6">
                      {/* Quick note input */}
                      <div className="mb-5">
                        <textarea
                          value={activityNoteText}
                          onChange={(e) => setActivityNoteText(e.target.value)}
                          placeholder="Log a note..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none resize-none"
                          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitActivityNote() } }}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer group" title="Set a follow-up date">
                              <CalendarClock className="w-3.5 h-3.5 text-text-muted group-hover:text-navy transition-colors" />
                              <span className="group-hover:text-text-primary transition-colors">Follow-up</span>
                              <input
                                type="date"
                                value={activityFollowUpDate}
                                onChange={(e) => setActivityFollowUpDate(e.target.value)}
                                className="w-[120px] px-1.5 py-0.5 text-[11px] rounded border border-ds-border bg-white text-text-primary focus:border-navy focus:outline-none"
                              />
                            </label>
                            {activityFollowUpDate && (
                              <button onClick={() => setActivityFollowUpDate('')} className="text-[11px] text-text-muted hover:text-red-500">clear</button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-text-muted">Cmd+Enter</span>
                            <button
                              onClick={submitActivityNote}
                              disabled={!activityNoteText.trim() || isSubmittingNote}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold disabled:opacity-40 hover:bg-navy/90 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {isSubmittingNote ? 'Posting...' : 'Post'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {panelActivities.length === 0 ? (
                        <p className="text-sm text-text-muted italic text-center py-4">No activity recorded yet</p>
                      ) : (
                        <div className="space-y-3">
                          {panelActivities.map((item) => {
                            const isNote = item.activity_type === 'note'
                            const followUp = item.follow_up_date ? new Date(item.follow_up_date + 'T00:00:00') : null
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const isOverdue = followUp ? followUp.getTime() < today.getTime() : false
                            const isDueToday = followUp ? followUp.getTime() === today.getTime() : false
                            const isUrgent = isOverdue || isDueToday

                            const isEditing = editingPanelNoteId === item.id

                            return (
                              <div key={item.id} className={`flex gap-3 rounded-lg p-2.5 -mx-2.5 transition-colors group/note ${isUrgent ? 'bg-red-50 border border-red-200' : ''}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  isUrgent ? 'bg-red-100' : isNote ? 'bg-amber-50' : 'bg-navy/5'
                                }`}>
                                  {isUrgent ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : isNote ? <MessageSquare className="w-3.5 h-3.5 text-amber-600" /> : <FileText className="w-3.5 h-3.5 text-navy" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {item.author_name && (
                                      <p className="text-[11px] font-semibold text-navy mb-0.5">{item.author_name}</p>
                                    )}
                                    {isNote && !isEditing && (
                                      <button
                                        onClick={() => { setEditingPanelNoteId(item.id); setEditingPanelNoteText(item.content || '') }}
                                        className="p-0.5 rounded text-text-muted hover:text-navy opacity-0 group-hover/note:opacity-100 transition-opacity mb-0.5"
                                        title="Edit note"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  {isNote ? (
                                    isEditing ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editingPanelNoteText}
                                          onChange={(e) => setEditingPanelNoteText(e.target.value)}
                                          rows={3}
                                          className="w-full px-3 py-2 text-sm rounded-lg bg-white text-text-primary border border-navy/30 focus:border-navy focus:outline-none resize-y"
                                          autoFocus
                                          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); savePanelNote(item.id) } }}
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                          <span className="text-[11px] text-text-muted mr-auto">Cmd+Enter to save</span>
                                          <button
                                            onClick={() => setEditingPanelNoteId(null)}
                                            className="px-2.5 py-1 rounded text-xs font-medium text-text-muted hover:text-text-primary"
                                          >Cancel</button>
                                          <button
                                            onClick={() => savePanelNote(item.id)}
                                            disabled={isSavingPanelNote}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50"
                                          >
                                            <Check className="w-3 h-3" />
                                            {isSavingPanelNote ? 'Saving...' : 'Save'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-text-primary whitespace-pre-wrap">{item.content}</p>
                                    )
                                  ) : (
                                    <a href={item.file_url || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-orange">{item.file_name}</a>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-[11px] text-text-muted">{formatTimestamp(item.created_at)}</p>
                                    {item.visibility_level && item.visibility_level !== 'team_only' && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange/10 text-orange font-medium">Shared</span>
                                    )}
                                    {followUp && (
                                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                        isOverdue ? 'bg-red-100 text-red-700' :
                                        isDueToday ? 'bg-amber-100 text-amber-700' :
                                        'bg-blue-50 text-blue-600'
                                      }`}>
                                        <CalendarClock className="w-2.5 h-2.5" />
                                        {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `Follow-up ${followUp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* === DOCUMENTS TAB === */}
                  {panelTab === 'documents' && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-navy">Documents</h4>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-navy border border-ds-border bg-white hover:bg-bg-section transition-colors">
                          <input type="file" onChange={handlePanelDocUpload} className="hidden" />
                          <Upload className="w-3.5 h-3.5" />
                          {isUploadingPanelDoc ? 'Uploading...' : 'Attach Document'}
                        </label>
                      </div>
                      {/* Resume */}
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-text-muted mb-1.5">Resume</h5>
                        {selectedCandidate.resume_url ? (
                          <div className="flex items-center gap-3 p-3 bg-bg-section rounded-lg group">
                            <FileText className="w-4 h-4 text-navy flex-shrink-0" />
                            <a href={selectedCandidate.resume_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-navy hover:underline flex-1 truncate">Resume</a>
                            <a href={selectedCandidate.resume_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0"><ExternalLink className="w-3.5 h-3.5 text-text-muted" /></a>
                            <button onClick={() => panelResumeInputRef.current?.click()} disabled={isUploadingResume} className="text-text-muted hover:text-navy opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title="Replace resume">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => panelResumeInputRef.current?.click()} disabled={isUploadingResume} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-ds-border text-sm text-text-muted hover:border-navy/30 hover:text-text-primary transition-colors disabled:opacity-50">
                            <Upload className="w-4 h-4" /> {isUploadingResume ? 'Uploading...' : 'Upload Resume'}
                          </button>
                        )}
                      </div>
                      {/* Attachments */}
                      {panelAttachments.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-text-muted mb-1.5">Attachments</h5>
                          <div className="space-y-1">
                            {panelAttachments.map(att => (
                              <div key={att.id} className="flex items-center gap-3 p-3 bg-bg-section rounded-lg group">
                                <Paperclip className="w-4 h-4 text-text-muted flex-shrink-0" />
                                <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-orange flex-1 truncate">{att.file_name}</a>
                                <span className="text-xs text-text-muted flex-shrink-0">{new Date(att.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                <button onClick={() => deletePanelAttachment(att.id)} className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {panelAttachments.length === 0 && !selectedCandidate.resume_url && (
                        <p className="text-sm text-text-muted italic text-center py-4">No documents attached</p>
                      )}
                    </div>
                  )}

                  {/* === FEEDBACK TAB === */}
                  {panelTab === 'feedback' && (
                    <div className="p-6 space-y-4">
                      {panelPanelistFeedback.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-navy mb-3">Panelist Feedback</h4>
                          <div className="space-y-2">
                            {panelPanelistFeedback.map((fb) => (
                              <div key={fb.id} className="bg-bg-section rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-base">{fb.rating === 'thumbs_up' ? <ThumbsUp className="w-4 h-4 text-green-600" /> : fb.rating === 'thumbs_down' ? <ThumbsDown className="w-4 h-4 text-red-500" /> : <span className="text-sm">{'🤔'}</span>}</span>
                                  <span className="font-semibold text-sm text-navy">{fb.panelist_name}</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-auto ${
                                    fb.recommendation === 'advance' ? 'bg-green-100 text-green-700' :
                                    fb.recommendation === 'do_not_advance' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {fb.recommendation === 'advance' ? 'Advance' : fb.recommendation === 'do_not_advance' ? 'Do Not Advance' : 'Need More Info'}
                                  </span>
                                </div>
                                {fb.comments && <p className="text-sm text-text-primary mt-1">{fb.comments}</p>}
                                <p className="text-[11px] text-text-muted mt-1.5">{formatTimestamp(fb.submitted_at)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {panelFeedback.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-navy mb-3">Client Feedback</h4>
                          <div className="space-y-2">
                            {panelFeedback.map((fb) => (
                              <div key={fb.id} className="bg-bg-section rounded-lg p-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-semibold text-sm text-navy">{fb.reviewer_name}</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    fb.recommendation === 'advance' ? 'bg-green-100 text-green-700' :
                                    fb.recommendation === 'hold' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {fb.recommendation === 'advance' ? 'Advance' : fb.recommendation === 'hold' ? 'Hold' : 'Concern'}
                                  </span>
                                </div>
                                {fb.notes && <p className="text-sm text-text-primary mt-1">{fb.notes}</p>}
                                <p className="text-[11px] text-text-muted mt-1.5">{formatTimestamp(fb.created_at)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {panelFeedback.length === 0 && panelPanelistFeedback.length === 0 && (
                        <p className="text-sm text-text-muted italic text-center py-8">No feedback yet</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== SCHEDULE DATE DIALOG ===== */}
      <ScheduleDateDialog
        isOpen={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        onSchedule={handleScheduleInterview}
        onSkip={() => setScheduleDialogOpen(false)}
        stageName={scheduleDialogStageName}
        candidateName={scheduleDialogCandidate ? `${scheduleDialogCandidate.first_name} ${scheduleDialogCandidate.last_name}` : ''}
        existingDate={
          scheduleDialogCandidate && scheduleDialogStageId
            ? (candidateInterviews[scheduleDialogCandidate.id] || []).find(iv => iv.stage_id === scheduleDialogStageId)?.scheduled_at?.split('T')[0] || null
            : null
        }
        existingTime={
          scheduleDialogCandidate && scheduleDialogStageId
            ? (() => {
                const sa = (candidateInterviews[scheduleDialogCandidate.id] || []).find(iv => iv.stage_id === scheduleDialogStageId)?.scheduled_at
                if (!sa) return null
                const parts = sa.split('T')
                return parts[1] ? parts[1].substring(0, 5) : null
              })()
            : null
        }
        existingInterviewer={
          scheduleDialogCandidate && scheduleDialogStageId
            ? (candidateInterviews[scheduleDialogCandidate.id] || []).find(iv => iv.stage_id === scheduleDialogStageId)?.interviewer_name || null
            : null
        }
        existingGuideId={
          scheduleDialogCandidate && scheduleDialogStageId
            ? (candidateInterviews[scheduleDialogCandidate.id] || []).find(iv => iv.stage_id === scheduleDialogStageId)?.interview_guide_id || null
            : null
        }
        searchDocuments={searchDocuments.map(d => ({ id: d.id, name: d.name, file_url: d.file_url, type: d.type }))}
        searchId={searchId}
        onGuideUploaded={(doc) => {
          setSearchDocuments(prev => [{ id: doc.id, search_id: searchId, name: doc.name, type: doc.type, file_url: doc.file_url, created_at: new Date().toISOString() }, ...prev])
        }}
      />
    </div>
  )
}
