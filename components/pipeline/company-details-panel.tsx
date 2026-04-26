"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Pencil, X, Upload, Loader2, Building2, Newspaper } from "lucide-react"
import { LatestNewsPanel } from "@/components/pipeline/latest-news-panel"

interface CompanyDetailsPanelProps {
  searchId: string
  search: any
  onUpdate?: () => void
}

export function CompanyDetailsPanel({ searchId, search, onUpdate }: CompanyDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [specialtyInput, setSpecialtyInput] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(search?.client_logo_url || null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isNewsOpen, setIsNewsOpen] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB')
      return
    }

    setIsUploadingLogo(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${searchId}-logo-${Date.now()}.${fileExt}`
      const filePath = `${search?.firm_id || 'default'}/logos/${fileName}`

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

  const [form, setForm] = useState({
    company_description: search?.company_description || "",
    company_industry: search?.company_industry || "",
    company_size: search?.company_size || "",
    company_address: search?.company_address || "",
    company_founded: search?.company_founded || "",
    company_website: search?.company_website || "",
    company_linkedin: search?.company_linkedin || "",
    company_type: search?.company_type || "",
    company_stock_ticker: search?.company_stock_ticker || "",
    company_specialties: search?.company_specialties || [],
  })

  const updateField = (field: string, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addSpecialty = () => {
    const trimmed = specialtyInput.trim()
    if (!trimmed) return
    // Support comma-separated input
    const newTags = trimmed.split(',').map(t => t.trim()).filter(t => t && !form.company_specialties.includes(t))
    if (newTags.length > 0) {
      updateField('company_specialties', [...form.company_specialties, ...newTags])
    }
    setSpecialtyInput("")
  }

  const removeSpecialty = (tag: string) => {
    updateField('company_specialties', form.company_specialties.filter((t: string) => t !== tag))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('searches')
        .update({
          company_description: form.company_description || null,
          company_industry: form.company_industry || null,
          company_size: form.company_size || null,
          company_address: form.company_address || null,
          company_founded: form.company_founded || null,
          company_website: form.company_website || null,
          company_linkedin: form.company_linkedin || null,
          company_type: form.company_type || null,
          company_stock_ticker: form.company_stock_ticker || null,
          company_specialties: form.company_specialties.length > 0 ? form.company_specialties : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', searchId)

      if (updateError) {
        console.error('Company details save error:', updateError.code, updateError.message, updateError.details, updateError.hint)
        throw new Error(updateError.message || JSON.stringify(updateError))
      }
      setIsEditing(false)
      onUpdate?.()
    } catch (err: any) {
      console.error('Error saving company details:', err?.message || JSON.stringify(err))
      setError(err?.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Poll for auto-research completion on freshly created searches.
  // Why: new searches kick off background company research; the row lands
  // with an empty company_description and is filled in shortly after.
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const createdAt = search?.created_at
  const hasDescription = !!search?.company_description
  const isFreshSearch = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) / 1000 < 60
    : false
  const isResearching = !hasDescription && isFreshSearch

  useEffect(() => {
    if (!isResearching) return
    const interval = setInterval(() => {
      onUpdateRef.current?.()
    }, 3000)
    return () => clearInterval(interval)
  }, [isResearching])

  const handleCancel = () => {
    setForm({
      company_description: search?.company_description || "",
      company_industry: search?.company_industry || "",
      company_size: search?.company_size || "",
      company_address: search?.company_address || "",
      company_founded: search?.company_founded || "",
      company_website: search?.company_website || "",
      company_linkedin: search?.company_linkedin || "",
      company_type: search?.company_type || "",
      company_stock_ticker: search?.company_stock_ticker || "",
      company_specialties: search?.company_specialties || [],
    })
    setSpecialtyInput("")
    setError(null)
    setIsEditing(false)
  }

  const showEditButton = !isEditing && !isResearching

  return (
    <>
      {/* Section header banner with inline action buttons */}
      <div className="px-6 py-4 bg-navy flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-white" />
          Company Intel
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsNewsOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80 transition-colors"
          >
            <Newspaper className="w-4 h-4 text-white" />
            Latest News
          </button>
          {showEditButton && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80 transition-colors"
            >
              <Pencil className="w-4 h-4 text-white" />
              Edit
            </button>
          )}
        </div>
      </div>

      {isResearching ? (
        <div className="px-6 py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-navy" />
          <p className="text-sm font-medium text-text-secondary">
            Researching {search?.company_name || 'company'}...
          </p>
        </div>
      ) : (
    <div className="relative px-6 pt-2 space-y-2" style={{ paddingBottom: isEditing ? '72px' : '16px' }}>
      {/* Sticky Save/Cancel Bar (bottom, only when editing) */}
      {isEditing && (
        <div className="bg-white border-t border-ds-border" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', zIndex: 50, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex justify-end gap-3 px-6 py-4 max-w-4xl mx-auto">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-navy text-white font-bold">
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Company Logo */}
      <div>
        <Label className="text-sm font-bold text-navy">Company Logo</Label>
        <p className="text-xs text-text-muted mt-0.5 mb-1">Displays in the header across all pages</p>
        {logoUrl ? (
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="Company logo" className="h-14 max-w-[180px] object-contain rounded border border-ds-border p-1.5" />
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-ds-border bg-white hover:bg-bg-section transition-colors cursor-pointer">
                <Upload className="w-3 h-3" />
                {isUploadingLogo ? 'Uploading...' : 'Change Logo'}
              </span>
            </label>
          </div>
        ) : (
          <div className="w-[220px] rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 p-4">
            <span className="text-xs text-text-muted">No logo</span>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-navy border border-ds-border bg-white hover:bg-bg-section transition-colors cursor-pointer">
                <Upload className="w-3 h-3" />
                {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Company Description — full width */}
      <div>
        <Label className="text-sm font-bold text-navy">Company Description</Label>
        {isEditing ? (
          <Textarea
            value={form.company_description}
            onChange={(e) => updateField('company_description', e.target.value)}
            placeholder="Brief description of the company..."
            rows={4}
            className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
          />
        ) : (
          <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[72px] text-sm text-text-primary whitespace-pre-wrap">
            {search?.company_description || <span className="text-text-muted">—</span>}
          </div>
        )}
      </div>

      {/* Industry | Company Size */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-bold text-navy">Industry</Label>
          {isEditing ? (
            <Input
              value={form.company_industry}
              onChange={(e) => updateField('company_industry', e.target.value)}
              placeholder="e.g. Technology, Healthcare"
              className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center text-sm text-text-primary">
              {search?.company_industry || <span className="text-text-muted">—</span>}
            </div>
          )}
        </div>
        <div>
          <Label className="text-sm font-bold text-navy">Company Size</Label>
          {isEditing ? (
            <Input
              value={form.company_size}
              onChange={(e) => updateField('company_size', e.target.value)}
              placeholder="e.g. 500-1,000 employees"
              className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center text-sm text-text-primary">
              {search?.company_size || <span className="text-text-muted">—</span>}
            </div>
          )}
        </div>
      </div>

      {/* Headquarters | Founded */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-bold text-navy">Headquarters</Label>
          {isEditing ? (
            <Input
              value={form.company_address}
              onChange={(e) => updateField('company_address', e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center text-sm text-text-primary">
              {search?.company_address || <span className="text-text-muted">—</span>}
            </div>
          )}
        </div>
        <div>
          <Label className="text-sm font-bold text-navy">Founded</Label>
          {isEditing ? (
            <Input
              value={form.company_founded}
              onChange={(e) => updateField('company_founded', e.target.value)}
              placeholder="e.g. 2015"
              className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center text-sm text-text-primary">
              {search?.company_founded || <span className="text-text-muted">—</span>}
            </div>
          )}
        </div>
      </div>

      {/* Website | LinkedIn URL */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-bold text-navy">Website</Label>
          {isEditing ? (
            <Input
              value={form.company_website}
              onChange={(e) => updateField('company_website', e.target.value)}
              placeholder="e.g. https://acme.com"
              className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center">
              {search?.company_website ? (
                <a
                  href={search.company_website.startsWith('http') ? search.company_website : `https://${search.company_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline text-orange"
                >
                  {search.company_website}
                </a>
              ) : (
                <span className="text-sm text-text-muted">—</span>
              )}
            </div>
          )}
        </div>
        <div>
          <Label className="text-sm font-bold text-navy">LinkedIn URL</Label>
          {isEditing ? (
            <Input
              value={form.company_linkedin}
              onChange={(e) => updateField('company_linkedin', e.target.value)}
              placeholder="e.g. https://linkedin.com/company/acme"
              className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center">
              {search?.company_linkedin ? (
                <a
                  href={search.company_linkedin.startsWith('http') ? search.company_linkedin : `https://${search.company_linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline text-orange"
                >
                  {search.company_linkedin}
                </a>
              ) : (
                <span className="text-sm text-text-muted">—</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Company Type | Stock Ticker */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-bold text-navy">Company Type</Label>
          {isEditing ? (
            <select
              value={form.company_type}
              onChange={(e) => updateField('company_type', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-ds-border bg-white rounded-md focus:outline-none text-sm text-black"
            >
              <option value="">Select type...</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="nonprofit">Nonprofit</option>
            </select>
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center text-sm text-text-primary capitalize">
              {search?.company_type || <span className="text-text-muted normal-case">—</span>}
            </div>
          )}
        </div>
        <div>
          <Label className="text-sm font-bold text-navy">Stock Ticker</Label>
          {isEditing ? (
            <Input
              value={form.company_stock_ticker}
              onChange={(e) => updateField('company_stock_ticker', e.target.value)}
              placeholder="e.g. AAPL"
              className="mt-1 border border-ds-border bg-white rounded-md text-black text-sm"
            />
          ) : (
            <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center text-sm text-text-primary">
              {search?.company_stock_ticker || <span className="text-text-muted">—</span>}
            </div>
          )}
        </div>
      </div>

      {/* Specialties — full width tags */}
      <div>
        <Label className="text-sm font-bold text-navy">Specialties</Label>
        {isEditing ? (
          <div className="mt-1 space-y-2">
            <div className="flex gap-2">
              <Input
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty() } }}
                placeholder="Type specialty and press Enter (comma-separated)"
                className="border border-ds-border bg-white rounded-md text-black text-sm flex-1"
              />
              <Button type="button" size="sm" onClick={addSpecialty} className="bg-navy text-white font-bold">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.company_specialties.map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-navy/10 text-navy">
                  {tag}
                  <button onClick={() => removeSpecialty(tag)} className="hover:text-red-600 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-1 px-3 py-2 border border-ds-border rounded-md bg-bg-page min-h-[36px] flex items-center flex-wrap gap-2">
            {search?.company_specialties && search.company_specialties.length > 0 ? (
              search.company_specialties.map((tag: string) => (
                <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-navy/10 text-navy">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-text-muted">—</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}
    </div>
      )}

      <LatestNewsPanel
        searchId={searchId}
        search={search}
        isOpen={isNewsOpen}
        onClose={() => setIsNewsOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  )
}
