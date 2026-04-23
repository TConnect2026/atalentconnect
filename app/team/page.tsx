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
  const [firmLogoUrl, setFirmLogoUrl] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    if (profile?.firm_id) {
      loadTeamMembers()
      loadFirmLogo()
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

  const loadFirmLogo = async () => {
    if (!profile?.firm_id) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('firms')
        .select('logo_url')
        .eq('id', profile.firm_id)
        .single()
      if (data) setFirmLogoUrl(data.logo_url || null)
    } catch (err) {
      console.error('Error loading firm logo:', err)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.firm_id) return
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return }

    setIsUploadingLogo(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.firm_id}/logos/firm-logo-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('firms')
        .update({ logo_url: publicUrl })
        .eq('id', profile.firm_id)
      if (updateError) throw updateError

      setFirmLogoUrl(publicUrl)
    } catch (err) {
      console.error('Error uploading logo:', err)
      alert('Failed to upload logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!profile?.firm_id) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('firms')
        .update({ logo_url: null })
        .eq('id', profile.firm_id)
      if (error) throw error
      setFirmLogoUrl(null)
    } catch (err) {
      console.error('Error removing logo:', err)
      alert('Failed to remove logo')
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
              <h3 className="text-xl font-semibold mb-2 text-navy">Access Denied</h3>
              <p className="mb-6 text-text-secondary">Only administrators can manage team members.</p>
              <Button onClick={() => router.push('/searches')}>Go to Searches</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-navy">Team Management</h1>
          <p className="mt-2 text-text-secondary">Manage your team members and send invitations</p>
        </div>

        {/* Firm Branding */}
        <Card className="mb-8 border-ds-border bg-white">
          <CardHeader>
            <CardTitle className="text-navy">Firm Branding</CardTitle>
            <CardDescription>Upload your firm logo — it will appear on the pipeline header and client portal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {firmLogoUrl ? (
                <div className="flex items-center gap-4">
                  <img src={firmLogoUrl} alt="Firm logo" className="h-16 w-auto max-w-[200px] object-contain rounded-lg border border-ds-border p-2" />
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
                      <span className="text-sm font-medium text-navy hover:underline cursor-pointer">
                        {isUploadingLogo ? 'Uploading...' : 'Change Logo'}
                      </span>
                    </label>
                    <button onClick={handleRemoveLogo} className="text-sm font-medium text-red-600 hover:underline text-left">
                      Remove Logo
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
                  <div className="w-40 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-navy hover:bg-bg-section transition-colors">
                    <span className="text-2xl text-gray-700 font-light">+</span>
                    <span className="text-xs text-text-muted mt-1">{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                  </div>
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invite Form */}
        <Card className="mb-8 border-ds-border bg-white">
          <CardHeader>
            <CardTitle className="text-navy">Invite Team Member</CardTitle>
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
                <div className="bg-navy/5 border border-navy/20 p-4 rounded-md">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-navy">
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
                      className="text-navy hover:text-navy text-xs font-semibold underline"
                    >
                      Add Another
                    </button>
                  </div>
                  <p className="text-xs text-navy mb-3">
                    Copy this link and send it to {inviteFirstName || 'the user'} via email or chat:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-white border border-navy/30 rounded-md font-mono"
                    />
                    <Button
                      type="button"
                      onClick={copyInviteLink}
                      className="text-white whitespace-nowrap bg-orange"
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
                    className="w-full px-3 py-2 border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-navy"
                  >
                    <option value="recruiter">Recruiter</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isInviting || !inviteEmail || !inviteFirstName || !inviteLastName}
                className="text-white bg-orange"
              >
                {isInviting ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card className="border-ds-border bg-white">
          <CardHeader>
            <CardTitle className="text-navy">Team Members ({teamMembers.length})</CardTitle>
            <CardDescription>Current members of your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-ds-border rounded-lg hover:bg-bg-section/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(31, 60, 98, 0.15)' }}>
                        <span className="font-semibold text-sm text-navy">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-navy">
                          {member.first_name} {member.last_name}
                          {member.id === user?.id && (
                            <span className="ml-2 text-xs text-text-secondary">(You)</span>
                          )}
                        </h4>
                        <p className="text-sm text-text-secondary">{member.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        member.role === 'administrator'
                          ? 'bg-navy/10 text-navy'
                          : 'bg-bg-section text-text-primary'
                      }`}
                    >
                      {member.role === 'administrator' ? 'Admin' : 'Recruiter'}
                    </span>
                  </div>
                </div>
              ))}

              {teamMembers.length === 0 && (
                <div className="text-center py-8 text-text-secondary">
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
