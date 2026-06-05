"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase-client"
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
  const supabase = createClient()
  const { user, profile } = useAuth()
  const [companyName, setCompanyName] = useState("")
  const [positionTitle, setPositionTitle] = useState("")
  const [leadRecruiterId, setLeadRecruiterId] = useState("")
  const [searchType, setSearchType] = useState<'retained' | 'contingency' | 'container' | 'other'>('retained')
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

  // Lead Recruiter defaults to empty and is required at submit.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !profile) {
      setError("You must be logged in to create a search")
      return
    }

    if (!companyName.trim() || !positionTitle.trim()) return

    if (!leadRecruiterId) {
      setError("Lead Recruiter is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { data: search, error: searchError } = await supabase
        .from('searches')
        .insert({
          firm_id: profile.firm_id,
          lead_recruiter_id: leadRecruiterId,
          company_name: companyName.trim(),
          position_title: positionTitle.trim(),
          search_type: searchType,
          status: 'active',
          client_name: 'TBD',
          client_email: 'pending@example.com',
        })
        .select()
        .single()

      if (searchError) throw new Error(searchError.message || 'Failed to create search')

      // Seed the default entry stage via the service-role server route.
      // A browser-side insert into `stages` is rejected by RLS, so we POST
      // to /api/stages (service-role admin client). Fail loudly so a broken
      // seed surfaces instead of leaving the search with no stage.
      const stageRes = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: search.id,
          name: 'Prospect',
          stage_order: 0,
          visible_in_client_portal: false,
        }),
      })
      if (!stageRes.ok) {
        const body = await stageRes.json().catch(() => ({}))
        throw new Error(body?.error || `Failed to seed default stage (${stageRes.status})`)
      }

      // Seed the Lead Recruiter onto the Interview Team (panelists) via the
      // service-role route so they show up on the Interview Team page and in
      // the stage participant dropdown. Best-effort: a failure here shouldn't
      // block search creation, so we log and continue.
      try {
        // Resolve the lead recruiter's name with a fallback chain so we never
        // POST an empty name (the route 400s on a blank name, and the failure
        // would be swallowed below). Prefer the matched firmUsers row; if that
        // is blank and the lead recruiter is the logged-in user, fall back to
        // the current profile's name.
        const leadUser = firmUsers.find((u) => u.id === leadRecruiterId)
        const fromFirmUser = leadUser ? `${leadUser.first_name || ''} ${leadUser.last_name || ''}`.trim() : ''
        const profileFallback = leadRecruiterId === profile.id
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : ''
        const leadName = fromFirmUser || profileFallback

        if (!leadName) {
          console.warn('Lead recruiter name could not be resolved — skipping Interview Team seed')
        } else {
          const seedRes = await fetch('/api/panelists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              search_id: search.id,
              name: leadName,
              title: 'Lead Recruiter',
              email: null,
              linkedin_url: null,
              notes: null,
            }),
          })
          const seedBody = await seedRes.json().catch(() => ({}))
          if (!seedRes.ok) {
            console.error('Error seeding lead recruiter panelist:', seedBody?.error || seedRes.status)
          }
        }
      } catch (panelistErr) {
        console.error('Error seeding lead recruiter panelist:', panelistErr)
      }

      // Seed search_team_members with the Lead Recruiter so the Search Team
      // section in Essentials starts populated. Failure here shouldn't block
      // search creation — log it and continue.
      const leadUserId = leadRecruiterId || user.id
      const { error: teamError } = await supabase
        .from('search_team_members')
        .insert({ search_id: search.id, user_id: leadUserId, role: 'Lead' })
      if (teamError) console.error('Error seeding search_team_members:', teamError)

      setCompanyName("")
      setPositionTitle("")
      setLeadRecruiterId("")
      setSearchType('retained')
      onOpenChange(false)

      // Company Intel: panel triggers /api/company-intel on first load
      // when company_description is empty — no fire-and-forget here.
      //
      // Company news: pulled once at search creation. After this, the
      // recruiter is responsible for refreshing manually from the panel.
      // Fire-and-forget — failure is silent; the manual refresh button
      // in the panel is the retry path.
      fetch('/api/company-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId: search.id, companyName: companyName.trim() }),
      }).catch((err) => console.error('Company news kickoff error:', err))

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
    setSearchType('retained')
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
              Lead Recruiter *
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
            <p className="mt-1 text-xs text-text-muted">
              {firmUsers.length <= 1
                ? 'Add team members in Settings to expand your search team.'
                : 'The person accountable for this search. Other team members can be added in Search Details.'}
            </p>
          </div>

          <div>
            <Label htmlFor="search_type" className="text-sm font-bold text-navy">
              Search Type
            </Label>
            <Select value={searchType} onValueChange={(v) => setSearchType(v as typeof searchType)}>
              <SelectTrigger className="mt-1 border-2 border-ds-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retained">Retained</SelectItem>
                <SelectItem value="contingency">Contingency</SelectItem>
                <SelectItem value="container">Container</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
