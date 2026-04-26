"use client"

import { useState } from "react"
import { X, ThumbsUp, ThumbsDown, PauseCircle, Loader2, Check } from "lucide-react"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()

type Decision = "advance" | "hold" | "concern"

interface PortalFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId: string
  candidateName: string
  searchId: string
  reviewerName: string
  reviewerEmail: string
}

const OPTIONS: { value: Decision; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "advance",
    label: "Advance",
    description: "Move this candidate forward",
    icon: <ThumbsUp className="w-4 h-4" />,
    color: "#3A8943",
  },
  {
    value: "hold",
    label: "Hold",
    description: "Need more information or time",
    icon: <PauseCircle className="w-4 h-4" />,
    color: "#C8B873",
  },
  {
    value: "concern",
    label: "Pass",
    description: "Not a fit for this role",
    icon: <ThumbsDown className="w-4 h-4" />,
    color: "#B04A3E",
  },
]

export function PortalFeedbackModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  searchId,
  reviewerName,
  reviewerEmail,
}: PortalFeedbackModalProps) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!decision) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from("client_feedback").insert({
        candidate_id: candidateId,
        search_id: searchId,
        reviewer_email: reviewerEmail || "preview@internal",
        reviewer_name: reviewerName || "Preview",
        recommendation: decision,
        notes: notes.trim() || null,
      })
      if (error) throw error
      setSubmitted(true)
      setTimeout(() => {
        handleClose()
      }, 1400)
    } catch (err) {
      console.error("Feedback submit failed:", err)
      alert("Failed to submit feedback — please try again")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setDecision(null)
    setNotes("")
    setSubmitted(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-[12px] overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(31, 60, 98, 0.1)" }}>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-navy/60">
              Share your feedback
            </h3>
            <p className="text-sm font-semibold text-navy mt-0.5">{candidateName}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-[8px] hover:bg-black/5 text-navy/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-12 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-navy">Thanks for your feedback</p>
            <p className="text-xs text-navy/60 mt-1">Your recruiter has been notified.</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-navy/60 mb-2.5 block">
                  Your recommendation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {OPTIONS.map((opt) => {
                    const active = decision === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDecision(opt.value)}
                        className="flex flex-col items-center gap-1.5 rounded-[8px] border px-3 py-3 text-xs font-semibold transition"
                        style={{
                          borderColor: active ? opt.color : "rgba(31, 60, 98, 0.12)",
                          backgroundColor: active ? `${opt.color}14` : "#FFFFFF",
                          color: active ? opt.color : "#1F3C62",
                        }}
                      >
                        <span style={{ color: opt.color }}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {decision && (
                  <p className="text-xs text-navy/60 mt-2">
                    {OPTIONS.find((o) => o.value === decision)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-navy/60 mb-2 block">
                  Notes <span className="text-navy/40 normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="What stood out, any concerns, questions for the next round..."
                  className="w-full rounded-[8px] border px-3 py-2.5 text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  style={{ borderColor: "rgba(31, 60, 98, 0.12)" }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: "rgba(31, 60, 98, 0.1)" }}>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-[8px] text-sm font-semibold text-navy hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!decision || submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-navy text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit feedback
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
