"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Candidate, Contact, Stage, Search } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ScheduleInterviewDialogEnhancedProps {
  isOpen: boolean
  onClose: () => void
  candidateId: string
  stageId: string
  searchId: string
  onInterviewScheduled: () => void
  existingInterview?: any // For reschedule
}

export function ScheduleInterviewDialogEnhanced({
  isOpen,
  onClose,
  candidateId,
  stageId,
  searchId,
  onInterviewScheduled,
  existingInterview
}: ScheduleInterviewDialogEnhancedProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const [search, setSearch] = useState<Search | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [recruiter, setRecruiter] = useState<{ name: string; email: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedInterviewers, setSelectedInterviewers] = useState<Contact[]>([])
  const [interviewerEmailInput, setInterviewerEmailInput] = useState('')

  const [formData, setFormData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    location: '',
    timezone: 'America/Los_Angeles',
    notes: '',
    interview_guide_url: ''
  })

  const [markAsPending, setMarkAsPending] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
      loadRecruiter()

      // Pre-fill if rescheduling
      if (existingInterview) {
        const scheduledAt = new Date(existingInterview.scheduled_at)
        const date = scheduledAt.toISOString().split('T')[0]
        const time = scheduledAt.toTimeString().substring(0, 5)

        setFormData({
          scheduled_date: date,
          scheduled_time: time,
          duration_minutes: existingInterview.duration_minutes || 60,
          location: existingInterview.location || '',
          timezone: existingInterview.timezone || 'America/Los_Angeles',
          notes: existingInterview.prep_notes || '',
          interview_guide_url: existingInterview.interview_guide_url || ''
        })

        // Load existing interviewers
        if (existingInterview.interviewers) {
          const existingInterviewerContacts = contacts.filter(c =>
            existingInterview.interviewers.some((i: any) => i.contact_id === c.id)
          )
          setSelectedInterviewers(existingInterviewerContacts)
        }
      }
    }
  }, [isOpen, candidateId, stageId, existingInterview])

  const loadData = async () => {
    try {
      // Load candidate
      const { data: candidateData } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single()

      if (candidateData) setCandidate(candidateData)

      // Load stage
      const { data: stageData } = await supabase
        .from("stages")
        .select("*")
        .eq("id", stageId)
        .single()

      if (stageData) {
        setStage(stageData)
        setFormData(prev => ({
          ...prev,
          interview_guide_url: prev.interview_guide_url || stageData.interview_guide_url || ''
        }))
      }

      // Load search
      const { data: searchData } = await supabase
        .from("searches")
        .select("*")
        .eq("id", searchId)
        .single()

      if (searchData) setSearch(searchData)

      // Load contacts (interviewers)
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("search_id", searchId)
        .order("name", { ascending: true })

      if (contactsData) setContacts(contactsData)
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const loadRecruiter = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load recruiter profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setRecruiter({
          name: `${profileData.first_name} ${profileData.last_name}`,
          email: profileData.email || user.email || ''
        })
      } else {
        // Fallback to user email
        setRecruiter({
          name: user.email?.split('@')[0] || 'Recruiter',
          email: user.email || ''
        })
      }
    } catch (error) {
      console.error("Error loading recruiter:", error)
    }
  }

  const handleAddInterviewer = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId)
    if (contact && !selectedInterviewers.find(i => i.id === contact.id)) {
      setSelectedInterviewers([...selectedInterviewers, contact])
    }
  }

  const handleRemoveInterviewer = (contactId: string) => {
    setSelectedInterviewers(selectedInterviewers.filter(i => i.id !== contactId))
  }

  const handleAddInterviewerByEmail = () => {
    const email = interviewerEmailInput.trim()
    if (!email) return

    // Check if email matches a contact
    const contact = contacts.find(c => c.email.toLowerCase() === email.toLowerCase())
    if (contact) {
      handleAddInterviewer(contact.id)
      setInterviewerEmailInput('')
      return
    }

    // Add as custom interviewer (not in contacts)
    const customContact: Contact = {
      id: `custom-${Date.now()}`,
      search_id: searchId,
      name: email.split('@')[0],
      email,
      is_primary: false,
      access_level: 'no_portal_access',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setSelectedInterviewers([...selectedInterviewers, customContact])
    setInterviewerEmailInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (markAsPending) {
      // Create pending interview
      setIsSubmitting(true)
      try {
        const { error } = await supabase
          .from("interviews")
          .insert({
            candidate_id: candidateId,
            search_id: searchId,
            interviewer_name: 'Pending',
            interviewer_email: '',
            scheduled_at: new Date().toISOString(),
            interview_type: 'video',
            timezone: 'America/Los_Angeles',
            duration_minutes: 60,
            status: 'scheduled',
            feedback_token: crypto.randomUUID()
          })

        if (error) throw error

        onInterviewScheduled()
        onClose()
      } catch (error) {
        console.error("Error marking as pending:", error)
        alert("Failed to mark as pending")
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Validate
    if (!formData.scheduled_date || !formData.scheduled_time || selectedInterviewers.length === 0) {
      alert("Please fill in all required fields")
      return
    }

    if (!candidate || !stage || !search || !recruiter) {
      alert("Missing required data")
      return
    }

    setIsSubmitting(true)

    try {
      // Combine date and time
      const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`)

      // Create or update interview
      let interviewId = existingInterview?.id

      if (existingInterview) {
        // Update existing interview
        const { error: updateError } = await supabase
          .from("interviews")
          .update({
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: formData.duration_minutes,
            location: formData.location,
            timezone: formData.timezone,
            prep_notes: formData.notes || null,
            interview_guide_url: formData.interview_guide_url || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingInterview.id)

        if (updateError) throw updateError

        // Delete existing interviewers
        await supabase
          .from("interview_interviewers")
          .delete()
          .eq("interview_id", existingInterview.id)
      } else {
        // Create new interview
        const primaryInterviewer = selectedInterviewers[0]
        const { data: interviewData, error: interviewError } = await supabase
          .from("interviews")
          .insert({
            candidate_id: candidateId,
            search_id: searchId,
            interviewer_contact_id: primaryInterviewer.id.startsWith('custom-') ? null : primaryInterviewer.id,
            interviewer_name: primaryInterviewer.name,
            interviewer_email: primaryInterviewer.email,
            scheduled_at: scheduledAt.toISOString(),
            interview_type: 'video',
            timezone: formData.timezone,
            duration_minutes: formData.duration_minutes,
            location: formData.location,
            prep_notes: formData.notes || null,
            interview_guide_url: formData.interview_guide_url || null,
            status: 'scheduled',
            feedback_token: crypto.randomUUID()
          })
          .select()
          .single()

        if (interviewError) throw interviewError
        interviewId = interviewData.id
      }

      // Add all interviewers to junction table
      const interviewerInserts = selectedInterviewers.map(interviewer => ({
        interview_id: interviewId,
        contact_id: interviewer.id.startsWith('custom-') ? null : interviewer.id,
        contact_name: interviewer.name,
        contact_email: interviewer.email
      }))

      const { error: junctionError } = await supabase
        .from("interview_interviewers")
        .insert(interviewerInserts)

      if (junctionError) console.error("Error adding interviewers:", junctionError)

      // Send calendar invites
      const inviteResponse = await fetch('/api/interviews/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview: {
            id: interviewId,
            candidate_name: `${candidate.first_name} ${candidate.last_name}`,
            candidate_email: candidate.email,
            stage_name: stage.name,
            position_title: search.position_title,
            company_name: search.company_name,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: formData.duration_minutes,
            location: formData.location,
            timezone: formData.timezone,
            notes: formData.notes,
            interview_guide_url: formData.interview_guide_url
          },
          interviewers: selectedInterviewers.map(i => ({
            name: i.name,
            email: i.email
          })),
          recruiter: recruiter,
          type: existingInterview ? 'update' : 'new',
          portal_link: `${window.location.origin}/client/${search.secure_link}/portal`
        })
      })

      if (!inviteResponse.ok) {
        console.error("Failed to send invites")
      }

      // Show success message
      alert(existingInterview
        ? "Interview rescheduled. Updated invites sent."
        : "Interview scheduled. Invites sent.")

      onInterviewScheduled()
      onClose()

      // Reset form
      setFormData({
        scheduled_date: '',
        scheduled_time: '',
        duration_minutes: 60,
        location: '',
        timezone: 'America/Los_Angeles',
        notes: '',
        interview_guide_url: ''
      })
      setSelectedInterviewers([])
    } catch (error) {
      console.error("Error scheduling interview:", error)
      alert("Failed to schedule interview")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredContacts = contacts.filter(c =>
    !selectedInterviewers.find(i => i.id === c.id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingInterview ? 'Reschedule Interview' : 'Schedule Interview'}
          </DialogTitle>
          <DialogDescription>
            {candidate && stage && (
              <>
                <div className="mt-2 space-y-1">
                  <p><strong>Candidate:</strong> {candidate.first_name} {candidate.last_name}</p>
                  <p><strong>Email:</strong> {candidate.email}</p>
                  <p><strong>Stage:</strong> {stage.name}</p>
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Mark as Pending */}
          {!existingInterview && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsPending}
                  onChange={(e) => setMarkAsPending(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">
                  Mark as "Pending" (schedule details later)
                </span>
              </label>
            </div>
          )}

          {!markAsPending && (
            <>
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled_date">Date *</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled_time">Time *</Label>
                  <Input
                    id="scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration_minutes">Duration</Label>
                <Select
                  value={formData.duration_minutes.toString()}
                  onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Zoom link, address, or phone number"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  E.g., https://zoom.us/j/123456 or "Conference Room A" or phone number
                </p>
              </div>

              {/* Interviewers */}
              <div>
                <Label>Interviewers * {selectedInterviewers.length > 0 && `(${selectedInterviewers.length} selected)`}</Label>

                {/* Selected Interviewers */}
                {selectedInterviewers.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {selectedInterviewers.map(interviewer => (
                      <div
                        key={interviewer.id}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-200"
                      >
                        <div>
                          <p className="text-sm font-medium">{interviewer.name}</p>
                          <p className="text-xs text-gray-600">{interviewer.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveInterviewer(interviewer.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Interviewer */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={interviewerEmailInput}
                      onChange={(e) => setInterviewerEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddInterviewerByEmail()
                        }
                      }}
                      placeholder="Enter email address"
                      type="email"
                    />
                    <Button
                      type="button"
                      onClick={handleAddInterviewerByEmail}
                      variant="outline"
                    >
                      + Add
                    </Button>
                  </div>

                  {/* Quick select from contacts */}
                  {filteredContacts.length > 0 && (
                    <Select onValueChange={handleAddInterviewer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Or select from contacts" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} ({contact.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Interview Guide URL */}
              <div>
                <Label htmlFor="interview_guide_url">Interview Guide URL (optional)</Label>
                <Input
                  id="interview_guide_url"
                  type="url"
                  value={formData.interview_guide_url}
                  onChange={(e) => setFormData({ ...formData, interview_guide_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Notes for Invite */}
              <div>
                <Label htmlFor="notes">Notes for invite (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes to include in the calendar invite..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#1F3C62] hover:opacity-90"
            >
              {isSubmitting
                ? 'Sending...'
                : markAsPending
                ? 'Mark as Pending'
                : existingInterview
                ? 'Update & Send Invites'
                : 'Schedule & Send Invites'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
