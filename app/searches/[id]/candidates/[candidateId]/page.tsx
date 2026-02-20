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
  Calendar, NotebookPen
} from "lucide-react"
import type { VisibilityLevel, CandidateStageNote, StageNoteAttachment, InterviewFeedback } from "@/types"

// ── Visibility helpers (used by Interview Progress stage cards) ─────
function VisibilitySelector({ value, onChange }: { value: VisibilityLevel; onChange: (v: VisibilityLevel) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as VisibilityLevel)}>
      <SelectTrigger className="h-7 text-xs px-2 w-[140px] bg-white text-text-primary border-ds-border">
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
  const [activeTab, setActiveTab] = useState<'interview' | 'assessment' | 'client'>('interview')

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
        if (c.stage_id) setExpandedStageId(c.stage_id)
      }
      setSearch(searchRes.data)

      // Stages
      try {
        const { data } = await supabase.from('stages').select('*').eq('search_id', searchId).gte('stage_order', 0).order('stage_order', { ascending: true })
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
        for (const n of (data || [])) { nm[n.stage_id] = n as CandidateStageNote; dr[n.stage_id] = { notes: n.notes || '', visibility_level: n.visibility_level } }
        setStageNotes(nm); setStageNoteDrafts(dr)
      } catch {}

      // Candidate activity feed
      try {
        const { data } = await supabase.from('candidate_activity').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })
        setActivities(data || [])
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
      if (data) setStageNotes(prev => ({ ...prev, [stageId]: data as CandidateStageNote }))
    } catch { alert('Failed to save note') } finally { setSavingStageNote(null) }
  }

  const handleStageVisibilityChange = async (stageId: string, v: VisibilityLevel) => {
    setStageNoteDrafts(prev => ({ ...prev, [stageId]: { ...(prev[stageId] || { notes: '' }), visibility_level: v } }))
    try { await supabase.from('candidate_stage_notes').upsert({ candidate_id: candidateId, stage_id: stageId, search_id: searchId, visibility_level: v, notes: stageNoteDrafts[stageId]?.notes?.trim() || stageNotes[stageId]?.notes || null, updated_at: new Date().toISOString() }, { onConflict: 'candidate_id,stage_id' }) } catch {}
  }

  const handleStageAttachmentUpload = async (stageId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('File must be less than 10MB'); return }
    let noteId = stageNotes[stageId]?.id
    if (!noteId) {
      const { data, error } = await supabase.from('candidate_stage_notes').upsert({ candidate_id: candidateId, stage_id: stageId, search_id: searchId, notes: stageNoteDrafts[stageId]?.notes?.trim() || null, visibility_level: stageNoteDrafts[stageId]?.visibility_level || 'team_only', updated_at: new Date().toISOString() }, { onConflict: 'candidate_id,stage_id' }).select().single()
      if (error || !data) { alert('Failed to create note record'); return }
      noteId = data.id
    }
    setUploadingAttachment(stageId)
    try {
      const ext = file.name.split('.').pop()
      const fn = `${searchId}/${candidateId}/${stageId}-${Date.now()}.${ext}`
      const publicUrl = await uploadFile('stagenotefiles', fn, file)
      await supabase.from('stage_note_attachments').insert({ stage_note_id: noteId, file_name: file.name, file_url: publicUrl, file_type: file.type.startsWith('video/') ? 'video' : 'document', file_size: file.size })
      const { data: refreshed } = await supabase.from('candidate_stage_notes').select('*, stage_note_attachments(*)').eq('id', noteId).single()
      if (refreshed) setStageNotes(prev => ({ ...prev, [stageId]: refreshed as CandidateStageNote }))
    } catch { alert('Failed to upload file') } finally { setUploadingAttachment(null) }
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
      const { data: fresh } = await supabase.from('stages').select('*').eq('search_id', searchId).gte('stage_order', 0).order('stage_order', { ascending: true })
      if (fresh) setStages(fresh)
      setNewStageName(''); setNewStageInterviewer(''); setShowAddStage(false)
    } catch (err: any) { alert(`Failed to add stage: ${err?.message || 'Unknown error'}`) }
    finally { setIsSavingStage(false) }
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
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><p className="text-navy">Loading candidate...</p></div>
  if (!candidate) return <div className="min-h-screen flex items-center justify-center bg-white"><p className="text-navy">Candidate not found</p></div>

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-page">
      {/* TOP NAV BAR */}
      <div className="bg-white border-b-2 border-ds-border">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/searches/${searchId}/candidates`)} className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pipeline
            </Button>
            {search && (<><div className="h-6 w-px bg-ds-border" /><p className="text-sm font-semibold text-text-secondary">{search.company_name} — {search.position_title}</p></>)}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-6 px-6 space-y-4">

        {/* ══════════════════════════════════════════════════════════
            HEADER CARD — navy background, full width
           ══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl" style={{ background: 'linear-gradient(to bottom, #1F3C62, #1A3358)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div className="p-6">
            {editingSection === 'profile' ? (
              <div className="space-y-4 bg-white rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-sm font-bold text-navy">First Name *</Label><Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                  <div><Label className="text-sm font-bold text-navy">Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-sm font-bold text-navy">Current Title</Label><Input value={form.current_title} onChange={(e) => setForm(f => ({ ...f, current_title: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                  <div><Label className="text-sm font-bold text-navy">Current Company</Label><Input value={form.current_company} onChange={(e) => setForm(f => ({ ...f, current_company: e.target.value }))} className="mt-1 bg-white text-text-primary border border-ds-border" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
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
                        <img src={candidate.photo_url} alt="" className="w-[72px] h-[72px] rounded-full object-cover border-[3px] border-white group-hover:opacity-80 transition-opacity" />
                        {isUploadingPhoto && <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full"><span className="text-[10px] text-white font-medium">uploading...</span></div>}
                      </label>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white flex items-center justify-center hover:opacity-80 transition-opacity"><User className="w-8 h-8 text-white/50" /></div>
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
                <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  {candidate.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0 text-white/50" /><span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{candidate.location}</span></div>}
                  {candidate.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 flex-shrink-0 text-white/50" /><span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{candidate.phone}</span></div>}
                  {candidate.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 flex-shrink-0 text-white/50" /><a href={`mailto:${candidate.email}`} className="text-sm hover:underline" style={{ color: 'rgba(255,255,255,0.75)' }}>{candidate.email}</a></div>}
                </div>
                )}
                {/* Resume / LinkedIn row */}
                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
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
              </>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            LEFT PANEL + RIGHT CONTENT
           ══════════════════════════════════════════════════════════ */}
        <div className="flex gap-4" style={{ minHeight: '500px' }}>
          {/* LEFT PANEL — nav tabs */}
          <div className="w-[240px] flex-shrink-0 rounded-xl shadow-sm bg-white">
            <nav className="flex flex-col">
              {[
                { id: 'interview' as const, label: 'Interview Progress', icon: Calendar },
                { id: 'assessment' as const, label: 'Recruiter Assessment', icon: NotebookPen },
                { id: 'client' as const, label: 'Client View', icon: Eye },
              ].map((tab, idx, arr) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                      isActive ? 'font-semibold text-navy' : 'font-normal'
                    }`}
                    style={{
                      padding: '14px 20px',
                      borderLeft: isActive ? '3px solid var(--orange)' : '3px solid transparent',
                      background: isActive ? 'rgba(232,113,58,0.06)' : undefined,
                      color: isActive ? undefined : '#6B7280',
                      borderBottom: idx < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F9FAFB' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm p-8">

              {/* ── INTERVIEW STAGES (interview tab only) ── */}
              {activeTab === 'interview' && (
                <>
                  <h3 className="text-lg font-semibold mb-4 text-text-primary">Interview Progress</h3>
                  <div className="divide-y divide-ds-border">
                    {stages.map((stage) => {
                      const state = getStageState(stage)
                      const isExpanded = expandedStageId === stage.id
                      const stageInterviews = getInterviewsForStage(stage.id)
                      const note = stageNotes[stage.id]
                      const draft = stageNoteDrafts[stage.id] || { notes: '', visibility_level: 'team_only' as VisibilityLevel }
                      const canExpand = state !== 'future'

                      return (
                        <div key={stage.id} className={state === 'future' ? 'bg-bg-section' : 'bg-white'}>
                          <button onClick={() => { if (canExpand) setExpandedStageId(isExpanded ? null : stage.id) }}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left ${canExpand ? 'hover:bg-bg-section cursor-pointer' : 'cursor-default'}`} disabled={!canExpand}>
                            {state === 'completed' ? <Check className="w-4 h-4 flex-shrink-0 text-green-600" />
                              : canExpand ? (isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0 text-text-muted" /> : <ChevronRight className="w-4 h-4 flex-shrink-0 text-text-muted" />)
                              : <ChevronRight className="w-4 h-4 flex-shrink-0 text-text-muted" />}
                            <div className={`flex-1 min-w-0 flex items-center gap-3 ${state === 'current' ? 'border-l-4 pl-3' : ''}`} style={state === 'current' ? { borderColor: 'var(--orange)' } : {}}>
                              <span className={`text-sm font-semibold ${state === 'future' ? 'text-text-muted' : 'text-text-primary'}`}>{stage.name}</span>
                              {stage.interviewer_name && <span className="text-xs text-text-muted">{stage.interviewer_name}</span>}
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${state === 'completed' ? 'bg-green-100 text-green-700' : state === 'current' ? 'bg-orange-100 text-orange-700' : 'bg-bg-section text-text-muted'}`}>
                                {state === 'completed' ? 'Completed' : state === 'current' ? 'Current' : 'Upcoming'}
                              </span>
                              {stageInterviews.length > 0 && <span className="text-xs text-text-muted">{stageInterviews.length} interview{stageInterviews.length !== 1 ? 's' : ''}</span>}
                            </div>
                          </button>

                          {isExpanded && canExpand && (
                            <div className="px-4 pb-6 space-y-4">
                              {stageInterviews.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Interviews</p>
                                  {stageInterviews.map((interview: any) => {
                                    const fb = feedbackMap[interview.id]
                                    return (
                                      <div key={interview.id} className="border border-ds-border rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-sm font-medium text-text-primary">{interview.interviewer_name || 'TBD'}{interview.interviewers?.length > 0 && <span className="text-text-muted font-normal"> + {interview.interviewers.map((i: any) => i.contact_name).join(', ')}</span>}</p>
                                            {interview.scheduled_at && <p className="text-xs text-text-muted">{new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(interview.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>}
                                          </div>
                                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${interview.status === 'completed' || interview.status === 'feedback_received' ? 'bg-green-100 text-green-800' : interview.status === 'scheduled' ? 'bg-navy/10 text-navy' : interview.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-bg-section text-text-secondary'}`}>
                                            {interview.status === 'feedback_received' ? 'Feedback Received' : interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                                          </span>
                                        </div>
                                        {fb && fb.length > 0 && fb.map((f) => (
                                          <div key={f.id} className="mt-2 pt-2 border-t border-ds-border text-xs text-text-secondary space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className={`font-medium px-1.5 py-0.5 rounded ${f.recommendation === 'advance' ? 'bg-green-50 text-green-700' : f.recommendation === 'hold' ? 'bg-yellow-50 text-yellow-700' : f.recommendation === 'decline' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>{f.recommendation.charAt(0).toUpperCase() + f.recommendation.slice(1)}</span>
                                              <span className="text-text-muted">by {f.interviewer_name}</span>
                                            </div>
                                            {f.strengths && <p><span className="font-medium text-text-muted">Strengths:</span> {f.strengths}</p>}
                                            {f.concerns && <p><span className="font-medium text-text-muted">Concerns:</span> {f.concerns}</p>}
                                            {f.interview_notes && <p><span className="font-medium text-text-muted">Notes:</span> {f.interview_notes}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Stage Notes</p>
                                <textarea value={draft.notes} onChange={(e) => setStageNoteDrafts(prev => ({ ...prev, [stage.id]: { ...(prev[stage.id] || { visibility_level: 'team_only' as VisibilityLevel }), notes: e.target.value } }))} rows={3} placeholder="Add notes for this stage..." className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none resize-y" />
                              </div>
                              <div className="space-y-2">
                                {(note?.attachments || []).length > 0 && <div className="space-y-1">{(note?.attachments || []).map((att: StageNoteAttachment) => (
                                  <div key={att.id} className="flex items-center gap-2 text-sm text-text-secondary bg-bg-section rounded px-3 py-1.5">
                                    <Paperclip className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex-1 truncate text-orange">{att.file_name}</a>
                                    {att.file_size && <span className="text-xs text-text-muted flex-shrink-0">{formatFileSize(att.file_size)}</span>}
                                    <button onClick={() => deleteStageAttachment(stage.id, att.id)} className="text-text-muted hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}</div>}
                                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary cursor-pointer">
                                  <input type="file" onChange={(e) => handleStageAttachmentUpload(stage.id, e)} className="hidden" />
                                  <Upload className="w-3.5 h-3.5" />{uploadingAttachment === stage.id ? 'Uploading...' : 'Attach file'}
                                </label>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-ds-border">
                                <VisibilitySelector value={draft.visibility_level} onChange={(v) => handleStageVisibilityChange(stage.id, v)} />
                                <Button size="sm" onClick={() => saveStageNote(stage.id)} disabled={savingStageNote === stage.id} className="bg-navy text-white font-bold">{savingStageNote === stage.id ? 'Saving...' : 'Save Notes'}</Button>
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

              {/* ── RECRUITER ASSESSMENT (assessment tab only) ── */}
              {activeTab === 'assessment' && (() => {
                // Helper: render a single assessment section (used per-stage and for general)
                const renderAssessmentSection = (sectionKey: string, sectionLabel: string, isGeneral: boolean) => {
                  const isOpen = !!expandedAssessmentStages[sectionKey]
                  const sectionActivities = activities.filter((a: any) =>
                    isGeneral ? (!a.stage_id) : (a.stage_id === sectionKey)
                  )
                  const noteDraft = assessmentNoteDrafts[sectionKey] || ''
                  const visibility = assessmentVisibility[sectionKey] || 'team_only'
                  const isSaving = savingAssessmentNote === sectionKey
                  const isUploading = uploadingAssessmentFile === sectionKey
                  const isDrag = draggingSection === sectionKey

                  return (
                    <div key={sectionKey} className="border border-ds-border rounded-xl overflow-hidden">
                      {/* Collapsible header */}
                      <button
                        onClick={() => setExpandedAssessmentStages(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-bg-section transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                          <span className={`text-sm font-semibold ${isGeneral ? 'text-text-secondary' : 'text-text-primary'}`}>{sectionLabel}</span>
                          {sectionActivities.length > 0 && (
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-bg-section text-text-muted">{sectionActivities.length}</span>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-2 space-y-4 border-t border-ds-border bg-white">
                          {/* Notes textarea */}
                          <div>
                            <textarea
                              value={noteDraft}
                              onChange={(e) => setAssessmentNoteDrafts(prev => ({ ...prev, [sectionKey]: e.target.value }))}
                              rows={3}
                              placeholder={isGeneral ? 'Add general notes...' : `Add notes from this stage...`}
                              className="w-full px-3 py-2.5 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:outline-none resize-y min-h-[80px]"
                              style={{ transition: 'border-color 0.15s, box-shadow 0.15s' }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,60,98,0.1)' }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                            />
                          </div>

                          {/* File upload drop zone */}
                          <label
                            className={`flex items-center justify-center gap-2 rounded-lg border p-4 cursor-pointer transition-colors ${
                              isDrag ? 'border-orange bg-orange/5' : 'border-ds-border bg-bg-section hover:border-orange hover:bg-orange/5'
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setDraggingSection(sectionKey) }}
                            onDragEnter={(e) => { e.preventDefault(); setDraggingSection(sectionKey) }}
                            onDragLeave={(e) => { e.preventDefault(); setDraggingSection(null) }}
                            onDrop={(e) => { e.preventDefault(); handleAssessmentFileUpload(sectionKey, e.dataTransfer.files) }}
                          >
                            <input type="file" multiple onChange={(e) => handleAssessmentFileInput(sectionKey, e)} className="hidden" />
                            <Upload className="w-4 h-4 text-text-muted" />
                            <p className="text-xs text-text-muted">
                              {isUploading ? 'Uploading...' : 'Upload transcript, scorecard, or recording'}
                            </p>
                          </label>

                          {/* Visibility + Save row */}
                          <div className="flex items-center justify-between">
                            <select
                              value={visibility}
                              onChange={(e) => setAssessmentVisibility(prev => ({ ...prev, [sectionKey]: e.target.value }))}
                              className="h-7 text-xs pl-2 pr-6 rounded border border-ds-border bg-white text-text-secondary focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer"
                            >
                              <option value="team_only">Team Only</option>
                              <option value="limited_access">Limited Access</option>
                              <option value="full_access">Full Access</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => saveAssessmentNote(sectionKey)}
                              disabled={isSaving}
                              className="bg-orange hover:bg-orange-hover text-white rounded-lg text-sm font-medium"
                            >
                              {isSaving ? 'Saving...' : 'Save Note'}
                            </Button>
                          </div>

                          {/* Activity items for this section */}
                          {sectionActivities.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-ds-border">
                              {sectionActivities.map((item: any) => {
                                const isNote = item.activity_type === 'note'
                                const isExpanded = expandedActivityId === item.id
                                const notePreview = isNote && item.content ? item.content.split('\n').slice(0, 3).join('\n') : ''
                                const noteIsTruncated = isNote && item.content && item.content.split('\n').length > 3
                                return (
                                  <div key={item.id} className="flex items-start gap-2.5 py-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isNote ? 'bg-amber-50' : 'bg-navy/5'}`}>
                                      {isNote ? <Pencil className="w-3 h-3 text-amber-600" /> : <FileText className="w-3 h-3 text-navy" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {isNote ? (
                                        <>
                                          <button onClick={() => setExpandedActivityId(isExpanded ? null : item.id)} className="text-left w-full">
                                            <p className="text-sm text-text-primary whitespace-pre-wrap">{isExpanded ? item.content : notePreview}{!isExpanded && noteIsTruncated && <span className="text-text-muted">...</span>}</p>
                                          </button>
                                          {noteIsTruncated && <button onClick={() => setExpandedActivityId(isExpanded ? null : item.id)} className="text-xs font-medium mt-0.5 hover:underline text-orange">{isExpanded ? 'Show less' : 'Read more'}</button>}
                                        </>
                                      ) : (
                                        <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="group">
                                          <p className="text-sm font-medium group-hover:underline text-orange">{item.file_name || 'File'}</p>
                                          <p className="text-xs text-text-muted mt-0.5">{item.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}{item.file_size ? ` · ${formatFileSize(item.file_size)}` : ''}</p>
                                        </a>
                                      )}
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[11px] text-text-muted">{formatActivityTimestamp(item.created_at)}</p>
                                        <span className="text-[11px] text-text-muted">·</span>
                                        <select value={item.visibility_level} onChange={(e) => updateActivityVisibility(item.id, e.target.value)} className="h-5 text-[11px] pl-1 pr-4 rounded border border-ds-border bg-white text-text-muted focus:outline-none cursor-pointer">
                                          <option value="team_only">Team Only</option>
                                          <option value="limited_access">Limited</option>
                                          <option value="full_access">Full</option>
                                        </select>
                                        <button onClick={() => deleteActivity(item.id)} className="text-text-muted hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary">Recruiter Assessment</h3>

                    {/* Per-stage sections */}
                    {stages.map((stage) => renderAssessmentSection(stage.id, stage.name, false))}

                    {/* General Notes & Files */}
                    {renderAssessmentSection('general', 'General Notes & Files', true)}

                    {stages.length === 0 && activities.length === 0 && (
                      <p className="text-sm text-text-muted text-center py-4">No stages configured yet — add stages in the Interview Progress tab</p>
                    )}
                  </div>
                )
              })()}

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
    </div>
  )
}
