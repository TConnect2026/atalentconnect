"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { Stage } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const candidateSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  linkedin_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  current_company: z.string().optional(),
  current_title: z.string().optional(),
  stage_id: z.string().min(1, "Stage is required"),
})

type CandidateForm = z.infer<typeof candidateSchema>

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch
  } = useForm<CandidateForm>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      stage_id: stages[0]?.id || "",
    }
  })

  const stageId = watch("stage_id")

  const onSubmit = async (data: CandidateForm) => {
    setIsLoading(true)
    setError(null)

    try {
      let resumeUrl: string | null = null

      // Upload resume if one was selected
      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop()
        const fileName = `${Date.now()}-${data.first_name}-${data.last_name}.${fileExt}`
        const filePath = `resumes/${searchId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('candidate-resumes')
          .upload(filePath, resumeFile)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('candidate-resumes')
          .getPublicUrl(filePath)

        resumeUrl = urlData.publicUrl
      }

      // Get the count of candidates in the selected stage to set the order
      const { count } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("stage_id", data.stage_id)

      const { error: insertError } = await supabase
        .from("candidates")
        .insert({
          search_id: searchId,
          stage_id: data.stage_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone || null,
          linkedin_url: data.linkedin_url || null,
          current_company: data.current_company || null,
          current_title: data.current_title || null,
          resume_url: resumeUrl,
          order: count || 0,
        })

      if (insertError) throw insertError

      // Reset form and close dialog
      reset()
      setResumeFile(null)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error("Error adding candidate:", err)
      setError(err instanceof Error ? err.message : "Failed to add candidate")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
          <DialogDescription>
            Add a candidate to this search. You can import from LinkedIn or enter manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Stage Selection */}
          <div>
            <Label htmlFor="stage_id">Pipeline Stage</Label>
            <Select
              value={stageId}
              onValueChange={(value) => setValue("stage_id", value)}
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
            {errors.stage_id && (
              <p className="text-sm text-red-500 mt-1">{errors.stage_id.message}</p>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                {...register("first_name")}
                placeholder="John"
              />
              {errors.first_name && (
                <p className="text-sm text-red-500 mt-1">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                {...register("last_name")}
                placeholder="Smith"
              />
              {errors.last_name && (
                <p className="text-sm text-red-500 mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john.smith@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="linkedin_url">LinkedIn URL (Optional)</Label>
            <Input
              id="linkedin_url"
              {...register("linkedin_url")}
              placeholder="https://linkedin.com/in/johnsmith"
            />
            {errors.linkedin_url && (
              <p className="text-sm text-red-500 mt-1">{errors.linkedin_url.message}</p>
            )}
          </div>

          {/* Current Position */}
          <div>
            <Label htmlFor="current_title">Current Title (Optional)</Label>
            <Input
              id="current_title"
              {...register("current_title")}
              placeholder="e.g. VP of Engineering"
            />
          </div>

          <div>
            <Label htmlFor="current_company">Current Company (Optional)</Label>
            <Input
              id="current_company"
              {...register("current_company")}
              placeholder="e.g. Tech Corp"
            />
          </div>

          {/* Resume Upload */}
          <div>
            <Label htmlFor="resume">Resume (Optional)</Label>
            <Input
              id="resume"
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
                  setResumeFile(file)
                  setError(null)
                }
              }}
              className="cursor-pointer"
            />
            {resumeFile && (
              <p className="text-sm text-green-600 mt-1.5">
                Selected: {resumeFile.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1.5">
              Accepted formats: PDF, DOC, DOCX (Max 10MB)
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Candidate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
