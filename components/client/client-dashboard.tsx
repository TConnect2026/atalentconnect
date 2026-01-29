"use client"

import { useState } from "react"
import { Search, Stage, Candidate, Interview, Document } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientCandidatePanel } from "@/components/client/client-candidate-panel"

interface ClientDashboardProps {
  search: Search
  stages: Stage[]
  candidates: Candidate[]
  interviews: Interview[]
  documents?: Document[]
  accessLevel: 'full_access' | 'limited_access'
  clientEmail: string
  clientName: string
}

export function ClientDashboard({
  search,
  stages,
  candidates,
  interviews,
  documents = [],
  accessLevel,
  clientEmail,
  clientName
}: ClientDashboardProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [showCandidatePanel, setShowCandidatePanel] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [showInterviewPanel, setShowInterviewPanel] = useState(false)
  const [openGuideDropdown, setOpenGuideDropdown] = useState<string | null>(null)

  // Filter to only active candidates
  const activeCandidates = candidates.filter(c =>
    !c.status || c.status === 'active'
  )

  // Interview stages are already filtered by visible_in_client_portal
  const interviewStages = stages

  // Get interviews for specific candidate at specific stage
  const getInterviewsForCandidateAtStage = (candidateId: string, stageId: string) => {
    return interviews
      .filter(i => i.candidate_id === candidateId)
      .filter(i => i.status === 'completed' || i.status === 'scheduled' || i.status === 'feedback_received')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }

  const formatInterviewDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatInterviewTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getInterviewerNames = (interview: Interview) => {
    if (interview.interviewers && interview.interviewers.length > 0) {
      return interview.interviewers.map(i => i.contact_name).join(', ')
    }
    return interview.interviewer_name
  }

  // Get interview guides for a stage
  const getInterviewGuidesForStage = (stage: Stage) => {
    // Interview guides can be:
    // 1. Stage-specific guide URL (stage.interview_guide_url)
    // 2. Documents marked as interview_guide type
    const guides: Array<{name: string, url: string}> = []

    if (stage.interview_guide_url) {
      guides.push({
        name: `${stage.name} Guide`,
        url: stage.interview_guide_url
      })
    }

    // Add any interview guide documents
    const guideDocuments = documents.filter(doc => doc.type === 'interview_guide')
    guideDocuments.forEach(doc => {
      guides.push({
        name: doc.name,
        url: doc.file_url
      })
    })

    return guides
  }

  // Get client-visible documents
  const positionSpec = documents.find(doc => doc.type === 'job_description')
  const otherDocs = documents.filter(doc =>
    doc.type !== 'job_description' &&
    doc.type !== 'interview_guide' &&
    doc.type !== 'intake_form'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-7xl">
        {/* Header Info */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {search.position_title} — {search.company_name}
          </h1>
          {search.position_location && (
            <p className="text-base text-gray-600">{search.position_location}</p>
          )}
        </div>

        {/* Candidate Pipeline Matrix */}
        <Card className="border-2 border-gray-200 shadow-md mb-6">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-xl font-bold text-gray-900">Candidate Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeCandidates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No active candidates yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 font-bold text-gray-900 bg-gray-50 sticky left-0 z-20 min-w-[200px]">
                        Candidate
                      </th>
                      {interviewStages.map((stage) => {
                        const guides = getInterviewGuidesForStage(stage)
                        return (
                          <th
                            key={stage.id}
                            className="text-left py-4 px-4 font-bold text-gray-900 bg-gray-50 min-w-[180px] relative"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{stage.name}</span>
                              {guides.length > 0 && (
                                <div className="relative">
                                  <button
                                    onClick={() => setOpenGuideDropdown(openGuideDropdown === stage.id ? null : stage.id)}
                                    className="text-gray-600 hover:text-blue-600 transition-colors p-1"
                                    title="View interview guides"
                                  >
                                    📋
                                  </button>
                                  {openGuideDropdown === stage.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setOpenGuideDropdown(null)}
                                      />
                                      <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-40">
                                        {guides.map((guide, idx) => (
                                          <a
                                            key={idx}
                                            href={guide.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            onClick={() => setOpenGuideDropdown(null)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              <span className="truncate">{guide.name}</span>
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {activeCandidates.map((candidate, candidateIdx) => (
                      <tr
                        key={candidate.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${candidateIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="py-4 px-4 font-medium sticky left-0 bg-inherit z-10 border-r border-gray-200">
                          <button
                            onClick={() => {
                              setSelectedCandidate(candidate)
                              setShowCandidatePanel(true)
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-left font-semibold"
                          >
                            {candidate.first_name} {candidate.last_name}
                          </button>
                          <div className="text-xs text-gray-500 mt-1">
                            {candidate.current_title}
                            {candidate.current_company && ` at ${candidate.current_company}`}
                          </div>
                        </td>
                        {interviewStages.map((stage) => {
                          const stageInterviews = getInterviewsForCandidateAtStage(candidate.id, stage.id)
                          return (
                            <td
                              key={stage.id}
                              className="py-4 px-4 align-top"
                            >
                              {stageInterviews.length > 0 ? (
                                <div className="space-y-2">
                                  {stageInterviews.map((interview) => (
                                    <button
                                      key={interview.id}
                                      onClick={() => {
                                        setSelectedInterview(interview)
                                        setShowInterviewPanel(true)
                                      }}
                                      className="text-sm text-left w-full p-2 rounded hover:bg-blue-50 transition-colors border border-gray-200 hover:border-blue-300"
                                    >
                                      <div className="font-semibold text-gray-900">
                                        {formatInterviewDate(interview.scheduled_at)}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-0.5">
                                        {formatInterviewTime(interview.scheduled_at)}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {getInterviewerNames(interview)}
                                      </div>
                                      {interview.status === 'scheduled' && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                          Scheduled
                                        </span>
                                      )}
                                      {(interview.status === 'completed' || interview.status === 'feedback_received') && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                          Completed
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-400 text-sm">—</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Documents */}
          <Card className="border-2 border-gray-200 shadow-md">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-900">Documents</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {positionSpec && (
                  <a
                    href={positionSpec.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Position Spec</div>
                        <div className="text-xs text-gray-600 mt-0.5">{positionSpec.name}</div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {otherDocs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{doc.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5 capitalize">{doc.type.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}

                {!positionSpec && otherDocs.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No documents available yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Talent Insights */}
          <Card className="border-2 border-gray-200 shadow-md">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-900">Talent Insights</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[200px]">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {search.notes || 'No market updates or recruiter notes available yet.'}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Market insights and updates from your recruiter will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Candidate Detail Panel */}
      <ClientCandidatePanel
        candidate={selectedCandidate}
        isOpen={showCandidatePanel}
        onClose={() => {
          setShowCandidatePanel(false)
          setSelectedCandidate(null)
        }}
        accessLevel={accessLevel}
        clientEmail={clientEmail}
        clientName={clientName}
        searchId={search.id}
      />

      {/* Interview Detail Mini-Panel */}
      {showInterviewPanel && selectedInterview && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => {
              setShowInterviewPanel(false)
              setSelectedInterview(null)
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
            <Card className="border-2 border-gray-300 shadow-xl">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">Interview Details</CardTitle>
                  <button
                    onClick={() => {
                      setShowInterviewPanel(false)
                      setSelectedInterview(null)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Date & Time</p>
                    <p className="text-sm text-gray-900">
                      {formatInterviewDate(selectedInterview.scheduled_at)} at {formatInterviewTime(selectedInterview.scheduled_at)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{selectedInterview.timezone}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Interviewer</p>
                    <p className="text-sm text-gray-900">{getInterviewerNames(selectedInterview)}</p>
                  </div>

                  {selectedInterview.interview_guide_url && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Interview Guide</p>
                      <a
                        href={selectedInterview.interview_guide_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        View Guide
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}

                  {selectedInterview.prep_notes && search.share_interview_notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Prep Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                        {selectedInterview.prep_notes}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Status</p>
                    {selectedInterview.status === 'scheduled' && (
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        Scheduled
                      </span>
                    )}
                    {(selectedInterview.status === 'completed' || selectedInterview.status === 'feedback_received') && (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
