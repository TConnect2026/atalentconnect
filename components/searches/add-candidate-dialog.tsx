"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Stage } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Camera } from "lucide-react"

interface AddCandidateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchId: string
  stages: Stage[]
  onSuccess: () => void
}

export function AddCandidateDialog({
  open,
  onOpenChange,
  searchId,
  stages,
  onSuccess,
}: AddCandidateDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
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
      setError("First name and last name are required.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Auto-assign to first stage (Prospect)
      const stageId = stages[0]?.id
      if (!stageId) {
        setError("No stages found. Please add at least one stage first.")
        setIsLoading(false)
        return
      }

      let photoUrl: string | null = null
      let resumeUrl: string | null = null

      // Upload photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from("candidate-photos")
          .upload(fileName, photoFile)

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("candidate-photos")
            .getPublicUrl(fileName)
          photoUrl = urlData.publicUrl
        }
      }

      // Upload resume if provided
      if (resumeFile) {
        const fileExt = resumeFile.name.split(".").pop()
        const filePath = `resumes/${searchId}/${Date.now()}-${firstName}-${lastName}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from("candidateresumes")
          .upload(filePath, resumeFile)

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("candidateresumes")
            .getPublicUrl(filePath)
          resumeUrl = urlData.publicUrl
        }
      }

      // Get the count of candidates in the stage to set the order
      const { count } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("stage_id", stageId)

      const { data: newCandidate, error: insertError } = await supabase
        .from("candidates")
        .insert({
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
          order: count || 0,
          status: 'active',
        })
        .select()
        .single()

      if (insertError) throw insertError

      resetForm()
      onOpenChange(false)
      onSuccess()
      router.push(`/searches/${searchId}/candidates/${newCandidate.id}`)
    } catch (err) {
      console.error("Error adding candidate:", err)
      setError(err instanceof Error ? err.message : "Failed to add candidate")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

            {/* Error */}
            {error && (
              <div className="p-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-ds-border flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false) }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-navy text-white hover:bg-navy/90"
            >
              {isLoading ? "Adding..." : "Add Candidate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
