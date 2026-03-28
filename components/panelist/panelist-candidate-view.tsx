"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { InterviewPrepPanel } from "@/components/panelist/interview-prep-panel"
import type { PanelistFeedback } from "@/types"

interface CandidateInfo {
  id: string
  first_name: string
  last_name: string
  current_title?: string
  current_company?: string
  resume_url?: string
  linkedin_url?: string
  email?: string
  phone?: string
  photo_url?: string
  interview_date?: string
  stage_name?: string
  interview_id?: string
}

interface PanelistCandidateViewProps {
  candidate: CandidateInfo
  searchId: string
  panelistId: string
  panelistName: string
  panelistEmail: string
  positionTitle?: string
  companyName?: string
}

export function PanelistCandidateView({
  candidate,
  searchId,
  panelistId,
  panelistName,
  panelistEmail,
  positionTitle = '',
  companyName = '',
}: PanelistCandidateViewProps) {
  const [interviewGuideUrl, setInterviewGuideUrl] = useState<string | null>(null)
  const [interviewHistory, setInterviewHistory] = useState<{ completed: string[], scheduled: string[] } | null>(null)
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | 'maybe' | null>(null)
  const [recommendation, setRecommendation] = useState<'advance' | 'do_not_advance' | 'need_more_info' | null>(null)
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previousFeedback, setPreviousFeedback] = useState<PanelistFeedback[]>([])
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [showResume, setShowResume] = useState(false)

  useEffect(() => {
    loadInterviewGuide()
    loadPreviousFeedback()
    loadInterviewHistory()
  }, [candidate.id])

  const loadInterviewGuide = async () => {
    if (!candidate.stage_name) return
    try {
      const { data: stages } = await supabase
        .from('stages')
        .select('interview_guide_url')
        .eq('search_id', searchId)
        .eq('name', candidate.stage_name)
        .single()
      if (stages?.interview_guide_url) {
        setInterviewGuideUrl(stages.interview_guide_url)
      }
    } catch {}
  }

  const loadPreviousFeedback = async () => {
    try {
      const { data } = await supabase
        .from('panelist_feedback')
        .select('*')
        .eq('candidate_id', candidate.id)
        .eq('panelist_id', panelistId)
        .order('submitted_at', { ascending: false })

      if (data && data.length > 0) {
        setPreviousFeedback(data as PanelistFeedback[])
      }
    } catch {}
  }

  const loadInterviewHistory = async () => {
    try {
      const { data: allInterviews } = await supabase
        .from('interviews')
        .select('id, interviewer_name, status, scheduled_at')
        .eq('candidate_id', candidate.id)
        .eq('search_id', searchId)
        .order('scheduled_at', { ascending: true })

      const completed = [...new Set(
        (allInterviews || [])
          .filter((iv: any) => iv.status === 'completed' && iv.interviewer_name)
          .map((iv: any) => iv.interviewer_name as string)
      )]
      const scheduled = [...new Set(
        (allInterviews || [])
          .filter((iv: any) => iv.status !== 'completed' && iv.status !== 'cancelled' && iv.interviewer_name)
          .map((iv: any) => iv.interviewer_name as string)
      )]

      // Always include the current panelist in scheduled if not already present
      if (panelistName && !completed.includes(panelistName) && !scheduled.includes(panelistName)) {
        scheduled.push(panelistName)
      }

      if (completed.length === 0 && scheduled.length === 0) {
        setInterviewHistory(null)
        return
      }

      setInterviewHistory({ completed, scheduled })
    } catch {}
  }


  const handleSubmitFeedback = async () => {
    if (!rating || !recommendation) {
      alert('Please select a rating and recommendation')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('panelist_feedback')
        .insert({
          interview_id: candidate.interview_id || null,
          candidate_id: candidate.id,
          search_id: searchId,
          panelist_id: panelistId,
          panelist_name: panelistName,
          panelist_email: panelistEmail,
          rating,
          recommendation,
          comments: comments.trim() || null,
          submitted_at: new Date().toISOString(),
        })

      if (error) throw error

      setFeedbackSubmitted(true)
      setRating(null)
      setRecommendation(null)
      setComments('')
      loadPreviousFeedback()
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Candidate Info Card */}
      <div className="bg-bg-section rounded-xl sticky top-[65px] z-20" style={{ padding: '16px' }}>
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Left side — candidate info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={`${candidate.first_name} ${candidate.last_name}`}
                className="w-16 h-16 rounded-full object-cover border-2 border-navy"
              />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold bg-navy flex-shrink-0">
                {(candidate.first_name?.[0] || '').toUpperCase()}
                {(candidate.last_name?.[0] || '').toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold" style={{ color: '#1F3C62' }}>
                  {candidate.first_name} {candidate.last_name}
                </h2>
                {candidate.resume_url && (
                  <button
                    onClick={() => setShowResume(prev => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', backgroundColor: showResume ? '#D97757' : '#1F3C62', padding: '6px 16px' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {showResume ? 'Hide Resume' : 'Resume'}
                  </button>
                )}
                {candidate.linkedin_url && (
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', backgroundColor: '#1F3C62', padding: '6px 16px' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                )}
                {interviewGuideUrl && (
                  <a
                    href={interviewGuideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', backgroundColor: '#1F3C62', padding: '6px 16px' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Guide
                  </a>
                )}
              </div>
              {(candidate.current_title || candidate.current_company) && (
                <p className="mt-1" style={{ color: '#1F3C62' }}>
                  {candidate.current_title}
                  {candidate.current_title && candidate.current_company && ' at '}
                  {candidate.current_company && <span className="font-medium">{candidate.current_company}</span>}
                </p>
              )}
              {candidate.stage_name && (
                <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded bg-navy/10 font-medium" style={{ color: '#1F3C62' }}>
                  {candidate.stage_name}
                </span>
              )}
              {candidate.interview_date && (
                <p className="text-sm mt-1" style={{ color: '#1F3C62' }}>
                  Interview: {new Date(candidate.interview_date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Right side — interview history */}
          {interviewHistory && (
            <div className="flex-shrink-0">
              <div className="rounded-md" style={{ backgroundColor: '#1F3C62', padding: '12px 14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {candidate.first_name}&apos;s Interviews
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {interviewHistory.completed.map((name, i) => (
                    <p key={`c-${i}`} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                      <span style={{ marginRight: '6px' }}>✓</span>{name}
                    </p>
                  ))}
                  {interviewHistory.scheduled.map((name, i) => (
                    <p key={`s-${i}`} style={{ fontSize: '13px', color: '#FFFFFF', margin: 0 }}>
                      <span style={{ marginRight: '6px' }}>●</span>{name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Split layout: left content + right resume panel */}
      <div className="flex gap-0" style={{ height: 'calc(100vh - 65px - 90px)' }}>
        {/* Left panel — prep + feedback */}
        <div className={`min-w-0 overflow-y-auto ${showResume ? 'w-[55%]' : 'w-full'}`} style={{ padding: '24px 0' }}>
          <div className="space-y-6">
          {/* Interview Prep Panel */}
          <InterviewPrepPanel
            candidateId={candidate.id}
            candidateName={`${candidate.first_name} ${candidate.last_name}`}
            currentTitle={candidate.current_title}
            currentCompany={candidate.current_company}
            searchId={searchId}
            positionTitle={positionTitle}
            companyName={companyName}
            stageName={candidate.stage_name}
          />

          {/* Feedback Form */}
          <div className="bg-white rounded-xl border border-ds-border p-6">
            <h3 className="text-lg font-bold text-navy mb-4">Your Feedback</h3>

            {feedbackSubmitted && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-700">Feedback submitted successfully!</p>
              </div>
            )}

            {/* Rating */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-text-primary block mb-2">Rating</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRating('thumbs_up')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    rating === 'thumbs_up'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-ds-border bg-white text-text-primary hover:bg-bg-section'
                  }`}
                >
                  <span className="text-lg">👍</span> Thumbs Up
                </button>
                <button
                  type="button"
                  onClick={() => setRating('maybe')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    rating === 'maybe'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-ds-border bg-white text-text-primary hover:bg-bg-section'
                  }`}
                >
                  <span className="text-lg">🤔</span> Maybe
                </button>
                <button
                  type="button"
                  onClick={() => setRating('thumbs_down')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    rating === 'thumbs_down'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-ds-border bg-white text-text-primary hover:bg-bg-section'
                  }`}
                >
                  <span className="text-lg">👎</span> Thumbs Down
                </button>
              </div>
            </div>

            {/* Recommendation */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-text-primary block mb-2">Recommendation</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRecommendation('advance')}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    recommendation === 'advance'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-ds-border bg-white text-text-primary hover:bg-bg-section'
                  }`}
                >
                  Advance
                </button>
                <button
                  type="button"
                  onClick={() => setRecommendation('need_more_info')}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    recommendation === 'need_more_info'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-ds-border bg-white text-text-primary hover:bg-bg-section'
                  }`}
                >
                  Need More Info
                </button>
                <button
                  type="button"
                  onClick={() => setRecommendation('do_not_advance')}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    recommendation === 'do_not_advance'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-ds-border bg-white text-text-primary hover:bg-bg-section'
                  }`}
                >
                  Do Not Advance
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-text-primary block mb-2">Comments</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share your thoughts about this candidate..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-white text-text-primary focus:border-navy focus:outline-none resize-y"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitFeedback}
              disabled={isSubmitting || !rating || !recommendation}
              className="w-full py-2.5 bg-navy text-white rounded-lg font-semibold text-sm hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>

          {/* Previous Feedback */}
          {previousFeedback.length > 0 && (
            <div className="bg-white rounded-xl border border-ds-border p-6">
              <h3 className="text-lg font-bold text-navy mb-4">Your Previous Feedback</h3>
              <div className="space-y-3">
                {previousFeedback.map(fb => (
                  <div key={fb.id} className="p-4 bg-bg-section rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">
                        {fb.rating === 'thumbs_up' ? '👍' : fb.rating === 'thumbs_down' ? '👎' : '🤔'}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        fb.recommendation === 'advance'
                          ? 'bg-green-100 text-green-700'
                          : fb.recommendation === 'do_not_advance'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {fb.recommendation === 'advance' ? 'Advance' :
                         fb.recommendation === 'do_not_advance' ? 'Do Not Advance' : 'Need More Info'}
                      </span>
                      <span className="text-xs text-text-muted ml-auto">
                        {new Date(fb.submitted_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {fb.comments && (
                      <p className="text-sm text-text-primary">{fb.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Right panel — resume iframe */}
        {showResume && candidate.resume_url && (
          <div className="w-[45%] flex-shrink-0 border-l border-ds-border flex flex-col" style={{ height: '100%' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-ds-border bg-white flex-shrink-0">
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F3C62' }}>Resume</span>
              <div className="flex items-center gap-3">
                <a
                  href={candidate.resume_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#1F3C62' }}
                >
                  Download
                </a>
                <button
                  onClick={() => setShowResume(false)}
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#1F3C62' }}
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <iframe
              src={`${candidate.resume_url}#toolbar=0`}
              title="Resume"
              className="w-full bg-white flex-1"
              style={{ border: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
