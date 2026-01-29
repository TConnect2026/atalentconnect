"use client"

import { useState, useEffect } from "react"
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
import { ChevronDown, ChevronRight, Pencil, Save, X, Upload } from "lucide-react"

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
  work_arrangement: z.enum(['onsite', 'hybrid', 'remote']).optional(),
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

  // Section edit states
  const [isEditingSearchDetails, setIsEditingSearchDetails] = useState(false)
  const [isEditingParticipants, setIsEditingParticipants] = useState(false)
  const [isEditingStages, setIsEditingStages] = useState(false)
  const [isEditingDocuments, setIsEditingDocuments] = useState(false)

  // Collapse states
  const [isParticipantsCollapsed, setIsParticipantsCollapsed] = useState(true)
  const [isStagesCollapsed, setIsStagesCollapsed] = useState(true)
  const [isDocumentsCollapsed, setIsDocumentsCollapsed] = useState(true)

  const [isSaving, setIsSaving] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])

  // Edit mode state
  const [contacts, setContacts] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
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
      work_arrangement: search?.work_arrangement || 'onsite',
      open_to_relocation: search?.open_to_relocation || false,
      compensation_range: search?.compensation_range || '',
      relocation_package_available: search?.relocation_package_available || false,
    }
  })

  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      if (!search?.id) return
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("search_id", search.id)
          .order("created_at", { ascending: false })

        if (!error) setDocuments(data || [])
      } catch (err) {
        console.error("Error loading documents:", err)
      }
    }
    loadDocuments()
  }, [search?.id])

  // Initialize edit state
  useEffect(() => {
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
      work_arrangement: search?.work_arrangement || 'onsite',
      open_to_relocation: search?.open_to_relocation || false,
      compensation_range: search?.compensation_range || '',
      relocation_package_available: search?.relocation_package_available || false,
    })

    setOpenToRelocation(search?.open_to_relocation || false)
    setRelocationPackageAvailable(search?.relocation_package_available || false)

    setContacts(initialContacts.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      title: c.title || '',
      linkedin_url: c.linkedin_url || '',
      role: c.role || 'other',
      is_primary: c.is_primary,
      access_level: c.access_level
    })))

    setStages(initialStages.map(s => {
      const interviewerNames = s.interviewer_name ? s.interviewer_name.split(', ').filter((n: string) => n.trim()) : []
      return {
        id: s.id,
        name: s.name,
        order: s.order,
        visible_to_recruiter: s.visible_to_recruiter ?? true,
        visible_to_client: s.visible_to_client ?? false,
        interviewer_name: s.interviewer_name || '',
        selected_interviewers: interviewerNames
      }
    }))
  }, [search, initialContacts, initialStages, reset])

  const updateContact = (index: number, field: string, value: any) => {
    const updated = [...contacts]
    updated[index] = { ...updated[index], [field]: value }
    setContacts(updated)
  }

  const addContact = () => {
    setContacts([...contacts, {
      name: '',
      email: '',
      phone: '',
      title: '',
      linkedin_url: '',
      role: 'other',
      is_primary: false,
      access_level: 'limited_access'
    }])
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const updateStage = (index: number, field: string, value: any) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], [field]: value }
    setStages(updated)
  }

  const toggleInterviewer = (stageIndex: number, interviewerName: string) => {
    const updated = [...stages]
    const currentInterviewers = updated[stageIndex].selected_interviewers
    if (currentInterviewers.includes(interviewerName)) {
      updated[stageIndex].selected_interviewers = currentInterviewers.filter((name: string) => name !== interviewerName)
    } else {
      updated[stageIndex].selected_interviewers = [...currentInterviewers, interviewerName]
    }
    updated[stageIndex].interviewer_name = updated[stageIndex].selected_interviewers.join(', ')
    setStages(updated)
  }

  const saveSearchDetails = async (data: any) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("searches")
        .update({
          company_name: data.company_name,
          company_address: data.company_address,
          company_website: data.company_website || null,
          linkedin_profile: data.linkedin_profile || null,
          position_title: data.position_title,
          reports_to: data.reports_to,
          launch_date: data.launch_date || null,
          target_fill_date: data.target_fill_date || null,
          position_location: data.position_location,
          work_arrangement: data.work_arrangement,
          open_to_relocation: data.open_to_relocation,
          compensation_range: data.compensation_range,
          relocation_package_available: data.relocation_package_available,
          updated_at: new Date().toISOString()
        })
        .eq("id", search.id)

      if (error) throw error
      await onSave()
      setIsEditingSearchDetails(false)
    } catch (err) {
      console.error("Error saving search details:", err)
      alert("Error saving changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const saveParticipants = async () => {
    setIsSaving(true)
    try {
      for (const contact of contacts) {
        if (contact.id) {
          const { error } = await supabase
            .from("contacts")
            .update({
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              title: contact.title,
              linkedin_url: contact.linkedin_url,
              role: contact.role,
              is_primary: contact.is_primary,
              access_level: contact.access_level,
              updated_at: new Date().toISOString()
            })
            .eq("id", contact.id)

          if (error) throw error
        } else if (contact.name && contact.email) {
          const { error } = await supabase
            .from("contacts")
            .insert({
              search_id: search.id,
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              title: contact.title,
              linkedin_url: contact.linkedin_url,
              role: contact.role,
              is_primary: contact.is_primary,
              access_level: contact.access_level
            })

          if (error) throw error
        }
      }

      await onSave()
      setIsEditingParticipants(false)
    } catch (err) {
      console.error("Error saving participants:", err)
      alert("Error saving changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const saveStages = async () => {
    setIsSaving(true)
    try {
      // Update launch and target dates
      const formData = {
        launch_date: (document.getElementById('launch_date') as HTMLInputElement)?.value || null,
        target_fill_date: (document.getElementById('target_fill_date') as HTMLInputElement)?.value || null
      }

      const { error: searchError } = await supabase
        .from("searches")
        .update({
          launch_date: formData.launch_date,
          target_fill_date: formData.target_fill_date,
          updated_at: new Date().toISOString()
        })
        .eq("id", search.id)

      if (searchError) throw searchError

      // Update stages
      for (const stage of stages) {
        const { error } = await supabase
          .from("stages")
          .update({
            name: stage.name,
            visible_to_recruiter: stage.visible_to_recruiter,
            visible_to_client: stage.visible_to_client,
            interviewer_name: stage.interviewer_name
          })
          .eq("id", stage.id)

        if (error) throw error
      }

      await onSave()
      setIsEditingStages(false)
    } catch (err) {
      console.error("Error saving stages:", err)
      alert("Error saving changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-6 max-w-5xl">
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
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Candidate Pipeline
            </Button>
          </div>
        </div>

        <Card className="shadow-lg overflow-hidden rounded-lg p-0">
          <CardHeader className="border-b" style={{ backgroundColor: '#1F3C62', padding: '1.5rem', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
            <CardTitle className="text-2xl font-bold text-white">Position Details</CardTitle>
          </CardHeader>

          <CardContent className="pt-0 px-6 pb-6">
            <div className="space-y-0">
              {/* Search Details Section - LIGHT GREY BACKGROUND */}
              <div style={{ backgroundColor: '#f5f5f5' }} className="p-8 border-b-4 border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-600 flex-1">Search Details</h3>
                  {!isEditingSearchDetails && (
                    <Button onClick={() => setIsEditingSearchDetails(true)} size="sm" className="ml-4" style={{ backgroundColor: '#1F3C62' }}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {isEditingSearchDetails ? (
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
                            <select id="work_arrangement" {...register("work_arrangement")} className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md">
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
                        <span className="text-xs text-gray-500 ml-2">Include base salary, bonus, equity, benefits, and other compensation details</span>
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

                    <div className="flex gap-3 pt-4">
                      <Button type="submit" disabled={isSaving} style={{ backgroundColor: '#1F3C62' }} className="hover:opacity-90">
                        <Save className="h-4 w-4 mr-1" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button type="button" onClick={() => setIsEditingSearchDetails(false)} variant="outline">
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-5 mt-5">
                    {/* Line 1: Company Name | Position Title */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Company Name</Label>
                        <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                          <p className="text-base text-gray-900">{search.company_name || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-base font-bold">Position Title</Label>
                        <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                          <p className="text-base text-gray-900 font-medium">{search.position_title || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Line 2: Reports To | LinkedIn Profile */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Reports To</Label>
                        <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                          <p className="text-base text-gray-900">{search.reports_to || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-base font-bold">LinkedIn Profile</Label>
                        <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                          {search.linkedin_profile ? (
                            <a href={search.linkedin_profile.startsWith('http') ? search.linkedin_profile : `https://${search.linkedin_profile}`} target="_blank" rel="noopener noreferrer" className="text-base text-[#1F3C62] hover:opacity-80">
                              {search.linkedin_profile}
                            </a>
                          ) : (
                            <p className="text-base text-gray-900">—</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Line 3: Position Location | Work Arrangement + Open to Relocation */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Position Location</Label>
                        <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                          <p className="text-base text-gray-900">{search.position_location || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-base font-bold">Work Arrangement</Label>
                            <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                              <p className="text-base text-gray-900 capitalize">{search.work_arrangement || '—'}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-base font-bold">Open to Relocation</Label>
                            <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                              <p className="text-base text-gray-900">{search.open_to_relocation ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Line 4: Compensation Range */}
                    <div>
                      <div className="mb-1.5">
                        <Label className="text-base font-bold">Compensation Range</Label>
                        <span className="text-xs text-gray-500 ml-2">Include base salary, bonus, equity, benefits, and other compensation details</span>
                      </div>
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[120px]">
                        <p className="text-base text-gray-900 whitespace-pre-wrap">{search.compensation_range || '—'}</p>
                      </div>
                    </div>

                    {/* Line 5: Company HQ Address | Company Website */}
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <Label className="text-base font-bold">Company HQ Address</Label>
                        <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                          <p className="text-base text-gray-900">{search.company_address || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-base font-bold">Company Website</Label>
                        <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                          {search.company_website ? (
                            <a href={search.company_website} target="_blank" rel="noopener noreferrer" className="text-base text-[#1F3C62] hover:opacity-80">
                              {search.company_website}
                            </a>
                          ) : (
                            <p className="text-base text-gray-900">—</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Participants Section - WHITE BACKGROUND */}
              <div className="bg-white px-8 pt-4 pb-8 border-b-4 border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setIsParticipantsCollapsed(!isParticipantsCollapsed)}
                    className="flex items-center gap-2 flex-1"
                  >
                    {isParticipantsCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-gray-900" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-900" />
                    )}
                    <h3 className="text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-600 flex-1 text-left">
                      Search Participants
                      {isParticipantsCollapsed && (
                        <span className="ml-2 text-base font-normal text-gray-600">
                          ({initialContacts.length})
                        </span>
                      )}
                    </h3>
                  </button>
                  {!isEditingParticipants && !isParticipantsCollapsed && (
                    <Button onClick={() => setIsEditingParticipants(true)} size="sm" className="ml-4" style={{ backgroundColor: '#1F3C62' }}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {!isParticipantsCollapsed && (
                  <>
                    {isEditingParticipants ? (
                      <div className="space-y-4 mt-5">
                        {contacts.map((contact, index) => (
                          <Card key={index} className="p-5 bg-white border-gray-400">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">Contact</h4>
                                {contacts.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeContact(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">Name *</Label>
                                  <Input value={contact.name} onChange={(e) => updateContact(index, 'name', e.target.value)} className="mt-1.5" />
                                </div>
                                <div>
                                  <Label className="text-sm">Title</Label>
                                  <Input value={contact.title} onChange={(e) => updateContact(index, 'title', e.target.value)} className="mt-1.5" />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">Phone</Label>
                                  <Input value={contact.phone} onChange={(e) => updateContact(index, 'phone', e.target.value)} className="mt-1.5" />
                                </div>
                                <div>
                                  <Label className="text-sm">Email *</Label>
                                  <Input type="email" value={contact.email} onChange={(e) => updateContact(index, 'email', e.target.value)} className="mt-1.5" />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">LinkedIn Profile</Label>
                                  <Input value={contact.linkedin_url || ''} onChange={(e) => updateContact(index, 'linkedin_url', e.target.value)} className="mt-1.5" />
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-sm">Contact's Role</Label>
                                    <Select value={contact.role || 'other'} onValueChange={(value) => updateContact(index, 'role', value)}>
                                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                                        <SelectItem value="recruiter">Recruiter</SelectItem>
                                        <SelectItem value="interview_panel">Interview Panel</SelectItem>
                                        <SelectItem value="board_member">Board Member</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm">Portal Access Level</Label>
                                    <Select value={contact.access_level} onValueChange={(value) => updateContact(index, 'access_level', value)}>
                                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="full_access">Full Access</SelectItem>
                                        <SelectItem value="limited_access">Limited Access</SelectItem>
                                        <SelectItem value="no_portal_access">No Portal Access</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`primary-${index}`}
                                  checked={contact.is_primary}
                                  onCheckedChange={(checked) => updateContact(index, 'is_primary', checked)}
                                />
                                <Label htmlFor={`primary-${index}`} className="cursor-pointer font-normal text-sm">Primary Contact</Label>
                              </div>
                            </div>
                          </Card>
                        ))}

                        <Button type="button" onClick={addContact} variant="outline" className="w-full">
                          + Add Participant
                        </Button>

                        <div className="flex gap-3 pt-4">
                          <Button onClick={saveParticipants} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="h-4 w-4 mr-1" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button onClick={() => setIsEditingParticipants(false)} variant="outline">
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 mt-5">
                        {initialContacts.map((contact) => (
                          <Card key={contact.id} className="p-5 bg-gray-50 border-gray-400">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">Contact</h4>
                                {contact.is_primary && (
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Primary</span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">Name *</Label>
                                  <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                                    <p className="text-base text-gray-900">{contact.name}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm">Title</Label>
                                  <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                                    <p className="text-base text-gray-900">{contact.title || '—'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">Phone</Label>
                                  <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                                    <p className="text-base text-gray-900">{contact.phone || '—'}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm">Email *</Label>
                                  <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                                    <p className="text-base text-gray-900">{contact.email}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">LinkedIn Profile</Label>
                                  <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                                    <p className="text-base text-gray-900">{contact.linkedin_url || '—'}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm">Contact's Role</Label>
                                      <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                                        <p className="text-base text-gray-900 capitalize">{contact.role?.replace('_', ' ') || 'Other'}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm">Portal Access Level</Label>
                                      <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                                        <p className="text-base text-gray-900 capitalize">{contact.access_level?.replace('_', ' ')}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`primary-view-${contact.id}`}
                                      checked={contact.is_primary}
                                      disabled
                                    />
                                    <Label htmlFor={`primary-view-${contact.id}`} className="cursor-pointer font-normal text-sm text-gray-700">
                                      Primary Contact
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Search Execution Section - LIGHT GREY BACKGROUND */}
              <div style={{ backgroundColor: '#f5f5f5' }} className="p-8 border-b-4 border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setIsStagesCollapsed(!isStagesCollapsed)}
                    className="flex items-center gap-2 flex-1"
                  >
                    {isStagesCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-gray-900" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-900" />
                    )}
                    <h3 className="text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-600 flex-1 text-left">
                      Search Execution
                    </h3>
                  </button>
                  {!isEditingStages && !isStagesCollapsed && (
                    <Button onClick={() => setIsEditingStages(true)} size="sm" className="ml-4" style={{ backgroundColor: '#1F3C62' }}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {!isStagesCollapsed && (
                  <>
                    {isEditingStages ? (
                      <div className="space-y-4 mt-5">
                        {/* Launch Date and Target Close Date */}
                        <div className="grid grid-cols-2 gap-5 mb-6">
                          <div>
                            <Label htmlFor="launch_date" className="text-base font-bold">Launch Date</Label>
                            <Input type="date" id="launch_date" defaultValue={search.launch_date || ''} className="mt-1.5" />
                          </div>
                          <div>
                            <Label htmlFor="target_fill_date" className="text-base font-bold">Target Close Date</Label>
                            <Input type="date" id="target_fill_date" defaultValue={search.target_fill_date || ''} className="mt-1.5" />
                          </div>
                        </div>

                        {/* Interview Stages Subtitle */}
                        <h4 className="text-base font-bold text-gray-900 mb-4">Interview Stages</h4>

                        {stages.map((stage, index) => (
                          <Card key={stage.id} className="p-5 bg-gray-50 border-gray-400">
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-900">Stage {index + 1}</h4>

                              <div>
                                <Label className="text-sm">Stage Name</Label>
                                <Input value={stage.name} onChange={(e) => updateStage(index, 'name', e.target.value)} className="mt-1.5" />
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">Interviewer(s)</Label>
                                {contacts.filter(c => c.name && c.name.trim() !== '').length > 0 ? (
                                  <div className="space-y-2 p-3 border border-gray-400 rounded-md bg-white">
                                    {contacts.filter(c => c.name && c.name.trim() !== '').map((contact, contactIndex) => (
                                      <div key={contactIndex} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`stage-${index}-interviewer-${contactIndex}`}
                                          checked={stage.selected_interviewers.includes(contact.name)}
                                          onCheckedChange={() => toggleInterviewer(index, contact.name)}
                                        />
                                        <Label htmlFor={`stage-${index}-interviewer-${contactIndex}`} className="cursor-pointer font-normal text-sm">
                                          {contact.name} {contact.title ? `(${contact.title})` : ''}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic p-3 border border-gray-400 rounded-md bg-white">
                                    No participants added yet.
                                  </p>
                                )}
                              </div>

                              <div className="flex gap-6">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`recruiter-${index}`}
                                    checked={stage.visible_to_recruiter}
                                    onCheckedChange={(checked) => updateStage(index, 'visible_to_recruiter', checked)}
                                  />
                                  <Label htmlFor={`recruiter-${index}`} className="cursor-pointer font-normal text-sm">Visible to Recruiter</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`client-${index}`}
                                    checked={stage.visible_to_client}
                                    onCheckedChange={(checked) => updateStage(index, 'visible_to_client', checked)}
                                  />
                                  <Label htmlFor={`client-${index}`} className="cursor-pointer font-normal text-sm">Visible to Client</Label>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}

                        <div className="flex gap-3 pt-4">
                          <Button onClick={saveStages} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="h-4 w-4 mr-1" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button onClick={() => setIsEditingStages(false)} variant="outline">
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 mt-5">
                        {/* Launch Date and Target Close Date */}
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <Label className="text-base font-bold">Launch Date</Label>
                            <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                              <p className="text-base text-gray-900">{search.launch_date || '—'}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-base font-bold">Target Close Date</Label>
                            <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[42px] flex items-center">
                              <p className="text-base text-gray-900">{search.target_fill_date || '—'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Interview Stages Table */}
                        <div>
                          <h4 className="text-base font-bold text-gray-900 mb-3">Interview Stages</h4>
                          <div className="border border-gray-300 rounded-md overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr style={{ backgroundColor: '#F5F5F5' }}>
                                  <th className="text-left px-4 py-3 font-bold text-gray-900 border-b border-gray-300">Stage</th>
                                  <th className="text-left px-4 py-3 font-bold text-gray-900 border-b border-gray-300">Interviewer</th>
                                </tr>
                              </thead>
                              <tbody>
                                {initialStages.map((stage, index) => (
                                  <tr key={stage.id} className="bg-white" style={{ borderBottom: index < initialStages.length - 1 ? '1px solid #E5E5E5' : 'none' }}>
                                    <td className="px-4 py-3 text-base text-gray-900">{stage.name}</td>
                                    <td className="px-4 py-3 text-base text-gray-900">{stage.interviewer_name || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Documents Section - WHITE BACKGROUND */}
              <div className="bg-white p-8 border-b-4 border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
                    className="flex items-center gap-2 flex-1"
                  >
                    {isDocumentsCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-gray-900" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-900" />
                    )}
                    <h3 className="text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-600 flex-1 text-left">
                      Documents
                      {isDocumentsCollapsed && (
                        <span className="ml-2 text-base font-normal text-gray-600">
                          ({documents.length})
                        </span>
                      )}
                    </h3>
                  </button>
                  {!isEditingDocuments && !isDocumentsCollapsed && (
                    <Button onClick={() => setIsEditingDocuments(true)} size="sm" className="ml-4" style={{ backgroundColor: '#1F3C62' }}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {!isDocumentsCollapsed && (
                  <>
                    {isEditingDocuments ? (
                      <div className="space-y-3 mt-5">
                        {documents.length > 0 ? (
                          <>
                            {documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-400">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                  <p className="text-xs text-gray-500 mt-1 capitalize">{doc.type.replace('_', ' ')}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, '_blank')}>
                                    View
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      if (confirm('Delete this document?')) {
                                        const { error } = await supabase.from('documents').delete().eq('id', doc.id)
                                        if (!error) {
                                          setDocuments(documents.filter(d => d.id !== doc.id))
                                        }
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No documents uploaded yet</p>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <Button onClick={() => setIsEditingDocuments(false)} style={{ backgroundColor: '#1F3C62' }} className="hover:opacity-90">
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-5">
                        {documents.length > 0 ? (
                          <>
                            {documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-400">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                  <p className="text-xs text-gray-500 mt-1 capitalize">{doc.type.replace('_', ' ')}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, '_blank')}>
                                  View
                                </Button>
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No documents uploaded yet</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <style jsx global>{`
          input, textarea, select {
            border-color: #374151 !important;
            color: #000000 !important;
            font-weight: 600 !important;
          }
          input:focus, textarea:focus, select:focus {
            border-color: #1F3C62 !important;
          }
          input::placeholder, textarea::placeholder {
            color: #9ca3af !important;
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
            border-color: #1F3C62 !important;
          }
        `}</style>
      </div>
    </div>
  )
}
