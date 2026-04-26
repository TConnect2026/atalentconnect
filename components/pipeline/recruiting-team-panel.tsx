"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AddTeamMemberDialog } from "@/components/searches/add-team-member-dialog"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Pencil, Trash2, UserCircle } from "lucide-react"

interface RecruitingTeamPanelProps {
  searchId: string
  teamMembers: any[]
  onUpdate: () => void
}

export function RecruitingTeamPanel({ searchId, teamMembers, onUpdate }: RecruitingTeamPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<any | null>(null)

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const { error } = await supabase
        .from('search_team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Error deleting team member:', err)
      alert('Failed to delete team member')
    }
  }

  const handleEdit = (member: any) => {
    setEditingMember(member)
    setIsAddDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
    setEditingMember(null)
    onUpdate()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Lead': return 'bg-navy/10 text-navy'
      case 'Associate': return 'bg-green-100 text-green-800'
      case 'Sourcer': return 'bg-purple-100 text-purple-800'
      case 'Researcher': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-bg-section text-text-primary'
    }
  }

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {/* Add Team Member Button */}
      <Button
        onClick={() => {
          setEditingMember(null)
          setIsAddDialogOpen(true)
        }}
        size="sm"
        className="w-full text-white font-semibold bg-orange"
      >
        + Add Team Member
      </Button>

      {/* Team Members Table */}
      {teamMembers.length === 0 ? (
        <div className="py-6 text-center">
          <UserCircle className="w-12 h-12 mx-auto text-text-muted mb-2" />
          <p className="text-sm text-text-muted">No recruiting team members yet</p>
          <p className="text-xs text-text-muted mt-1">Add firm members assigned to this search</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ds-border">
                <th className="text-left py-2 px-2 font-bold text-text-primary">Name</th>
                <th className="text-left py-2 px-2 font-bold text-text-primary">Role</th>
                <th className="text-center py-2 px-2 font-bold text-text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-b border-ds-border hover:bg-bg-section">
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="font-semibold text-text-primary hover:text-navy transition-colors text-left"
                    >
                      {member.first_name} {member.last_name}
                    </button>
                    {member.email && (
                      <p className="text-[10px] text-text-muted">{member.email}</p>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(member)}
                        className="p-1 hover:bg-bg-page rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3 text-text-secondary" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Team Member Dialog */}
      <AddTeamMemberDialog
        isOpen={isAddDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogClose}
        searchId={searchId}
        existingMember={editingMember}
      />
    </div>
  )
}
