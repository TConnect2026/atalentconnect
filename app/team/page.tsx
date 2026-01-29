'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type TeamMember = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  created_at: string
}

export default function TeamPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'administrator' | 'recruiter'>('recruiter')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.firm_id) {
      loadTeamMembers()
    }
  }, [profile])

  const loadTeamMembers = async () => {
    if (!profile?.firm_id) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('firm_id', profile.firm_id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setTeamMembers(data || [])
    } catch (err) {
      console.error('Error loading team members:', err)
      setError('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.firm_id || !inviteEmail || !inviteFirstName || !inviteLastName) return

    setIsInviting(true)
    setError(null)
    setInviteSuccess(false)
    setInviteLink(null)

    try {
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: inviteFirstName,
          lastName: inviteLastName,
          email: inviteEmail,
          role: inviteRole,
          firmId: profile.firm_id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create invitation')
        if (result.manualLink) {
          setInviteLink(result.manualLink)
        }
      } else {
        // Always show the manual link
        if (result.manualLink) {
          setInviteLink(result.manualLink)
        }

        // Show success if email was sent, otherwise show info message
        if (result.emailSent) {
          setInviteSuccess(true)
          setInviteFirstName('')
          setInviteLastName('')
          setInviteEmail('')
        } else {
          setError('Email service unavailable. Use the manual link below.')
          // Don't clear form yet - wait for them to copy the link
        }

        // Refresh team members list
        setTimeout(() => {
          loadTeamMembers()
        }, 1000)
      }
    } catch (err) {
      console.error('Error inviting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      alert('Invitation link copied to clipboard!')
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading team...</p>
      </div>
    )
  }

  // Only admins can access this page
  if (profile.role !== 'administrator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Access Denied</h3>
              <p className="text-gray-600 mb-6">Only administrators can manage team members.</p>
              <Button onClick={() => router.push('/searches')}>Go to Searches</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-2">Manage your team members and send invitations</p>
        </div>

        {/* Invite Form */}
        <Card className="mb-8 border-gray-200 bg-white">
          <CardHeader>
            <CardTitle style={{ color: '#1e508c' }}>Invite Team Member</CardTitle>
            <CardDescription>Send an invitation to join your team</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              {inviteSuccess && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm flex items-center justify-between">
                  <span>Invitation sent successfully!</span>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteSuccess(false)
                      setInviteLink(null)
                    }}
                    className="text-green-700 hover:text-green-900 text-xs font-semibold underline"
                  >
                    Add Another
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {inviteLink && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-900">
                      📋 Manual Invitation Link
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setInviteLink(null)
                        setError(null)
                        setInviteFirstName('')
                        setInviteLastName('')
                        setInviteEmail('')
                      }}
                      className="text-blue-700 hover:text-blue-900 text-xs font-semibold underline"
                    >
                      Add Another
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Copy this link and send it to {inviteFirstName || 'the user'} via email or chat:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-white border border-blue-300 rounded-md font-mono"
                    />
                    <Button
                      type="button"
                      onClick={copyInviteLink}
                      className="text-white whitespace-nowrap"
                      style={{ backgroundColor: '#1e508c' }}
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteFirstName">First Name</Label>
                  <Input
                    id="inviteFirstName"
                    type="text"
                    placeholder="John"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    disabled={isInviting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteLastName">Last Name</Label>
                  <Input
                    id="inviteLastName"
                    type="text"
                    placeholder="Smith"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    disabled={isInviting}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="john.smith@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInviting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteRole">Role</Label>
                  <select
                    id="inviteRole"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'administrator' | 'recruiter')}
                    disabled={isInviting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="recruiter">Recruiter</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isInviting || !inviteEmail || !inviteFirstName || !inviteLastName}
                className="text-white"
                style={{ backgroundColor: '#1e508c' }}
              >
                {isInviting ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle style={{ color: '#1e508c' }}>Team Members ({teamMembers.length})</CardTitle>
            <CardDescription>Current members of your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 font-semibold text-sm">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {member.first_name} {member.last_name}
                          {member.id === user?.id && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        member.role === 'administrator'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {member.role === 'administrator' ? 'Admin' : 'Recruiter'}
                    </span>
                  </div>
                </div>
              ))}

              {teamMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No team members yet. Start by inviting someone!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
