"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { useAuth } from "@/lib/auth-context"
import { SearchTeamMember } from "@/types"

interface AddTeamMemberDialogProps {
  searchId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingMember?: SearchTeamMember | null
}

export function AddTeamMemberDialog({ searchId, isOpen, onClose, onSuccess, existingMember }: AddTeamMemberDialogProps) {
  const { profile } = useAuth()
  const [profileId, setProfileId] = useState("")
  const [role, setRole] = useState("Associate")
  const [firmMembers, setFirmMembers] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFirmMembers()
    }
  }, [isOpen, profile])

  useEffect(() => {
    if (existingMember) {
      setProfileId(existingMember.profile_id || "")
      setRole(existingMember.role || "Associate")
    } else {
      setProfileId("")
      setRole("Associate")
    }
  }, [existingMember, isOpen])

  const loadFirmMembers = async () => {
    if (!profile?.firm_id) return
    setIsLoadingMembers(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("firm_id", profile.firm_id)
        .order("first_name", { ascending: true })

      if (error) throw error
      setFirmMembers(data || [])
    } catch (err) {
      console.error("Error loading firm members:", err)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileId || !role) return
    setIsSaving(true)

    try {
      if (existingMember) {
        const { error } = await supabase
          .from("search_team_members")
          .update({ profile_id: profileId, role })
          .eq("id", existingMember.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("search_team_members")
          .insert({ search_id: searchId, profile_id: profileId, role })

        if (error) throw error
      }

      setProfileId("")
      setRole("Associate")
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error("Error saving team member:", err)
      if (err?.code === '23505') {
        alert("This person is already on the team.")
      } else {
        alert(`Failed to ${existingMember ? "update" : "add"} team member`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            {existingMember ? "Edit Team Member" : "Add Team Member"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="profileId" className="text-text-primary">Team Member *</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger className="mt-1 bg-white text-text-primary">
                <SelectValue placeholder={isLoadingMembers ? "Loading..." : "Select a team member..."} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {firmMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex flex-col">
                      <span>{member.first_name} {member.last_name}</span>
                      <span className="text-xs text-text-muted">{member.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="role" className="text-text-primary">Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1 bg-white text-text-primary">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Associate">Associate</SelectItem>
                <SelectItem value="Sourcer">Sourcer</SelectItem>
                <SelectItem value="Researcher">Researcher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white text-text-primary border-ds-border hover:bg-bg-section"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !profileId}
              className="bg-[#0891B2] text-white hover:bg-[#DC2626] font-semibold"
            >
              {isSaving ? "Saving..." : existingMember ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
