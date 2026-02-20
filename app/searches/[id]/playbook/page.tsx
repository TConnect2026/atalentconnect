"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Search, Stage, Document, Contact } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlaybookPage() {
  const params = useParams()
  const router = useRouter()
  const searchId = params.id as string

  const [search, setSearch] = useState<Search | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSearchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId])

  const loadSearchData = async () => {
    setIsLoading(true)
    try {
      // Load search details
      const { data: searchData, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("id", searchId)
        .single()

      if (searchError) throw searchError
      setSearch(searchData)

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .order("stage_order", { ascending: true })

      if (stagesError) throw stagesError
      setStages(stagesData || [])

      // Load documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("search_id", searchId)
        .order("created_at", { ascending: false })

      if (documentsError) throw documentsError
      setDocuments(documentsData || [])

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("search_id", searchId)
        .order("is_primary", { ascending: false })

      if (contactsError) throw contactsError
      setContacts(contactsData || [])
    } catch (err) {
      console.error("Error loading search:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      job_description: 'Job Description',
      interview_guide: 'Interview Guide',
      finalist_playbook: 'Finalist Playbook',
      intake_form: 'Intake Form',
      other: 'Other'
    }
    return labels[type] || type
  }

  const handleDocumentDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading project playbook...</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="sticky top-[89px] sm:top-[105px] bg-white z-20 mb-6 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/searches')}
            className="mb-3 sm:mb-4 -ml-2 touch-manipulation min-h-[44px] text-foreground hover:text-foreground/80"
          >
            ← Back to Projects
          </Button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">{search.position_title}</h1>
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            {search.client_logo_url && (
              <img
                src={search.client_logo_url}
                alt={`${search.company_name} logo`}
                className="h-10 w-auto object-contain"
              />
            )}
            <p className="text-lg sm:text-xl font-bold text-navy">{search.company_name}</p>
          </div>
        </div>

        {/* Project Playbook Section */}
        <Card style={{ border: '2px solid var(--navy)' }}>
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-xl">📋 Project Playbook</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Search Details */}
            <div>
              <h3 className="text-base font-bold mb-3 border-b pb-2 text-navy">Search Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Company Name</p>
                  <p className="text-sm text-navy">{search.company_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Position Title</p>
                  <p className="text-sm text-navy">{search.position_title}</p>
                </div>
                {search.position_location && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-1">Location</p>
                    <p className="text-sm text-navy">{search.position_location}</p>
                  </div>
                )}
                {search.reports_to && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-1">Reports To</p>
                    <p className="text-sm text-navy">{search.reports_to}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Open to Relocation</p>
                  <p className="text-sm text-navy">{search.open_to_relocation ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-muted mb-1">Relocation Package Available</p>
                  <p className="text-sm text-navy">{search.relocation_package_available ? 'Yes' : 'No'}</p>
                </div>
                {search.compensation_range && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-text-muted mb-1">Compensation Range</p>
                    <p className="text-sm whitespace-pre-wrap text-navy">{search.compensation_range}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Contacts */}
            {contacts.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3 border-b pb-2 text-navy">Client Contacts</h3>
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="p-3 bg-bg-section rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {contact.name}
                            {contact.is_primary && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-navy/10 text-navy rounded">
                                Primary
                              </span>
                            )}
                          </p>
                          {contact.title && (
                            <p className="text-xs text-text-secondary mt-0.5">{contact.title}</p>
                          )}
                          <p className="text-xs text-text-secondary mt-1">{contact.email}</p>
                          {contact.phone && (
                            <p className="text-xs text-text-secondary">{contact.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-text-muted">
                            {contact.access_level === 'full_access' && 'Full Access'}
                            {contact.access_level === 'limited_access' && 'Limited Access'}
                            {contact.access_level === 'no_portal_access' && 'No Portal Access'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pipeline Stages */}
            <div>
              <h3 className="text-base font-bold mb-3 border-b pb-2 text-navy">Pipeline Stages</h3>
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center justify-between p-3 bg-bg-section rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-text-muted">Stage {index + 1}</span>
                      <span className="text-sm font-medium text-navy">{stage.name}</span>
                    </div>
                    {stage.interview_guide_url && (
                      <a
                        href={stage.interview_guide_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-navy hover:text-navy underline"
                      >
                        Interview Guide
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            {documents.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3 border-b pb-2 text-navy">Documents</h3>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-bg-section rounded-lg hover:bg-bg-section transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-navy">{doc.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{getDocumentTypeLabel(doc.type)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocumentDownload(doc.file_url, doc.name)}
                        className="text-xs"
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
