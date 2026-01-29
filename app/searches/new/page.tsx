"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { ContactFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Form validation schema
const createSearchSchema = z.object({
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
  open_to_relocation: z.boolean().default(false),
  compensation_range: z.string().optional(),
  relocation_package_available: z.boolean().default(false),
  notes: z.string().optional(),
})

type CreateSearchForm = z.infer<typeof createSearchSchema>

interface UploadedDocument {
  file: File
  name: string
  type: string
}

const DOCUMENT_TYPES = [
  { value: 'job_description', label: 'Job Description' },
  { value: 'intake_form', label: 'Intake Form' },
  { value: 'email_templates', label: 'Email Template' },
  { value: 'interview_guide', label: 'Interview Guide' },
  { value: 'scoring_rubric', label: 'Scoring Rubric' },
  { value: 'other', label: 'Other' },
]

export default function NewSearchPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ContactFormData[]>([
    { name: '', email: '', phone: '', title: '', linkedin_url: '', role: '', is_primary: false, access_level: '' },
    { name: '', email: '', phone: '', title: '', linkedin_url: '', role: '', is_primary: false, access_level: '' }
  ])
  const [stages, setStages] = useState<{ name: string; interview_type: string; visible_to_recruiter: boolean; visible_to_client: boolean; interviewer_name: string; selected_interviewers: string[]; notes: string; guide: File | null }[]>([
    { name: '', interview_type: '', visible_to_recruiter: true, visible_to_client: false, interviewer_name: '', selected_interviewers: [], notes: '', guide: null },
    { name: '', interview_type: '', visible_to_recruiter: true, visible_to_client: false, interviewer_name: '', selected_interviewers: [], notes: '', guide: null },
  ])
  const [clientLogo, setClientLogo] = useState<File | null>(null)
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    email_templates: false,
    interview_guides: false,
    scoring_rubrics: false,
    other: false
  })
  const [firmUsers, setFirmUsers] = useState<Array<{ id: string; name: string }>>([])
  const [searchTeam, setSearchTeam] = useState<Array<{ user_id: string; role: string; notes: string }>>([
    { user_id: '', role: '', notes: '' }
  ])
  const [activeTab, setActiveTab] = useState<'setup' | 'execution'>('setup')
  const [researchExpanded, setResearchExpanded] = useState(false)
  const [customLinks, setCustomLinks] = useState<Array<{ label: string; url: string }>>([])
  const [resourceDocumentSlots, setResourceDocumentSlots] = useState<number>(2)

  const addCustomLink = () => {
    setCustomLinks([...customLinks, { label: '', url: '' }])
  }

  const updateCustomLink = (index: number, field: 'label' | 'url', value: string) => {
    const updated = [...customLinks]
    updated[index][field] = value
    setCustomLinks(updated)
  }

  const removeCustomLink = (index: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index))
  }

  const addResourceDocumentSlot = () => {
    setResourceDocumentSlots(resourceDocumentSlots + 1)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateSearchForm>({
    resolver: zodResolver(createSearchSchema),
    defaultValues: {
      open_to_relocation: false,
      relocation_package_available: false,
    }
  })

  const openToRelocation = watch("open_to_relocation")
  const relocationPackageAvailable = watch("relocation_package_available")
  const workArrangement = watch("work_arrangement")

  // Load firm users on mount
  useEffect(() => {
    const loadFirmUsers = async () => {
      if (!profile?.firm_id) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('firm_id', profile.firm_id)
          .in('role', ['administrator', 'recruiter'])
          .order('first_name')

        if (error) throw error

        const users = (data || []).map(user => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`
        }))

        setFirmUsers(users)

        // Don't auto-select current user - let user choose manually
      } catch (err) {
        console.error('Error loading firm users:', err)
      }
    }

    loadFirmUsers()
  }, [profile?.firm_id])

  const addTeamMember = () => {
    setSearchTeam([...searchTeam, { user_id: '', role: '', notes: '' }])
  }

  const removeTeamMember = (index: number) => {
    if (searchTeam.length > 1) {
      setSearchTeam(searchTeam.filter((_, i) => i !== index))
    }
  }

  const updateTeamMember = (index: number, field: 'user_id' | 'role' | 'notes', value: string) => {
    const updated = [...searchTeam]
    updated[index] = { ...updated[index], [field]: value }
    setSearchTeam(updated)
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

    // If setting a contact as primary, unset all others
    if (field === 'is_primary' && value === true) {
      updated.forEach((contact, i) => {
        if (i !== index) contact.is_primary = false
      })
    }

    setContacts(updated)
  }

  const addStage = () => {
    if (stages.length < 10) {
      setStages([...stages, { name: '', interview_type: '', visible_to_recruiter: true, visible_to_client: false, interviewer_name: '', selected_interviewers: [], notes: '', guide: null }])
    }
  }

  const removeStage = (index: number) => {
    if (stages.length > 1) {
      setStages(stages.filter((_, i) => i !== index))
    }
  }

  const updateStage = (index: number, field: 'name' | 'interview_type' | 'visible_to_recruiter' | 'visible_to_client' | 'interviewer_name' | 'selected_interviewers' | 'notes' | 'guide', value: string | boolean | string[] | File | null) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], [field]: value }
    setStages(updated)
  }

  const handleStageGuideUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateStage(index, 'guide', file)
    }
  }

  const toggleInterviewer = (stageIndex: number, interviewerId: string) => {
    const updated = [...stages]
    const currentInterviewers = updated[stageIndex].selected_interviewers
    if (currentInterviewers.includes(interviewerId)) {
      updated[stageIndex].selected_interviewers = currentInterviewers.filter(id => id !== interviewerId)
    } else {
      updated[stageIndex].selected_interviewers = [...currentInterviewers, interviewerId]
    }

    // Update interviewer_name to be a comma-separated list of display names
    const displayNames = updated[stageIndex].selected_interviewers.map(id => {
      if (id.startsWith('recruiter:')) {
        const userId = id.replace('recruiter:', '')
        const user = firmUsers.find(u => u.id === userId)
        return user?.name || ''
      } else if (id.startsWith('contact:')) {
        return id.replace('contact:', '')
      }
      return ''
    }).filter(name => name !== '')

    updated[stageIndex].interviewer_name = displayNames.join(', ')
    setStages(updated)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (file) {
      setDocuments([...documents, { file, name: file.name, type }])
    }
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setClientLogo(file)
      // Create preview URL
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

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getDocumentCount = (type: string) => {
    return documents.filter(doc => doc.type === type).length
  }

  const handleSingleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string, name: string) => {
    const file = e.target.files?.[0]
    if (file) {
      // Remove existing file of this type
      const filteredDocs = documents.filter(doc => doc.type !== type)
      setDocuments([...filteredDocs, { file, name, type }])
    }
  }

  const uploadDocument = async (searchId: string, doc: UploadedDocument) => {
    const fileExt = doc.file.name.split('.').pop()
    const fileName = `${searchId}/${Date.now()}.${fileExt}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, doc.file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Save document metadata to database
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        search_id: searchId,
        name: doc.name,
        type: doc.type,
        file_url: publicUrl,
        uploaded_by: 'Admin'
      })

    if (dbError) throw dbError
  }

  const onSubmit = async (data: CreateSearchForm) => {
    setIsLoading(true)
    setError(null)

    // Validate search team
    const validTeamMembers = searchTeam.filter(tm => tm.user_id && tm.role)
    if (validTeamMembers.length === 0) {
      setError("At least one team member is required")
      setIsLoading(false)
      return
    }

    const leadRecruiters = validTeamMembers.filter(tm => tm.role === 'lead_recruiter')
    if (leadRecruiters.length === 0) {
      setError("Exactly one team member must be assigned as Lead Recruiter")
      setIsLoading(false)
      return
    }

    if (leadRecruiters.length > 1) {
      setError("Only one team member can be assigned as Lead Recruiter")
      setIsLoading(false)
      return
    }

    // Validate at least one contact with name and email
    const validContacts = contacts.filter(c => c.name && c.email)
    if (validContacts.length === 0) {
      setError("At least one client contact with name and email is required")
      setIsLoading(false)
      return
    }

    // Validate at least one stage with a name
    const validStages = stages.filter(s => s.name.trim() !== '')
    if (validStages.length === 0) {
      setError("At least one pipeline stage is required")
      setIsLoading(false)
      return
    }

    try {
      // Upload client logo if provided
      let clientLogoUrl: string | null = null
      if (clientLogo) {
        setUploadProgress("Uploading client logo...")
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

      // Get lead recruiter ID
      const leadRecruiter = validTeamMembers.find(tm => tm.role === 'lead_recruiter')

      // Create the search
      const { data: search, error: searchError} = await supabase
        .from("searches")
        .insert({
          firm_id: profile?.firm_id,
          lead_recruiter_id: leadRecruiter?.user_id,
          company_name: data.company_name,
          company_address: data.company_address || null,
          company_website: data.company_website || null,
          linkedin_profile: data.linkedin_profile || null,
          position_title: data.position_title,
          reports_to: data.reports_to || null,
          launch_date: data.launch_date || null,
          target_fill_date: data.target_fill_date || null,
          client_name: validContacts[0].name, // Keep for backward compatibility
          client_email: validContacts[0].email, // Keep for backward compatibility
          position_location: data.position_location || null,
          work_arrangement: data.work_arrangement || null,
          open_to_relocation: data.open_to_relocation,
          compensation_range: data.compensation_range || null,
          relocation_package_available: data.relocation_package_available,
          notes: data.notes || null,
          client_logo_url: clientLogoUrl,
          status: "active"
        })
        .select()
        .single()

      if (searchError) {
        console.error('Search creation error:', searchError)
        console.error('Error details:', JSON.stringify(searchError, null, 2))
        console.error('Error message:', searchError.message)
        console.error('Error code:', searchError.code)
        throw searchError
      }

      console.log('Search created successfully:', search.id)

      // Insert contacts
      const contactsToInsert = validContacts.map(contact => ({
        search_id: search.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        title: contact.title || null,
        linkedin_url: contact.linkedin_url || null,
        role: contact.role || null,
        is_primary: contact.is_primary,
        access_level: contact.access_level || 'full_access'
      }))

      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contactsToInsert)

      if (contactsError) {
        console.error('Contacts error:', contactsError)
        throw contactsError
      }

      console.log('Contacts inserted successfully')

      // Insert search assignments (all team members)
      const assignmentsToInsert = validTeamMembers.map(tm => ({
        search_id: search.id,
        user_id: tm.user_id
      }))

      console.log('Assignments to insert:', assignmentsToInsert)

      const { error: assignmentsError } = await supabase
        .from('search_assignments')
        .insert(assignmentsToInsert)

      if (assignmentsError) {
        console.error('Assignments error:', assignmentsError)
        throw assignmentsError
      }

      console.log('Assignments inserted successfully')

      // Create stages
      const stagesToInsert = validStages.map((stage, index) => ({
        search_id: search.id,
        name: stage.name,
        interview_type: stage.interview_type || 'video',
        order: index,
        visible_to_recruiter: stage.visible_to_recruiter,
        visible_to_client: stage.visible_to_client,
        interviewer_name: stage.interviewer_name || null,
      }))

      console.log('Stages to insert:', stagesToInsert)

      const { error: stagesError } = await supabase
        .from("stages")
        .insert(stagesToInsert)

      if (stagesError) {
        console.error('Stages error:', stagesError)
        throw stagesError
      }

      console.log('Stages inserted successfully')

      // Upload documents if any
      if (documents.length > 0) {
        setUploadProgress(`Uploading ${documents.length} document(s)...`)
        for (const doc of documents) {
          await uploadDocument(search.id, doc)
        }
      }

      console.log('All data saved successfully, redirecting...')

      // Redirect to the search kanban board
      router.push(`/searches/${search.id}`)
    } catch (err) {
      console.error("Error creating search:", err)
      console.error("Error type:", typeof err)
      console.error("Error keys:", err ? Object.keys(err) : 'null')
      if (err && typeof err === 'object') {
        console.error("Error stringified:", JSON.stringify(err, null, 2))
      }
      setError(err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : "Failed to create search. Please check console for details.")
    } finally {
      setIsLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        input, textarea, select {
          border-color: #888888 !important;
          color: #333333 !important;
          font-weight: 400 !important;
        }
        input:focus, textarea:focus, select:focus {
          border-color: #1F3C62 !important;
        }
        input::placeholder, textarea::placeholder {
          color: #999999 !important;
          font-weight: 400 !important;
        }
        button[role="checkbox"] {
          border-color: #888888 !important;
          border-width: 1px !important;
        }
        button[role="combobox"] {
          border-color: #888888 !important;
        }
        button[role="combobox"]:focus {
          border-color: #1F3C62 !important;
        }
      `}</style>
      <div className="container mx-auto px-6 py-10 max-w-7xl">
        <Button
          type="button"
          onClick={() => router.push('/searches')}
          variant="ghost"
          size="sm"
          className="mb-4 hover:bg-gray-100 p-2 flex items-center gap-2"
          style={{ color: '#DC4405' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Searches</span>
        </Button>

        <Card className="shadow-lg overflow-hidden rounded-lg p-0">
          <CardHeader className="border-b" style={{ backgroundColor: 'white', padding: '1.5rem', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem', borderBottom: '1px solid #888888' }}>
            <CardTitle className="text-2xl font-bold" style={{ color: '#1F3C62' }}>Create New Search</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
              {/* Tab Bar */}
              <div className="flex px-6" style={{ borderBottom: '1px solid #888888' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('setup')}
                  className="px-6 py-4 font-medium transition-colors rounded-t-md"
                  style={{
                    color: activeTab === 'setup' ? 'white' : '#666666',
                    backgroundColor: activeTab === 'setup' ? '#1F3C62' : 'white',
                    border: activeTab === 'setup' ? 'none' : '1px solid #888888',
                    marginBottom: '-1px',
                    marginRight: '4px'
                  }}
                >
                  Setup
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('execution')}
                  className="px-6 py-4 font-medium transition-colors rounded-t-md"
                  style={{
                    color: activeTab === 'execution' ? 'white' : '#666666',
                    backgroundColor: activeTab === 'execution' ? '#1F3C62' : 'white',
                    border: activeTab === 'execution' ? 'none' : '1px solid #888888',
                    marginBottom: '-1px'
                  }}
                >
                  Execution
                </button>
              </div>

              {/* Tab Content */}
              <div className="py-8" style={{ minHeight: '500px', border: '1px solid #888888', borderTop: 'none', backgroundColor: 'white' }}>
                {/* Tab 1: Setup - Full Width */}
                {activeTab === 'setup' && (
                  <div className="px-6">
                    {/* Search Details - Full Width */}
                    <div className="space-y-8">
                    {/* Search Details */}
                    <div>
                      <h3 className="font-bold pb-3 mb-6" style={{ fontSize: '26px', color: '#1F3C62', borderBottom: '2px solid #1F3C62' }}>Search Details</h3>

                      <div className="space-y-5">
                  {/* Job Description */}
                  <div>
                    <Label className="text-base font-bold mb-2 block" style={{ color: '#1F3C62' }}>Job Description</Label>
                    {documents.filter(doc => doc.type === 'job_description').length === 0 ? (
                      <>
                        <input
                          id="job-description-input"
                          type="file"
                          onChange={(e) => handleSingleFileSelect(e, 'job_description', 'Job Description')}
                          className="hidden"
                        />
                        <div
                          onClick={() => document.getElementById('job-description-input')?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-md h-10 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                        >
                          <span className="text-sm text-gray-500">Drop file or click to upload</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {documents.filter(doc => doc.type === 'job_description').map((doc, index) => (
                          <div key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md text-sm border border-gray-300">
                            <span className="truncate max-w-[200px]">{doc.file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeDocument(documents.indexOf(doc))}
                              className="text-gray-500 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Line 1: Company Name | Position Title */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="company_name" className="text-base font-bold" style={{ color: '#1F3C62' }}>Company Name</Label>
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
                      <Label htmlFor="position_title" className="text-base font-bold" style={{ color: '#1F3C62' }}>Position Title</Label>
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
                  </div>

                  {/* Line 2: Reports To | LinkedIn Profile */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="reports_to" className="text-base font-bold" style={{ color: '#1F3C62' }}>Reports To</Label>
                      <Input
                        id="reports_to"
                        {...register("reports_to")}
                        placeholder="Name and Title"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="linkedin_profile" className="text-base font-bold" style={{ color: '#1F3C62' }}>LinkedIn Profile</Label>
                      <Input
                        id="linkedin_profile"
                        {...register("linkedin_profile")}
                        placeholder="e.g. linkedin.com/in/janedoe"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Line 3: Position Location | Work Arrangement + Open to Relocation */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="position_location" className="text-base font-bold" style={{ color: '#1F3C62' }}>Position Location</Label>
                      <Input
                        id="position_location"
                        {...register("position_location")}
                        placeholder="e.g. New York, NY"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="work_arrangement" className="text-base font-bold" style={{ color: '#1F3C62' }}>Work Arrangement</Label>
                          <select
                            id="work_arrangement"
                            {...register("work_arrangement")}
                            className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select...</option>
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
                              onCheckedChange={(checked) => setValue("open_to_relocation", checked as boolean)}
                            />
                            <Label htmlFor="open_to_relocation" className="cursor-pointer font-normal text-sm whitespace-nowrap">
                              Open to Relocation
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compensation and Benefits Section */}
                  <div>
                    <h4 className="text-base font-bold mb-4" style={{ color: '#1F3C62' }}>Compensation and Benefits</h4>

                    <div className="space-y-4">
                      {/* Compensation */}
                      <div>
                        <Label htmlFor="compensation_range" className="text-sm font-bold" style={{ color: '#1F3C62' }}>Compensation</Label>
                        <Textarea
                          id="compensation_range"
                          {...register("compensation_range")}
                          placeholder="e.g. Base: $250k-$300k, Bonus: 30-40%, Equity: 0.5-1.0%"
                          rows={2}
                          className="mt-1.5"
                        />
                      </div>

                      {/* Benefits */}
                      <div>
                        <Label htmlFor="benefits" className="text-sm font-bold" style={{ color: '#1F3C62' }}>Benefits</Label>
                        <Textarea
                          id="benefits"
                          {...register("benefits")}
                          placeholder="e.g. Full health/dental/vision, 401k match, 4 weeks PTO"
                          rows={2}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                      </div>
                    </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Execution */}
                {activeTab === 'execution' && (
                  <div className="px-6">
                    {/* Two column layout */}
                    <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
                      {/* Left column - Recruiting Team */}
                      <div style={{ flex: '1', minWidth: '0' }}>
                    {/* Recruiting Team */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '12px', borderRadius: '8px', border: '1px solid #D0D0D0' }}>
                      <h3 className="font-bold pb-3 mb-6" style={{ fontSize: '26px', color: '#1F3C62', borderBottom: '2px solid #1F3C62' }}>Recruiting Team</h3>

                      <div className="space-y-3 mb-2">
                  {searchTeam.map((member, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div style={{ minWidth: '230px', width: '230px' }}>
                        <Select
                          value={member.user_id || undefined}
                          onValueChange={(value) => updateTeamMember(index, 'user_id', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {firmUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div style={{ minWidth: '160px', width: '160px' }}>
                        <Select
                          value={member.role || undefined}
                          onValueChange={(value) => updateTeamMember(index, 'role', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead_recruiter">Lead Recruiter</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="sourcer">Sourcer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div style={{ flex: '1' }}>
                        <textarea
                          value={member.notes}
                          onChange={(e) => updateTeamMember(index, 'notes', e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                          style={{ height: '38px' }}
                        />
                      </div>

                      {searchTeam.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTeamMember(index)}
                          className="text-gray-400 hover:text-red-600 text-lg leading-none mt-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                      <button
                        type="button"
                        onClick={addTeamMember}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        <span style={{ color: '#E07A40' }}>+</span> Add team member
                      </button>
                    </div>
                      </div>

                      {/* Right column - Timeline */}
                      <div style={{ width: 'max-content', height: '180px', backgroundColor: '#F5F5F5', padding: '12px', borderRadius: '8px', border: '1px solid #D0D0D0' }}>
                        <h3 className="font-bold pb-2 mb-4" style={{ fontSize: '20px', color: '#1F3C62', borderBottom: '2px solid #1F3C62' }}>Timeline</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div className="flex items-center gap-3">
                            <Label htmlFor="launch_date" className="font-bold whitespace-nowrap" style={{ color: '#1F3C62', width: '150px', fontSize: '16px' }}>Launch Date</Label>
                            <Input
                              id="launch_date"
                              type="date"
                              {...register("launch_date")}
                              style={{ width: '160px', fontSize: '16px' }}
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <Label htmlFor="target_fill_date" className="font-bold whitespace-nowrap" style={{ color: '#1F3C62', width: '150px', fontSize: '16px' }}>Target Close Date</Label>
                            <Input
                              id="target_fill_date"
                              type="date"
                              {...register("target_fill_date")}
                              style={{ width: '160px', fontSize: '16px' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Client Team - Full Width */}
                    <div className="mb-8 mt-12" style={{ padding: '12px', borderRadius: '8px', border: '2px solid #BBBBBB' }}>
                      <h3 className="font-bold pb-3 mb-6" style={{ fontSize: '26px', color: '#1F3C62', borderBottom: '2px solid #1F3C62' }}>Client Team</h3>
                <div className="overflow-x-auto rounded-md" style={{ border: '1px solid #555555' }}>
                  <table className="w-full border-collapse">
                    {/* Header row */}
                    <thead>
                      <tr style={{ backgroundColor: '#F5F5F5', height: '38px', borderBottom: '2px solid #555555' }}>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '16%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>Name</th>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '14%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>Title</th>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '18%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>Email</th>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '10%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>Phone</th>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '14%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>LinkedIn</th>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '12%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>Role</th>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '10%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>Access</th>
                        <th className="text-center px-2 font-bold uppercase" style={{ width: '6%', fontSize: '11px', padding: '8px', color: '#1F3C62', border: '1px solid #555555' }}>Primary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#FAFAFA' }}>
                          {/* Name */}
                          <td style={{ padding: '8px', border: '1px solid #555555' }}>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) => updateContact(index, 'name', e.target.value)}
                              placeholder="Name"
                              className="w-full border-0 bg-transparent focus:outline-none"
                              style={{
                                fontSize: '12px'
                              }}
                            />
                          </td>

                          {/* Title */}
                          <td style={{ padding: '8px', border: '1px solid #555555' }}>
                            <input
                              type="text"
                              value={contact.title}
                              onChange={(e) => updateContact(index, 'title', e.target.value)}
                              placeholder="Title"
                              className="w-full border-0 bg-transparent focus:outline-none"
                              style={{
                                fontSize: '12px'
                              }}
                            />
                          </td>

                          {/* Email */}
                          <td style={{ padding: '8px', border: '1px solid #555555' }}>
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(index, 'email', e.target.value)}
                              placeholder="Email"
                              className="w-full border-0 bg-transparent focus:outline-none"
                              style={{
                                fontSize: '12px'
                              }}
                            />
                          </td>

                          {/* Phone */}
                          <td style={{ padding: '8px', border: '1px solid #555555' }}>
                            <input
                              type="text"
                              value={contact.phone}
                              onChange={(e) => updateContact(index, 'phone', e.target.value)}
                              placeholder="Phone"
                              className="w-full border-0 bg-transparent focus:outline-none"
                              style={{
                                fontSize: '12px'
                              }}
                            />
                          </td>

                          {/* LinkedIn */}
                          <td style={{ padding: '8px', border: '1px solid #555555' }}>
                            <input
                              type="text"
                              value={contact.linkedin_url || ''}
                              onChange={(e) => updateContact(index, 'linkedin_url', e.target.value)}
                              placeholder="LinkedIn"
                              className="w-full border-0 bg-transparent focus:outline-none truncate"
                              style={{
                                fontSize: '12px'
                              }}
                            />
                          </td>

                          {/* Role */}
                          <td style={{ padding: '8px', border: '1px solid #555555' }}>
                            <Select
                              value={contact.role || undefined}
                              onValueChange={(value) => updateContact(index, 'role', value as 'hiring_manager' | 'recruiter' | 'interview_panel' | 'board_member' | 'other')}
                            >
                              <SelectTrigger className="w-full h-7 border-0 rounded-none bg-transparent shadow-none" style={{ fontSize: '12px' }}>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                                <SelectItem value="recruiter">Recruiter</SelectItem>
                                <SelectItem value="interview_panel">Interview Panel</SelectItem>
                                <SelectItem value="board_member">Board Member</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Access */}
                          <td style={{ padding: '8px', border: '1px solid #555555' }}>
                            <Select
                              value={contact.access_level || undefined}
                              onValueChange={(value) => updateContact(index, 'access_level', value as 'full_access' | 'limited_access' | 'no_portal_access')}
                            >
                              <SelectTrigger className="w-full h-7 border-0 rounded-none bg-transparent shadow-none" style={{ fontSize: '12px' }}>
                                <SelectValue placeholder="Select access" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full_access">Full</SelectItem>
                                <SelectItem value="limited_access">Limited</SelectItem>
                                <SelectItem value="no_portal_access">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Primary */}
                          <td className="text-center" style={{ padding: '8px', border: '1px solid #555555' }}>
                            <Checkbox
                              checked={contact.is_primary}
                              onCheckedChange={(checked) => updateContact(index, 'is_primary', checked as boolean)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addContact}
                  className="text-sm text-gray-600 hover:text-gray-900 mt-2"
                >
                  <span style={{ color: '#E07A40' }}>+</span> Add
                </button>

                {/* Notes Field */}
                <div className="mt-6">
                  <label className="block font-bold mb-2" style={{ fontSize: '14px', color: '#1F3C62' }}>
                    Notes
                  </label>
                  <textarea
                    placeholder="Notes..."
                    className="w-full rounded focus:outline-none focus:ring-2 focus:ring-[#1F3C62] resize-y"
                    style={{
                      minHeight: '60px',
                      border: '1px solid #888888',
                      padding: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                    </div>

                    {/* Stages Section */}
                    <div className="mt-8">
                      <h3 className="font-bold pb-3 mb-6" style={{ fontSize: '26px', color: '#1F3C62', borderBottom: '2px solid #1F3C62' }}>Stages</h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="mb-3">
                  {stages.map((stage, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Row 1: Badge, Name, Format, Guide, Interviewers, Remove */}
                      <div className="flex items-center gap-3">
                        {/* Stage badge */}
                        <div
                          className="text-white text-xs font-semibold rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#1F3C62', width: '28px', height: '28px' }}
                        >
                          {index + 1}
                        </div>

                        {/* Stage name input - wider */}
                        <div style={{ width: '280px' }}>
                          <Input
                            value={stage.name}
                            onChange={(e) => updateStage(index, 'name', e.target.value)}
                            placeholder="e.g. Recruiter Screen"
                          />
                        </div>

                        {/* Format dropdown */}
                        <div style={{ width: '120px' }}>
                          <Select
                            value={stage.interview_type || undefined}
                            onValueChange={(value) => updateStage(index, 'interview_type', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="in-person">In-Person</SelectItem>
                              <SelectItem value="presentation">Presentation</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Guide attachment cell */}
                        <div style={{ width: '180px' }}>
                          <input
                            id={`stage-guide-${index}`}
                            type="file"
                            onChange={(e) => handleStageGuideUpload(index, e)}
                            className="hidden"
                          />
                          {stage.guide ? (
                            <div
                              className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md"
                              style={{ height: '38px' }}
                            >
                              <span className="text-gray-700 text-sm truncate flex-1">{stage.guide.name}</span>
                              <button
                                type="button"
                                onClick={() => updateStage(index, 'guide', null)}
                                className="text-gray-500 hover:text-red-600 text-sm flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById(`stage-guide-${index}`)?.click()}
                              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-600"
                              style={{ height: '38px' }}
                            >
                              📎 Guide
                            </button>
                          )}
                        </div>

                        {/* Interviewers section */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#1F3C62' }}>Interviewers:</span>

                            <div className="flex flex-wrap items-center" style={{ gap: '8px' }}>
                              {/* Add interviewer dropdown as text link - appears first */}
                              <select
                                value=""
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value && !stage.selected_interviewers.includes(value)) {
                                    toggleInterviewer(index, value)
                                  }
                                  e.target.value = ""
                                }}
                                className="border-0 bg-transparent cursor-pointer outline-none"
                                style={{
                                  fontSize: '12px',
                                  color: '#DC4405',
                                  padding: 0,
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  MozAppearance: 'none'
                                }}
                              >
                                <option value="">+ Add</option>

                                {/* Recruiting Team members */}
                                {searchTeam.filter(tm => tm.user_id).length > 0 && (
                                  <>
                                    <option disabled style={{ color: '#DC4405', fontWeight: 'bold' }}>— RECRUITING TEAM —</option>
                                    {searchTeam.filter(tm => tm.user_id).map((teamMember, tmIndex) => {
                                      const user = firmUsers.find(u => u.id === teamMember.user_id)
                                      if (!user) return null

                                      const roleLabel = teamMember.role === 'lead_recruiter' ? 'Lead Recruiter' :
                                                       teamMember.role === 'recruiter' ? 'Recruiter' :
                                                       teamMember.role === 'sourcer' ? 'Sourcer' : 'Other'
                                      const interviewerId = `recruiter:${user.id}`

                                      const isSelected = stage.selected_interviewers.includes(interviewerId)

                                      return (
                                        <option key={`tm-${tmIndex}`} value={interviewerId}>
                                          {isSelected ? '✓ ' : ''}{user.name} ({roleLabel})
                                        </option>
                                      )
                                    })}
                                  </>
                                )}

                                {/* Client Team members */}
                                {contacts.filter(c => c.name && c.name.trim() !== '').length > 0 && (
                                  <>
                                    <option disabled style={{ color: '#DC4405', fontWeight: 'bold' }}>— CLIENT TEAM —</option>
                                    {contacts.filter(c => c.name && c.name.trim() !== '').map((contact, contactIndex) => {
                                      const roleLabel = contact.role === 'hiring_manager' ? 'Hiring Manager' :
                                                       contact.role === 'recruiter' ? 'Recruiter' :
                                                       contact.role === 'interview_panel' ? 'Interview Panel' :
                                                       contact.role === 'board_member' ? 'Board Member' :
                                                       contact.title || 'Other'
                                      const interviewerId = `contact:${contact.name}`

                                      const isSelected = stage.selected_interviewers.includes(interviewerId)

                                      return (
                                        <option key={`contact-${contactIndex}`} value={interviewerId}>
                                          {isSelected ? '✓ ' : ''}{contact.name} ({roleLabel})
                                        </option>
                                      )
                                    })}
                                  </>
                                )}

                                {searchTeam.filter(tm => tm.user_id).length === 0 && contacts.filter(c => c.name && c.name.trim() !== '').length === 0 && (
                                  <option disabled>No team members or contacts added yet</option>
                                )}
                              </select>

                              {/* Selected interviewer tags - appear after + Add */}
                              {stage.selected_interviewers.map((interviewerId, tagIndex) => {
                                let displayName = ''

                                if (interviewerId.startsWith('recruiter:')) {
                                  const userId = interviewerId.replace('recruiter:', '')
                                  const user = firmUsers.find(u => u.id === userId)
                                  displayName = user?.name || ''
                                } else if (interviewerId.startsWith('contact:')) {
                                  displayName = interviewerId.replace('contact:', '')
                                }

                                return (
                                  <div
                                    key={tagIndex}
                                    className="inline-flex items-center gap-1 rounded"
                                    style={{
                                      backgroundColor: '#E5E5E5',
                                      padding: '4px 6px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <span className="text-gray-700">{displayName}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleInterviewer(index, interviewerId)}
                                      className="text-gray-500 hover:text-gray-700"
                                      style={{ fontSize: '11px' }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Remove stage button */}
                        {stages.length > 1 && index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeStage(index)}
                            className="text-gray-400 hover:text-red-600 text-lg"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Row 2: Notes (spans stage name + format + guide with gaps) */}
                      <div style={{ marginLeft: '40px' }}>
                        <textarea
                          value={stage.notes}
                          onChange={(e) => updateStage(index, 'notes', e.target.value)}
                          placeholder="Notes: Key focus areas..."
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                          style={{ width: '604px', height: '38px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {stages.length >= 10 ? (
                  <p className="text-sm text-amber-600">
                    Maximum of 10 stages reached
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={addStage}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    <span style={{ color: '#E07A40' }}>+</span> Add Another Stage
                  </button>
                )}
                    </div>

                    {/* Playbooks Section - Full Width */}
                    <div className="mt-8" style={{ backgroundColor: '#F5F5F5', padding: '16px', borderRadius: '8px' }}>
                      <h3 className="font-bold pb-3 mb-6" style={{ fontSize: '26px', color: '#1F3C62', borderBottom: '2px solid #1F3C62' }}>
                        <span style={{ fontSize: '22px' }}>📁</span> Playbooks
                      </h3>

                      <div className="grid grid-cols-6 gap-3">
                        {/* Cell 1 */}
                        <div>
                          <input
                            id="playbook-doc-1"
                            type="file"
                            onChange={(e) => handleFileSelect(e, 'playbook_1')}
                            className="hidden"
                          />
                          {documents.filter(doc => doc.type === 'playbook_1').length > 0 ? (
                            documents.filter(doc => doc.type === 'playbook_1').map((doc, idx) => (
                              <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-md text-sm border border-gray-300 w-full">
                                <span className="truncate flex-1">{doc.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(documents.indexOf(doc))}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('playbook-doc-1')?.click()}
                              className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
                              style={{ color: '#DC4405' }}
                            >
                              + Add Document
                            </button>
                          )}
                        </div>

                        {/* Cell 2 */}
                        <div>
                          <input
                            id="playbook-doc-2"
                            type="file"
                            onChange={(e) => handleFileSelect(e, 'playbook_2')}
                            className="hidden"
                          />
                          {documents.filter(doc => doc.type === 'playbook_2').length > 0 ? (
                            documents.filter(doc => doc.type === 'playbook_2').map((doc, idx) => (
                              <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-md text-sm border border-gray-300 w-full">
                                <span className="truncate flex-1">{doc.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(documents.indexOf(doc))}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('playbook-doc-2')?.click()}
                              className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
                              style={{ color: '#DC4405' }}
                            >
                              + Add Document
                            </button>
                          )}
                        </div>

                        {/* Cell 3 */}
                        <div>
                          <input
                            id="playbook-doc-3"
                            type="file"
                            onChange={(e) => handleFileSelect(e, 'playbook_3')}
                            className="hidden"
                          />
                          {documents.filter(doc => doc.type === 'playbook_3').length > 0 ? (
                            documents.filter(doc => doc.type === 'playbook_3').map((doc, idx) => (
                              <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-md text-sm border border-gray-300 w-full">
                                <span className="truncate flex-1">{doc.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(documents.indexOf(doc))}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('playbook-doc-3')?.click()}
                              className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
                              style={{ color: '#DC4405' }}
                            >
                              + Add Document
                            </button>
                          )}
                        </div>

                        {/* Cell 4 */}
                        <div>
                          <input
                            id="playbook-doc-4"
                            type="file"
                            onChange={(e) => handleFileSelect(e, 'playbook_4')}
                            className="hidden"
                          />
                          {documents.filter(doc => doc.type === 'playbook_4').length > 0 ? (
                            documents.filter(doc => doc.type === 'playbook_4').map((doc, idx) => (
                              <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-md text-sm border border-gray-300 w-full">
                                <span className="truncate flex-1">{doc.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(documents.indexOf(doc))}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('playbook-doc-4')?.click()}
                              className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
                              style={{ color: '#DC4405' }}
                            >
                              + Add Document
                            </button>
                          )}
                        </div>

                        {/* Cell 5 */}
                        <div>
                          <input
                            id="playbook-doc-5"
                            type="file"
                            onChange={(e) => handleFileSelect(e, 'playbook_5')}
                            className="hidden"
                          />
                          {documents.filter(doc => doc.type === 'playbook_5').length > 0 ? (
                            documents.filter(doc => doc.type === 'playbook_5').map((doc, idx) => (
                              <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-md text-sm border border-gray-300 w-full">
                                <span className="truncate flex-1">{doc.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(documents.indexOf(doc))}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('playbook-doc-5')?.click()}
                              className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
                              style={{ color: '#DC4405' }}
                            >
                              + Add Document
                            </button>
                          )}
                        </div>

                        {/* Cell 6 */}
                        <div>
                          <input
                            id="playbook-doc-6"
                            type="file"
                            onChange={(e) => handleFileSelect(e, 'playbook_6')}
                            className="hidden"
                          />
                          {documents.filter(doc => doc.type === 'playbook_6').length > 0 ? (
                            documents.filter(doc => doc.type === 'playbook_6').map((doc, idx) => (
                              <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-md text-sm border border-gray-300 w-full">
                                <span className="truncate flex-1">{doc.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(documents.indexOf(doc))}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('playbook-doc-6')?.click()}
                              className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
                              style={{ color: '#DC4405' }}
                            >
                              + Add Document
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Research & Resources Section - Full Width */}
                    <div className="mt-8" style={{ backgroundColor: '#F8F8F8', padding: '16px', borderRadius: '8px', border: '1px solid #E5E5E5' }}>
                      <button
                        type="button"
                        onClick={() => setResearchExpanded(!researchExpanded)}
                        className="w-full flex items-center justify-between mb-4"
                      >
                        <h3 className="font-semibold" style={{ fontSize: '18px', color: '#1F3C62' }}>🔍 Research & Resources</h3>
                        <span style={{ color: '#1F3C62', fontSize: '18px' }}>
                          {researchExpanded ? '▼' : '▶'}
                        </span>
                      </button>

                      {researchExpanded && (
                      <div className="space-y-4">
                    {/* Company HQ */}
                    <div>
                      <Label htmlFor="company_address" className="text-sm font-bold mb-2 block" style={{ color: '#1F3C62' }}>Company HQ</Label>
                      <Input
                        id="company_address"
                        {...register("company_address")}
                        placeholder="e.g. San Francisco, CA"
                        className="bg-white"
                      />
                    </div>

                    {/* Company Website */}
                    <div>
                      <Label htmlFor="company_website" className="text-sm font-bold mb-2 block" style={{ color: '#1F3C62' }}>Company Website</Label>
                      <Input
                        id="company_website"
                        {...register("company_website")}
                        placeholder="e.g. https://www.acmecorp.com"
                        className="bg-white"
                      />
                    </div>

                    {/* LinkedIn Company Page */}
                    <div>
                      <Label htmlFor="linkedin_company_page" className="text-sm font-bold mb-2 block" style={{ color: '#1F3C62' }}>LinkedIn Company Page</Label>
                      <Input
                        id="linkedin_company_page"
                        placeholder="e.g. linkedin.com/company/acme-corp"
                        className="bg-white"
                      />
                    </div>

                    {/* Recent News */}
                    <div>
                      <Label htmlFor="recent_funding_news" className="text-sm font-bold mb-2 block" style={{ color: '#1F3C62' }}>Recent News</Label>
                      <Input
                        id="recent_funding_news"
                        placeholder="Add link"
                        className="bg-white"
                      />
                    </div>

                    {/* Custom Links */}
                    {customLinks.map((link, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => updateCustomLink(index, 'label', e.target.value)}
                          placeholder="Label"
                          className="bg-white"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                          placeholder="URL"
                          className="bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeCustomLink(index)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Add Link Button */}
                    <button
                      type="button"
                      onClick={addCustomLink}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      <span style={{ color: '#E07A40' }}>+</span> Add Link
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-300 my-4"></div>

                    {/* Documents Section */}
                    <div>
                      <h4 className="text-sm font-bold mb-3" style={{ color: '#1F3C62' }}>Documents</h4>
                      <div className="space-y-2">
                        {Array.from({ length: resourceDocumentSlots }).map((_, index) => (
                          <div
                            key={index}
                            className="border-2 border-dashed border-gray-300 rounded-md h-10 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-white"
                          >
                            <span className="text-xs text-gray-500">Drop file or click to upload</span>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addResourceDocumentSlot}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          <span style={{ color: '#E07A40' }}>+</span> Add
                        </button>
                      </div>
                    </div>
                      </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - visible on all tabs */}
              <div className="px-6 py-6 bg-gray-50 border-t" style={{ borderColor: '#888888' }}>
                {error && (
                  <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                {uploadProgress && (
                  <div className="p-4 mb-4 text-sm text-blue-600 bg-blue-50 rounded-lg border border-blue-200">
                    {uploadProgress}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading} className="px-8 py-3" style={{ backgroundColor: '#E07A40', color: 'white', fontWeight: 'bold' }}>
                    {isLoading ? "Saving..." : "Save Search"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
