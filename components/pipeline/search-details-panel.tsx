"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Pencil, Trash2 } from "lucide-react"

interface SearchDetailsPanelProps {
  searchId: string
  search: any
  onUpdate?: () => void
}

export function SearchDetailsPanel({ searchId, search, onUpdate }: SearchDetailsPanelProps) {
  const { profile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Logo state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState(search?.client_logo_url || null)

  // Form state
  const [form, setForm] = useState({
    company_name: search?.company_name || "",
    position_title: search?.position_title || "",
    reports_to: search?.reports_to || "",
    company_linkedin: search?.company_linkedin || "",
    position_location: search?.position_location || "",
    work_arrangement: search?.work_arrangement || "",
    open_to_relocation: search?.open_to_relocation || false,
    compensation_range: search?.compensation_range || "",
    company_address: search?.company_address || "",
    company_website: search?.company_website || "",
    launch_date: search?.launch_date || "",
    target_fill_date: search?.target_fill_date || "",
  })

  // Recruiting team state
  // TODO: Replace with firm member dropdown after Stripe billing integration — only licensed users should appear
  const [teamMembers, setTeamMembers] = useState<any[]>([])

  const TEAM_ROLES = ['Lead', 'Recruiter', 'Research Associate', 'Sourcer', 'Other']

  useEffect(() => {
    loadTeamMembers()
  }, [searchId])

  const loadTeamMembers = async () => {
    const { data } = await supabase
      .from('search_team_members')
      .select('id, search_id, profile_id, role, member_name, profiles(first_name, last_name)')
      .eq('search_id', searchId)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      const members = data.map((tm: any) => ({
        id: tm.id,
        role: tm.role,
        name: tm.member_name || (tm.profiles ? `${tm.profiles.first_name} ${tm.profiles.last_name}` : ''),
      }))
      setTeamMembers(members)
      return
    }

    // Auto-add search creator as Lead if no team members exist
    if (profile) {
      const creatorName = `${profile.first_name} ${profile.last_name}`
      const { data: inserted, error } = await supabase
        .from('search_team_members')
        .insert({ search_id: searchId, profile_id: profile.id, role: 'Lead', member_name: creatorName })
        .select('id, role, member_name')
        .single()

      if (!error && inserted) {
        setTeamMembers([{ id: inserted.id, role: inserted.role, name: (inserted as any).member_name || creatorName }])
        return
      }

      // If insert failed (member_name column missing), try without it
      const { data: inserted2, error: error2 } = await supabase
        .from('search_team_members')
        .insert({ search_id: searchId, profile_id: profile.id, role: 'Lead' })
        .select('id, role, profiles(first_name, last_name)')
        .single()

      if (!error2 && inserted2) {
        setTeamMembers([{ id: inserted2.id, role: inserted2.role, name: creatorName }])
        return
      }
    }

    setTeamMembers([])
  }

  const addTeamMember = () => {
    setTeamMembers(prev => [...prev, {
      id: `pending-${Date.now()}`,
      role: '',
      name: '',
      isPending: true,
    }])
  }

  const savePendingMember = async (tempId: string, name: string, role: string) => {
    // Try with member_name first, fall back without it
    let result = await supabase
      .from('search_team_members')
      .insert({ search_id: searchId, profile_id: profile!.id, role: role || 'Recruiter', member_name: name })
      .select('id, role')
      .single()

    if (result.error) {
      result = await supabase
        .from('search_team_members')
        .insert({ search_id: searchId, profile_id: profile!.id, role: role || 'Recruiter' })
        .select('id, role')
        .single()
    }

    if (!result.error && result.data) {
      setTeamMembers(prev => prev.map(tm => tm.id === tempId
        ? { id: result.data!.id, role: result.data!.role, name }
        : tm
      ))
    }
  }

  const updateTeamMember = async (memberId: string, field: 'name' | 'role', value: string) => {
    if (field === 'name') {
      // Try member_name column, silently fail if it doesn't exist yet
      await supabase.from('search_team_members').update({ member_name: value }).eq('id', memberId)
    } else {
      await supabase.from('search_team_members').update({ role: value }).eq('id', memberId)
    }
    setTeamMembers(prev => prev.map(tm => tm.id === memberId ? { ...tm, [field]: value } : tm))
  }

  const removeTeamMember = async (memberId: string) => {
    const { error } = await supabase
      .from('search_team_members')
      .delete()
      .eq('id', memberId)
    if (!error) {
      setTeamMembers(prev => prev.filter(tm => tm.id !== memberId))
    }
  }

  // Debounce timer ref for name saves
  const nameTimers = useState<Record<string, NodeJS.Timeout>>({})[0]

  const handleNameChange = (memberId: string, value: string, isPending: boolean) => {
    // Update local state immediately
    setTeamMembers(prev => prev.map(tm => tm.id === memberId ? { ...tm, name: value } : tm))

    if (!isPending) {
      // Debounce DB save for existing members
      if (nameTimers[memberId]) clearTimeout(nameTimers[memberId])
      nameTimers[memberId] = setTimeout(() => {
        updateTeamMember(memberId, 'name', value)
      }, 500)
    }
  }

  const handlePendingBlur = (tm: any) => {
    if (tm.isPending && tm.name.trim()) {
      savePendingMember(tm.id, tm.name.trim(), tm.role)
    }
  }

  const recruitingTeamSection = (
    <div className="pb-5 mb-5 border-b-2 border-ds-border">
      <div className="p-4 rounded-lg bg-bg-section border border-ds-border">
        <Label className="text-base font-bold mb-3 block text-navy">Recruiting Team</Label>
        <div className="grid grid-cols-2 gap-2">
          {teamMembers.map((tm) => (
            <div key={tm.id} className="flex items-center gap-1.5 bg-white border border-ds-border rounded-md px-2.5 py-2">
              {/* TODO: Replace with firm member dropdown after Stripe billing integration — only licensed users should appear */}
              <input
                type="text"
                value={tm.name}
                onChange={(e) => handleNameChange(tm.id, e.target.value, tm.isPending)}
                onBlur={() => handlePendingBlur(tm)}
                placeholder="Type name..."
                className="text-sm py-1 px-2 border border-ds-border rounded bg-white text-text-primary flex-1 min-w-0 outline-none focus:border-ds-border"
              />
              <select
                value={tm.role}
                onChange={(e) => {
                  if (tm.isPending) {
                    setTeamMembers(prev => prev.map(m => m.id === tm.id ? { ...m, role: e.target.value } : m))
                  } else {
                    updateTeamMember(tm.id, 'role', e.target.value)
                  }
                }}
                className="text-sm py-1 px-2 border border-ds-border rounded bg-white text-text-primary flex-1 min-w-0"
              >
                <option value="" disabled>Select role...</option>
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (tm.isPending) {
                    setTeamMembers(prev => prev.filter(m => m.id !== tm.id))
                  } else {
                    removeTeamMember(tm.id)
                  }
                }}
                className="p-1 text-text-muted hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addTeamMember}
          className="text-sm font-semibold mt-2 hover:underline text-orange"
        >
          + Add Member
        </button>
      </div>
    </div>
  )

  const updateField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    setIsUploadingLogo(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${searchId}-logo-${Date.now()}.${fileExt}`
      const filePath = `${profile.firm_id}/logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('searches')
        .update({ client_logo_url: publicUrl })
        .eq('id', searchId)

      if (updateError) throw updateError

      setLogoUrl(publicUrl)
      onUpdate?.()
    } catch (err) {
      console.error('Error uploading logo:', err)
      alert('Failed to upload logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('searches')
        .update({
          company_name: form.company_name,
          position_title: form.position_title,
          reports_to: form.reports_to || null,
          company_linkedin: form.company_linkedin || null,
          position_location: form.position_location || null,
          work_arrangement: form.work_arrangement || null,
          open_to_relocation: form.open_to_relocation,
          compensation_range: form.compensation_range || null,
          company_address: form.company_address || null,
          company_website: form.company_website || null,
          launch_date: form.launch_date || null,
          target_fill_date: form.target_fill_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', searchId)

      if (updateError) throw updateError

      setIsEditing(false)
      onUpdate?.()
    } catch (err) {
      console.error('Error saving search details:', err)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form to current search data
    setForm({
      company_name: search?.company_name || "",
      position_title: search?.position_title || "",
      reports_to: search?.reports_to || "",
      company_linkedin: search?.company_linkedin || "",
      position_location: search?.position_location || "",
      work_arrangement: search?.work_arrangement || "",
      open_to_relocation: search?.open_to_relocation || false,
      compensation_range: search?.compensation_range || "",
      company_address: search?.company_address || "",
      company_website: search?.company_website || "",
      launch_date: search?.launch_date || "",
      target_fill_date: search?.target_fill_date || "",
    })
    setError(null)
    setIsEditing(false)
  }

  // ========================
  // SINGLE UNIFIED LAYOUT
  // ========================
  return (
    <div className="space-y-5 px-6 pb-6 pt-2">
      {recruitingTeamSection}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !form.company_name.trim() || !form.position_title.trim()}
              className="bg-navy text-white font-bold"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white bg-orange"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Details
          </button>
        )}
      </div>

      {/* ===== CLIENT PROFILE HEADER ===== */}
      <div className="flex items-start gap-4">
        {/* Logo */}
        {logoUrl ? (
          <div className="flex-shrink-0 text-center">
            <img src={logoUrl} alt="Client logo" className="w-12 h-12 object-contain rounded" />
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
              <span className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer">
                {isUploadingLogo ? 'uploading...' : 'logo'}
              </span>
            </label>
          </div>
        ) : (
          <label className="cursor-pointer flex-shrink-0 text-center">
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
            <div className="w-12 h-12 rounded border-2 border-dashed border-ds-border flex items-center justify-center hover:border-ds-border hover:bg-bg-section transition-colors">
              <span className="text-text-muted text-lg font-light">+</span>
            </div>
            <span className="text-[10px] text-text-muted">{isUploadingLogo ? 'uploading...' : 'logo'}</span>
          </label>
        )}

        {/* Name + details */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              placeholder="Organization Name"
              className="text-2xl font-bold leading-tight w-full bg-transparent border-none outline-none py-0.5 text-navy"
            />
          ) : (
            <h3 className="text-2xl font-bold leading-tight text-navy">
              {search.company_name || 'Untitled Organization'}
            </h3>
          )}
          {!isEditing && search.company_address && (
            <p className="text-sm text-text-muted mt-0.5">{search.company_address}</p>
          )}
        </div>
      </div>

      {/* Website | Headquarters */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label className="text-base font-bold text-navy">Website</Label>
          {isEditing ? (
            <Input
              value={form.company_website}
              onChange={(e) => updateField('company_website', e.target.value)}
              placeholder="e.g. https://acme.com"
              className="mt-1.5 border border-ds-border bg-bg-section rounded-md text-black text-base"
            />
          ) : (
            <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[40px] flex items-center">
              {search.company_website ? (
                <a
                  href={search.company_website.startsWith('http') ? search.company_website : `https://${search.company_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base hover:underline text-orange"
                >
                  {search.company_website}
                </a>
              ) : (
                <span className="text-base text-text-primary">—</span>
              )}
            </div>
          )}
        </div>
        <div>
          <Label className="text-base font-bold text-navy">Headquarters</Label>
          {isEditing ? (
            <Input
              value={form.company_address}
              onChange={(e) => updateField('company_address', e.target.value)}
              placeholder="e.g. 123 Main St, San Francisco, CA"
              className="mt-1.5 border border-ds-border bg-bg-section rounded-md text-black text-base"
            />
          ) : (
            <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[40px] flex items-center">
              <span className="text-base text-text-primary">{search.company_address || '—'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== THE ROLE ===== */}
      <div className="mt-4 rounded-lg bg-bg-section border border-ds-border p-5 space-y-5">
        <h3 className="text-xl font-bold text-navy">The Role</h3>

        {/* Launch Date | Target Close */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label className="text-base font-bold text-navy">Launch Date</Label>
            {isEditing ? (
              <Input
                type="date"
                value={form.launch_date}
                onChange={(e) => updateField('launch_date', e.target.value)}
                className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-base"
              />
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-base text-text-primary">{search.launch_date ? new Date(search.launch_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-base font-bold text-navy">Target Close</Label>
            {isEditing ? (
              <Input
                type="date"
                value={form.target_fill_date}
                onChange={(e) => updateField('target_fill_date', e.target.value)}
                className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-base"
              />
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-base text-text-primary">{search.target_fill_date ? new Date(search.target_fill_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Position Title | Reports To */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label className="text-base font-bold text-navy">Position Title{isEditing ? ' *' : ''}</Label>
            {isEditing ? (
              <Input
                value={form.position_title}
                onChange={(e) => updateField('position_title', e.target.value)}
                placeholder="e.g. Chief Technology Officer"
                className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-base"
              />
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-base text-text-primary">{search.position_title || '—'}</span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-base font-bold text-navy">Reports To</Label>
            {isEditing ? (
              <Input
                value={form.reports_to}
                onChange={(e) => updateField('reports_to', e.target.value)}
                placeholder="e.g. Jane Smith, VP of Engineering"
                className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-base"
              />
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-base text-text-primary">{search.reports_to || '—'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Compensation Details (full width) */}
        <div>
          <Label className="text-base font-bold text-navy">Compensation Details</Label>
          <span className="text-xs text-text-muted ml-2">Base, bonus, equity, relocation, etc.</span>
          {isEditing ? (
            <Textarea
              value={form.compensation_range}
              onChange={(e) => updateField('compensation_range', e.target.value)}
              placeholder="e.g. Base: $250k-$300k, Bonus: 30-40%, Equity: 0.5-1.0%"
              rows={3}
              className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-base"
            />
          ) : (
            <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[80px]">
              <span className="text-base text-text-primary whitespace-pre-wrap">{search.compensation_range || '—'}</span>
            </div>
          )}
        </div>

        {/* Position Location | Work Arrangement */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label className="text-base font-bold text-navy">Position Location</Label>
            {isEditing ? (
              <Input
                value={form.position_location}
                onChange={(e) => updateField('position_location', e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="mt-1.5 border border-ds-border bg-white rounded-md text-black text-base"
              />
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-base text-text-primary">{search.position_location || '—'}</span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-base font-bold text-navy">Work Arrangement</Label>
            {isEditing ? (
              <select
                value={form.work_arrangement}
                onChange={(e) => updateField('work_arrangement', e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-ds-border bg-white rounded-md focus:outline-none text-base text-black"
              >
                <option value="" disabled>Select arrangement...</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            ) : (
              <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-white min-h-[40px] flex items-center">
                <span className="text-base text-text-primary capitalize">{search.work_arrangement || '—'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Open to Relocation */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="open-to-relocation"
            checked={isEditing ? form.open_to_relocation : (search.open_to_relocation || false)}
            onCheckedChange={isEditing ? (checked) => updateField('open_to_relocation', checked as boolean) : undefined}
            disabled={!isEditing}
          />
          <Label htmlFor="open-to-relocation" className={`font-normal text-base text-text-primary ${isEditing ? 'cursor-pointer' : ''}`}>
            Open to Relocation
          </Label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {/* Status Badge */}
      {search.status && (
        <div className="pt-3 border-t border-ds-border">
          <Label className="text-base font-bold text-navy">Status</Label>
          <div className="mt-1.5">
            <span
              className={`inline-block px-2.5 py-1 rounded text-sm font-medium ${
                search.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : search.status === 'pending'
                  ? 'bg-purple-100 text-purple-800'
                  : search.status === 'filled'
                  ? 'bg-navy/10 text-navy'
                  : 'bg-bg-section text-text-primary'
              }`}
            >
              {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
