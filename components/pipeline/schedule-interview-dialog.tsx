"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Candidate, Contact, Stage } from "@/types"
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

interface ScheduleInterviewDialogProps {
  isOpen: boolean
  onClose: () => void
  candidateId: string
  stageId: string
  searchId: string
  onInterviewScheduled: () => void
}

export function ScheduleInterviewDialog({
  isOpen,
  onClose,
  candidateId,
  stageId,
  searchId,
  onInterviewScheduled
}: ScheduleInterviewDialogProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    interviewer_contact_id: '',
    interview_type: 'video' as 'phone' | 'video' | 'in_person',
    duration_minutes: 60,
    timezone: 'America/Los_Angeles',
    prep_notes: '',
    interview_guide_url: ''
  })

  const [markAsPending, setMarkAsPending] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, candidateId, stageId])

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
          interview_guide_url: stageData.interview_guide_url || ''
        }))
      }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (markAsPending) {
      // Just mark as pending (create a placeholder interview)
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

    // Validate required fields
    if (!formData.scheduled_date || !formData.scheduled_time || !formData.interviewer_contact_id) {
      alert("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      // Get selected contact
      const selectedContact = contacts.find(c => c.id === formData.interviewer_contact_id)
      if (!selectedContact) {
        throw new Error("Interviewer not found")
      }

      // Combine date and time
      const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`)

      // Create interview
      const { data: interviewData, error: interviewError } = await supabase
        .from("interviews")
        .insert({
          candidate_id: candidateId,
          search_id: searchId,
          interviewer_contact_id: selectedContact.id,
          interviewer_name: selectedContact.name,
          interviewer_email: selectedContact.email,
          scheduled_at: scheduledAt.toISOString(),
          interview_type: formData.interview_type,
          timezone: formData.timezone,
          duration_minutes: formData.duration_minutes,
          prep_notes: formData.prep_notes || null,
          interview_guide_url: formData.interview_guide_url || null,
          status: 'scheduled',
          feedback_token: crypto.randomUUID()
        })
        .select()
        .single()

      if (interviewError) throw interviewError

      // Add interviewer to interview_interviewers junction table
      if (interviewData) {
        const { error: junctionError } = await supabase
          .from("interview_interviewers")
          .insert({
            interview_id: interviewData.id,
            contact_id: selectedContact.id,
            contact_name: selectedContact.name,
            contact_email: selectedContact.email
          })

        if (junctionError) console.error("Error adding interviewer:", junctionError)
      }

      onInterviewScheduled()
      onClose()

      // Reset form
      setFormData({
        scheduled_date: '',
        scheduled_time: '',
        interviewer_contact_id: '',
        interview_type: 'video',
        duration_minutes: 60,
        timezone: 'America/Los_Angeles',
        prep_notes: '',
        interview_guide_url: ''
      })
    } catch (error) {
      console.error("Error scheduling interview:", error)
      alert("Failed to schedule interview")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            {candidate && stage && (
              <>Schedule interview for {candidate.first_name} {candidate.last_name} — {stage.name}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Mark as Pending */}
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
                    required={!markAsPending}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled_time">Time *</Label>
                  <Input
                    id="scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    required={!markAsPending}
                  />
                </div>
              </div>

              {/* Interviewer */}
              <div>
                <Label htmlFor="interviewer">Interviewer *</Label>
                <Select
                  value={formData.interviewer_contact_id}
                  onValueChange={(value) => setFormData({ ...formData, interviewer_contact_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.title && `(${contact.title})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interview Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interview_type">Type</Label>
                  <Select
                    value={formData.interview_type}
                    onValueChange={(value: 'phone' | 'video' | 'in_person') =>
                      setFormData({ ...formData, interview_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min={15}
                    step={15}
                  />
                </div>
              </div>

              {/* Interview Guide URL */}
              <div>
                <Label htmlFor="interview_guide_url">Interview Guide URL</Label>
                <Input
                  id="interview_guide_url"
                  type="url"
                  value={formData.interview_guide_url}
                  onChange={(e) => setFormData({ ...formData, interview_guide_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Prep Notes */}
              <div>
                <Label htmlFor="prep_notes">Prep Notes (optional)</Label>
                <Textarea
                  id="prep_notes"
                  value={formData.prep_notes}
                  onChange={(e) => setFormData({ ...formData, prep_notes: e.target.value })}
                  placeholder="Add any notes to help prepare for this interview..."
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
              {isSubmitting ? 'Scheduling...' : markAsPending ? 'Mark as Pending' : 'Schedule Interview'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
