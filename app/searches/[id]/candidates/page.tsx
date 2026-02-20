"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, X, User, MapPin, Phone, Mail, Linkedin, FileText, StickyNote, Camera } from "lucide-react"

const PROSPECTS_STAGE_ORDER = -1

export default function CandidatesPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const searchId = params.id as string

  // Data
  const [search, setSearch] = useState<any>(null)
  const [interviewStages, setInterviewStages] = useState<any[]>([])
  const [prospectStageId, setProspectStageId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
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
  const [newNotes, setNewNotes] = useState('')
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null)
  const [newStageId, setNewStageId] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Slide panel state
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)

  // Drag state
  const [dragCandidateId, setDragCandidateId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [searchId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [searchRes, stagesRes, candidatesRes] = await Promise.all([
        supabase.from("searches").select("*").eq("id", searchId).single(),
        supabase.from("stages").select("*").eq("search_id", searchId).order("stage_order", { ascending: true }),
        supabase.from("candidates").select("*").eq("search_id", searchId).order("candidate_order", { ascending: true }),
      ])
      setSearch(searchRes.data)
      setCandidates(candidatesRes.data || [])

      if (stagesRes.error) {
        console.error("Stages query error:", stagesRes.error)
      }
      const allStages = stagesRes.data || []

      // Find or create a system "Prospect" stage (order = -1)
      const systemStages = allStages.filter((s: any) => s.stage_order != null && s.stage_order < 0)
      let prospect = systemStages[0]
      if (!prospect) {
        const { data: newStage } = await supabase
          .from('stages')
          .insert({
            search_id: searchId,
            name: 'Prospect',
            stage_order: PROSPECTS_STAGE_ORDER,
            visible_in_client_portal: false,
          })
          .select()
          .single()
        if (newStage) {
          prospect = newStage
        }
      }
      setProspectStageId(prospect?.id || null)

      // Interview stages = all stages except system stages (order < 0)
      const systemIds = new Set(systemStages.map((s: any) => s.id))
      setInterviewStages(allStages.filter((s: any) => !systemIds.has(s.id)))
    } catch (err) {
      console.error("Error loading pipeline data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // ---- Columns ----
  const COLUMN_COLORS = ['#6B7280', '#1F3C62', '#2D8B4E', '#D97706', '#7C3AED', '#DC2626']

  const columns: { id: string; name: string }[] = [
    ...(prospectStageId ? [{ id: prospectStageId, name: 'Prospect' }] : []),
    ...interviewStages.map(s => ({ id: s.id, name: s.name })),
  ]

  const getColumnColor = (index: number) => {
    return COLUMN_COLORS[index % COLUMN_COLORS.length]
  }

  const getColumnCandidates = (stageId: string) => {
    return candidates.filter(c => c.stage_id === stageId)
  }

  const getStageBadge = (stageId: string) => {
    const colIndex = columns.findIndex(c => c.id === stageId)
    if (colIndex === -1) return { name: 'Unknown', color: '#6B7280' }
    return { name: columns[colIndex].name, color: getColumnColor(colIndex) }
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
    if (!candidate) return

    if (candidate.stage_id === targetStageId) {
      setDragCandidateId(null)
      return
    }

    // Optimistic update
    setCandidates(prev =>
      prev.map(c =>
        c.id === dragCandidateId ? { ...c, stage_id: targetStageId } : c
      )
    )
    const movedId = dragCandidateId
    setDragCandidateId(null)

    // Persist
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ stage_id: targetStageId, updated_at: new Date().toISOString() })
        .eq('id', movedId)

      if (error) throw error
    } catch (err) {
      console.error('Error moving candidate:', err)
      loadData()
    }
  }

  const handleDragEnd = () => {
    setDragCandidateId(null)
    setDragOverColumn(null)
  }

  // ---- Add Candidate ----
  const resetForm = () => {
    setNewFirstName('')
    setNewLastName('')
    setNewCompany('')
    setNewTitle('')
    setNewLocation('')
    setNewPhone('')
    setNewEmail('')
    setNewLinkedin('')
    setNewNotes('')
    setNewPhotoFile(null)
    setNewPhotoPreview(null)
    setNewResumeFile(null)
    setNewStageId(null)
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

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFirstName.trim() || !newLastName.trim()) return
    if (!prospectStageId) {
      alert('Pipeline is still loading. Please try again.')
      return
    }
    setIsSubmitting(true)

    try {
      // Use selected stage or default to Prospect
      const targetStageId = newStageId || prospectStageId!
      const stageCount = candidates.filter(c => c.stage_id === targetStageId).length

      let photoUrl: string | null = null
      let resumeUrl: string | null = null

      // Upload photo if provided
      if (newPhotoFile) {
        const fileExt = newPhotoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('candidate-photos')
          .upload(fileName, newPhotoFile)
        if (uploadErr) {
          console.error('Photo upload failed:', uploadErr.message)
          // Don't block candidate creation — just skip the photo
        } else {
          const { data: urlData } = supabase.storage
            .from('candidate-photos')
            .getPublicUrl(fileName)
          photoUrl = urlData.publicUrl
        }
      }

      // Upload resume if provided
      if (newResumeFile) {
        const fileExt = newResumeFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('candidateresumes')
          .upload(fileName, newResumeFile)
        if (uploadErr) {
          console.error('Resume upload failed:', uploadErr.message)
        } else {
          const { data: urlData } = supabase.storage
            .from('candidateresumes')
            .getPublicUrl(fileName)
          resumeUrl = urlData.publicUrl
        }
      }

      console.log('[AddCandidate] Inserting with photo_url:', photoUrl)
      const { data: inserted, error } = await supabase
        .from('candidates')
        .insert({
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
          recruiter_notes: newNotes.trim() || null,
          photo_url: photoUrl,
          resume_url: resumeUrl,
          candidate_order: stageCount,
          status: 'active',
        })
        .select('id')
        .single()

      if (error) throw error

      resetForm()
      setIsAddOpen(false)

      // Redirect to candidate profile
      if (inserted?.id) {
        router.push(`/searches/${searchId}/candidates/${inserted.id}`)
      }
    } catch (err: any) {
      console.error('Error adding candidate:', err)
      alert(`Failed to add candidate: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- Loading / Not Found ----
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-navy">Loading pipeline...</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-navy">Search not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-section">
      {/* ===== HEADER ===== */}
      <div className="bg-white border-b-2 border-ds-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/searches')}
              className="text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-ds-border" />
            <div>
              <h1 className="text-2xl font-bold text-navy">
                {search.company_name}
              </h1>
              <p className="text-lg font-semibold text-text-secondary">
                {search.position_title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/searches/${searchId}/pipeline`)}
              className="text-sm font-semibold text-navy"
            >
              Search Details
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="text-white font-semibold bg-orange"
            >
              + Add Candidate
            </Button>
          </div>
        </div>
      </div>

      {/* ===== KANBAN BOARD ===== */}
      <div className="px-6 py-4 overflow-x-auto h-[calc(100vh-90px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="inline-flex gap-4 h-full">
          {columns.map((col, colIndex) => {
            const colCandidates = getColumnCandidates(col.id)
            const isDragOver = dragOverColumn === col.id
            const headerColor = getColumnColor(colIndex)

            return (
              <div
                key={col.id}
                className={`flex-shrink-0 w-[280px] min-w-[280px] rounded-lg border-2 flex flex-col transition-colors ${
                  isDragOver
                    ? 'border-orange-400 bg-orange-50/50'
                    : 'border-ds-border bg-white'
                }`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div
                  className="px-3 py-3 border-b border-ds-border rounded-t-lg flex-shrink-0"
                  style={{ backgroundColor: headerColor }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm truncate">{col.name}</h4>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-white/20 text-xs font-bold text-white">
                      ({colCandidates.length})
                    </span>
                  </div>
                </div>

                {/* Cards Area */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-[80px]">
                  {colCandidates.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-xs text-text-muted">No candidates</p>
                    </div>
                  ) : (
                    colCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, candidate.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedCandidate(candidate)}
                        className={`bg-white rounded-lg border border-ds-border p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-ds-border transition-all ${
                          dragCandidateId === candidate.id ? 'opacity-40 scale-95' : ''
                        }`}
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Photo / Initials */}
                          {candidate.photo_url ? (
                            <img
                              src={candidate.photo_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold bg-navy"
                            >
                              {(candidate.first_name?.[0] || '').toUpperCase()}
                              {(candidate.last_name?.[0] || '').toUpperCase()}
                            </div>
                          )}

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate text-navy">
                              {candidate.first_name} {candidate.last_name}
                            </p>
                            {(candidate.current_title || candidate.current_company) && (
                              <p className="text-xs text-text-muted truncate mt-0.5">
                                {candidate.current_title}
                                {candidate.current_title && candidate.current_company && ' at '}
                                {candidate.current_company}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== ADD CANDIDATE DIALOG ===== */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-[560px] bg-white max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-navy">
              Add Candidate
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCandidate} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Photo */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-ds-border flex items-center justify-center overflow-hidden hover:border-ds-border transition-colors bg-bg-section"
                >
                  {newPhotoPreview ? (
                    <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-text-muted" />
                  )}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>

              {/* First Name | Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">First Name *</Label>
                  <Input
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="John"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Last Name *</Label>
                  <Input
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Smith"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Current Company | Current Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">Current Company</Label>
                  <Input
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Current Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="VP of Engineering"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Location | Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">Location</Label>
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="City, State"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">Phone</Label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="555-123-4567"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Email | LinkedIn */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-navy">Email</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-navy">LinkedIn URL</Label>
                  <Input
                    value={newLinkedin}
                    onChange={(e) => setNewLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/..."
                    className="mt-1"
                  />
                </div>
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
                  {interviewStages.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Resume Upload */}
              <div>
                <Label className="text-xs font-semibold text-navy">Resume / CV</Label>
                <label className="mt-1 flex items-center justify-center border-2 border-dashed border-ds-border rounded-md py-4 cursor-pointer hover:border-ds-border transition-colors bg-bg-section">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setNewResumeFile(file)
                    }}
                  />
                  {newResumeFile ? (
                    <span className="text-sm text-green-700 font-medium">{newResumeFile.name}</span>
                  ) : (
                    <span className="text-sm text-text-muted">Click to upload PDF, DOC, or DOCX</span>
                  )}
                </label>
              </div>

              {/* Internal Notes */}
              <div>
                <Label className="text-xs font-semibold text-navy">Internal Notes</Label>
                <p className="text-xs text-text-muted mt-0.5 mb-1">Private — only visible to your team</p>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Add any context, sourcing notes, or first impressions..."
                  rows={3}
                />
              </div>
            </div>

            {/* Sticky footer */}
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-ds-border flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); setIsAddOpen(false) }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-navy text-white"
              >
                {isSubmitting ? 'Adding...' : 'Add Candidate'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== CANDIDATE SLIDE PANEL ===== */}
      {selectedCandidate && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setSelectedCandidate(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[40%] min-w-[380px] max-w-[600px] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Navy Header */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 bg-navy">
              <h2 className="text-lg font-bold text-white truncate">
                {selectedCandidate.first_name} {selectedCandidate.last_name}
              </h2>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Profile Section */}
              <div className="p-6 border-b border-ds-border">
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  {selectedCandidate.photo_url ? (
                    <img src={selectedCandidate.photo_url} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-ds-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-ds-border bg-bg-page">
                      <User className="w-7 h-7 text-text-muted" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-navy">
                      {selectedCandidate.first_name} {selectedCandidate.last_name}
                    </h3>
                    {(selectedCandidate.current_title || selectedCandidate.current_company) && (
                      <p className="text-sm text-text-primary mt-0.5">
                        {selectedCandidate.current_title}
                        {selectedCandidate.current_title && selectedCandidate.current_company && ' at '}
                        <span className="font-semibold">{selectedCandidate.current_company}</span>
                      </p>
                    )}

                    {/* Stage Badge */}
                    {(() => {
                      const badge = getStageBadge(selectedCandidate.stage_id)
                      return (
                        <span
                          className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: badge.color }}
                        >
                          {badge.name}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="mt-4 space-y-2">
                  {selectedCandidate.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-text-secondary" />
                      <span className="text-sm text-text-primary">{selectedCandidate.location}</span>
                    </div>
                  )}
                  {selectedCandidate.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 flex-shrink-0 text-text-secondary" />
                      <span className="text-sm text-text-primary">{selectedCandidate.phone}</span>
                    </div>
                  )}
                  {selectedCandidate.email && selectedCandidate.email !== '' && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 flex-shrink-0 text-text-secondary" />
                      <a href={`mailto:${selectedCandidate.email}`} className="text-sm hover:underline text-orange">
                        {selectedCandidate.email}
                      </a>
                    </div>
                  )}
                  {selectedCandidate.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 flex-shrink-0 text-text-secondary" />
                      <a href={selectedCandidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline text-orange">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {!selectedCandidate.location && !selectedCandidate.phone && (!selectedCandidate.email || selectedCandidate.email === '') && !selectedCandidate.linkedin_url && (
                    <p className="text-sm text-text-muted">No contact details added yet</p>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="p-6 border-b border-ds-border">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4 text-navy" />
                  <h4 className="text-sm font-bold text-navy">Internal Notes</h4>
                </div>
                {selectedCandidate.general_notes ? (
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{selectedCandidate.general_notes}</p>
                ) : (
                  <p className="text-sm text-text-muted">No notes yet</p>
                )}
              </div>

              {/* Client Notes */}
              <div className="p-6 border-b border-ds-border">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4 text-navy" />
                  <h4 className="text-sm font-bold text-navy">Client Notes</h4>
                </div>
                {selectedCandidate.aggregate_summary ? (
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{selectedCandidate.aggregate_summary}</p>
                ) : (
                  <p className="text-sm text-text-muted">No notes yet</p>
                )}
              </div>

              {/* Resume */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-navy" />
                  <h4 className="text-sm font-bold text-navy">Resume</h4>
                </div>
                {selectedCandidate.resume_url ? (
                  <a href={selectedCandidate.resume_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-orange">
                    {selectedCandidate.resume_url.split('/').pop() || 'View Resume'}
                  </a>
                ) : (
                  <p className="text-sm text-text-muted">No resume uploaded</p>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-ds-border flex items-center gap-3 flex-shrink-0">
              <Button
                onClick={() => {
                  router.push(`/searches/${searchId}/candidates/${selectedCandidate.id}`)
                  setSelectedCandidate(null)
                }}
                className="flex-1 text-white font-semibold bg-navy"
              >
                Open Full Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  router.push(`/searches/${searchId}/candidates/${selectedCandidate.id}`)
                  setSelectedCandidate(null)
                }}
                className="flex-1 bg-white text-text-primary border-ds-border font-semibold"
              >
                Edit
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
