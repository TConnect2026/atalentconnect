"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"

const companyDetailsSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_location: z.string().optional(),
  company_website: z.string().optional(),
  company_linkedin: z.string().optional(),
})

type CompanyDetailsForm = z.infer<typeof companyDetailsSchema>

interface EditCompanyDetailsDialogProps {
  searchId: string
  currentData: {
    company_name: string
    company_location?: string
    company_website?: string
    company_linkedin?: string
    company_social_links?: Array<{ platform: string; url: string }>
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditCompanyDetailsDialog({
  searchId,
  currentData,
  isOpen,
  onClose,
  onSuccess
}: EditCompanyDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>(
    currentData.company_social_links || []
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyDetailsForm>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      company_name: currentData.company_name,
      company_location: currentData.company_location || "",
      company_website: currentData.company_website || "",
      company_linkedin: currentData.company_linkedin || "",
    }
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        company_name: currentData.company_name,
        company_location: currentData.company_location || "",
        company_website: currentData.company_website || "",
        company_linkedin: currentData.company_linkedin || "",
      })
      setSocialLinks(currentData.company_social_links || [])
    }
  }, [isOpen, currentData, reset])

  const onSubmit = async (data: CompanyDetailsForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from("searches")
        .update({
          company_name: data.company_name,
          company_location: data.company_location || null,
          company_website: data.company_website || null,
          company_linkedin: data.company_linkedin || null,
          company_social_links: socialLinks.length > 0 ? socialLinks : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", searchId)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      console.error("Error updating company details:", err)
      setError(err instanceof Error ? err.message : "Failed to update company details")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Company Name */}
          <div>
            <Label htmlFor="company_name" className="text-sm font-medium">Company Name *</Label>
            <Input
              id="company_name"
              {...register("company_name")}
              className="mt-1.5"
            />
            {errors.company_name && (
              <p className="text-red-600 text-sm mt-1.5">{errors.company_name.message}</p>
            )}
          </div>

          {/* Company Location */}
          <div>
            <Label htmlFor="company_location" className="text-sm font-medium">Company Location</Label>
            <Input
              id="company_location"
              {...register("company_location")}
              placeholder="e.g. San Francisco, CA"
              className="mt-1.5"
            />
            <p className="text-xs text-text-muted mt-1.5">
              Physical location or headquarters
            </p>
          </div>

          {/* Company Website */}
          <div>
            <Label htmlFor="company_website" className="text-sm font-medium">Company Website</Label>
            <Input
              id="company_website"
              {...register("company_website")}
              placeholder="https://example.com"
              className="mt-1.5"
            />
          </div>

          {/* LinkedIn */}
          <div>
            <Label htmlFor="company_linkedin" className="text-sm font-medium">LinkedIn</Label>
            <Input
              id="company_linkedin"
              {...register("company_linkedin")}
              placeholder="https://linkedin.com/company/example"
              className="mt-1.5"
            />
          </div>

          {/* Other Social Channels */}
          <div>
            <Label className="text-sm font-medium">Other Social Channels (Optional)</Label>
            <p className="text-xs text-text-muted mt-1 mb-3">
              Add links to Twitter, Facebook, Instagram, or other social platforms
            </p>

            <div className="space-y-3">
              {socialLinks.map((link, index) => (
                <Card key={index} className="p-4 bg-bg-section border-ds-border">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Input
                        value={link.platform}
                        onChange={(e) => {
                          const updated = [...socialLinks]
                          updated[index].platform = e.target.value
                          setSocialLinks(updated)
                        }}
                        placeholder="Platform (e.g., Twitter)"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...socialLinks]
                          updated[index].url = e.target.value
                          setSocialLinks(updated)
                        }}
                        placeholder="https://..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSocialLinks([...socialLinks, { platform: '', url: '' }])}
              className="w-full mt-3"
            >
              + Add Social Link
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
