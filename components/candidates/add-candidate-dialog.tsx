"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Camera } from "lucide-react"
import { Stage } from "@/types"

interface AddCandidateDialogProps {
  searchId: string
  stages: Stage[]
  onCandidateAdded: () => void
  trigger?: React.ReactNode
}

export function AddCandidateDialog({
  searchId,
  stages,
  onCandidateAdded,
  trigger
}: AddCandidateDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [currentCompany, setCurrentCompany] = useState("")
  const [currentTitle, setCurrentTitle] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [internalNotes, setInternalNotes] = useState("")

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setCurrentCompany("")
    setCurrentTitle("")
    setLocation("")
    setPhone("")
    setEmail("")
    setLinkedinUrl("")
    setInternalNotes("")
    setPhotoFile(null)
    setPhotoPreview(null)
    setResumeFile(null)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      alert("First name and last name are required.")
      return
    }

    setIsSubmitting(true)

    try {
      // Auto-assign to first stage (Prospect)
      const stageId = stages[0]?.id
      if (!stageId) {
        alert("No stages found. Please add at least one stage first.")
        setIsSubmitting(false)
        return
      }

      let photoUrl: string | null = null
      let resumeUrl: string | null = null

      // Upload files via server-side API (bypasses storage RLS)
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const formData = new FormData()
        formData.append('file', photoFile)
        formData.append('bucket', 'candidate-photos')
        formData.append('path', fileName)
        const uploadRes = await fetch('/api/upload-file', { method: 'POST', body: formData })
        if (uploadRes.ok) {
          const { publicUrl } = await uploadRes.json()
          photoUrl = publicUrl
        }
      }

      if (resumeFile) {
        const fileExt = resumeFile.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const formData = new FormData()
        formData.append('file', resumeFile)
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
          stage_id: stageId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || '',
          phone: phone.trim() || null,
          current_company: currentCompany.trim() || null,
          current_title: currentTitle.trim() || null,
          location: location.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          recruiter_notes: internalNotes.trim() || null,
          photo_url: photoUrl,
          resume_url: resumeUrl,
          status: "active",
        }),
      })
      const result = await insertRes.json()
      if (!insertRes.ok) throw new Error(result.error || 'Failed to add candidate')
      const newCandidate = result

      resetForm()
      setIsOpen(false)
      onCandidateAdded()
      router.push(`/searches/${searchId}/candidates/${newCandidate.id}`)
    } catch (error) {
      console.error("Error adding candidate:", error)
      alert("Failed to add candidate. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-orange hover:bg-orange-hover text-white">
            + Add Candidate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] bg-white max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-navy">
            Add Candidate
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Photo */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-20 h-20 rounded-full border-2 border-dashed border-ds-border flex items-center justify-center overflow-hidden hover:border-ds-border transition-colors bg-bg-section"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
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
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-navy">Last Name *</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
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
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-navy">Current Title</Label>
                <Input
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
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
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-navy">Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-navy">LinkedIn URL</Label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="linkedin.com/in/..."
                  className="mt-1"
                />
              </div>
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
                    if (file) setResumeFile(file)
                  }}
                />
                {resumeFile ? (
                  <span className="text-sm text-green-700 font-medium">{resumeFile.name}</span>
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
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
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
              onClick={() => { resetForm(); setIsOpen(false) }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-navy text-white hover:bg-navy/90"
            >
              {isSubmitting ? "Adding..." : "Add Candidate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
