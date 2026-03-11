"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InterviewInterviewer {
  id: string
  contact_name: string
  contact_email: string
}

interface InterviewData {
  id: string
  candidate_first_name: string
  candidate_last_name: string
  interviewer_name: string
  interviewer_email: string
  scheduled_at: string
  interview_type: string
  timezone: string
  duration_minutes: number
  prep_notes?: string
  interview_guide_url?: string
  status: string
  interviewers?: InterviewInterviewer[]
}

export default function InterviewFeedbackPage() {
  const params = useParams()
  const token = params.token as string
  const [interview, setInterview] = useState<InterviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Form fields
  const [interviewNotes, setInterviewNotes] = useState("")
  const [strengths, setStrengths] = useState("")
  const [concerns, setConcerns] = useState("")
  const [recommendation, setRecommendation] = useState<"advance" | "hold" | "decline" | "concern" | "">("")
  const [videoDebriefLink, setVideoDebriefLink] = useState("")

  const getTimezoneAbbreviation = (timezone: string) => {
    const tzMap: Record<string, string> = {
      'America/New_York': 'ET',
      'America/Chicago': 'CT',
      'America/Denver': 'MT',
      'America/Los_Angeles': 'PT',
      'America/Phoenix': 'MT',
      'America/Anchorage': 'AKT',
      'Pacific/Honolulu': 'HT',
    }
    return tzMap[timezone] || timezone.split('/')[1]?.replace(/_/g, ' ') || timezone
  }

  useEffect(() => {
    loadInterview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const loadInterview = async () => {
    try {
      // Fetch interview by token with candidate info and interviewers
      const { data: interviewData, error: interviewError } = await supabase
        .from("interviews")
        .select(`
          id,
          interviewer_name,
          interviewer_email,
          scheduled_at,
          interview_type,
          timezone,
          duration_minutes,
          prep_notes,
          interview_guide_url,
          status,
          candidates (
            first_name,
            last_name
          ),
          interview_interviewers (
            id,
            contact_name,
            contact_email
          )
        `)
        .eq("feedback_token", token)
        .single()

      if (interviewError) throw interviewError

      if (!interviewData) {
        setError("Interview not found or link is invalid")
        setIsLoading(false)
        return
      }

      // Check if feedback already exists
      const { data: existingFeedback } = await supabase
        .from("interview_feedback")
        .select("id")
        .eq("interview_id", interviewData.id)
        .single()

      if (existingFeedback) {
        setIsSubmitted(true)
      }

      setInterview({
        id: interviewData.id,
        candidate_first_name: (interviewData.candidates as any).first_name,
        candidate_last_name: (interviewData.candidates as any).last_name,
        interviewer_name: interviewData.interviewer_name,
        interviewer_email: interviewData.interviewer_email,
        scheduled_at: interviewData.scheduled_at,
        interview_type: interviewData.interview_type,
        timezone: interviewData.timezone,
        duration_minutes: interviewData.duration_minutes,
        prep_notes: interviewData.prep_notes,
        interview_guide_url: interviewData.interview_guide_url,
        status: interviewData.status,
        interviewers: (interviewData.interview_interviewers as any) || []
      })
    } catch (err) {
      console.error("Error loading interview:", err)
      setError("Failed to load interview details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!recommendation) {
      setError("Please select a recommendation")
      setIsSubmitting(false)
      return
    }

    try {
      // Insert feedback
      const { error: feedbackError } = await supabase
        .from("interview_feedback")
        .insert({
          interview_id: interview!.id,
          interviewer_name: interview!.interviewer_name,
          interview_notes: interviewNotes || null,
          strengths: strengths || null,
          concerns: concerns || null,
          recommendation: recommendation,
          video_debrief_link: videoDebriefLink || null
        })

      if (feedbackError) throw feedbackError

      // Update interview status
      const { error: updateError } = await supabase
        .from("interviews")
        .update({ status: "feedback_received" })
        .eq("id", interview!.id)

      if (updateError) throw updateError

      setIsSubmitted(true)
    } catch (err) {
      console.error("Error submitting feedback:", err)
      setError("Failed to submit feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <p className="text-center text-text-secondary">Loading interview details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !interview) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-navy mb-2">Invalid Link</h2>
              <p className="text-text-secondary">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-navy mb-2">Thank You!</h2>
              <p className="text-text-secondary">
                Your feedback has been submitted successfully.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="bg-[#64748B] text-white">
            <CardTitle className="text-2xl">Interview Feedback</CardTitle>
            <p className="text-white/80 text-sm mt-2">
              Please share your thoughts on the interview
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Interview Details */}
            <div className="bg-white rounded-lg p-4 mb-6 space-y-2 border border-ds-border">
              <div>
                <Label className="text-sm text-text-secondary">Candidate</Label>
                <p className="font-semibold text-text-primary">
                  {interview!.candidate_first_name} {interview!.candidate_last_name}
                </p>
              </div>
              <div>
                <Label className="text-sm text-text-secondary">Interview Date & Time</Label>
                <p className="text-text-primary">
                  {new Date(interview!.scheduled_at).toLocaleDateString()} at{" "}
                  {new Date(interview!.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {interview!.duration_minutes} minutes • {getTimezoneAbbreviation(interview!.timezone)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-text-secondary">Interview Type</Label>
                <p className="text-text-primary">
                  {interview!.interview_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              {interview!.interviewers && interview!.interviewers.length > 0 && (
                <div>
                  <Label className="text-sm text-text-secondary">
                    Interview Panel {interview!.interviewers.length > 1 && `(${interview!.interviewers.length} interviewers)`}
                  </Label>
                  <div className="mt-1 space-y-1">
                    {interview!.interviewers.map((interviewer) => (
                      <div key={interviewer.id} className="text-sm text-text-primary">
                        <span className="font-medium">{interviewer.contact_name}</span>
                        <span className="text-text-muted"> • {interviewer.contact_email}</span>
                      </div>
                    ))}
                  </div>
                  {interview!.interviewers.length > 1 && (
                    <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded mt-2 inline-block">
                      Panel Interview: Each interviewer will submit individual feedback
                    </p>
                  )}
                </div>
              )}
              {interview!.interview_guide_url && (
                <div>
                  <Label className="text-sm text-text-secondary">Interview Guide</Label>
                  <a
                    href={interview!.interview_guide_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-navy hover:text-navy hover:underline text-sm mt-1"
                  >
                    📄 View Interview Guide →
                  </a>
                </div>
              )}
              {interview!.prep_notes && (
                <div>
                  <Label className="text-sm text-text-secondary">Prep Notes</Label>
                  <p className="text-text-primary text-sm whitespace-pre-wrap">{interview!.prep_notes}</p>
                </div>
              )}
            </div>

            {/* Feedback Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="notes">How did the interview go?</Label>
                <Textarea
                  id="notes"
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="Share your overall impressions of the interview..."
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="strengths">Strengths</Label>
                <Textarea
                  id="strengths"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="What did the candidate do well?"
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="concerns">Concerns</Label>
                <Textarea
                  id="concerns"
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  placeholder="Any concerns or areas for improvement?"
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="recommendation">Recommendation *</Label>
                <Select value={recommendation} onValueChange={(value) => setRecommendation(value as any)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your recommendation..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">
                      <div className="flex flex-col">
                        <span className="font-medium text-green-700">Advance</span>
                        <span className="text-xs text-text-muted">Move to next round</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hold">
                      <div className="flex flex-col">
                        <span className="font-medium text-yellow-700">Hold</span>
                        <span className="text-xs text-text-muted">Need more information or discussion</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="concern">
                      <div className="flex flex-col">
                        <span className="font-medium text-orange-700">Concern</span>
                        <span className="text-xs text-text-muted">Significant concerns about fit</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="video">Video Debrief Link (Optional)</Label>
                <Input
                  id="video"
                  type="url"
                  value={videoDebriefLink}
                  onChange={(e) => setVideoDebriefLink(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5"
                />
                <p className="text-xs text-text-muted mt-1.5">
                  If you recorded a video debrief, paste the link here (e.g., Loom, YouTube, etc.)
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange hover:bg-orange-hover text-white"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
