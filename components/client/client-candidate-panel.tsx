"use client"

import { useState, useEffect } from "react"
import { Candidate } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ClientFeedback {
  id: string
  reviewer_name: string
  reviewer_email: string
  recommendation: 'advance' | 'hold' | 'concern'
  notes: string | null
  feedback_file_url: string | null
  created_at: string
}

interface ClientCandidatePanelProps {
  candidate: Candidate | null
  isOpen: boolean
  onClose: () => void
  accessLevel: 'full_access' | 'limited_access'
  clientEmail: string
  clientName: string
  searchId: string
}

export function ClientCandidatePanel({
  candidate,
  isOpen,
  onClose,
  accessLevel,
  clientEmail,
  clientName,
  searchId
}: ClientCandidatePanelProps) {
  const [feedbackNotes, setFeedbackNotes] = useState("")
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recommendation, setRecommendation] = useState<'advance' | 'hold' | 'concern' | null>(null)
  const [previousFeedback, setPreviousFeedback] = useState<ClientFeedback[]>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)

  useEffect(() => {
    if (isOpen && candidate) {
      loadPreviousFeedback()
    }
  }, [isOpen, candidate])

  const loadPreviousFeedback = async () => {
    if (!candidate) return

    setIsLoadingFeedback(true)
    try {
      const { data, error } = await supabase
        .from('client_feedback')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter based on access level
      const filteredFeedback = (data || []).filter(feedback => {
        // Full access sees all feedback
        if (accessLevel === 'full_access') return true
        // Limited access only sees their own feedback
        return feedback.reviewer_email === clientEmail
      })

      setPreviousFeedback(filteredFeedback)
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  if (!isOpen || !candidate) return null

  const handleSubmitFeedback = async (selectedRecommendation: 'advance' | 'hold' | 'concern') => {
    setIsSubmitting(true)
    setRecommendation(selectedRecommendation)

    try {
      let fileUrl: string | null = null

      // Upload file if provided
      if (feedbackFile) {
        const fileExt = feedbackFile.name.split('.').pop()
        const fileName = `${Date.now()}-${candidate.first_name}-${candidate.last_name}-feedback.${fileExt}`
        const filePath = `client-feedback/${searchId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('candidateresumes')
          .upload(filePath, feedbackFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('candidateresumes')
          .getPublicUrl(filePath)

        fileUrl = urlData.publicUrl
      }

      // Save feedback to database
      const { error } = await supabase
        .from('client_feedback')
        .insert({
          candidate_id: candidate.id,
          search_id: searchId,
          reviewer_email: clientEmail,
          reviewer_name: clientName,
          recommendation: selectedRecommendation,
          notes: feedbackNotes || null,
          feedback_file_url: fileUrl
        })

      if (error) throw error

      alert('Feedback submitted successfully!')
      setFeedbackNotes("")
      setFeedbackFile(null)
      setRecommendation(null)
      loadPreviousFeedback() // Reload to show new feedback
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-navy">
                {candidate.first_name} {candidate.last_name}
              </h2>
              {candidate.current_title && (
                <p className="text-text-secondary mt-1">
                  {candidate.current_title}
                  {candidate.current_company && ` at ${candidate.current_company}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-secondary p-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Resume & LinkedIn */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-navy mb-3">Documents</h3>
            <div className="space-y-2">
              {candidate.resume_url && (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-bg-section transition-colors border border-ds-border"
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium text-navy">View Resume</span>
                  <svg className="w-4 h-4 text-text-muted ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-bg-section transition-colors border border-ds-border"
                >
                  <svg className="w-5 h-5 text-navy" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="text-sm font-medium text-navy">LinkedIn Profile</span>
                  <svg className="w-4 h-4 text-text-muted ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Compensation - Full Access Only */}
          {accessLevel === 'full_access' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-navy mb-3">Compensation</h3>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-900">Current: {candidate.current_compensation || 'Not provided'}</p>
                    <p className="text-sm font-medium text-amber-900 mt-1">Target: {candidate.compensation_expectations || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Previous Feedback - Full Access sees all, Limited Access sees only their own */}
          {previousFeedback.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-navy mb-3">
                {accessLevel === 'full_access' ? 'Team Feedback' : 'Your Previous Feedback'}
              </h3>
              <div className="space-y-3">
                {isLoadingFeedback ? (
                  <p className="text-sm text-text-muted">Loading feedback...</p>
                ) : (
                  previousFeedback.map((feedback) => (
                    <div key={feedback.id} className="p-4 bg-bg-section rounded-lg border border-ds-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-text-primary">{feedback.reviewer_name}</p>
                          <p className="text-xs text-text-muted">
                            {new Date(feedback.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          feedback.recommendation === 'advance'
                            ? 'bg-green-100 text-green-700'
                            : feedback.recommendation === 'hold'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {feedback.recommendation === 'advance' && '✓ Advance'}
                          {feedback.recommendation === 'hold' && '⏸ Hold'}
                          {feedback.recommendation === 'concern' && '⚠ Concern'}
                        </span>
                      </div>
                      {feedback.notes && (
                        <p className="text-sm text-text-primary mt-2">{feedback.notes}</p>
                      )}
                      {feedback.feedback_file_url && (
                        <a
                          href={feedback.feedback_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-navy hover:text-navy mt-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View attached file
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-navy mb-4">Your Feedback</h3>

            <div className="space-y-4">
              {/* Text Notes */}
              <div>
                <Label htmlFor="feedback-notes">Notes</Label>
                <Textarea
                  id="feedback-notes"
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Share your thoughts about this candidate..."
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              {/* File Upload */}
              <div>
                <Label htmlFor="feedback-file">Upload Detailed Feedback (Optional)</Label>
                <Input
                  id="feedback-file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                      if (!validTypes.includes(file.type)) {
                        alert('Please upload a PDF, DOC, or DOCX file')
                        e.target.value = ''
                        return
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        alert('File size must be less than 10MB')
                        e.target.value = ''
                        return
                      }
                      setFeedbackFile(file)
                    }
                  }}
                  className="mt-1.5"
                />
                {feedbackFile && (
                  <p className="text-sm text-green-600 mt-1.5">
                    Selected: {feedbackFile.name}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-1.5">
                  PDF, DOC, or DOCX (Max 10MB)
                </p>
              </div>

              {/* Recommendation Buttons */}
              <div>
                <Label className="mb-2 block">Your Recommendation</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleSubmitFeedback('advance')}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSubmitting && recommendation === 'advance' ? 'Submitting...' : '✓ Advance'}
                  </Button>
                  <Button
                    onClick={() => handleSubmitFeedback('hold')}
                    disabled={isSubmitting}
                    variant="outline"
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                  >
                    {isSubmitting && recommendation === 'hold' ? 'Submitting...' : '⏸ Hold'}
                  </Button>
                  <Button
                    onClick={() => handleSubmitFeedback('concern')}
                    disabled={isSubmitting}
                    variant="outline"
                    className="border-red-600 text-red-700 hover:bg-red-50"
                  >
                    {isSubmitting && recommendation === 'concern' ? 'Submitting...' : '⚠ Concern'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
