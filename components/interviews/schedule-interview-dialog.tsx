"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Candidate, Contact, Interview } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ScheduleInterviewDialogProps {
  candidate: Candidate
  searchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingInterview?: Interview | null
}

export function ScheduleInterviewDialog({
  candidate,
  searchId,
  open,
  onOpenChange,
  onSuccess,
  editingInterview = null
}: ScheduleInterviewDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [interviewType, setInterviewType] = useState<'phone' | 'video' | 'in_person'>('video')
  const [timezone, setTimezone] = useState<string>(() => {
    // Detect user's timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles'
  })
  const [duration, setDuration] = useState<number>(60)
  const [prepNotes, setPrepNotes] = useState("")
  const [guideFile, setGuideFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  useEffect(() => {
    if (open) {
      loadContacts()

      // Pre-populate form when editing
      if (editingInterview) {
        const interviewDate = new Date(editingInterview.scheduled_at)
        const dateStr = interviewDate.toISOString().split('T')[0]
        const timeStr = interviewDate.toTimeString().slice(0, 5)

        setScheduledDate(dateStr)
        setScheduledTime(timeStr)
        setInterviewType(editingInterview.interview_type)
        setTimezone(editingInterview.timezone)
        setDuration(editingInterview.duration_minutes)
        setPrepNotes(editingInterview.prep_notes || "")

        // Pre-select interviewers
        if (editingInterview.interviewers && editingInterview.interviewers.length > 0) {
          setSelectedContactIds(editingInterview.interviewers.map(i => i.contact_id))
        }
      } else {
        // Reset form when creating new interview
        setSelectedContactIds([])
        setScheduledDate("")
        setScheduledTime("")
        setInterviewType('video')
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles')
        setDuration(60)
        setPrepNotes("")
        setGuideFile(null)
        setError(null)
      }
    }
  }, [open, searchId, editingInterview])

  const loadContacts = async () => {
    setIsLoadingContacts(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('search_id', searchId)
        .order('is_primary', { ascending: false })

      if (error) throw error
      setContacts(data || [])
      console.log('Loaded contacts for interview scheduling:', data?.length || 0)
    } catch (err) {
      console.error('Error loading contacts:', err)
      setError('Failed to load interviewers. Please close and reopen this dialog.')
    } finally {
      setIsLoadingContacts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log('Form submission started', {
      selectedContactIds,
      scheduledDate,
      scheduledTime,
      contacts: contacts.length
    })

    if (selectedContactIds.length === 0 || !scheduledDate || !scheduledTime) {
      const errorMsg = "Please select at least one interviewer and fill in all required fields"
      console.error('Validation failed:', errorMsg)
      setError(errorMsg)
      setIsLoading(false)
      return
    }

    try {
      // Get selected contacts details
      const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id))
      if (selectedContacts.length === 0) {
        throw new Error("Selected contacts not found")
      }

      // Use first contact as primary for backward compatibility
      const primaryContact = selectedContacts[0]

      let guideUrl: string | null = null

      // Upload interview guide if one was selected
      if (guideFile) {
        const fileExt = guideFile.name.split('.').pop()
        const fileName = `${Date.now()}-${candidate.first_name}-${candidate.last_name}-guide.${fileExt}`
        const filePath = `interview-guides/${searchId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('candidate-resumes')
          .upload(filePath, guideFile)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('candidate-resumes')
          .getPublicUrl(filePath)

        guideUrl = urlData.publicUrl
      }

      // Combine date and time into ISO string
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()

      let interviewData

      if (editingInterview) {
        // UPDATE existing interview
        console.log('Updating interview:', editingInterview.id)

        const { data: updatedInterview, error: updateError } = await supabase
          .from('interviews')
          .update({
            interviewer_contact_id: primaryContact.id,
            interviewer_name: primaryContact.name,
            interviewer_email: primaryContact.email,
            scheduled_at: scheduledAt,
            interview_type: interviewType,
            timezone: timezone,
            duration_minutes: duration,
            prep_notes: prepNotes || null,
            interview_guide_url: guideUrl || editingInterview.interview_guide_url
          })
          .eq('id', editingInterview.id)
          .select()
          .single()

        if (updateError) {
          console.error('Interview update error:', updateError)
          throw updateError
        }

        interviewData = updatedInterview

        // Delete existing interviewers
        await supabase
          .from('interview_interviewers')
          .delete()
          .eq('interview_id', editingInterview.id)

        // Insert updated interviewers list
        const interviewersToInsert = selectedContacts.map(contact => ({
          interview_id: interviewData.id,
          contact_id: contact.id,
          contact_name: contact.name,
          contact_email: contact.email
        }))

        const { error: interviewersError } = await supabase
          .from('interview_interviewers')
          .insert(interviewersToInsert)

        if (interviewersError) {
          console.error('Interviewers insert error:', interviewersError)
          throw interviewersError
        }

        console.log('Interview updated successfully:', interviewData)
      } else {
        // CREATE new interview
        console.log('Creating interview with data:', {
          candidate_id: candidate.id,
          search_id: searchId,
          interviewer_contact_id: primaryContact.id,
          scheduled_at: scheduledAt,
          interview_type: interviewType
        })

        const { data: newInterview, error: insertError } = await supabase
          .from('interviews')
          .insert({
            candidate_id: candidate.id,
            search_id: searchId,
            interviewer_contact_id: primaryContact.id,
            interviewer_name: primaryContact.name,
            interviewer_email: primaryContact.email,
            scheduled_at: scheduledAt,
            interview_type: interviewType,
            timezone: timezone,
            duration_minutes: duration,
            prep_notes: prepNotes || null,
            interview_guide_url: guideUrl
          })
          .select()
          .single()

        if (insertError) {
          console.error('Interview insert error:', insertError)
          throw insertError
        }

        interviewData = newInterview

        // Insert all interviewers into junction table
        const interviewersToInsert = selectedContacts.map(contact => ({
          interview_id: interviewData.id,
          contact_id: contact.id,
          contact_name: contact.name,
          contact_email: contact.email
        }))

        const { error: interviewersError } = await supabase
          .from('interview_interviewers')
          .insert(interviewersToInsert)

        if (interviewersError) {
          console.error('Interviewers insert error:', interviewersError)
          throw interviewersError
        }

        console.log('Interview created successfully:', interviewData)
      }

      console.log('Interview scheduled successfully!', interviewData)

      // Reset form
      setSelectedContactIds([])
      setScheduledDate("")
      setScheduledTime("")
      setInterviewType('video')
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles')
      setDuration(60)
      setPrepNotes("")
      setGuideFile(null)

      // Close dialog first
      onOpenChange(false)

      // Small delay to ensure database commit, then reload
      setTimeout(async () => {
        await onSuccess()
        alert(editingInterview ? 'Interview updated successfully!' : 'Interview scheduled successfully!')
      }, 500)
    } catch (err) {
      console.error(editingInterview ? 'Error updating interview:' : 'Error scheduling interview:', err)
      const errorMessage = err instanceof Error ? err.message : (editingInterview ? 'Failed to update interview' : 'Failed to schedule interview')
      setError(errorMessage)
      alert('Error: ' + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingInterview ? 'Edit Interview' : 'Schedule Interview'}</DialogTitle>
          <DialogDescription>
            {editingInterview ? 'Update interview details for' : 'Schedule an interview for'} {candidate.first_name} {candidate.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-red-900 font-semibold text-sm">Error</p>
                  <p className="text-red-800 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Select Interviewers * (Panel Interview)</Label>
            <p className="text-xs text-gray-500 mt-1 mb-3">
              Select one or more interviewers for this interview
            </p>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {isLoadingContacts ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading interviewers...</p>
              ) : contacts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No contacts available</p>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded border border-gray-200">
                    <Checkbox
                      id={`contact-${contact.id}`}
                      checked={selectedContactIds.includes(contact.id)}
                      onCheckedChange={() => toggleContactSelection(contact.id)}
                      className="w-5 h-5 border-2 border-gray-400"
                    />
                    <label
                      htmlFor={`contact-${contact.id}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      <span className="font-medium text-gray-900">{contact.name}</span>
                      {contact.is_primary && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Primary</span>
                      )}
                      <span className="text-gray-600 text-xs block mt-0.5">
                        {contact.title || contact.email}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>
            {selectedContactIds.length > 0 && (
              <p className="text-sm text-green-600 mt-2">
                {selectedContactIds.length} interviewer{selectedContactIds.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timezone">Time Zone *</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Duration *</Label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="type">Interview Type *</Label>
            <Select value={interviewType} onValueChange={(value) => setInterviewType(value as any)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Screen</SelectItem>
                <SelectItem value="video">Video Interview</SelectItem>
                <SelectItem value="in_person">In-Person Interview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Prep Notes for Interviewer</Label>
            <Textarea
              id="notes"
              value={prepNotes}
              onChange={(e) => setPrepNotes(e.target.value)}
              placeholder="Key things for the interviewer to focus on, questions to ask, etc."
              rows={4}
              className="mt-1.5"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              These notes will be included in the feedback form for the interviewer's reference
            </p>
          </div>

          <div>
            <Label htmlFor="guide">Interview Guide (Optional)</Label>
            <Input
              id="guide"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  // Validate file type
                  const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                  if (!validTypes.includes(file.type)) {
                    setError('Please upload a PDF, DOC, or DOCX file')
                    e.target.value = ''
                    return
                  }
                  // Validate file size (10MB max)
                  if (file.size > 10 * 1024 * 1024) {
                    setError('File size must be less than 10MB')
                    e.target.value = ''
                    return
                  }
                  setGuideFile(file)
                  setError(null)
                }
              }}
              className="cursor-pointer mt-1.5"
            />
            {guideFile && (
              <p className="text-sm text-green-600 mt-1.5">
                Selected: {guideFile.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1.5">
              Upload a guide specific to this interview (questions, focus areas, etc.). The interviewer will receive this with their notification. Accepted formats: PDF, DOC, DOCX (Max 10MB)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading
                ? (editingInterview ? "Updating..." : "Scheduling...")
                : (editingInterview ? "Update Interview" : "Schedule Interview")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
