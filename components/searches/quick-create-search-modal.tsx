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
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const quickCreateSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_website: z.string().optional(),
  position_title: z.string().min(1, "Position title is required"),
  compensation_range: z.string().optional(),
  launch_date: z.string().optional(),
  target_fill_date: z.string().optional(),
})

type QuickCreateFormData = z.infer<typeof quickCreateSchema>

interface QuickCreateSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCreateSearchModal({ open, onOpenChange }: QuickCreateSearchModalProps) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recruiting team state - array of team members
  const [recruitingTeam, setRecruitingTeam] = useState<Array<{ user_id: string; role: string }>>([])
  const [firmUsers, setFirmUsers] = useState<Array<{ id: string; name: string }>>([])

  // Load firm users and set default when modal opens
  useEffect(() => {
    if (open && profile?.firm_id) {
      loadFirmUsers()
      // Set current user as default Lead Recruiter
      if (user?.id) {
        setRecruitingTeam([{ user_id: user.id, role: 'lead_recruiter' }])
      }
    }
  }, [open, profile?.firm_id, user?.id])

  const loadFirmUsers = async () => {
    if (!profile?.firm_id) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('firm_id', profile.firm_id)
        .in('role', ['administrator', 'recruiter'])
        .order('first_name')

      if (error) throw error

      const users = (data || []).map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`
      }))

      setFirmUsers(users)
    } catch (err) {
      console.error('Error loading firm users:', err)
    }
  }

  const addTeamMember = () => {
    setRecruitingTeam([...recruitingTeam, { user_id: '', role: 'associate' }])
  }

  const updateTeamMember = (index: number, field: 'user_id' | 'role', value: string) => {
    const updated = [...recruitingTeam]
    updated[index][field] = value
    setRecruitingTeam(updated)
  }

  const removeTeamMember = (index: number) => {
    setRecruitingTeam(recruitingTeam.filter((_, i) => i !== index))
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
  })

  const onSubmit = async (data: QuickCreateFormData) => {
    if (!user || !profile) {
      setError("You must be logged in to create a search")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create search record
      const leadRecruiter = recruitingTeam.find(tm => tm.role === 'lead_recruiter')
      const { data: search, error: searchError } = await supabase
        .from('searches')
        .insert({
          firm_id: profile.firm_id,
          lead_recruiter_id: leadRecruiter?.user_id || user.id,
          company_name: data.company_name,
          company_website: data.company_website || null,
          position_title: data.position_title,
          compensation_range: data.compensation_range || null,
          launch_date: data.launch_date || null,
          target_fill_date: data.target_fill_date || null,
          status: 'active', // Set to active immediately
          client_name: 'TBD', // Backward compatibility - will be updated when contacts added
          client_email: 'pending@example.com', // Backward compatibility - will be updated when contacts added
        })
        .select()
        .single()

      if (searchError) {
        console.error('Search creation error:', searchError)
        console.error('Error details:', JSON.stringify(searchError, null, 2))
        throw new Error(searchError.message || 'Failed to create search')
      }

      // Save recruiting team members to search_team table
      const validTeam = recruitingTeam.filter(tm => tm.user_id && tm.role)
      if (validTeam.length > 0) {
        const teamData = validTeam.map(tm => ({
          search_id: search.id,
          user_id: tm.user_id,
          role: tm.role,
          access_level: 'full_access'
        }))

        await supabase
          .from('search_team')
          .insert(teamData)
      }

      // Reset form and close modal
      reset()
      setRecruitingTeam([{ user_id: user?.id || '', role: 'lead_recruiter' }])
      onOpenChange(false)

      // Redirect to pipeline workspace
      router.push(`/searches/${search.id}/pipeline`)
    } catch (err) {
      console.error('Error creating search:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontSize: '20px', color: '#1F3C62', fontWeight: 'bold' }}>
            New Search
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Company Name */}
          <div>
            <Label htmlFor="company_name" className="text-sm font-bold" style={{ color: '#1F3C62' }}>
              Company Name *
            </Label>
            <Input
              id="company_name"
              {...register("company_name")}
              placeholder="e.g. Acme Corp"
              className="mt-1 border-2 border-gray-400"
            />
            {errors.company_name && (
              <p className="text-xs text-red-600 mt-0.5">{errors.company_name.message}</p>
            )}
          </div>

          {/* Company Website */}
          <div>
            <Label htmlFor="company_website" className="text-sm font-bold" style={{ color: '#1F3C62' }}>
              Company Website
            </Label>
            <Input
              id="company_website"
              {...register("company_website")}
              placeholder="e.g. https://www.acmecorp.com"
              className="mt-1 border-2 border-gray-400"
            />
          </div>

          {/* Position Title */}
          <div>
            <Label htmlFor="position_title" className="text-sm font-bold" style={{ color: '#1F3C62' }}>
              Position Title *
            </Label>
            <Input
              id="position_title"
              {...register("position_title")}
              placeholder="e.g. Senior Software Engineer"
              className="mt-1 border-2 border-gray-400"
            />
            {errors.position_title && (
              <p className="text-xs text-red-600 mt-0.5">{errors.position_title.message}</p>
            )}
          </div>

          {/* Compensation */}
          <div>
            <Label htmlFor="compensation_range" className="text-sm font-bold" style={{ color: '#1F3C62' }}>
              Compensation
            </Label>
            <Input
              id="compensation_range"
              {...register("compensation_range")}
              placeholder="e.g. $120k-150k + equity"
              className="mt-1 border-2 border-gray-400"
            />
          </div>

          {/* Launch Date | Target Close Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="launch_date" className="text-sm font-bold" style={{ color: '#1F3C62' }}>
                Launch Date
              </Label>
              <Input
                id="launch_date"
                type="date"
                {...register("launch_date")}
                className="mt-1 border-2 border-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="target_fill_date" className="text-sm font-bold" style={{ color: '#1F3C62' }}>
                Target Close Date
              </Label>
              <Input
                id="target_fill_date"
                type="date"
                {...register("target_fill_date")}
                className="mt-1 border-2 border-gray-400"
              />
            </div>
          </div>

          {/* Recruiting Team */}
          <div>
            <Label className="text-sm font-bold" style={{ color: '#1F3C62' }}>
              Recruiting Team
            </Label>
            {recruitingTeam.map((member, index) => (
              <div key={index} className={index === 0 ? "mt-1" : "mt-2"}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Select value={member.user_id} onValueChange={(value) => updateTeamMember(index, 'user_id', value)}>
                      <SelectTrigger className="w-full h-10 border-2 border-gray-400">
                        <SelectValue placeholder="Select team member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {firmUsers.map(firmUser => (
                          <SelectItem key={firmUser.id} value={firmUser.id}>
                            {firmUser.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Select value={member.role} onValueChange={(value) => updateTeamMember(index, 'role', value)}>
                      <SelectTrigger className="w-full h-10 border-2 border-gray-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead_recruiter">Lead</SelectItem>
                        <SelectItem value="associate">Associate</SelectItem>
                        <SelectItem value="sourcer">Sourcer</SelectItem>
                        <SelectItem value="researcher">Researcher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeTeamMember(index)}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTeamMember}
              className="text-sm text-gray-600 hover:text-gray-900 mt-2"
            >
              + Add team member
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
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
              style={{ backgroundColor: '#E07A40', color: 'white', fontWeight: 'bold' }}
            >
              {isSubmitting ? "Creating..." : "Create Search"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
