"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

interface QuickCreateSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FirmUser {
  id: string
  first_name: string
  last_name: string
}

export function QuickCreateSearchModal({ open, onOpenChange }: QuickCreateSearchModalProps) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [companyName, setCompanyName] = useState("")
  const [positionTitle, setPositionTitle] = useState("")
  const [leadRecruiterId, setLeadRecruiterId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firmUsers, setFirmUsers] = useState<FirmUser[]>([])

  // Load firm users for Lead Recruiter dropdown
  useEffect(() => {
    const loadFirmUsers = async () => {
      if (!profile?.firm_id) return
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("firm_id", profile.firm_id)
          .order("first_name", { ascending: true })

        if (!error && data) {
          setFirmUsers(data)
        }
      } catch (err) {
        console.error("Error loading firm users:", err)
      }
    }
    if (open) loadFirmUsers()
  }, [open, profile?.firm_id])

  // Default lead recruiter to current user
  useEffect(() => {
    if (user?.id && !leadRecruiterId) {
      setLeadRecruiterId(user.id)
    }
  }, [user?.id, leadRecruiterId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !profile) {
      setError("You must be logged in to create a search")
      return
    }

    if (!companyName.trim() || !positionTitle.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { data: search, error: searchError } = await supabase
        .from('searches')
        .insert({
          firm_id: profile.firm_id,
          lead_recruiter_id: leadRecruiterId || user.id,
          company_name: companyName.trim(),
          position_title: positionTitle.trim(),
          status: 'active',
          client_name: 'TBD',
          client_email: 'pending@example.com',
        })
        .select()
        .single()

      if (searchError) throw new Error(searchError.message || 'Failed to create search')

      setCompanyName("")
      setPositionTitle("")
      setLeadRecruiterId("")
      onOpenChange(false)

      router.push(`/searches/${search.id}/pipeline`)
    } catch (err) {
      console.error('Error creating search:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setCompanyName("")
    setPositionTitle("")
    setLeadRecruiterId("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-navy">
            New Search
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="company_name" className="text-sm font-bold text-navy">
              Company Name *
            </Label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              className="mt-1 border-2 border-ds-border"
            />
          </div>

          <div>
            <Label htmlFor="position_title" className="text-sm font-bold text-navy">
              Position Title *
            </Label>
            <Input
              id="position_title"
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              required
              className="mt-1 border-2 border-ds-border"
            />
          </div>

          <div>
            <Label htmlFor="lead_recruiter" className="text-sm font-bold text-navy">
              Lead Recruiter
            </Label>
            <Select value={leadRecruiterId} onValueChange={setLeadRecruiterId}>
              <SelectTrigger className="mt-1 border-2 border-ds-border">
                <SelectValue placeholder="Select recruiter..." />
              </SelectTrigger>
              <SelectContent>
                {firmUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="p-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange text-white font-bold hover:bg-orange-hover"
            >
              {isSubmitting ? "Creating..." : "Create Search"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
