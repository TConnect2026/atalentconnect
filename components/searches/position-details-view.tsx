"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, Pencil, Save, X, Upload, Loader2, FileText, Download, Filter } from "lucide-react"

interface PositionDetailsViewProps {
  search: any
  contacts: any[]
  stages: any[]
  isEditMode: boolean
  onEditToggle: () => void
  onSave: () => Promise<void>
}

const searchDetailsSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_address: z.string().optional(),
  company_website: z.string().optional(),
  linkedin_profile: z.string().optional(),
  position_title: z.string().min(1, "Position title is required"),
  reports_to: z.string().optional(),
  launch_date: z.string().optional(),
  target_fill_date: z.string().optional(),
  position_location: z.string().optional(),
  work_arrangement: z.string().optional(),
  open_to_relocation: z.preprocess((val) => val === true, z.boolean().default(false)),
  compensation_range: z.string().optional(),
  relocation_package_available: z.preprocess((val) => val === true, z.boolean().default(false)),
})

export function PositionDetailsView({
  search,
  contacts: initialContacts,
  stages: initialStages,
  isEditMode,
  onEditToggle,
  onSave
}: PositionDetailsViewProps) {
  const router = useRouter()

  // Single editing state: null = all view mode, or section name being edited
  const [editingSection, setEditingSection] = useState<'searchDetails' | 'positionSpec' | null>(null)

  const [isSaving, setIsSaving] = useState(false)

  // Position Spec state
  const [positionSpecDoc, setPositionSpecDoc] = useState<any>(null)
  const [positionSpecStatus, setPositionSpecStatus] = useState<'draft' | 'client_review' | 'approved'>('draft')
  const [isUploadingSpec, setIsUploadingSpec] = useState(false)
  const [specUploadError, setSpecUploadError] = useState<string | null>(null)
  const [isDraggingSpec, setIsDraggingSpec] = useState(false)
  const specFileInputRef = useRef<HTMLInputElement>(null)

  // Edit mode state
  const [openToRelocation, setOpenToRelocation] = useState(false)
  const [relocationPackageAvailable, setRelocationPackageAvailable] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm({
    resolver: zodResolver(searchDetailsSchema),
    defaultValues: {
      company_name: search?.company_name || '',
      company_address: search?.company_address || '',
      company_website: search?.company_website || '',
      linkedin_profile: search?.linkedin_profile || '',
      position_title: search?.position_title || '',
      reports_to: search?.reports_to || '',
      launch_date: search?.launch_date || '',
      target_fill_date: search?.target_fill_date || '',
      position_location: search?.position_location || '',
      work_arrangement: search?.work_arrangement || '',
      open_to_relocation: search?.open_to_relocation || false,
      compensation_range: search?.compensation_range || '',
      relocation_package_available: search?.relocation_package_available || false,
    }
  })

  // Load position spec document
  useEffect(() => {
    const loadPositionSpec = async () => {
      if (!search?.id) return
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("search_id", search.id)
          .eq("type", "position_spec")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setPositionSpecDoc(data)
        }
      } catch (err) {
        console.error("Error loading position spec:", err)
      }
    }
    loadPositionSpec()
  }, [search?.id])

  // Initialize edit state and ALWAYS reset to view mode when fresh data loads
  useEffect(() => {
    setEditingSection(null)

    reset({
      company_name: search?.company_name || '',
      company_address: search?.company_address || '',
      company_website: search?.company_website || '',
      linkedin_profile: search?.linkedin_profile || '',
      position_title: search?.position_title || '',
      reports_to: search?.reports_to || '',
      launch_date: search?.launch_date || '',
      target_fill_date: search?.target_fill_date || '',
      position_location: search?.position_location || '',
      work_arrangement: search?.work_arrangement || '',
      open_to_relocation: search?.open_to_relocation || false,
      compensation_range: search?.compensation_range || '',
      relocation_package_available: search?.relocation_package_available || false,
    })

    setOpenToRelocation(search?.open_to_relocation || false)
    setRelocationPackageAvailable(search?.relocation_package_available || false)
    setPositionSpecStatus(search?.position_spec_status || 'draft')
  }, [search, initialContacts, initialStages, reset])

  const saveSearchDetails = async (data: any) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("searches")
        .update({
          company_name: data.company_name,
          company_address: data.company_address || null,
          company_website: data.company_website || null,
          linkedin_profile: data.linkedin_profile || null,
          position_title: data.position_title,
          reports_to: data.reports_to || null,
          launch_date: data.launch_date || null,
          target_fill_date: data.target_fill_date || null,
          position_location: data.position_location || null,
          work_arrangement: data.work_arrangement || null,
          open_to_relocation: openToRelocation,
          compensation_range: data.compensation_range || null,
          relocation_package_available: relocationPackageAvailable,
          updated_at: new Date().toISOString()
        })
        .eq("id", search.id)

      if (error) throw error

      await onSave()
      setEditingSection(null)
    } catch (err) {
      console.error("Error saving search details:", err)
      alert("Error saving changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Position Spec file handling
  const ALLOWED_SPEC_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg']
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  const handleSpecFileUpload = async (file: File) => {
    setIsUploadingSpec(true)
    setSpecUploadError(null)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!ALLOWED_SPEC_EXTENSIONS.includes(ext)) {
        setSpecUploadError(`Unsupported file type: .${ext}. Allowed: ${ALLOWED_SPEC_EXTENSIONS.map(e => `.${e}`).join(', ')}`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setSpecUploadError(`File "${file.name}" exceeds the 10MB size limit.`)
        return
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const filePath = `${search.id}/position-spec/${fileName}`

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // If there's an existing position spec, delete it
      if (positionSpecDoc) {
        await supabase.from('documents').delete().eq('id', positionSpecDoc.id)
      }

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          search_id: search.id,
          name: file.name,
          type: 'position_spec',
          file_url: publicUrl,
        })
        .select()
        .single()

      if (dbError) throw dbError

      setPositionSpecDoc(newDoc)
    } catch (err) {
      console.error('Upload error:', err)
      setSpecUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploadingSpec(false)
    }
  }

  const savePositionSpec = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("searches")
        .update({
          position_spec_status: positionSpecStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", search.id)

      if (error) throw error

      await onSave()
      setEditingSection(null)
    } catch (err) {
      console.error("Error saving position spec:", err)
      alert("Error saving changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'client_review': return 'Client Review'
      case 'approved': return 'Approved'
      default: return 'Draft'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'client_review': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading...</p>
      </div>
    )
  }

  const handleStickyCancel = () => {
    if (editingSection === 'positionSpec') {
      setEditingSection(null)
      setSpecUploadError(null)
      setPositionSpecStatus(search?.position_spec_status || 'draft')
    } else {
      setEditingSection(null)
    }
  }

  const handleStickySave = () => {
    if (editingSection === 'searchDetails') {
      handleSubmit(saveSearchDetails)()
    } else if (editingSection === 'positionSpec') {
      savePositionSpec()
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-6 max-w-5xl" style={{ paddingBottom: editingSection ? '80px' : undefined }}>
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/searches")}
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-foreground/80"
            >
              ← Back to Dashboard
            </Button>
            <Button
              onClick={() => router.push(`/searches/${search.id}/pipeline`)}
              className="bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Candidate Pipeline
            </Button>
          </div>
        </div>

        <Card className="shadow-lg overflow-hidden rounded-lg p-0">
          <CardHeader className="border-b bg-navy" style={{ padding: '1.5rem', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
            <CardTitle className="text-2xl font-bold text-white">Position Details</CardTitle>
          </CardHeader>

          <CardContent className="pt-0 px-6 pb-6">
            <div className="space-y-0">
              {/* Search Details Section */}
              <div className="bg-white p-8 border-b-4 border-ds-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-navy">Search Details</h3>
                  {editingSection !== 'searchDetails' ? (
                    <Button
                      type="button"
                      onClick={() => setEditingSection('searchDetails')}
                      className="bg-orange hover:bg-orange-hover text-white font-semibold shrink-0"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : null}
                </div>

                {editingSection === 'searchDetails' ? (
                  <form onSubmit={handleSubmit(saveSearchDetails)} className="space-y-5 mt-5">
                    {/* Line 1: Company Name | Position Title */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="company_name" className="text-base font-bold">Company Name</Label>
                        <Input id="company_name" {...register("company_name")} className="mt-1.5" />
                        {errors.company_name && <p className="text-red-600 text-sm mt-1">{errors.company_name.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="position_title" className="text-base font-bold">Position Title</Label>
                        <Input id="position_title" {...register("position_title")} className="mt-1.5" />
                        {errors.position_title && <p className="text-red-600 text-sm mt-1">{errors.position_title.message}</p>}
                      </div>
                    </div>

                    {/* Line 2: Reports To | LinkedIn Profile */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="reports_to" className="text-base font-bold">Reports To</Label>
                        <Input id="reports_to" {...register("reports_to")} placeholder="e.g. CEO" className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="linkedin_profile" className="text-base font-bold">LinkedIn Profile</Label>
                        <Input id="linkedin_profile" {...register("linkedin_profile")} placeholder="e.g. linkedin.com/company/acme-corp" className="mt-1.5" />
                      </div>
                    </div>

                    {/* Line 3: Position Location | Work Arrangement + Open to Relocation */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="position_location" className="text-base font-bold">Position Location</Label>
                        <Input id="position_location" {...register("position_location")} placeholder="e.g. New York, NY" className="mt-1.5" />
                      </div>
                      <div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="work_arrangement" className="text-base font-bold">Work Arrangement</Label>
                            <select id="work_arrangement" {...register("work_arrangement")} className="mt-1.5 w-full px-3 py-2 border border-ds-border rounded-md">
                              <option value="" disabled>Select arrangement...</option>
                              <option value="onsite">Onsite</option>
                              <option value="hybrid">Hybrid</option>
                              <option value="remote">Remote</option>
                            </select>
                          </div>
                          <div className="flex items-end pb-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="open_to_relocation"
                                checked={openToRelocation}
                                onCheckedChange={(checked) => {
                                  setOpenToRelocation(checked as boolean)
                                  setValue("open_to_relocation", checked as boolean)
                                }}
                              />
                              <Label htmlFor="open_to_relocation" className="cursor-pointer font-normal text-sm whitespace-nowrap">Open to Relocation</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Line 4: Compensation Range */}
                    <div>
                      <div className="mb-1.5">
                        <Label htmlFor="compensation_range" className="text-base font-bold">Compensation Range</Label>
                        <span className="text-xs text-text-muted ml-2">Include base salary, bonus, equity, benefits, and other compensation details</span>
                      </div>
                      <Textarea id="compensation_range" {...register("compensation_range")} rows={5} placeholder="e.g. Base: $250k-$300k&#10;Bonus: 30-40%&#10;Equity: 0.5-1.0%&#10;Benefits: Full package" />
                    </div>

                    {/* Line 5: Company HQ Address | Company Website */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="company_address" className="text-base font-bold">Company HQ Address</Label>
                        <Input id="company_address" {...register("company_address")} placeholder="e.g. 123 Main St, San Francisco, CA" className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="company_website" className="text-base font-bold">Company Website</Label>
                        <Input id="company_website" {...register("company_website")} placeholder="e.g. https://www.acmecorp.com" className="mt-1.5" />
                      </div>
                    </div>

                  </form>
                ) : (
                  <div className="space-y-5 mt-5">
                    {/* Line 1: Company Name | Position Title */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Company Name</Label>
                        <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                          <p className="text-base text-text-primary">{search.company_name || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-base font-bold">Position Title</Label>
                        <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                          <p className="text-base text-text-primary font-medium">{search.position_title || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Line 2: Reports To | LinkedIn Profile */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Reports To</Label>
                        <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                          <p className="text-base text-text-primary">{search.reports_to || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-base font-bold">LinkedIn Profile</Label>
                        <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                          {search.linkedin_profile ? (
                            <a href={search.linkedin_profile.startsWith('http') ? search.linkedin_profile : `https://${search.linkedin_profile}`} target="_blank" rel="noopener noreferrer" className="text-base text-navy hover:opacity-80">
                              {search.linkedin_profile}
                            </a>
                          ) : (
                            <p className="text-base text-text-primary">—</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Line 3: Position Location | Work Arrangement + Open to Relocation */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Position Location</Label>
                        <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                          <p className="text-base text-text-primary">{search.position_location || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-base font-bold">Work Arrangement</Label>
                            <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                              <p className="text-base text-text-primary capitalize">{search.work_arrangement || '—'}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-base font-bold">Open to Relocation</Label>
                            <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                              <p className="text-base text-text-primary">{search.open_to_relocation ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Line 4: Compensation Range */}
                    <div>
                      <div className="mb-1.5">
                        <Label className="text-base font-bold">Compensation Range</Label>
                        <span className="text-xs text-text-muted ml-2">Include base salary, bonus, equity, benefits, and other compensation details</span>
                      </div>
                      <div className="px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[120px]">
                        <p className="text-base text-text-primary whitespace-pre-wrap">{search.compensation_range || '—'}</p>
                      </div>
                    </div>

                    {/* Line 5: Company HQ Address | Company Website */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Company HQ Address</Label>
                        <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                          <p className="text-base text-text-primary">{search.company_address || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-base font-bold">Company Website</Label>
                        <div className="mt-1.5 px-3 py-2 border border-ds-border rounded-md bg-bg-section min-h-[42px] flex items-center">
                          {search.company_website ? (
                            <a href={search.company_website} target="_blank" rel="noopener noreferrer" className="text-base text-navy hover:opacity-80">
                              {search.company_website}
                            </a>
                          ) : (
                            <p className="text-base text-text-primary">—</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Position Spec Section */}
              <div className="bg-bg-section p-8 border-b-4 border-ds-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-navy">Position Spec</h3>
                  {editingSection !== 'positionSpec' ? (
                    <Button
                      type="button"
                      onClick={() => setEditingSection('positionSpec')}
                      className="bg-orange hover:bg-orange-hover text-white font-semibold shrink-0"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : null}
                </div>

                {editingSection === 'positionSpec' ? (
                  <div className="space-y-5 mt-5">
                    {/* Status Selector */}
                    <div>
                      <Label className="text-base font-bold">Status</Label>
                      <Select value={positionSpecStatus} onValueChange={(value: 'draft' | 'client_review' | 'approved') => setPositionSpecStatus(value)}>
                        <SelectTrigger className="mt-1.5 w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="client_review">Client Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Current Document */}
                    {positionSpecDoc && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-ds-border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-navy" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{positionSpecDoc.name}</p>
                            <p className="text-xs text-text-muted mt-0.5">Uploaded {new Date(positionSpecDoc.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(positionSpecDoc.file_url, '_blank')}>
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm('Remove this position spec?')) {
                                const { error } = await supabase.from('documents').delete().eq('id', positionSpecDoc.id)
                                if (!error) setPositionSpecDoc(null)
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Upload Drop Zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingSpec(true) }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDraggingSpec(false) }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDraggingSpec(false)
                        const files = Array.from(e.dataTransfer.files)
                        if (files.length > 0) handleSpecFileUpload(files[0])
                      }}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDraggingSpec
                          ? 'border-orange bg-orange-50'
                          : 'border-ds-border hover:border-ds-border'
                      }`}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-3 text-text-muted" />
                      <p className="text-sm font-medium text-text-primary mb-2">
                        {positionSpecDoc ? 'Drag & drop to replace file' : 'Drag & drop file here'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => specFileInputRef.current?.click()}
                        disabled={isUploadingSpec}
                      >
                        {isUploadingSpec ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          positionSpecDoc ? 'Replace File' : 'Choose File'
                        )}
                      </Button>
                      <input
                        ref={specFileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleSpecFileUpload(e.target.files[0])
                            e.target.value = ''
                          }
                        }}
                      />
                      <p className="text-xs text-text-muted mt-2">
                        Supported: PDF, DOCX, DOC, XLSX, XLS, PNG, JPG (max 10MB)
                      </p>
                    </div>

                    {specUploadError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {specUploadError}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="space-y-4 mt-5">
                    {/* Status Badge */}
                    <div>
                      <Label className="text-base font-bold">Status</Label>
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(positionSpecStatus)}`}>
                          {getStatusLabel(positionSpecStatus)}
                        </span>
                      </div>
                    </div>

                    {/* Document Display */}
                    {positionSpecDoc ? (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-ds-border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-navy" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{positionSpecDoc.name}</p>
                            <p className="text-xs text-text-muted mt-0.5">Uploaded {new Date(positionSpecDoc.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => window.open(positionSpecDoc.file_url, '_blank')}>
                          <Download className="h-4 w-4 mr-1" />
                          View / Download
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted italic">No position spec uploaded yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sticky Save/Cancel Bar */}
        {editingSection && (
          <div className="bg-white border-t border-ds-border" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', zIndex: 50, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
            <div className="flex justify-end gap-3 px-6 py-4 max-w-4xl mx-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStickyCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleStickySave}
                disabled={isSaving}
                className="bg-navy text-white font-bold"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        <style jsx global>{`
          input, textarea, select {
            border-color: #374151 !important;
            color: #000000 !important;
            font-weight: 600 !important;
          }
          input:focus, textarea:focus, select:focus {
            border-color: var(--navy) !important;
          }
          input::placeholder, textarea::placeholder {
            color: #6B7280 !important;
            font-weight: 400 !important;
          }
          button[role="checkbox"] {
            border-color: #374151 !important;
            border-width: 2px !important;
          }
          button[role="combobox"] {
            border-color: #374151 !important;
          }
          button[role="combobox"]:focus {
            border-color: var(--navy) !important;
          }
        `}</style>
      </div>
    </div>
  )
}
