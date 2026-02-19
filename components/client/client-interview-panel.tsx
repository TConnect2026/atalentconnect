"use client"

import { useState, useEffect } from "react"
import { Interview } from "@/types"
import { supabase } from "@/lib/supabase"

interface InterviewFeedback {
  id: string
  interview_id: string
  interviewer_name: string
  interview_notes: string | null
  strengths: string | null
  concerns: string | null
  recommendation: 'advance' | 'hold' | 'decline'
  video_debrief_link: string | null
  feedback_file_url: string | null
  submitted_at: string
}

interface ClientInterviewPanelProps {
  interview: Interview | null
  isOpen: boolean
  onClose: () => void
  accessLevel: 'full_access' | 'limited_access'
  clientEmail: string
  clientName: string
}

export function ClientInterviewPanel({
  interview,
  isOpen,
  onClose,
  accessLevel,
  clientEmail,
  clientName
}: ClientInterviewPanelProps) {
  const [feedback, setFeedback] = useState<InterviewFeedback[]>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Form state
  const [interviewNotes, setInterviewNotes] = useState('')
  const [strengths, setStrengths] = useState('')
  const [concerns, setConcerns] = useState('')
  const [recommendation, setRecommendation] = useState<'advance' | 'hold' | 'concern'>('advance')
  const [videoDebriefLink, setVideoDebriefLink] = useState('')
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Check if current user is an interviewer
  const isInterviewer = interview?.interviewers?.some(i => i.contact_email === clientEmail)
  const canSubmitFeedback = accessLevel === 'full_access' || isInterviewer

  useEffect(() => {
    if (isOpen && interview) {
      loadFeedback()
    }
  }, [isOpen, interview])

  const loadFeedback = async () => {
    if (!interview) return

    setIsLoadingFeedback(true)
    try {
      const { data, error } = await supabase
        .from('interview_feedback')
        .select('*')
        .eq('interview_id', interview.id)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      // Filter based on access level
      const filteredFeedback = (data || []).filter(fb => {
        // Full access sees all feedback
        if (accessLevel === 'full_access') return true
        // Limited access only sees their own feedback (match by interviewer who gave feedback)
        // We'd need to match clientEmail to the interviewer somehow
        // For now, show all if they're on the interview panel
        return interview.interviewers?.some(i => i.contact_email === clientEmail)
      })

      setFeedback(filteredFeedback)
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!interview) return

    setIsSubmittingFeedback(true)
    try {
      let feedbackFileUrl = null

      // Upload file if provided
      if (feedbackFile) {
        setUploadingFile(true)
        const fileExt = feedbackFile.name.split('.').pop()
        const fileName = `${interview.id}_${Date.now()}.${fileExt}`
        const filePath = `interview-feedback/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, feedbackFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        feedbackFileUrl = urlData.publicUrl
        setUploadingFile(false)
      }

      const { error } = await supabase
        .from('interview_feedback')
        .insert({
          interview_id: interview.id,
          interviewer_name: clientName,
          interview_notes: interviewNotes || null,
          strengths: strengths || null,
          concerns: concerns || null,
          recommendation: recommendation,
          video_debrief_link: videoDebriefLink || null,
          feedback_file_url: feedbackFileUrl,
          submitted_at: new Date().toISOString()
        })

      if (error) throw error

      // Reset form
      setInterviewNotes('')
      setStrengths('')
      setConcerns('')
      setRecommendation('advance')
      setVideoDebriefLink('')
      setFeedbackFile(null)

      // Reload feedback
      loadFeedback()

      alert('Feedback submitted successfully!')
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmittingFeedback(false)
      setUploadingFile(false)
    }
  }

  if (!isOpen || !interview) return null

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getInterviewerNames = () => {
    if (interview.interviewers && interview.interviewers.length > 0) {
      return interview.interviewers.map(i => i.contact_name).join(', ')
    }
    return interview.interviewer_name
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'advance':
        return 'bg-green-100 text-green-700'
      case 'hold':
        return 'bg-yellow-100 text-yellow-700'
      case 'decline':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-bg-section text-text-primary'
    }
  }

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case 'advance':
        return '✓ Advance'
      case 'hold':
        return '⏸ Hold'
      case 'decline':
        return '✗ Decline'
      default:
        return rec
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
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-navy">
                Interview Details
              </h2>
              <p className="text-text-secondary mt-1">
                {formatDateTime(interview.scheduled_at)}
              </p>
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

          {/* Interview Info */}
          <div className="mb-6 p-4 bg-navy/5 rounded-lg border border-navy/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-navy font-medium uppercase">Interviewer(s)</p>
                <p className="text-sm text-navy font-semibold mt-1">{getInterviewerNames()}</p>
              </div>
              <div>
                <p className="text-xs text-navy font-medium uppercase">Type</p>
                <p className="text-sm text-navy font-semibold mt-1 capitalize">
                  {interview.interview_type.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy font-medium uppercase">Duration</p>
                <p className="text-sm text-navy font-semibold mt-1">{interview.duration_minutes} minutes</p>
              </div>
              <div>
                <p className="text-xs text-navy font-medium uppercase">Status</p>
                <p className="text-sm text-navy font-semibold mt-1 capitalize">{interview.status}</p>
              </div>
            </div>

            {interview.prep_notes && (
              <div className="mt-4 pt-4 border-t border-navy/20">
                <p className="text-xs text-navy font-medium uppercase mb-2">Prep Notes</p>
                <p className="text-sm text-navy whitespace-pre-wrap">{interview.prep_notes}</p>
              </div>
            )}

            {interview.interview_guide_url && (
              <div className="mt-4">
                <a
                  href={interview.interview_guide_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-navy hover:text-navy font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Interview Guide
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Submit Feedback Form */}
          {canSubmitFeedback && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-navy mb-4">Submit Your Feedback</h3>

              <div className="space-y-4 p-4 bg-white rounded-lg border border-ds-border">
                {/* Interview Notes */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Interview Notes
                  </label>
                  <textarea
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    placeholder="Add your notes from the interview..."
                    rows={4}
                    className="w-full px-3 py-2 border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>

                {/* Strengths */}
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-2">
                    Strengths
                  </label>
                  <textarea
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="What were the candidate's strengths?"
                    rows={3}
                    className="w-full px-3 py-2 border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Concerns */}
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-2">
                    Concerns
                  </label>
                  <textarea
                    value={concerns}
                    onChange={(e) => setConcerns(e.target.value)}
                    placeholder="What concerns do you have, if any?"
                    rows={3}
                    className="w-full px-3 py-2 border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Upload Feedback Document (Optional)
                  </label>
                  <p className="text-xs text-text-muted mb-2">
                    Upload a document with your detailed feedback instead of or in addition to typing notes
                  </p>
                  <input
                    type="file"
                    onChange={(e) => setFeedbackFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt"
                    className="w-full px-3 py-2 border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-navy bg-white"
                  />
                  {feedbackFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ File selected: {feedbackFile.name}
                    </p>
                  )}
                </div>

                {/* Video Debrief Link */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Video Debrief Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={videoDebriefLink}
                    onChange={(e) => setVideoDebriefLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-ds-border rounded-md focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>

                {/* Recommendation */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Recommendation
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setRecommendation('advance')}
                      className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-colors ${
                        recommendation === 'advance'
                          ? 'bg-green-600 text-white border-2 border-green-700'
                          : 'bg-white text-green-700 border-2 border-green-600 hover:bg-green-50'
                      }`}
                    >
                      ✓ Advance
                    </button>
                    <button
                      onClick={() => setRecommendation('hold')}
                      className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-colors ${
                        recommendation === 'hold'
                          ? 'bg-yellow-600 text-white border-2 border-yellow-700'
                          : 'bg-white text-yellow-700 border-2 border-yellow-600 hover:bg-yellow-50'
                      }`}
                    >
                      ⏸ Hold
                    </button>
                    <button
                      onClick={() => setRecommendation('concern')}
                      className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold transition-colors ${
                        recommendation === 'concern'
                          ? 'bg-red-600 text-white border-2 border-red-700'
                          : 'bg-white text-red-700 border-2 border-red-600 hover:bg-red-50'
                      }`}
                    >
                      ⚠ Concern
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  className="w-full bg-orange hover:bg-orange-hover text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          )}

          {/* Previous Feedback Section */}
          <div>
            <h3 className="text-lg font-semibold text-navy mb-4">
              {accessLevel === 'full_access' ? 'All Interview Feedback' : 'Interview Feedback'}
            </h3>

            {isLoadingFeedback ? (
              <p className="text-sm text-text-muted">Loading feedback...</p>
            ) : feedback.length === 0 ? (
              <div className="p-4 bg-white rounded-lg border border-ds-border">
                <p className="text-sm text-text-secondary">No feedback submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedback.map((fb) => (
                  <div key={fb.id} className="p-4 bg-white rounded-lg border border-ds-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-text-primary">{fb.interviewer_name}</p>
                        <p className="text-xs text-text-muted">
                          {new Date(fb.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRecommendationColor(fb.recommendation)}`}>
                        {getRecommendationLabel(fb.recommendation)}
                      </span>
                    </div>

                    {fb.interview_notes && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-text-primary uppercase mb-1">Notes</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{fb.interview_notes}</p>
                      </div>
                    )}

                    {fb.strengths && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-green-700 uppercase mb-1">Strengths</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{fb.strengths}</p>
                      </div>
                    )}

                    {fb.concerns && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-red-700 uppercase mb-1">Concerns</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{fb.concerns}</p>
                      </div>
                    )}

                    {fb.feedback_file_url && (
                      <a
                        href={fb.feedback_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-navy hover:text-navy mt-2 mr-4"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Feedback Document
                      </a>
                    )}

                    {fb.video_debrief_link && (
                      <a
                        href={fb.video_debrief_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-navy hover:text-navy mt-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Watch Video Debrief
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
