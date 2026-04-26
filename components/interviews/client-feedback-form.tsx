"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()

interface ClientFeedbackFormProps {
  interviewId: string
  interviewerName: string
  interviewerEmail: string
  candidateName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ClientFeedbackForm({
  interviewId,
  interviewerName,
  interviewerEmail,
  candidateName,
  isOpen,
  onClose,
  onSuccess
}: ClientFeedbackFormProps) {
  const [recommendation, setRecommendation] = useState<'advance' | 'hold' | 'concern' | ''>('')
  const [interviewNotes, setInterviewNotes] = useState('')
  const [strengths, setStrengths] = useState('')
  const [concerns, setConcerns] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!recommendation) {
      alert('Please select a recommendation')
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('interview_feedback')
        .insert({
          interview_id: interviewId,
          interviewer_name: interviewerName,
          interviewer_email: interviewerEmail,
          interview_notes: interviewNotes || null,
          strengths: strengths || null,
          concerns: concerns || null,
          recommendation: recommendation,
          submitted_at: new Date().toISOString()
        })

      if (error) throw error

      // Reset form
      setRecommendation('')
      setInterviewNotes('')
      setStrengths('')
      setConcerns('')

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Failed to submit feedback')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-navy">
            Interview Feedback: {candidateName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Recommendation */}
          <div>
            <Label className="text-text-primary font-semibold mb-3 block">
              Recommendation *
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRecommendation('advance')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  recommendation === 'advance'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                    : 'border-ds-border hover:border-cyan-300 text-text-primary'
                }`}
              >
                <div className="text-2xl mb-1">✓</div>
                <div className="font-semibold">Advance</div>
                <div className="text-xs mt-1">Move forward</div>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation('hold')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  recommendation === 'hold'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-900'
                    : 'border-ds-border hover:border-yellow-300 text-text-primary'
                }`}
              >
                <div className="text-2xl mb-1">⏸</div>
                <div className="font-semibold">Hold</div>
                <div className="text-xs mt-1">Need more info</div>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation('concern')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  recommendation === 'concern'
                    ? 'border-orange-500 bg-orange-50 text-orange-900'
                    : 'border-ds-border hover:border-orange-300 text-text-primary'
                }`}
              >
                <div className="text-2xl mb-1">⚠</div>
                <div className="font-semibold">Concern</div>
                <div className="text-xs mt-1">Not a fit</div>
              </button>
            </div>
          </div>

          {/* Interview Notes */}
          <div>
            <Label htmlFor="interviewNotes" className="text-text-primary font-semibold">
              Overall Interview Notes
            </Label>
            <Textarea
              id="interviewNotes"
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="Your overall impressions, key discussion points, cultural fit observations..."
              rows={4}
              className="mt-2 bg-white text-text-primary"
            />
          </div>

          {/* Strengths */}
          <div>
            <Label htmlFor="strengths" className="text-text-primary font-semibold">
              Key Strengths
            </Label>
            <Textarea
              id="strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="What stood out positively? Specific examples of relevant skills or experience..."
              rows={3}
              className="mt-2 bg-white text-text-primary"
            />
          </div>

          {/* Concerns */}
          <div>
            <Label htmlFor="concerns" className="text-text-primary font-semibold">
              Concerns or Gaps
            </Label>
            <Textarea
              id="concerns"
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="Any concerns, gaps, or areas that need clarification..."
              rows={3}
              className="mt-2 bg-white text-text-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white text-text-primary border-ds-border hover:bg-bg-section"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !recommendation}
              className="bg-orange text-white hover:bg-orange-hover font-semibold"
            >
              {isSaving ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
