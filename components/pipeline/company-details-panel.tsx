"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()
import { Pencil, X, Upload, Loader2, Building2, Newspaper, ChevronDown, RefreshCw, ExternalLink } from "lucide-react"

interface CompanyDetailsPanelProps {
  searchId: string
  search: any
  onUpdate?: () => void
  // When true, the panel's own collapsible header bar is hidden and the
  // body is always rendered. Used by the slide-over host, which provides
  // its own header.
  hideOwnHeader?: boolean
}

export function CompanyDetailsPanel({ searchId, search, onUpdate, hideOwnHeader }: CompanyDetailsPanelProps) {
  // When the panel is hosted in a slide-over (no own header), there's no
  // Edit button — start in edit mode so the save/cancel bar surfaces.
  const [isEditing, setIsEditing] = useState(!!hideOwnHeader)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [specialtyInput, setSpecialtyInput] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(search?.client_logo_url || null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  // Section starts collapsed every page load — no persistence. When
  // hideOwnHeader is set the panel is always expanded.
  const [isCollapsed, setIsCollapsed] = useState(!hideOwnHeader ? true : false)

  // Latest News — inline sub-section state.
  interface NewsItem { title: string; source: string; date: string; summary: string; url: string }
  const [newsItems, setNewsItems] = useState<NewsItem[]>(
    Array.isArray(search?.company_news) ? search.company_news : []
  )
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [newsError, setNewsError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const newsLocalStorageKey = `intel_news_seen:${searchId}`

  // Compute unread on mount and whenever the underlying news list changes.
  useEffect(() => {
    if (typeof window === 'undefined') return
    let seenTitles: string[] = []
    try {
      const raw = window.localStorage.getItem(newsLocalStorageKey)
      if (raw) seenTitles = JSON.parse(raw)
      if (!Array.isArray(seenTitles)) seenTitles = []
    } catch {
      seenTitles = []
    }
    const seenSet = new Set(seenTitles)
    const fresh = newsItems.filter((n) => n.title && !seenSet.has(n.title)).length
    setUnreadCount(fresh)
  }, [newsItems, newsLocalStorageKey])

  // Mark news as seen the moment the section is expanded.
  useEffect(() => {
    if (isCollapsed) return
    if (typeof window === 'undefined') return
    try {
      const titles = newsItems.map((n) => n.title).filter(Boolean)
      window.localStorage.setItem(newsLocalStorageKey, JSON.stringify(titles))
    } catch { /* ignore */ }
    setUnreadCount(0)
  }, [isCollapsed, newsItems, newsLocalStorageKey])

  const fetchLatestNews = async () => {
    if (!search?.company_name) return
    setIsLoadingNews(true)
    setNewsError(null)
    try {
      const res = await fetch('/api/company-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId, companyName: search.company_name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch news')
      setNewsItems(Array.isArray(data.news) ? data.news : [])
      onUpdate?.()
    } catch (err: any) {
      setNewsError(err?.message || 'Failed to fetch news')
    } finally {
      setIsLoadingNews(false)
    }
  }

  // News is pulled once at search creation (by the create-search modal)
  // and otherwise only when the recruiter clicks the refresh button.
  // No auto-fetch on panel mount — the platform doesn't second-guess
  // the recruiter's attention to their clients.

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

  // Auto-research: when a search has no company_description, fire the
  // /api/company-intel call from the panel itself. Tracking status here
  // (not on the modal that creates the search) gives us a real signal
  // for success/failure to drive the spinner / error UI.
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const hasDescription = !!search?.company_description
  const companyName: string | undefined = search?.company_name
  const [researchStatus, setResearchStatus] = useState<'idle' | 'researching' | 'error'>('idle')
  const [researchError, setResearchError] = useState<string | null>(null)
  const researchAbortRef = useRef<AbortController | null>(null)
  const hasAutoTriggeredRef = useRef(false)

  const runResearch = async () => {
    if (!companyName) return
    researchAbortRef.current?.abort()
    const controller = new AbortController()
    researchAbortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    setResearchStatus('researching')
    setResearchError(null)
    try {
      const res = await fetch('/api/company-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId, companyName }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      onUpdateRef.current?.()
      setResearchStatus('idle')
    } catch (err: any) {
      if (controller.signal.aborted) {
        setResearchError('Research timed out — try again')
      } else {
        setResearchError(err?.message || 'Research failed — try again')
      }
      setResearchStatus('error')
    } finally {
      clearTimeout(timeoutId)
      if (researchAbortRef.current === controller) {
        researchAbortRef.current = null
      }
    }
  }

  // Trigger once on first mount when description is missing.
  useEffect(() => {
    if (hasAutoTriggeredRef.current) return
    if (hasDescription) return
    if (!companyName) return
    hasAutoTriggeredRef.current = true
    runResearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDescription, companyName])

  // Cancel any in-flight request on unmount.
  useEffect(() => () => researchAbortRef.current?.abort(), [])

  const isResearching = researchStatus === 'researching'

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
      {/* Section header banner — collapsible. Clicking the bar (anywhere
          except the inline action buttons) toggles open/closed. Hidden
          when the panel is hosted in a slide-over (which provides its
          own header and an inline Edit affordance). */}
      {!hideOwnHeader && (
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        onClick={() => setIsCollapsed((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsCollapsed((v) => !v)
          }
        }}
        className="px-6 py-4 bg-navy flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-white" />
          Company Intel
          {isCollapsed && unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} new news item${unreadCount === 1 ? '' : 's'}`}
              className="inline-block w-2.5 h-2.5 rounded-full bg-[#F97316]"
            />
          )}
        </h2>
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          {!isCollapsed && showEditButton && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80 transition-colors"
            >
              <Pencil className="w-4 h-4 text-white" />
              Edit
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-white transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            aria-hidden
          />
        </div>
      </div>
      )}

      {!isCollapsed && (isResearching ? (
        <div className="px-6 py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-navy" />
          <p className="text-sm font-medium text-text-secondary">
            Researching {search?.company_name || 'company'}...
          </p>
        </div>
      ) : researchStatus === 'error' && !hasDescription ? (
        <div className="px-6 py-12 flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-red-600">{researchError || 'Research failed — try again'}</p>
          <Button
            type="button"
            size="sm"
            onClick={runResearch}
            className="bg-navy text-white font-bold"
          >
            Retry
          </Button>
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

      {/* ─── Sub-section: Company Overview ─── */}
      <h3 className="text-base font-bold text-navy pt-2">Company Overview</h3>

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

      {/* ─── Sub-section: Latest News ─── */}
      <hr className="border-ds-border my-4" />
      <div className="flex items-center gap-2 pt-2">
        <Newspaper className="w-4 h-4 text-navy" />
        <h3 className="text-base font-bold text-navy">
          Latest News
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-semibold text-[#F97316]">
              ({unreadCount} new)
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={fetchLatestNews}
          disabled={isLoadingNews}
          aria-label="Refresh latest news"
          className="ml-1 inline-flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-navy hover:bg-bg-section transition-colors disabled:opacity-60"
        >
          {isLoadingNews ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {newsError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {newsError}
        </div>
      )}

      {!newsError && newsItems.length === 0 && !isLoadingNews && (
        <p className="text-sm text-text-muted italic">No news yet.</p>
      )}

      {newsItems.length > 0 && (
        <ul className="space-y-2">
          {newsItems.map((item, i) => (
            <li
              key={i}
              className="border border-ds-border rounded-md bg-bg-page hover:bg-white transition-colors"
            >
              <div className="px-3 py-2.5">
                <p className="text-sm font-bold text-navy leading-snug">{item.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {[item.source, item.date].filter(Boolean).join(' · ')}
                </p>
                {item.summary && (
                  <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                    {item.summary}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline mt-1.5"
                  >
                    Read more
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
      ))}
    </>
  )
}
