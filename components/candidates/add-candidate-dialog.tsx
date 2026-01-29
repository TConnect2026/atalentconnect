"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Stage } from "@/types"

interface AddCandidateDialogProps {
  searchId: string
  stages: Stage[]
  onCandidateAdded: () => void
  trigger?: React.ReactNode
}

interface NewCandidateFormData {
  first_name: string
  last_name: string
  email: string
  location: string
  open_to_relocation: boolean
  photo_url: string
  resume_url: string
  linkedin_url: string
  general_notes: string
  compensation_expectation: string
  stage_id: string
}

export function AddCandidateDialog({
  searchId,
  stages,
  onCandidateAdded,
  trigger
}: AddCandidateDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<NewCandidateFormData>({
    first_name: '',
    last_name: '',
    email: '',
    location: '',
    open_to_relocation: false,
    photo_url: '',
    resume_url: '',
    linkedin_url: '',
    general_notes: '',
    compensation_expectation: '',
    stage_id: ''
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
    }
  }

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setResumeFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Please fill in all required fields (Name and Email)')
      return
    }

    if (!formData.stage_id) {
      alert('Please select a stage')
      return
    }

    setIsSubmitting(true)

    try {
      let photoUrl = ''
      let resumeUrl = ''

      // Upload photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { data, error } = await supabase.storage
          .from('candidate-photos')
          .upload(fileName, photoFile)

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from('candidate-photos')
          .getPublicUrl(fileName)

        photoUrl = urlData.publicUrl
      }

      // Upload resume if provided
      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { data, error } = await supabase.storage
          .from('resumes')
          .upload(fileName, resumeFile)

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName)

        resumeUrl = urlData.publicUrl
      }

      // Get the highest order number for the selected stage
      const { data: existingCandidates } = await supabase
        .from('candidates')
        .select('order')
        .eq('search_id', searchId)
        .eq('stage_id', formData.stage_id)
        .order('order', { ascending: false })
        .limit(1)

      const nextOrder = existingCandidates && existingCandidates.length > 0
        ? existingCandidates[0].order + 1
        : 0

      // Create candidate
      const { error: insertError } = await supabase
        .from('candidates')
        .insert({
          search_id: searchId,
          stage_id: formData.stage_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          location: formData.location || null,
          open_to_relocation: formData.open_to_relocation,
          photo_url: photoUrl || null,
          resume_url: resumeUrl || null,
          linkedin_url: formData.linkedin_url || null,
          general_notes: formData.general_notes || null,
          compensation_expectation: formData.compensation_expectation || null,
          order: nextOrder,
          status: 'active'
        })

      if (insertError) throw insertError

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        location: '',
        open_to_relocation: false,
        photo_url: '',
        resume_url: '',
        linkedin_url: '',
        general_notes: '',
        compensation_expectation: '',
        stage_id: ''
      })
      setPhotoFile(null)
      setResumeFile(null)

      // Close dialog and notify parent
      setIsOpen(false)
      onCandidateAdded()
    } catch (error) {
      console.error('Error adding candidate:', error)
      alert('Failed to add candidate. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#1F3C62] hover:opacity-90">
            + Add Candidate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
          <DialogDescription>
            Add a candidate to the pipeline. Required fields are marked with *
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="john.doe@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">Used for scheduling interviews</p>
            </div>

            <div>
              <Label htmlFor="stage_id">Initial Stage *</Label>
              <Select
                value={formData.stage_id}
                onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900">Optional Information</h3>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, State"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="open_to_relocation"
                checked={formData.open_to_relocation}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, open_to_relocation: checked as boolean })
                }
              />
              <Label htmlFor="open_to_relocation" className="font-normal cursor-pointer">
                ☑ Open to relocation
              </Label>
            </div>

            <div>
              <Label htmlFor="photo">Photo</Label>
              <div className="mt-1">
                <label className="cursor-pointer inline-block">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>{photoFile ? photoFile.name : 'Choose File'}</span>
                  </Button>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="resume">Resume</Label>
              <div className="mt-1">
                <label className="cursor-pointer inline-block">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>{resumeFile ? resumeFile.name : 'Choose PDF'}</span>
                  </Button>
                  <input
                    id="resume"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleResumeSelect}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div>
              <Label htmlFor="general_notes">General Notes</Label>
              <Textarea
                id="general_notes"
                value={formData.general_notes}
                onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                placeholder="Add any relevant notes about this candidate..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="compensation_expectation">Compensation Expectation</Label>
              <Input
                id="compensation_expectation"
                value={formData.compensation_expectation}
                onChange={(e) => setFormData({ ...formData, compensation_expectation: e.target.value })}
                placeholder="e.g., $180-200k base + 30% bonus + equity"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#1F3C62] hover:opacity-90"
            >
              {isSubmitting ? 'Adding...' : 'Add Candidate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
