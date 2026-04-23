"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, Pencil, FileText, Mail, Phone, MapPin, User,
  ChevronRight, ChevronDown, Upload, Paperclip, X, Plus, Check, Linkedin, Eye,
  Calendar, NotebookPen, Sparkles, Trash2, ExternalLink
} from "lucide-react"
import type { VisibilityLevel, CandidateStageNote, StageNoteAttachment, InterviewFeedback, CandidateAttachment } from "@/types"

// ── Visibility helpers (used by Interview Progress stage cards) ─────
function VisibilitySelector({ value, onChange }: { value: VisibilityLevel; onChange: (v: VisibilityLevel) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as VisibilityLevel)}>
      <SelectTrigger className="h-7 text-xs px-2 w-[120px] sm:w-[140px] bg-white text-text-primary border-ds-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="team_only">Team Only</SelectItem>
        <SelectItem value="limited_access">Limited Access</SelectItem>
        <SelectItem value="full_access">Full Access</SelectItem>
      </SelectContent>
    </Select>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export default function CandidateProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const searchId = params.id as string
  const candidateId = params.candidateId as string

  // Core data
  const [candidate, setCandidate] = useState<any>(null)
  const [search, setSearch] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [interviews, setInterviews] = useState<any[]>([])
  const [stageNotes, setStageNotes] = useState<Record<string, CandidateStageNote>>({})
  const [feedbackMap, setFeedbackMap] = useState<Record<string, InterviewFeedback[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Editing state
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'recruiter' | 'client'>('recruiter')

  // Profile form (Header)
  const [form, setForm] = useState({
    first_name: '', last_name: '', current_company: '', current_title: '',
    location: '', phone: '', email: '', linkedin_url: '',
  })

  // Activity feed (Recruiter Assessment workspace) — per-stage
  const [activities, setActivities] = useState<any[]>([])
  const [assessmentNoteDrafts, setAssessmentNoteDrafts] = useState<Record<string, string>>({}) // key: stageId or 'general'
  const [assessmentVisibility, setAssessmentVisibility] = useState<Record<string, string>>({}) // key: stageId or 'general'
  const [savingAssessmentNote, setSavingAssessmentNote] = useState<string | null>(null) // stageId or 'general'
  const [uploadingAssessmentFile, setUploadingAssessmentFile] = useState<string | null>(null) // stageId or 'general'
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null)
  const [expandedAssessmentStages, setExpandedAssessmentStages] = useState<Record<string, boolean>>({})
  const [draggingSection, setDraggingSection] = useState<string | null>(null) // stageId or 'general'

  // Summary
  const [summaryText, setSummaryText] = useState('')
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isSavingSummary, setIsSavingSummary] = useState(false)

  // Candidate Attachments (documents)
  const [candidateAttachments, setCandidateAttachments] = useState<CandidateAttachment[]>([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [showSummarizePrompt, setShowSummarizePrompt] = useState(false)
  const [pendingTranscriptAttachment, setPendingTranscriptAttachment] = useState<CandidateAttachment | null>(null)
  const [isTranscriptSummarizing, setIsTranscriptSummarizing] = useState(false)

  // Resume
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [isUploadingResume, setIsUploadingResume] = useState(false)

  // Photo
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Interview Progress accordion
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
  const [stageNoteDrafts, setStageNoteDrafts] = useState<Record<string, { notes: string; visibility_level: VisibilityLevel }>>({})
  const [savingStageNote, setSavingStageNote] = useState<string | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState<string | null>(null)

  // Stage scheduling
  const [stageDates, setStageDates] = useState<Record<string, string>>({})
  const [stageInterviewers, setStageInterviewers] = useState<Record<string, string>>({})
  const [stageInterviewTypes, setStageInterviewTypes] = useState<Record<string, string>>({})

  // Decline modal
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null) // stageId
  const [declineWho, setDeclineWho] = useState<'recruiter' | 'candidate' | 'client'>('recruiter')
  const [declineReason, setDeclineReason] = useState('')
  const [declineNotes, setDeclineNotes] = useState('')
  const [isAdvancing, setIsAdvancing] = useState(false)

  // Panelist feedback
  const [panelistFeedback, setPanelistFeedback] = useState<any[]>([])
  const [sendingPortalLink, setSendingPortalLink] = useState<string | null>(null)

  // Add Stage inline form
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageInterviewer, setNewStageInterviewer] = useState('')
  const [isSavingStage, setIsSavingStage] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  // ── Load Data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [candidateRes, searchRes] = await Promise.all([
        supabase.from('candidates').select('*').eq('id', candidateId).single(),
        supabase.from('searches').select('*').eq('id', searchId).single(),
      ])

      if (candidateRes.data) {
        const c = candidateRes.data
        setCandidate(c)
        setForm({
          first_name: c.first_name || '', last_name: c.last_name || '',
          current_company: c.current_company || '', current_title: c.current_title || '',
          location: c.location || '', phone: c.phone || '',
          email: c.email || '', linkedin_url: c.linkedin_url || '',
        })
        setResumeUrl(c.resume_url || null)
        setSummaryText(c.summary || '')
        if (c.stage_id) setExpandedStageId(c.stage_id)
      }
      setSearch(searchRes.data)

      // Stages
      try {
        const { data } = await supabase.from('stages').select('*').eq('search_id', searchId).order('stage_order', { ascending: true })
        setStages(data || [])
      } catch {}

      // Interviews
      try {
        const { data, error } = await supabase.from('interviews').select('*, stages(name, stage_order), interviewers(*)').eq('candidate_id', candidateId).order('scheduled_at', { ascending: true })
        if (error) throw error
        setInterviews(data || [])
        const ids = (data || []).map((i: any) => i.id)
        if (ids.length > 0) {
          const { data: fb } = await supabase.from('interview_feedback').select('*').in('interview_id', ids)
          const m: Record<string, InterviewFeedback[]> = {}
          for (const f of (fb || [])) { if (!m[f.interview_id]) m[f.interview_id] = []; m[f.interview_id].push(f as InterviewFeedback) }
          setFeedbackMap(m)
        }
      } catch {
        try { const { data } = await supabase.from('interviews').select('*').eq('candidate_id', candidateId).order('scheduled_at', { ascending: true }); setInterviews(data || []) } catch {}
      }

      // Stage notes
      try {
        const { data } = await supabase.from('candidate_stage_notes').select('*, stage_note_attachments(*)').eq('candidate_id', candidateId)
        const nm: Record<string, CandidateStageNote> = {}; const dr: Record<string, { notes: string; visibility_level: VisibilityLevel }> = {}
        for (const n of (data || [])) { nm[n.stage_id] = { ...n, attachments: (n as any).stage_note_attachments || (n as any).attachments || [] } as CandidateStageNote; dr[n.stage_id] = { notes: n.notes || '', visibility_level: n.visibility_level } }
        setStageNotes(nm); setStageNoteDrafts(dr)
      } catch {}

      // Candidate activity feed
      try {
        const { data } = await supabase.from('candidate_activity').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })
        setActivities(data || [])
      } catch {}

      // Panelist feedback
      try {
        const { data: pfData } = await supabase
          .from('panelist_feedback')
          .select('*')
          .eq('candidate_id', candidateId)
          .eq('search_id', searchId)
          .order('submitted_at', { ascending: false })
        setPanelistFeedback(pfData || [])
      } catch {}

      // Candidate attachments (documents)
      try {
        const { data: attachData } = await supabase.from('candidate_attachments').select('*').eq('candidate_id', candidateId).order('uploaded_at', { ascending: false })
        setCandidateAttachments(attachData || [])
      } catch {}

      // Contacts + team members
      try { const { data } = await supabase.from('contacts').select('id, name, title').eq('search_id', searchId).order('is_primary', { ascending: false }); setContacts(data || []) } catch {}
      try {
        let { data } = await supabase.from('search_team_members').select('id, role, member_name, profiles(first_name, last_name)').eq('search_id', searchId).order('created_at', { ascending: true })
        if (!data) { const fb = await supabase.from('search_team_members').select('id, role, profiles(first_name, last_name)').eq('search_id', searchId).order('created_at', { ascending: true }); data = fb.data as any }
        setTeamMembers((data || []).map((tm: any) => ({ id: tm.id, name: (tm as any).member_name || (tm.profiles ? `${tm.profiles.first_name} ${tm.profiles.last_name}` : ''), role: tm.role })))
      } catch {}
    } catch (err) { console.error('Error loading candidate:', err) }
    finally { setIsLoading(false) }
  }, [candidateId, searchId])

  useEffect(() => { loadData() }, [loadData])

  // ── Send panelist portal link ─────────────────────────────────
  const sendPanelistPortalLink = async (panelistId: string) => {
    setSendingPortalLink(panelistId)
    try {
      const response = await fetch('/api/panelist/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelistId, searchId }),
      })
      const data = await response.json()
      if (data.success) {
        // Copy URL to clipboard for easy sharing
        await navigator.clipboard.writeText(data.portalUrl)
        alert('Portal link copied to clipboard!\n\nURL: ' + data.portalUrl)
      } else {
        alert('Failed to generate portal link: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error sending portal link:', err)
      alert('Failed to send portal link')
    } finally {
      setSendingPortalLink(null)
    }
  }

  // ── Save handlers ─────────────────────────────────────────────
  const saveProfile = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.from('candidates').update({
        first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        current_company: form.current_company.trim() || null, current_title: form.current_title.trim() || null,
        location: form.location.trim() || null, phone: form.phone.trim() || null,
        email: form.email.trim() || '', linkedin_url: form.linkedin_url.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', candidateId)
      if (error) throw error
      setEditingSection(null); loadData()
    } catch { alert('Failed to save changes') } finally { setIsSaving(false) }
  }

  // ── File uploads (via server-side API to bypass storage RLS) ──
  const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    formData.append('path', path)
    const res = await fetch('/api/upload-file', { method: 'POST', body: formData })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Upload failed (${res.status})`)
    }
    const { publicUrl } = await res.json()
    return publicUrl
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return }
    setIsUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop()
      const fn = `${searchId}/${candidateId}-photo-${Date.now()}.${ext}`
      const publicUrl = await uploadFile('candidate-photos', fn, file)
      await supabase.from('candidates').update({ photo_url: publicUrl }).eq('id', candidateId)
      loadData()
    } catch (err: any) { console.error('Photo upload error:', err); alert('Failed to upload photo') } finally { setIsUploadingPhoto(false) }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('File must be less than 10MB'); return }
    setIsUploadingResume(true)
    try {
      const ext = file.name.split('.').pop()
      const fn = `${searchId}/${candidateId}-resume-${Date.now()}.${ext}`
      const publicUrl = await uploadFile('candidateresumes', fn, file)
      await supabase.from('candidates').update({ resume_url: publicUrl }).eq('id', candidateId)
      setResumeUrl(publicUrl)
    } catch (err: any) { console.error('Resume upload error:', err); alert('Failed to upload resume') } finally { setIsUploadingResume(false) }
  }

  // ── Summary handlers ─────────────────────────────────────
  const generateSummary = async () => {
    if (!resumeUrl) return
    setIsGeneratingSummary(true)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, resumeUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary')
      setSummaryText(data.summary)
      setIsEditingSummary(true)
    } catch (err: any) {
      console.error('Generate summary error:', err)
      alert(`Failed to generate summary: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const saveSummary = async () => {
    setIsSavingSummary(true)
    try {
      const { error } = await supabase.from('candidates').update({ summary: summaryText.trim() || null, updated_at: new Date().toISOString() }).eq('id', candidateId)
      if (error) throw error
      setCandidate((prev: any) => prev ? { ...prev, summary: summaryText.trim() || null } : prev)
      setIsEditingSummary(false)
    } catch { alert('Failed to save summary') }
    finally { setIsSavingSummary(false) }
  }

  const cancelSummaryEdit = () => {
    setSummaryText(candidate?.summary || '')
    setIsEditingSummary(false)
  }

  // ── Candidate Attachment handlers ───────────────────────
  const SUMMARIZABLE_EXTS = ['mp4', 'webm', 'mov', 'mp3', 'wav', 'txt', 'docx', 'pdf']

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('File must be less than 25MB'); return }
    setIsUploadingAttachment(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const fn = `${searchId}/${candidateId}/doc-${Date.now()}.${ext}`
      const publicUrl = await uploadFile('documents', fn, file)
      const { data, error } = await supabase.from('candidate_attachments').insert({
        candidate_id: candidateId,
        file_name: file.name,
        file_url: publicUrl,
        label: file.name,
        visibility: 'full_access',
      }).select().single()
      if (error) throw error
      const attachment = data as CandidateAttachment
      setCandidateAttachments(prev => [attachment, ...prev])
      // Prompt for AI summarization if file type is summarizable
      if (SUMMARIZABLE_EXTS.includes(ext)) {
        setPendingTranscriptAttachment(attachment)
        setShowSummarizePrompt(true)
      }
    } catch (err: any) { console.error('Attachment upload error:', err); alert('Failed to upload document') }
    finally { setIsUploadingAttachment(false); e.target.value = '' }
  }

  const handleTranscriptSummarize = async () => {
    if (!pendingTranscriptAttachment) return
    const ext = pendingTranscriptAttachment.file_name.split('.').pop()?.toLowerCase() || ''
    const videoAudioExts = ['mp4', 'webm', 'mov', 'mp3', 'wav']
    if (videoAudioExts.includes(ext)) {
      alert('Video/audio files require a transcript for summarization. Please upload a text or PDF transcript.')
      setShowSummarizePrompt(false)
      setPendingTranscriptAttachment(null)
      return
    }
    setIsTranscriptSummarizing(true)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          fileUrl: pendingTranscriptAttachment.file_url,
          fileName: pendingTranscriptAttachment.file_name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary')
      // Append to existing summary with separator
      const datePart = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const newSection = `--- Interview Summary (${datePart}) ---\n${data.summary}`
      setSummaryText(prev => prev ? `${prev}\n\n${newSection}` : newSection)
      setIsEditingSummary(true)
    } catch (err: any) {
      console.error('Transcript summarize error:', err)
      alert(`Failed to summarize: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsTranscriptSummarizing(false)
      setShowSummarizePrompt(false)
      setPendingTranscriptAttachment(null)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase.from('candidate_attachments').delete().eq('id', attachmentId)
      if (error) throw error
      setCandidateAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch { alert('Failed to delete document') }
  }

  // ── Activity Feed handlers (per-stage) ─────────────────────
  const saveAssessmentNote = async (sectionKey: string) => {
    const content = assessmentNoteDrafts[sectionKey]?.trim()
    if (!content) return
    setSavingAssessmentNote(sectionKey)
    const stageId = sectionKey === 'general' ? null : sectionKey
    const visibility = assessmentVisibility[sectionKey] || 'team_only'
    try {
      const baseData: any = {
        candidate_id: candidateId,
        search_id: searchId,
        activity_type: 'note',
        content,
        visibility_level: visibility,
        created_by: profile?.id || null,
      }
      // Try with stage_id first, fall back without if column doesn't exist yet
      let data: any, error: any
      if (stageId) {
        const res = await supabase.from('candidate_activity').insert({ ...baseData, stage_id: stageId }).select().single()
        if (res.error?.message?.includes('stage_id')) {
          console.warn('stage_id column not found, saving without stage association')
          const fallback = await supabase.from('candidate_activity').insert(baseData).select().single()
          data = fallback.data; error = fallback.error
        } else { data = res.data; error = res.error }
      } else {
        const res = await supabase.from('candidate_activity').insert(baseData).select().single()
        data = res.data; error = res.error
      }
      if (error) { console.error('Failed to save assessment note:', error); throw error }
      setActivities(prev => [data, ...prev])
      setAssessmentNoteDrafts(prev => ({ ...prev, [sectionKey]: '' }))
    } catch (err) { console.error('saveAssessmentNote error:', err); alert('Failed to save note') }
    finally { setSavingAssessmentNote(null) }
  }

  const handleAssessmentFileUpload = async (sectionKey: string, files: FileList | File[]) => {
    console.log('[Upload] Starting upload for section:', sectionKey, 'files:', Array.from(files).map(f => f.name))
    setUploadingAssessmentFile(sectionKey)
    const stageId = sectionKey === 'general' ? null : sectionKey
    const visibility = assessmentVisibility[sectionKey] || 'team_only'
    try {
      for (const file of Array.from(files)) {
        console.log('[Upload] Processing file:', file.name, 'size:', file.size, 'type:', file.type)
        if (file.size > 50 * 1024 * 1024) { alert(`${file.name} exceeds 50MB limit`); continue }
        const ext = file.name.split('.').pop()
        const fn = `${searchId}/${candidateId}/activity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
        console.log('[Upload] Uploading to storage bucket "stagenotefiles" path:', fn)
        const publicUrl = await uploadFile('stagenotefiles', fn, file)
        console.log('[Upload] Storage upload succeeded, URL:', publicUrl)
        const baseFileData: any = {
          candidate_id: candidateId,
          search_id: searchId,
          activity_type: 'file',
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          visibility_level: visibility,
          created_by: profile?.id || null,
        }
        console.log('[Upload] Inserting into candidate_activity, stageId:', stageId)
        let data: any, error: any
        if (stageId) {
          const res = await supabase.from('candidate_activity').insert({ ...baseFileData, stage_id: stageId }).select().single()
          if (res.error?.message?.includes('stage_id')) {
            console.warn('[Upload] stage_id column not found, retrying without it')
            const fallback = await supabase.from('candidate_activity').insert(baseFileData).select().single()
            data = fallback.data; error = fallback.error
          } else { data = res.data; error = res.error }
        } else {
          const res = await supabase.from('candidate_activity').insert(baseFileData).select().single()
          data = res.data; error = res.error
        }
        if (error) { console.error('[Upload] DB insert FAILED:', JSON.stringify(error)); throw error }
        console.log('[Upload] Success! Activity saved:', data?.id)
        setActivities(prev => [data, ...prev])
      }
    } catch (err: any) { console.error('[Upload] CAUGHT ERROR:', err?.message || err, err); alert(`Failed to upload file: ${err?.message || 'Unknown error'}`) }
    finally { setUploadingAssessmentFile(null); setDraggingSection(null) }
  }

  const handleAssessmentFileInput = (sectionKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return
    handleAssessmentFileUpload(sectionKey, files)
    e.target.value = ''
  }

  const updateActivityVisibility = async (activityId: string, visibility: string) => {
    try {
      const { error } = await supabase.from('candidate_activity').update({ visibility_level: visibility }).eq('id', activityId)
      if (error) throw error
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, visibility_level: visibility } : a))
    } catch { alert('Failed to update visibility') }
  }

  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase.from('candidate_activity').delete().eq('id', activityId)
      if (error) throw error
      setActivities(prev => prev.filter(a => a.id !== activityId))
    } catch { alert('Failed to delete') }
  }

  // ── Stage Notes ───────────────────────────────────────────────
  const saveStageNote = async (stageId: string) => {
    const draft = stageNoteDrafts[stageId]; if (!draft) return
    setSavingStageNote(stageId)
    try {
      const { error } = await supabase.from('candidate_stage_notes').upsert({ candidate_id: candidateId, stage_id: stageId, search_id: searchId, notes: draft.notes.trim() || null, visibility_level: draft.visibility_level, updated_at: new Date().toISOString() }, { onConflict: 'candidate_id,stage_id' })
      if (error) throw error
      const { data } = await supabase.from('candidate_stage_notes').select('*, stage_note_attachments(*)').eq('candidate_id', candidateId).eq('stage_id', stageId).single()
      if (data) setStageNotes(prev => ({ ...prev, [stageId]: { ...data, attachments: (data as any).stage_note_attachments || (data as any).attachments || [] } as CandidateStageNote }))
    } catch { alert('Failed to save note') } finally { setSavingStageNote(null) }
  }

  const handleStageVisibilityChange = async (stageId: string, v: VisibilityLevel) => {
    setStageNoteDrafts(prev => ({ ...prev, [stageId]: { ...(prev[stageId] || { notes: '' }), visibility_level: v } }))
    try { await supabase.from('candidate_stage_notes').upsert({ candidate_id: candidateId, stage_id: stageId, search_id: searchId, visibility_level: v, notes: stageNoteDrafts[stageId]?.notes?.trim() || stageNotes[stageId]?.notes || null, updated_at: new Date().toISOString() }, { onConflict: 'candidate_id,stage_id' }) } catch {}
  }

  const handleStageAttachmentUpload = async (stageId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return
    const validFiles = Array.from(files).filter(f => {
      if (f.size > 10 * 1024 * 1024) { alert(`${f.name} is too large (max 10MB)`); return false }
      return true
    })
    if (validFiles.length === 0) return
    let noteId = stageNotes[stageId]?.id
    if (!noteId) {
      console.log('[AttachUpload] No existing note, creating one for stage', stageId)
      const { data, error } = await supabase.from('candidate_stage_notes').upsert({ candidate_id: candidateId, stage_id: stageId, search_id: searchId, notes: stageNoteDrafts[stageId]?.notes?.trim() || null, visibility_level: stageNoteDrafts[stageId]?.visibility_level || 'team_only', updated_at: new Date().toISOString() }, { onConflict: 'candidate_id,stage_id' }).select().single()
      console.log('[AttachUpload] Upsert result:', { data, error })
      if (error || !data) { alert('Failed to create note record: ' + (error?.message || 'unknown')); return }
      noteId = data.id
    }
    console.log('[AttachUpload] Using noteId:', noteId, 'for', validFiles.length, 'file(s)')
    setUploadingAttachment(stageId)
    try {
      for (const file of validFiles) {
        const ext = file.name.split('.').pop()
        const fn = `${searchId}/${candidateId}/${stageId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
        console.log('[AttachUpload] Uploading', file.name, 'to', fn)
        const publicUrl = await uploadFile('stagenotefiles', fn, file)
        console.log('[AttachUpload] Got URL:', publicUrl)
        const { error: attachErr } = await supabase.from('stage_note_attachments').insert({ stage_note_id: noteId, file_name: file.name, file_url: publicUrl, file_type: file.type.startsWith('video/') ? 'video' : 'document', file_size: file.size })
        console.log('[AttachUpload] Attachment insert result:', attachErr ? attachErr : 'OK')
        if (attachErr) { alert('Failed to save attachment record: ' + attachErr.message); return }
      }
      const { data: refreshed } = await supabase.from('candidate_stage_notes').select('*, stage_note_attachments(*)').eq('id', noteId).single()
      console.log('[AttachUpload] Refreshed note:', refreshed)
      if (refreshed) setStageNotes(prev => ({ ...prev, [stageId]: { ...refreshed, attachments: (refreshed as any).stage_note_attachments || (refreshed as any).attachments || [] } as CandidateStageNote }))
    } catch (err) { console.error('[AttachUpload] Error:', err); alert('Failed to upload file(s)') } finally { setUploadingAttachment(null); e.target.value = '' }
  }

  const deleteStageAttachment = async (stageId: string, attachmentId: string) => {
    try {
      await supabase.from('stage_note_attachments').delete().eq('id', attachmentId)
      setStageNotes(prev => { const n = prev[stageId]; if (!n) return prev; return { ...prev, [stageId]: { ...n, attachments: (n.attachments || []).filter(a => a.id !== attachmentId) } } })
    } catch { alert('Failed to delete file') }
  }

  // ── Add Stage ─────────────────────────────────────────────────
  const getInterviewerName = (value: string): string => {
    if (!value) return ''
    const tm = teamMembers.find((t: any) => `team-${t.id}` === value); if (tm) return tm.name
    const c = contacts.find((c: any) => c.id === value); if (c) return c.name
    return value
  }

  const addStage = async () => {
    if (!newStageName.trim()) return
    setIsSavingStage(true)
    try {
      const d: any = { search_id: searchId, name: newStageName.trim(), stage_order: stages.length }
      if (newStageInterviewer) d.interviewer_name = getInterviewerName(newStageInterviewer)
      const { error } = await supabase.from('stages').insert(d); if (error) throw error
      const { data: fresh } = await supabase.from('stages').select('*').eq('search_id', searchId).order('stage_order', { ascending: true })
      if (fresh) setStages(fresh)
      setNewStageName(''); setNewStageInterviewer(''); setShowAddStage(false)
    } catch (err: any) { alert(`Failed to add stage: ${err?.message || 'Unknown error'}`) }
    finally { setIsSavingStage(false) }
  }

  // ── Quick Action (stage recommendation) ──────────────────────
  const handleQuickAction = (stageId: string, recommendation: string) => {
    setStageNoteDrafts(prev => {
      const existing = prev[stageId] || { notes: '', visibility_level: 'team_only' as VisibilityLevel }
      const prefix = `Recommendation: ${recommendation}`
      const newNotes = existing.notes ? `${prefix}\n${existing.notes}` : prefix
      return { ...prev, [stageId]: { ...existing, notes: newNotes } }
    })
    setExpandedStageId(stageId)
  }

  // ── Cancel Edit ───────────────────────────────────────────────
  const cancelEdit = () => {
    if (candidate) {
      setForm({ first_name: candidate.first_name || '', last_name: candidate.last_name || '', current_company: candidate.current_company || '', current_title: candidate.current_title || '', location: candidate.location || '', phone: candidate.phone || '', email: candidate.email || '', linkedin_url: candidate.linkedin_url || '' })
    }
    setEditingSection(null)
  }

  // ── Inline Components ─────────────────────────────────────────
  const EditButton = ({ section }: { section: string }) => (
    <button onClick={() => setEditingSection(section)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-white border border-white/40 bg-transparent hover:bg-white hover:text-navy transition-colors">
      <Pencil className="w-3.5 h-3.5" /> Edit
    </button>
  )

  const SaveCancelButtons = ({ onSave }: { onSave: () => void }) => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving} className="bg-white text-text-primary border-ds-border">Cancel</Button>
      <Button size="sm" onClick={onSave} disabled={isSaving} className="bg-navy text-white font-bold">{isSaving ? 'Saving...' : 'Save'}</Button>
    </div>
  )

  // ── Stage helpers ─────────────────────────────────────────────
  // ── Advance / Decline handlers ──────────────────────────────
  const advanceCandidate = async (currentStageId: string) => {
    setIsAdvancing(true)
    try {
      const currentIndex = stages.findIndex(s => s.id === currentStageId)
      if (currentIndex < 0 || currentIndex >= stages.length - 1) {
        alert('No next stage available')
        return
      }
      const nextStage = stages[currentIndex + 1]
      const now = new Date().toISOString()
      
      await supabase.from('candidates').update({
        stage_id: nextStage.id,
        updated_at: now,
      }).eq('id', candidateId)
      
      // Log activity
      await supabase.from('candidate_activity').insert({
        candidate_id: candidateId,
        search_id: searchId,
        activity_type: 'note',
        content: `Advanced to ${nextStage.name}`,
        visibility_level: 'team_only',
        created_by: profile?.id || null,
      })
      
      loadData()
    } catch (err) { console.error('Failed to advance:', err); alert('Failed to advance candidate') }
    finally { setIsAdvancing(false) }
  }

  const declineCandidate = async (stageId: string) => {
    try {
      const reasons = [declineReason, declineNotes].filter(Boolean).join(' — ')
      const whoLabel = declineWho === 'recruiter' ? 'Recruiter' : declineWho === 'candidate' ? 'Candidate' : 'Client'
      const stageName = stages.find(s => s.id === stageId)?.name || 'Unknown'
      
      await supabase.from('candidates').update({
        status: 'declined',
        updated_at: new Date().toISOString(),
      }).eq('id', candidateId)
      
      // Log the decline
      await supabase.from('candidate_activity').insert({
        candidate_id: candidateId,
        search_id: searchId,
        activity_type: 'note',
        content: `Declined at ${stageName} — ${whoLabel}: ${reasons || 'No reason given'}`,
        visibility_level: 'team_only',
        created_by: profile?.id || null,
      })
      
      setShowDeclineModal(null)
      setDeclineWho('recruiter')
      setDeclineReason('')
      setDeclineNotes('')
      loadData()
    } catch (err) { console.error('Failed to decline:', err); alert('Failed to decline candidate') }
  }

  const saveStageSchedule = async (stageId: string) => {
    const date = stageDates[stageId]
    const interviewer = stageInterviewers[stageId]
    const interviewType = stageInterviewTypes[stageId]
    if (!date) return
    
    try {
      await supabase.from('interviews').insert({
        candidate_id: candidateId,
        search_id: searchId,
        stage_id: stageId,
        scheduled_at: date,
        interviewer_name: interviewer || null,
        interview_type: interviewType || null,
        status: 'scheduled',
      })
      loadData()
    } catch (err) { console.error('Failed to schedule:', err); alert('Failed to save schedule') }
  }

  const getStageState = (stage: any): 'completed' | 'current' | 'future' => {
    if (!candidate) return 'future'
    const cur = stages.find(s => s.id === candidate.stage_id)
    if (!cur) return 'future'
    if (stage.id === candidate.stage_id) return 'current'
    return stage.stage_order < cur.stage_order ? 'completed' : 'future'
  }

  const getInterviewsForStage = (stageId: string) => interviews.filter((i: any) => i.stage_id === stageId)

  const formatActivityTimestamp = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  // ── Loading / Not Found ───────────────────────────────────────
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-bg-page"><p className="text-navy">Loading candidate...</p></div>
  if (!candidate) return <div className="min-h-screen flex items-center justify-center bg-bg-page"><p className="text-navy">Candidate not found</p></div>

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-page">
      {/* TOP NAV BAR */}
      <div className="bg-white border-b-2 border-ds-border">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/searches/${searchId}/candidates`)} className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pipeline
            </Button>
            {search && (<><div className="h-6 w-px bg-ds-border" /><p className="text-sm font-semibold text-text-secondary">{search.company_name} — {search.position_title}</p></>)}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-4">

        {/* ══════════════════════════════════════════════════════════
            HEADER CARD — navy background, full width
           ══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl" style={{ background: 'linear-gradient(to bottom, #1F3C62, #1A3358)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div className="p-6">
            {editingSection === 'profile' ? (
              <div className="space-y-4 bg-white rounded-lg p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-sm font-bold text-navy">First Name *</Label><Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                  <div><Label className="text-sm font-bold text-navy">Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-sm font-bold text-navy">Current Title</Label><Input value={form.current_title} onChange={(e) => setForm(f => ({ ...f, current_title: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                  <div><Label className="text-sm font-bold text-navy">Current Company</Label><Input value={form.current_company} onChange={(e) => setForm(f => ({ ...f, current_company: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><Label className="text-sm font-bold text-navy">Location</Label><Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                  <div><Label className="text-sm font-bold text-navy">Phone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                  <div><Label className="text-sm font-bold text-navy">Email</Label><Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                </div>
                <div><Label className="text-sm font-bold text-navy">LinkedIn URL</Label><Input value={form.linkedin_url} onChange={(e) => setForm(f => ({ ...f, linkedin_url: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                <div className="flex justify-end"><SaveCancelButtons onSave={saveProfile} /></div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-5">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    {candidate.photo_url ? (
                      <label className="cursor-pointer group relative">
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        <img src={candidate.photo_url} alt="" className="w-[56px] sm:w-[72px] h-[56px] sm:h-[72px] rounded-full object-cover border-[3px] border-white group-hover:opacity-80 transition-opacity" />
                        {isUploadingPhoto && <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full"><span className="text-[10px] text-white font-medium">uploading...</span></div>}
                      </label>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        <div className="w-[56px] sm:w-[72px] h-[56px] sm:h-[72px] rounded-full border-[3px] border-white flex items-center justify-center hover:opacity-80 transition-opacity"><User className="w-8 h-8 text-white/50" /></div>
                      </label>
                    )}
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold truncate text-white">{candidate.first_name} {candidate.last_name}</h2>
                    {(candidate.current_title || candidate.current_company) && (
                      <p className="text-[15px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {candidate.current_title}{candidate.current_title && candidate.current_company && ' at '}<span className="font-semibold text-white/90">{candidate.current_company}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0"><EditButton section="profile" /></div>
                </div>
                {/* Location | Phone | Email — hide empty fields */}
                {(candidate.location || candidate.phone || candidate.email) && (
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  {candidate.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0 text-white/50" /><span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{candidate.location}</span></div>}
                  {candidate.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 flex-shrink-0 text-white/50" /><span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{candidate.phone}</span></div>}
                  {candidate.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 flex-shrink-0 text-white/50" /><a href={`mailto:${candidate.email}`} className="text-sm hover:underline" style={{ color: 'rgba(255,255,255,0.75)' }}>{candidate.email}</a></div>}
                </div>
                )}
                {/* Resume / LinkedIn row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white/50" />
                      {resumeUrl ? (
                        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-white">{candidate.first_name} {candidate.last_name} - Resume</a>
                      ) : <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No resume uploaded</span>}
                    </div>
                    <div className="h-4 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <div className="flex items-center gap-2">
                      {candidate.linkedin_url ? (
                        <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <Linkedin className="w-4 h-4" />LinkedIn Profile
                        </a>
                      ) : (
                        <button onClick={() => setEditingSection('profile')} className="text-white/50 hover:text-white/80 text-sm transition-colors">Add LinkedIn</button>
                      )}
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" />
                    <span className="text-sm font-medium px-3 py-1.5 rounded-md text-white border border-white/40 bg-transparent hover:bg-white hover:text-navy transition-colors inline-block">{isUploadingResume ? 'Uploading...' : resumeUrl ? 'Replace' : 'Upload'}</span>
                  </label>
                </div>

                {/* Summary section */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white/80">Summary</span>
                    <div className="flex items-center gap-2">
                      {!isEditingSummary && (
                        <>
                          <button
                            onClick={generateSummary}
                            disabled={!resumeUrl || isGeneratingSummary}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white border border-white/40 bg-transparent hover:bg-white hover:text-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isGeneratingSummary ? 'Generating...' : summaryText ? 'Regenerate' : 'Generate Summary'}
                          </button>
                          {summaryText && (
                            <button
                              onClick={() => setIsEditingSummary(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white border border-white/40 bg-transparent hover:bg-white hover:text-navy transition-colors"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {isEditingSummary ? (
                    <div className="space-y-2">
                      <textarea
                        value={summaryText}
                        onChange={(e) => setSummaryText(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white text-text-primary border border-ds-border focus:border-navy focus:outline-none resize-y"
                        placeholder="Enter candidate summary..."
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={cancelSummaryEdit} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white border border-white/40 bg-transparent hover:bg-white hover:text-navy transition-colors">Cancel</button>
                        <button onClick={saveSummary} disabled={isSavingSummary} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-navy hover:bg-white/90 transition-colors disabled:opacity-50">{isSavingSummary ? 'Saving...' : 'Save Summary'}</button>
                      </div>
                    </div>
                  ) : summaryText ? (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>{summaryText}</p>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{resumeUrl ? 'Click "Generate Summary" to create an AI summary from the resume' : 'Upload a resume to generate an AI summary'}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            CANDIDATE DOCUMENTS — attachments card
           ══════════════════════════════════════════════════════════ */}
        {candidateAttachments.length > 0 || true ? (
          <div className="bg-white rounded-xl shadow-sm border border-ds-border">
            <div className="px-5 py-3 border-b border-ds-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-navy" />
                <h3 className="text-sm font-bold text-navy">Documents</h3>
                {candidateAttachments.length > 0 && <span className="text-xs text-text-muted">({candidateAttachments.length})</span>}
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-ds-border bg-white hover:bg-bg-section transition-colors">
                <input type="file" onChange={handleAttachmentUpload} className="hidden" />
                <Upload className="w-3.5 h-3.5" />
                {isUploadingAttachment ? 'Uploading...' : 'Attach Document'}
              </label>
            </div>
            {candidateAttachments.length > 0 ? (
              <div className="divide-y divide-ds-border">
                {candidateAttachments.map((att) => (
                  <div key={att.id} className="px-5 py-2.5 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-orange flex-1 truncate">{att.file_name}</a>
                    <span className="text-xs text-text-muted flex-shrink-0">{new Date(att.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <button onClick={() => deleteAttachment(att.id)} className="text-text-muted hover:text-red-500 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="text-sm text-text-muted">No documents attached yet</p>
              </div>
            )}
            {/* AI Summarize prompt */}
            {showSummarizePrompt && pendingTranscriptAttachment && (
              <div className="px-5 py-3 border-t border-ds-border bg-blue-50 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-navy flex-shrink-0" />
                <span className="text-sm text-navy flex-1">Would you like AI to summarize this file?</span>
                <button
                  onClick={handleTranscriptSummarize}
                  disabled={isTranscriptSummarizing}
                  className="px-3 py-1 rounded-md text-xs font-semibold bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-50"
                >{isTranscriptSummarizing ? 'Summarizing...' : 'Yes'}</button>
                <button
                  onClick={() => { setShowSummarizePrompt(false); setPendingTranscriptAttachment(null) }}
                  className="px-3 py-1 rounded-md text-xs font-semibold text-text-muted border border-ds-border bg-white hover:bg-bg-section transition-colors"
                >No</button>
              </div>
            )}
          </div>
        ) : null}

        {/* TOP TABS + CONTENT */}
        <div style={{ minHeight: '500px' }}>
          {/* TOP TABS */}
          <div className="flex gap-1 mb-4">
            {[
              { id: 'recruiter' as const, label: 'Recruiter View', icon: NotebookPen },
              { id: 'client' as const, label: 'Client View', icon: Eye },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-navy border-t-2 border-x border-ds-border shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/60'
                  }`}
                  style={isActive ? { borderTopColor: 'var(--orange)' } : {}}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* TAB CONTENT */}
          <div className="bg-white rounded-xl shadow-sm p-8">

              {/* ── RECRUITER VIEW ── */}
              {activeTab === 'recruiter' && (
                <>
                  <div className="divide-y divide-ds-border">
                    {stages.map((stage) => {
                      const state = getStageState(stage)
                      const isExpanded = expandedStageId === stage.id
                      const stageInterviews = getInterviewsForStage(stage.id)
                      const note = stageNotes[stage.id]
                      const draft = stageNoteDrafts[stage.id] || { notes: '', visibility_level: 'team_only' as VisibilityLevel }
                      const canExpand = true

                      return (
                        <div key={stage.id} className={state === 'future' ? 'bg-bg-section' : 'bg-white'}>
                          <div
                            onClick={() => { if (canExpand) setExpandedStageId(isExpanded ? null : stage.id) }}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left ${canExpand ? 'hover:bg-bg-section cursor-pointer' : 'cursor-default'}`}>
                            {state === 'completed' ? <Check className="w-4 h-4 flex-shrink-0 text-green-600" />
                              : canExpand ? (isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0 text-text-muted" /> : <ChevronRight className="w-4 h-4 flex-shrink-0 text-text-muted" />)
                              : <ChevronRight className="w-4 h-4 flex-shrink-0 text-text-muted" />}
                            <div className={`flex-1 min-w-0 flex items-center gap-3 ${isExpanded ? 'border-l-4 pl-3' : ''}`} style={isExpanded ? { borderColor: 'var(--orange)' } : {}}>
                              <span className={`text-sm ${isExpanded ? 'font-bold text-navy' : 'font-semibold text-text-primary'}`}>{stage.name}</span>
                              {stage.interviewer_name && <span className="text-xs text-text-muted">{stage.interviewer_name}</span>}
                              {state !== 'future' && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${state === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {state === 'completed' ? 'Completed' : 'Current'}
                                </span>
                              )}
                              {stageInterviews.length > 0 && <span className="text-xs text-text-muted">{stageInterviews.length} interview{stageInterviews.length !== 1 ? 's' : ''}</span>}
                            </div>
                            {/* Quick action buttons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleQuickAction(stage.id, 'Advance')}
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              >Yes</button>
                              <button
                                onClick={() => handleQuickAction(stage.id, 'Decline')}
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              >No</button>
                              <button
                                onClick={() => handleQuickAction(stage.id, 'Need More Info')}
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              >Need More Info</button>
                              <button
                                onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                                className="text-text-muted hover:text-navy p-0.5"
                                title="Notes"
                              >
                                <NotebookPen className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && canExpand && (
                            <div className="px-4 pb-6 space-y-4">
                              {/* Schedule & Interviewer */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1">Date & Time</label>
                                  <input
                                    type="datetime-local"
                                    value={stageDates[stage.id] || ''}
                                    onChange={(e) => setStageDates(prev => ({ ...prev, [stage.id]: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1">With</label>
                                  <select
                                    value={stageInterviewers[stage.id] || ''}
                                    onChange={(e) => setStageInterviewers(prev => ({ ...prev, [stage.id]: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none"
                                  >
                                    <option value="">Select...</option>
                                    {teamMembers.length > 0 && <optgroup label="Recruiting Team">{teamMembers.map((tm: any) => <option key={`tm-${tm.id}`} value={tm.name}>{tm.name}</option>)}</optgroup>}
                                    {contacts.length > 0 && <optgroup label="Client Team">{contacts.map((c: any) => <option key={`c-${c.id}`} value={c.name}>{c.name}{c.title ? ` — ${c.title}` : ''}</option>)}</optgroup>}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1">Type</label>
                                  <select
                                    value={stageInterviewTypes[stage.id] || ''}
                                    onChange={(e) => setStageInterviewTypes(prev => ({ ...prev, [stage.id]: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none"
                                  >
                                    <option value="">Select...</option>
                                    <option value="phone">Phone</option>
                                    <option value="video">Video</option>
                                    <option value="in_person">In Person</option>
                                  </select>
                                </div>
                              </div>
                              {stageDates[stage.id] && (
                                <Button size="sm" onClick={() => saveStageSchedule(stage.id)} className="bg-navy text-white text-xs font-bold">Save Schedule</Button>
                              )}

                              {/* Existing scheduled interviews */}
                              {stageInterviews.length > 0 && (
                                <div className="space-y-2">
                                  {stageInterviews.map((interview: any) => (
                                    <div key={interview.id} className="flex items-center gap-3 text-sm bg-bg-section rounded-lg px-3 py-2">
                                      <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" />
                                      <span className="font-medium text-text-primary">{interview.interviewer_name || 'TBD'}</span>
                                      {interview.scheduled_at && <span className="text-text-muted">{new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(interview.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                                      {interview.interview_type && <span className="text-xs px-2 py-0.5 rounded bg-white border border-ds-border text-text-muted capitalize">{interview.interview_type.replace('_', ' ')}</span>}
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${interview.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-navy/10 text-navy'}`}>
                                        {interview.status?.charAt(0).toUpperCase() + interview.status?.slice(1)}
                                      </span>
                                      {/* Send Portal Link for panelist interviewers */}
                                      {interview.interviewers?.map((interviewer: any) => {
                                        // Check if this interviewer might be a panelist by their contact_id
                                        return (
                                          <button
                                            key={`portal-${interviewer.id}`}
                                            onClick={(e) => { e.stopPropagation(); sendPanelistPortalLink(interviewer.contact_id) }}
                                            disabled={sendingPortalLink === interviewer.contact_id}
                                            className="text-[10px] px-1.5 py-0.5 rounded border border-orange/30 text-orange hover:bg-orange/10 font-medium flex-shrink-0 ml-1"
                                            title={`Send portal link to ${interviewer.contact_name}`}
                                          >
                                            {sendingPortalLink === interviewer.contact_id ? '...' : 'Portal'}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Notes */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block">Notes</label>
                                <textarea value={draft.notes} onChange={(e) => setStageNoteDrafts(prev => ({ ...prev, [stage.id]: { ...(prev[stage.id] || { visibility_level: 'team_only' as VisibilityLevel }), notes: e.target.value } }))} rows={3} placeholder="Add notes for this stage..." className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none resize-y" />
                              </div>

                              {/* Attachments */}
                              <div className="space-y-2">
                                {(note?.attachments || []).length > 0 && <div className="space-y-1">{(note?.attachments || []).map((att: StageNoteAttachment) => (
                                  <div key={att.id} className="flex items-center gap-2 text-sm text-text-secondary bg-bg-section rounded px-3 py-1.5">
                                    <Paperclip className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex-1 truncate text-orange">{att.file_name}</a>
                                    {att.file_size && <span className="text-xs text-text-muted flex-shrink-0">{formatFileSize(att.file_size)}</span>}
                                    <button
                                      onClick={async () => {
                                        const newVis = att.file_type === 'client_shared' ? 'document' : 'client_shared'
                                        await supabase.from('stage_note_attachments').update({ file_type: newVis }).eq('id', att.id)
                                        loadData()
                                      }}
                                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 transition-colors ${
                                        att.file_type === 'client_shared'
                                          ? 'bg-orange/10 border-orange text-orange'
                                          : 'border-ds-border text-text-muted hover:border-orange hover:text-orange'
                                      }`}
                                    >
                                      <Eye className="w-3 h-3" />
                                      {att.file_type === 'client_shared' ? 'Shared' : 'Share'}
                                    </button>
                                    <button onClick={() => deleteStageAttachment(stage.id, att.id)} className="text-text-muted hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}</div>}
                                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary cursor-pointer">
                                  <input type="file" multiple onChange={(e) => handleStageAttachmentUpload(stage.id, e)} className="hidden" />
                                  <Upload className="w-3.5 h-3.5" />{uploadingAttachment === stage.id ? 'Uploading...' : 'Add Files'}
                                </label>
                              </div>

                              {/* Save Notes + Advance/Decline */}
                              <div className="flex items-center justify-between pt-3 border-t border-ds-border">
                                <div className="flex items-center gap-3">
                                  <Button size="sm" onClick={() => saveStageNote(stage.id)} disabled={savingStageNote === stage.id} className="bg-navy text-white font-bold text-xs">{savingStageNote === stage.id ? 'Saving...' : 'Save Notes'}</Button>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={draft.visibility_level !== 'team_only'} onChange={(e) => handleStageVisibilityChange(stage.id, e.target.checked ? 'limited_access' : 'team_only')} className="h-4 w-4 rounded border-ds-border text-orange focus:ring-orange" />
                                    <span className="text-xs text-text-muted">Share with Client</span>
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setShowDeclineModal(stage.id)} className="border-red-300 text-red-600 hover:bg-red-50 font-bold text-xs">Decline</Button>
                                  {stages.findIndex(s => s.id === stage.id) < stages.length - 1 && (
                                    <Button size="sm" onClick={() => advanceCandidate(stage.id)} disabled={isAdvancing} className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs">{isAdvancing ? 'Moving...' : 'Advance'}</Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Decline Modal */}
                          {showDeclineModal === stage.id && (
                            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDeclineModal(null)}>
                              <div className="bg-white rounded-xl shadow-lg p-6 w-full sm:w-[420px] space-y-4" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-bold text-navy">Decline Candidate</h3>
                                <p className="text-sm text-text-muted">Record why {candidate?.first_name} {candidate?.last_name} is being removed at {stage.name}.</p>
                                <div>
                                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1">Who Decided?</label>
                                  <select value={declineWho} onChange={(e) => setDeclineWho(e.target.value as any)} className="w-full h-9 px-3 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none">
                                    <option value="recruiter">Recruiter</option>
                                    <option value="candidate">Candidate</option>
                                    <option value="client">Client</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1">Reason</label>
                                  <select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} className="w-full h-9 px-3 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none">
                                    <option value="">Select reason...</option>
                                    <option value="Not Qualified">Not Qualified</option>
                                    <option value="Compensation">Compensation</option>
                                    <option value="Location">Location</option>
                                    <option value="Not Ready to Move">Not Ready to Move</option>
                                    <option value="Took Another Offer">Took Another Offer</option>
                                    <option value="Timing">Timing</option>
                                    <option value="Culture Fit">Culture Fit</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1">Additional Notes</label>
                                  <textarea value={declineNotes} onChange={(e) => setDeclineNotes(e.target.value)} rows={2} placeholder="Optional details..." className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none resize-y" />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                  <Button variant="outline" size="sm" onClick={() => setShowDeclineModal(null)} className="bg-white text-text-primary border-ds-border">Cancel</Button>
                                  <Button size="sm" onClick={() => declineCandidate(stage.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold">Confirm Decline</Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {stages.length === 0 && <div className="px-4 py-8 text-center"><p className="text-sm text-text-muted">No stages configured for this search</p></div>}

                    {/* + Add Stage */}
                    <div className="px-4 py-3">
                      {showAddStage ? (
                        <div className="space-y-3">
                          <div className="flex items-end gap-3">
                            <div className="flex-1"><Label className="text-xs font-semibold text-text-secondary">Stage Name *</Label><Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="e.g., Technical Interview" className="mt-1 h-9 bg-white text-text-primary border border-ds-border text-sm" /></div>
                            <div className="flex-1">
                              <Label className="text-xs font-semibold text-text-secondary">Interviewer</Label>
                              <select value={newStageInterviewer} onChange={(e) => setNewStageInterviewer(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-ds-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                <option value="">Not assigned</option>
                                {teamMembers.length > 0 && <optgroup label="Recruiting Team">{teamMembers.map((tm: any) => <option key={`team-${tm.id}`} value={`team-${tm.id}`}>{tm.name}{tm.role ? ` — ${tm.role}` : ''}</option>)}</optgroup>}
                                {contacts.length > 0 && <optgroup label="Client Team">{contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.title ? ` — ${c.title}` : ''}</option>)}</optgroup>}
                              </select>
                            </div>
                            <Button size="sm" onClick={addStage} disabled={isSavingStage || !newStageName.trim()} className="h-9 bg-navy text-white font-bold">{isSavingStage ? 'Saving...' : 'Save'}</Button>
                            <Button variant="outline" size="sm" onClick={() => { setShowAddStage(false); setNewStageName(''); setNewStageInterviewer('') }} className="h-9 bg-white text-text-primary border-ds-border">Cancel</Button>
                          </div>
                          <p className="text-xs text-text-muted">This stage will be added to the pipeline for all candidates in this search.</p>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddStage(true)} className="flex items-center gap-1.5 text-sm font-medium hover:underline text-orange"><Plus className="w-4 h-4" /> Add Stage</button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── PANELIST FEEDBACK SECTION ── */}
              {activeTab === 'recruiter' && panelistFeedback.length > 0 && (
                <div className="mt-6">
                  <div className="bg-white rounded-lg border border-ds-border shadow-sm">
                    <div className="px-4 py-3 bg-navy rounded-t-lg">
                      <h3 className="text-base font-bold text-white">Panelist Feedback ({panelistFeedback.length})</h3>
                    </div>
                    <div className="divide-y divide-ds-border">
                      {panelistFeedback.map((fb: any) => (
                        <div key={fb.id} className="px-4 py-3">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-base">
                              {fb.rating === 'thumbs_up' ? '👍' : fb.rating === 'thumbs_down' ? '👎' : '🤔'}
                            </span>
                            <span className="font-semibold text-sm text-navy">{fb.panelist_name}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              fb.recommendation === 'advance'
                                ? 'bg-green-100 text-green-700'
                                : fb.recommendation === 'do_not_advance'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {fb.recommendation === 'advance' ? 'Advance' :
                               fb.recommendation === 'do_not_advance' ? 'Do Not Advance' : 'Need More Info'}
                            </span>
                            <span className="text-xs text-text-muted ml-auto">
                              {new Date(fb.submitted_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: 'numeric', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {fb.comments && (
                            <p className="text-sm text-text-primary ml-8">{fb.comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── CLIENT VIEW TAB ── */}
              {activeTab === 'client' && (() => {
                const sharedActivities = activities.filter((a: any) => a.visibility_level === 'limited_access' || a.visibility_level === 'full_access')
                return (
                  <>
                    {/* Preview badge */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 mb-6">
                      <Eye className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs font-medium text-amber-700">Preview — this is what the client team sees in the portal</p>
                    </div>

                    {/* Candidate header card */}
                    <div className="bg-bg-section rounded-lg p-5 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {candidate.photo_url ? (
                            <img src={candidate.photo_url} alt={`${candidate.first_name} ${candidate.last_name}`} className="w-16 h-16 rounded-full object-cover border-2" style={{ borderColor: 'var(--navy)' }} />
                          ) : (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold bg-navy">
                              {(candidate.first_name?.[0] || '').toUpperCase()}{(candidate.last_name?.[0] || '').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-navy">{candidate.first_name} {candidate.last_name}</h3>
                          {(candidate.current_title || candidate.current_company) && (
                            <p className="text-sm text-text-primary mt-0.5">
                              {candidate.current_title}{candidate.current_title && candidate.current_company && ' at '}{candidate.current_company && <span className="font-medium">{candidate.current_company}</span>}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
                            {candidate.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{candidate.location}</span>}
                            {candidate.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{candidate.phone}</span>}
                            {candidate.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{candidate.email}</span>}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            {candidate.linkedin_url && (
                              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline text-navy">
                                <span className="flex items-center gap-1"><Linkedin className="w-3.5 h-3.5" />LinkedIn Profile</span>
                              </a>
                            )}
                            {resumeUrl && (
                              <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline text-orange">
                                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Resume</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    {candidate.summary && (
                      <div className="bg-bg-section rounded-lg p-5 mb-6">
                        <h3 className="text-base font-bold text-navy mb-2">Summary</h3>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{candidate.summary}</p>
                      </div>
                    )}

                    {/* Candidate Attachments */}
                    {candidateAttachments.filter(a => a.visibility === 'full_access').length > 0 && (
                      <div className="bg-bg-section rounded-lg p-5 mb-6">
                        <h3 className="text-base font-bold text-navy mb-3">Documents</h3>
                        <div className="space-y-2">
                          {candidateAttachments.filter(a => a.visibility === 'full_access').map(att => (
                            <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-white/80 transition-colors border border-ds-border">
                              <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                              <span className="text-sm font-medium text-navy flex-1 truncate">{att.file_name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shared Activity Feed */}
                    {sharedActivities.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="text-base font-bold text-navy">Shared Notes & Files</h3>
                        {sharedActivities.map((item: any) => {
                          const isNote = item.activity_type === 'note'
                          return (
                            <div key={item.id} className="border border-ds-border rounded-lg bg-white px-4 py-3">
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isNote ? 'bg-amber-50' : 'bg-navy/5'}`}>
                                  {isNote ? <Pencil className="w-3.5 h-3.5 text-amber-600" /> : <FileText className="w-3.5 h-3.5 text-navy" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {isNote ? (
                                    <p className="text-sm text-text-primary whitespace-pre-wrap">{item.content}</p>
                                  ) : (
                                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="group">
                                      <p className="text-sm font-medium group-hover:underline text-orange">{item.file_name}</p>
                                      <p className="text-xs text-text-muted mt-0.5">
                                        {item.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                        {item.file_size ? ` · ${formatFileSize(item.file_size)}` : ''}
                                      </p>
                                    </a>
                                  )}
                                  <p className="text-[11px] text-text-muted mt-1">{formatActivityTimestamp(item.created_at)}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted italic text-center py-4">No shared notes or files yet</p>
                    )}
                  </>
                )
              })()}

            </div>
        </div>

      </div>
    </div>
  )
}
