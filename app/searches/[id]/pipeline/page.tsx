"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, MoreVertical } from "lucide-react"
import { SearchDetailsPanel } from "@/components/pipeline/search-details-panel"
import { ClientTeamPanel } from "@/components/pipeline/client-team-panel"
import { StagesPanel } from "@/components/pipeline/stages-panel"
import { ResourcesPanel } from "@/components/pipeline/resources-panel"
import { KanbanPipelineView } from "@/components/pipeline/kanban-pipeline-view"
import { AddStageDialog } from "@/components/searches/add-stage-dialog"
import { AddContactDialog } from "@/components/searches/add-contact-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle2 } from "lucide-react"

export default function PipelineWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const searchId = params.id as string

  // Data state
  const [search, setSearch] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Client notes state
  const [clientNotes, setClientNotes] = useState<string>("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // UI state
  const [openPanel, setOpenPanel] = useState<string | null>('checklist')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Setup dialog state
  const [isAddStageDialogOpen, setIsAddStageDialogOpen] = useState(false)
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false)
  const [isAddResourceDialogOpen, setIsAddResourceDialogOpen] = useState(false)

  useEffect(() => {
    loadPipelineData()
  }, [searchId])

  const loadPipelineData = async () => {
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
      setClientNotes(searchData?.notes || "")

      // Load contacts
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("search_id", searchId)
        .order("is_primary", { ascending: false })
      setContacts(contactsData || [])

      // Load stages
      const { data: stagesData } = await supabase
        .from("stages")
        .select("*")
        .eq("search_id", searchId)
        .order("order", { ascending: true })
      setStages(stagesData || [])

      // Load documents
      const { data: documentsData } = await supabase
        .from("documents")
        .select("*")
        .eq("search_id", searchId)
        .order("created_at", { ascending: false })
      setDocuments(documentsData || [])

      // Load candidates
      const { data: candidatesData } = await supabase
        .from("candidates")
        .select("*")
        .eq("search_id", searchId)
        .order("created_at", { ascending: false })
      setCandidates(candidatesData || [])
    } catch (err) {
      console.error("Error loading pipeline data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate setup completion
  const hasStages = stages.length > 0
  const hasContacts = contacts.length > 0
  const hasPlaybooks = documents.some(d => ['interview_guide', 'email_templates'].includes(d.type))
  const isSetupComplete = hasContacts && hasStages

  const togglePanel = (panelName: string) => {
    setOpenPanel(openPanel === panelName ? null : panelName)
  }

  const handleStageAdded = () => {
    loadPipelineData()
    setIsAddStageDialogOpen(false)
  }

  const handleContactAdded = () => {
    loadPipelineData()
    setIsAddContactDialogOpen(false)
  }

  const handleNotesChange = async (value: string) => {
    setClientNotes(value)
    setIsSavingNotes(true)

    try {
      const { error } = await supabase
        .from('searches')
        .update({ notes: value })
        .eq('id', searchId)

      if (error) throw error
    } catch (err) {
      console.error('Error saving notes:', err)
    } finally {
      setIsSavingNotes(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Loading pipeline workspace...</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Search not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-full">
          <div className="flex items-center justify-between">
            {/* Left - Title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/searches')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search List
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {search.position_title}
                </h1>
                <p className="text-lg text-gray-700 font-semibold">{search.company_name}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-900 font-medium">
                  {search.launch_date && (
                    <span>
                      Launch: {new Date(search.launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {search.target_fill_date && (
                    <span>
                      Target Close: {new Date(search.target_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/searches/${searchId}`)}
                className="text-gray-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </Button>

              {/* Three-dot menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-600"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        router.push(`/searches/${searchId}/portal`)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                    >
                      View Client Portal
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/searches/${searchId}/agreement`)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                    >
                      View Search Agreement
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/searches/${searchId}/playbook`)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium text-sm"
                    >
                      View Playbook
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!isSetupComplete ? (
        /* Centered Setup View */
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-lg border-2 border-gray-300 shadow-lg p-8">
              {/* Header */}
              <div className="text-center mb-8">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="text-4xl font-bold flex items-center" style={{ color: '#1F3C62' }}>
                    @talent
                    <svg
                      className="mx-1 w-8 h-8"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Horizontal chain link */}
                      <rect x="2" y="10" width="6" height="4" rx="2" stroke="#DC4405" strokeWidth="2" fill="none" />
                      <rect x="16" y="10" width="6" height="4" rx="2" stroke="#DC4405" strokeWidth="2" fill="none" />
                      <line x1="8" y1="12" x2="16" y2="12" stroke="#DC4405" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>connect</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: '#1F3C62' }}>
                  Let's Get Started!
                </h2>
              </div>

              {/* Setup Steps */}
              <div className="space-y-4">
                {/* Step 1: Add Client Team */}
                <div className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {hasContacts ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 fill-green-100" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      1. Add Client Team
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {hasContacts
                        ? `✓ ${contacts.length} contact(s) added`
                        : 'Add hiring managers and stakeholders who will be involved'}
                    </p>
                    <Button
                      onClick={() => setIsAddContactDialogOpen(true)}
                      size="sm"
                      className="text-white font-semibold"
                      style={{ backgroundColor: '#1F3C62' }}
                    >
                      {hasContacts ? '+ Add Another Contact' : '+ Add Contacts'}
                    </Button>
                  </div>
                </div>

                {/* Step 2: Add Interview Stages */}
                <div className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {hasStages ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 fill-green-100" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      2. Add Interview Stages
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {hasStages
                        ? `✓ ${stages.length} stage(s) added`
                        : 'Define your interview process (e.g., Phone Screen, Technical Interview, Final Round)'}
                    </p>
                    <Button
                      onClick={() => setIsAddStageDialogOpen(true)}
                      size="sm"
                      className="text-white font-semibold"
                      style={{ backgroundColor: '#1F3C62' }}
                    >
                      {hasStages ? '+ Add Another Stage' : '+ Add Stages'}
                    </Button>
                  </div>
                </div>

                {/* Step 3: Upload Documents (Optional) */}
                <div className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {hasPlaybooks ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 fill-green-100" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      3. Upload Documents
                      <span className="ml-2 text-sm font-normal text-gray-500">Optional</span>
                    </h3>
                    <p className="text-sm text-gray-600">
                      {hasPlaybooks
                        ? '✓ Documents uploaded'
                        : 'Job description, interview guides, playbooks, etc.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Notes Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="mb-2">
                  <label htmlFor="clientNotes" className="text-base font-bold text-gray-900">
                    Client Notes
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Context, background, client dynamics
                  </p>
                </div>
                <textarea
                  id="clientNotes"
                  value={clientNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add any context about the search, client dynamics, politics, or background info that doesn't fit elsewhere..."
                  className="w-full h-32 px-3 py-2 text-sm border-2 border-gray-300 rounded-md focus:border-gray-400 focus:outline-none resize-y"
                  style={{ minHeight: '120px' }}
                />
                {isSavingNotes && (
                  <p className="text-xs text-gray-500 mt-1">Saving...</p>
                )}
              </div>

              {/* Go to Pipeline Button */}
              {isSetupComplete && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Setup Complete!</span>
                  </div>
                  <Button
                    onClick={() => {
                      // Just refresh to show workspace
                      loadPipelineData()
                    }}
                    size="lg"
                    className="w-full text-white font-bold text-lg py-6"
                    style={{ backgroundColor: '#E07A40' }}
                  >
                    Go to Pipeline Workspace →
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Workspace Layout */
        <div className="flex gap-6 p-6 max-w-full">
        {/* Left Sidebar - 25% */}
        <div className="w-1/4 min-w-[320px] space-y-3">
          {/* Search Details Panel */}
          <div className="bg-white rounded-lg border-2 border-gray-300 shadow-sm">
            <button
              onClick={() => togglePanel('details')}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                <span className="font-bold text-gray-900">Search Details</span>
              </div>
              <span className="text-gray-500">{openPanel === 'details' ? '▼' : '▶'}</span>
            </button>
            {openPanel === 'details' && (
              <div className="border-t border-gray-200">
                <SearchDetailsPanel searchId={searchId} search={search} />
              </div>
            )}
          </div>

          {/* Client Team Panel */}
          <div className="bg-white rounded-lg border-2 border-gray-300 shadow-sm">
            <button
              onClick={() => togglePanel('team')}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <span className="font-bold text-gray-900">Client Team</span>
                {contacts.length > 0 && (
                  <span className="text-xs text-gray-500">({contacts.length})</span>
                )}
              </div>
              <span className="text-gray-500">{openPanel === 'team' ? '▼' : '▶'}</span>
            </button>
            {openPanel === 'team' && (
              <div className="border-t border-gray-200">
                <ClientTeamPanel
                  searchId={searchId}
                  contacts={contacts}
                  onUpdate={loadPipelineData}
                />
              </div>
            )}
          </div>

          {/* Stages Panel */}
          <div className="bg-white rounded-lg border-2 border-gray-300 shadow-sm">
            <button
              onClick={() => togglePanel('stages')}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <span className="font-bold text-gray-900">Stages</span>
                {stages.length > 0 && (
                  <span className="text-xs text-gray-500">({stages.length})</span>
                )}
              </div>
              <span className="text-gray-500">{openPanel === 'stages' ? '▼' : '▶'}</span>
            </button>
            {openPanel === 'stages' && (
              <div className="border-t border-gray-200">
                <StagesPanel
                  searchId={searchId}
                  stages={stages}
                  onUpdate={loadPipelineData}
                />
              </div>
            )}
          </div>

          {/* Resources Panel */}
          <div className="bg-white rounded-lg border-2 border-gray-300 shadow-sm">
            <button
              onClick={() => togglePanel('resources')}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📁</span>
                <span className="font-bold text-gray-900">Resources</span>
                {documents.length > 0 && (
                  <span className="text-xs text-gray-500">({documents.length})</span>
                )}
              </div>
              <span className="text-gray-500">{openPanel === 'resources' ? '▼' : '▶'}</span>
            </button>
            {openPanel === 'resources' && (
              <div className="border-t border-gray-200">
                <ResourcesPanel
                  searchId={searchId}
                  documents={documents}
                  search={search}
                  onUpdate={loadPipelineData}
                />
              </div>
            )}
          </div>

          {/* Client Notes Panel */}
          <div className="bg-white rounded-lg border-2 border-gray-300 shadow-sm">
            <button
              onClick={() => togglePanel('notes')}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <span className="font-bold text-gray-900">Client Notes</span>
              </div>
              <span className="text-gray-500">{openPanel === 'notes' ? '▼' : '▶'}</span>
            </button>
            {openPanel === 'notes' && (
              <div className="border-t border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-2">
                  Context, background, client dynamics
                </p>
                <textarea
                  value={clientNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add any context about the search, client dynamics, politics, or background info..."
                  className="w-full h-40 px-3 py-2 text-sm border-2 border-gray-300 rounded-md focus:border-gray-400 focus:outline-none resize-y"
                />
                {isSavingNotes && (
                  <p className="text-xs text-gray-500 mt-1">Saving...</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Kanban Area - 75% */}
        <div className="flex-1 bg-white rounded-lg border-2 border-gray-300 shadow-sm p-6">
          <KanbanPipelineView
            searchId={searchId}
            stages={stages}
            candidates={candidates}
            onOpenPanel={togglePanel}
          />
        </div>
      </div>
      )}

      {/* Setup Dialogs */}
      <AddStageDialog
        isOpen={isAddStageDialogOpen}
        onClose={() => setIsAddStageDialogOpen(false)}
        onSuccess={handleStageAdded}
        searchId={searchId}
        currentStagesCount={stages.length}
      />

      <AddContactDialog
        isOpen={isAddContactDialogOpen}
        onClose={() => setIsAddContactDialogOpen(false)}
        onSuccess={handleContactAdded}
        searchId={searchId}
        existingContact={null}
      />
    </div>
  )
}
