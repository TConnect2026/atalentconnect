"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { ContactFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const editSearchSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_address: z.string().optional(),
  position_title: z.string().min(1, "Position title is required"),
  reports_to: z.string().optional(),
  launch_date: z.string().optional(),
  target_fill_date: z.string().optional(),
  position_location: z.string().optional(),
  work_arrangement: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  open_to_relocation: z.preprocess((val) => val === true, z.boolean().default(false)),
  compensation_range: z.string().optional(),
  relocation_package_available: z.preprocess((val) => val === true, z.boolean().default(false)),
  notes: z.string().optional(),
})

type EditSearchForm = z.infer<typeof editSearchSchema>

export default function EditSearchPage() {
  const params = useParams()
  const router = useRouter()
  const searchId = params.id as string

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ContactFormData[]>([])
  const [clientLogo, setClientLogo] = useState<File | null>(null)
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null)
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [stages, setStages] = useState<Array<{
    id: string
    name: string
    order: number
    visible_to_recruiter: boolean
    visible_to_client: boolean
    interviewer_name: string
    selected_interviewers: string[]
  }>>([])
  const [workArrangement, setWorkArrangement] = useState<'onsite' | 'hybrid' | 'remote'>('onsite')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<EditSearchForm>({
    resolver: zodResolver(editSearchSchema),
    defaultValues: {
      open_to_relocation: false,
      relocation_package_available: false,
    }
  })

  const openToRelocation = watch("open_to_relocation")
  const relocationPackageAvailable = watch("relocation_package_available")

  useEffect(() => {
    loadSearchData()
  }, [searchId])

  const loadSearchData = async () => {
    setIsLoadingData(true)
    try {
      // Load search details
      const { data: search, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("id", searchId)
        .single()

      if (searchError) throw searchError

      // Pre-fill form with existing data
      reset({
        company_name: search.company_name,
        company_address: search.company_address || "",
        position_title: search.position_title,
        reports_to: search.reports_to || "",
        launch_date: search.launch_date || "",
        target_fill_date: search.target_fill_date || "",
        position_location: search.position_location || "",
        work_arrangement: search.work_arrangement || 'onsite',
        open_to_relocation: search.open_to_relocation || false,
        compensation_range: search.compensation_range || "",
        relocation_package_available: search.relocation_package_available || false,
        notes: search.notes || "",
      })

      // Set work arrangement
      if (search.work_arrangement) {
        setWorkArrangement(search.work_arrangement as 'onsite' | 'hybrid' | 'remote')
      }

      // Set existing logo
      if (search.client_logo_url) {
        setExistingLogoUrl(search.client_logo_url)
      }

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .order("order", { ascending: true })

      if (stagesError) throw stagesError

      if (stagesData && stagesData.length > 0) {
        setStages(stagesData.map(s => {
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
      } else {
        // Default stages if none exist
        setStages([
          { id: '', name: 'Sourcing', order: 0, visible_to_recruiter: true, visible_to_client: false, interviewer_name: '', selected_interviewers: [] },
          { id: '', name: 'Initial Screen', order: 1, visible_to_recruiter: true, visible_to_client: false, interviewer_name: '', selected_interviewers: [] },
          { id: '', name: 'Client Interview', order: 2, visible_to_recruiter: true, visible_to_client: true, interviewer_name: '', selected_interviewers: [] },
          { id: '', name: 'Final Round', order: 3, visible_to_recruiter: true, visible_to_client: true, interviewer_name: '', selected_interviewers: [] },
          { id: '', name: 'Offer', order: 4, visible_to_recruiter: true, visible_to_client: true, interviewer_name: '', selected_interviewers: [] }
        ])
      }

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("search_id", searchId)
        .order("is_primary", { ascending: false })

      if (contactsError) throw contactsError

      if (contactsData && contactsData.length > 0) {
        setContacts(contactsData.map(c => ({
          name: c.name,
          email: c.email,
          phone: c.phone || "",
          title: c.title || "",
          linkedin_url: c.linkedin_url || "",
          role: c.role || 'other',
          is_primary: c.is_primary,
          access_level: (c.access_level === 'limited_access' || c.access_level === 'full_access' || c.access_level === 'no_portal_access')
            ? c.access_level
            : 'full_access'
        })))
      } else {
        // If no contacts, add one empty form
        setContacts([{ name: '', email: '', phone: '', title: '', linkedin_url: '', role: 'hiring_manager', is_primary: true, access_level: 'full_access' }])
      }
    } catch (err) {
      console.error("Error loading search:", err)
      setError("Failed to load search data")
    } finally {
      setIsLoadingData(false)
    }
  }

  const addContact = () => {
    setContacts([...contacts, { name: '', email: '', phone: '', title: '', linkedin_url: '', role: 'other', is_primary: false, access_level: 'full_access' }])
  }

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index))
    }
  }

  const updateContact = (index: number, field: keyof ContactFormData, value: string | boolean) => {
    const updated = [...contacts]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'is_primary' && value === true) {
      updated.forEach((contact, i) => {
        if (i !== index) contact.is_primary = false
      })
    }

    setContacts(updated)
  }

  const addStage = () => {
    if (stages.length < 10) {
      setStages([...stages, {
        id: '',
        name: '',
        order: stages.length,
        visible_to_recruiter: true,
        visible_to_client: false,
        interviewer_name: '',
        selected_interviewers: []
      }])
    }
  }

  const removeStage = (index: number) => {
    if (stages.length > 1) {
      const updated = stages.filter((_, i) => i !== index)
      // Reorder remaining stages
      setStages(updated.map((stage, i) => ({ ...stage, order: i })))
    }
  }

  const updateStage = (index: number, field: 'name' | 'visible_to_recruiter' | 'visible_to_client' | 'interviewer_name' | 'selected_interviewers', value: string | boolean | string[]) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], [field]: value }
    setStages(updated)
  }

  const toggleInterviewer = (stageIndex: number, interviewerName: string) => {
    const updated = [...stages]
    const currentInterviewers = updated[stageIndex].selected_interviewers
    if (currentInterviewers.includes(interviewerName)) {
      updated[stageIndex].selected_interviewers = currentInterviewers.filter(name => name !== interviewerName)
    } else {
      updated[stageIndex].selected_interviewers = [...currentInterviewers, interviewerName]
    }
    // Update interviewer_name to be a comma-separated list
    updated[stageIndex].interviewer_name = updated[stageIndex].selected_interviewers.join(', ')
    setStages(updated)
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setClientLogo(file)
      const previewUrl = URL.createObjectURL(file)
      setClientLogoPreview(previewUrl)
    }
  }

  const removeClientLogo = () => {
    setClientLogo(null)
    if (clientLogoPreview) {
      URL.revokeObjectURL(clientLogoPreview)
      setClientLogoPreview(null)
    }
  }

  const removeExistingLogo = () => {
    setExistingLogoUrl(null)
  }

  const onSubmit = async (data: EditSearchForm) => {
    setIsLoading(true)
    setError(null)

    const validContacts = contacts.filter(c => c.name && c.email)
    if (validContacts.length === 0) {
      setError("At least one client contact with name and email is required")
      setIsLoading(false)
      return
    }

    try {
      // Upload new client logo if provided
      let clientLogoUrl = existingLogoUrl
      if (clientLogo) {
        const fileExt = clientLogo.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`

        const { error: logoUploadError } = await supabase.storage
          .from('client-logos')
          .upload(fileName, clientLogo)

        if (logoUploadError) throw logoUploadError

        const { data: { publicUrl } } = supabase.storage
          .from('client-logos')
          .getPublicUrl(fileName)

        clientLogoUrl = publicUrl
      }

      // Update search
      console.log("Updating search with data:", {
        company_name: data.company_name,
        position_title: data.position_title,
        company_linkedin: data.company_linkedin,
        social_links_count: socialLinks.length
      })

      const { error: searchError } = await supabase
        .from("searches")
        .update({
          company_name: data.company_name,
          company_address: data.company_address || null,
          position_title: data.position_title,
          reports_to: data.reports_to || null,
          launch_date: data.launch_date || null,
          target_fill_date: data.target_fill_date || null,
          client_name: validContacts[0].name,
          client_email: validContacts[0].email,
          position_location: data.position_location || null,
          work_arrangement: data.work_arrangement || null,
          open_to_relocation: data.open_to_relocation,
          compensation_range: data.compensation_range || null,
          relocation_package_available: data.relocation_package_available,
          notes: data.notes || null,
          client_logo_url: clientLogoUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", searchId)

      if (searchError) {
        console.error("Search update error:", searchError)
        throw new Error(`Search update failed: ${searchError.message}`)
      }
      console.log("Search updated successfully")

      // Delete all existing contacts and re-insert
      await supabase
        .from('contacts')
        .delete()
        .eq('search_id', searchId)

      // Insert updated contacts
      const contactsToInsert = validContacts.map(contact => ({
        search_id: searchId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        title: contact.title || null,
        linkedin_url: contact.linkedin_url || null,
        role: contact.role || null,
        is_primary: contact.is_primary,
        access_level: (contact.access_level === 'limited_access' || contact.access_level === 'full_access' || contact.access_level === 'no_portal_access')
          ? contact.access_level
          : 'full_access'
      }))

      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contactsToInsert)

      if (contactsError) {
        console.error('Contact insert error:', contactsError)
        console.error('Attempted to insert:', JSON.stringify(contactsToInsert, null, 2))
        throw contactsError
      }

      // Delete all existing stages and re-insert
      const { error: deleteStagesError } = await supabase
        .from('stages')
        .delete()
        .eq('search_id', searchId)

      if (deleteStagesError) {
        console.error('Stages delete error:', {
          message: deleteStagesError.message,
          details: deleteStagesError.details,
          hint: deleteStagesError.hint,
          code: deleteStagesError.code
        })
        throw deleteStagesError
      }

      // Insert updated stages (only non-empty names)
      const validStages = stages.filter(s => s.name.trim() !== '')
      if (validStages.length > 0) {
        const stagesToInsert = validStages.map((stage, index) => ({
          search_id: searchId,
          name: stage.name,
          order: index,
          visible_to_recruiter: stage.visible_to_recruiter,
          visible_to_client: stage.visible_to_client,
          interviewer_name: stage.interviewer_name || null
        }))

        const { error: stagesError } = await supabase
          .from('stages')
          .insert(stagesToInsert)

        if (stagesError) {
          console.error('Stages insert error:', stagesError)
          throw stagesError
        }
      }

      router.push(`/searches/${searchId}`)
    } catch (err) {
      console.error("Error updating search:", err)
      console.error("Error type:", typeof err)
      console.error("Error keys:", err ? Object.keys(err) : 'null')

      // Try to extract more details from Supabase error
      if (err && typeof err === 'object') {
        const supabaseError = err as any
        console.error("Error details:", {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code
        })

        // Show detailed error to user
        const errorMessage = supabaseError.message || supabaseError.details || "Failed to update search"
        setError(`${errorMessage} ${supabaseError.hint ? `(Hint: ${supabaseError.hint})` : ''}`)
      } else {
        setError(err instanceof Error ? err.message : "Failed to update search")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading search data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        input, textarea, select {
          border-color: #374151 !important;
        }
        input:focus, textarea:focus, select:focus {
          border-color: #1F3C62 !important;
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
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Card className="shadow-lg overflow-hidden rounded-lg p-0">
          <CardHeader className="border-b" style={{ backgroundColor: '#1F3C62', padding: '1.5rem', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
            <CardTitle className="text-2xl font-bold text-white">Edit Search</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-6 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Search Details */}
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-600 pb-2 -mt-2">Search Details</h3>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="company_name" className="text-sm font-medium">Company Name</Label>
                    <Input
                      id="company_name"
                      {...register("company_name")}
                      placeholder="e.g. Acme Corp"
                      className="mt-1.5"
                    />
                    {errors.company_name && (
                      <p className="text-sm text-red-500 mt-1.5">{errors.company_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="company_address" className="text-sm font-medium">Company Address</Label>
                    <Input
                      id="company_address"
                      {...register("company_address")}
                      placeholder="e.g. 123 Main St, San Francisco, CA"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Row 1: Position Title and Reports To */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="position_title" className="text-sm font-medium">Position Title</Label>
                    <Input
                      id="position_title"
                      {...register("position_title")}
                      placeholder="e.g. Chief Technology Officer"
                      className="mt-1.5"
                    />
                    {errors.position_title && (
                      <p className="text-sm text-red-500 mt-1.5">{errors.position_title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="reports_to" className="text-sm font-medium">This Position Reports To</Label>
                    <Input
                      id="reports_to"
                      {...register("reports_to")}
                      placeholder="e.g. CEO, Board of Directors"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Row 2: Location, Work Arrangement, Relocation Checkboxes */}
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <Label htmlFor="position_location" className="text-sm font-medium">Location</Label>
                    <Input
                      id="position_location"
                      {...register("position_location")}
                      placeholder="e.g. San Francisco, CA"
                      className="mt-1.5"
                    />
                  </div>

                  <div className="col-span-3">
                    <Label htmlFor="work_arrangement" className="text-sm font-medium">Work Arrangement</Label>
                    <select
                      id="work_arrangement"
                      {...register("work_arrangement")}
                      className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="onsite">Onsite</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>

                  <div className="col-span-2 flex items-center space-x-2 pb-1">
                    <Checkbox
                      id="open_to_relocation"
                      checked={openToRelocation}
                      onCheckedChange={(checked) => setValue("open_to_relocation", checked as boolean)}
                    />
                    <Label htmlFor="open_to_relocation" className="cursor-pointer font-normal text-sm whitespace-nowrap">
                      Open to Relocation
                    </Label>
                  </div>

                  <div className="col-span-2 flex items-center space-x-2 pb-1">
                    <Checkbox
                      id="relocation_package_available"
                      checked={relocationPackageAvailable}
                      onCheckedChange={(checked) => setValue("relocation_package_available", checked as boolean)}
                    />
                    <Label htmlFor="relocation_package_available" className="cursor-pointer font-normal text-sm whitespace-nowrap">
                      Relocation Package
                    </Label>
                  </div>
                </div>

                {/* Row 3: Compensation Range */}
                <div>
                  <Label htmlFor="compensation_range" className="text-sm font-medium">Compensation Range</Label>
                  <Textarea
                    id="compensation_range"
                    {...register("compensation_range")}
                    placeholder="e.g. Base: $250k-$300k&#10;Bonus: 30-40%&#10;Equity: 0.5-1.0%&#10;Benefits: Full package"
                    rows={5}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Include base salary, bonus, equity, benefits, and other compensation details
                  </p>
                </div>

                {/* Row 4: Company Logo */}
                <div>
                  <Label htmlFor="client_logo" className="text-sm font-medium">Company Logo</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-3">
                    Upload the company logo. This will personalize the candidate portal view.
                  </p>
                  {existingLogoUrl && !clientLogoPreview && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-400 mb-3">
                      <img
                        src={existingLogoUrl}
                        alt="Current logo"
                        className="h-16 w-auto object-contain"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Current logo</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeExistingLogo}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  {clientLogoPreview ? (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-400">
                      <img
                        src={clientLogoPreview}
                        alt="Company logo preview"
                        className="h-16 w-auto object-contain"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{clientLogo?.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {clientLogo && (clientLogo.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeClientLogo}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : !existingLogoUrl && (
                    <div className="relative">
                      <Input
                        id="client_logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Accepts: PNG, JPG, SVG (recommended: transparent background)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Participants */}
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-600 pb-2 -mt-2">Search Participants</h3>
                <p className="text-sm text-gray-600">
                  Add all key stakeholders for this search (Board Chair, VP HR, CEO, etc.)
                </p>

                <div className="space-y-4">
                  {contacts.map((contact, index) => (
                    <Card key={index} className="p-5 bg-gray-50 border-gray-400">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">Contact</h4>
                          {contacts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContact(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Name *</Label>
                            <Input
                              value={contact.name}
                              onChange={(e) => updateContact(index, 'name', e.target.value)}
                              placeholder="e.g. John Smith"
                              className="mt-1.5"
                            />
                          </div>

                          <div>
                            <Label className="text-sm">Title</Label>
                            <Input
                              value={contact.title || ''}
                              onChange={(e) => updateContact(index, 'title', e.target.value)}
                              placeholder="e.g. VP of HR"
                              className="mt-1.5"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Phone</Label>
                            <Input
                              value={contact.phone || ''}
                              onChange={(e) => updateContact(index, 'phone', e.target.value)}
                              placeholder="e.g. (555) 123-4567"
                              className="mt-1.5"
                            />
                          </div>

                          <div>
                            <Label className="text-sm">Email *</Label>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(index, 'email', e.target.value)}
                              placeholder="e.g. john@acmecorp.com"
                              className="mt-1.5"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">LinkedIn Profile</Label>
                            <Input
                              value={contact.linkedin_url || ''}
                              onChange={(e) => updateContact(index, 'linkedin_url', e.target.value)}
                              placeholder="e.g. linkedin.com/in/johnsmith"
                              className="mt-1.5"
                            />
                          </div>

                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm">Contact's Role</Label>
                              <Select
                                value={contact.role || 'other'}
                                onValueChange={(value) => updateContact(index, 'role', value as 'hiring_manager' | 'recruiter' | 'interview_panel' | 'board_member' | 'other')}
                              >
                                <SelectTrigger className="mt-1.5">
                                  <SelectValue />
                                </SelectTrigger>
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
                              <Select
                                value={contact.access_level}
                                onValueChange={(value) => updateContact(index, 'access_level', value as 'full_access' | 'limited_access' | 'no_portal_access')}
                              >
                                <SelectTrigger className="mt-1.5">
                                  <SelectValue />
                                </SelectTrigger>
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
                            id={`contact-${index}-primary`}
                            checked={contact.is_primary}
                            onCheckedChange={(checked) => updateContact(index, 'is_primary', checked as boolean)}
                          />
                          <Label htmlFor={`contact-${index}-primary`} className="cursor-pointer font-normal text-sm text-gray-700">
                            Primary Contact
                          </Label>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContact}
                  className="w-full"
                >
                  + Add Another Contact
                </Button>
              </div>

              {/* Pipeline Stages */}
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-600 pb-2 -mt-2">Pipeline Stages</h3>
                <p className="text-sm text-gray-600">
                  Define your custom pipeline stages (1-10 stages). Leave fields blank to remove them.
                </p>

                <div className="space-y-4">
                  {stages.map((stage, index) => (
                    <div key={index} className="p-4 border border-gray-400 rounded-lg bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Stage {index + 1}</Label>
                          <div className="flex gap-2 mt-1.5">
                            <Input
                              value={stage.name}
                              onChange={(e) => updateStage(index, 'name', e.target.value)}
                              placeholder={`e.g. ${['Sourcing', 'Initial Screen', 'Client Interview', 'Final Round', 'Offer', 'Reference Checks', 'Background Check', 'Negotiations', 'Contract Sent', 'Accepted'][index] || 'Stage name'}`}
                            />
                            {stages.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeStage(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3"
                              >
                                ✕
                              </Button>
                            )}
                          </div>

                          <div className="mt-3 space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">Conducted by:</Label>
                              <div className="flex gap-6">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`stage-${index}-recruiter`}
                                    checked={stage.visible_to_recruiter}
                                    onCheckedChange={(checked) => updateStage(index, 'visible_to_recruiter', checked as boolean)}
                                  />
                                  <Label htmlFor={`stage-${index}-recruiter`} className="cursor-pointer font-normal text-sm text-gray-700">
                                    Recruiter
                                  </Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`stage-${index}-client`}
                                    checked={stage.visible_to_client}
                                    onCheckedChange={(checked) => updateStage(index, 'visible_to_client', checked as boolean)}
                                  />
                                  <Label htmlFor={`stage-${index}-client`} className="cursor-pointer font-normal text-sm text-gray-700">
                                    Client
                                  </Label>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">Interviewer(s)</Label>
                              {contacts.filter(c => c.name && c.name.trim() !== '').length > 0 ? (
                                <div className="space-y-2 p-3 border border-gray-400 rounded-md bg-gray-50">
                                  {contacts.filter(c => c.name && c.name.trim() !== '').map((contact, contactIndex) => (
                                    <div key={contactIndex} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`stage-${index}-interviewer-${contactIndex}`}
                                        checked={stage.selected_interviewers.includes(contact.name)}
                                        onCheckedChange={() => toggleInterviewer(index, contact.name)}
                                      />
                                      <Label
                                        htmlFor={`stage-${index}-interviewer-${contactIndex}`}
                                        className="cursor-pointer font-normal text-sm text-gray-700"
                                      >
                                        {contact.name} {contact.title ? `(${contact.title})` : ''}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic p-3 border border-gray-400 rounded-md bg-gray-50">
                                  No participants added yet. Add participants above to select interviewers.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {stages.length >= 10 ? (
                  <p className="text-sm text-amber-600">
                    Maximum of 10 stages reached
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStage}
                    className="w-full"
                  >
                    + Add Another Stage
                  </Button>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-600 pb-2 -mt-2">Notes</h3>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">Search Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Add any additional notes or important information about this search..."
                    rows={6}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Internal notes visible only to your team
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/searches/${searchId}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
