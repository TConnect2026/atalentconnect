"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface PrepQuestion {
  question: string
  note: string
}

interface ConversationTopic {
  tag: 'probe' | 'validate' | 'culture' | 'tradeoff'
  topic: string
  text: string
  starter: string
}

interface PrepContent {
  briefing: string
  things_to_think_about: PrepQuestion[]
  conversation_topics: ConversationTopic[]
}

interface InterviewPrepPanelProps {
  candidateId: string
  candidateName: string
  currentTitle?: string
  currentCompany?: string
  searchId: string
  positionTitle: string
  companyName: string
  stageName?: string
}

const TAG_STYLES: Record<string, { label: string; className: string }> = {
  probe:    { label: 'Worth probing',    className: 'bg-amber-50 text-amber-800' },
  validate: { label: 'Validate this',   className: 'bg-green-50 text-green-800' },
  culture:  { label: 'Culture',          className: 'bg-purple-50 text-purple-800' },
  tradeoff: { label: 'Honest tradeoff', className: 'bg-orange-50 text-orange-800' },
}

export function InterviewPrepPanel({
  candidateId,
  candidateName,
  currentTitle,
  currentCompany,
  searchId,
  positionTitle,
  companyName,
  stageName,
}: InterviewPrepPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [prepContent, setPrepContent] = useState<PrepContent | null>(null)
  const [scratchpad, setScratchpad] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const toggleNotes = (key: string) => {
    setExpandedNotes(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateNote = (key: string, value: string) => {
    setNotes(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    generatePrep()
  }, [])

  const generatePrep = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: candidateData } = await supabase
        .from('candidates')
        .select('recruiter_assessment, recruiter_notes')
        .eq('id', candidateId)
        .single()

      const { data: previousFeedback } = await supabase
        .from('panelist_feedback')
        .select('panelist_name, rating, comments, submitted_at')
        .eq('candidate_id', candidateId)
        .eq('search_id', searchId)
        .order('submitted_at', { ascending: true })

      const response = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName,
          currentTitle,
          currentCompany,
          recruiterAssessment: candidateData?.recruiter_assessment || candidateData?.recruiter_notes || '',
          positionTitle,
          companyName,
          stageName,
          previousFeedback: previousFeedback || [],
        }),
      })

      if (!response.ok) throw new Error('Failed to generate prep')

      const result = await response.json()
      setPrepContent(result)
    } catch (err) {
      console.error('Prep generation error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-ds-border overflow-hidden" style={{ backgroundColor: '#FAF9F7' }}>
      <div className="flex items-center gap-2.5" style={{ backgroundColor: '#4A6378', padding: '16px' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
          <path d="M8 1v2M12 1v2M7 7h6M7 10h6M7 13h4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Interview Prep</h3>
      </div>

      {isLoading && (
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 rounded-lg bg-bg-section animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="px-6 pb-6">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={generatePrep} className="mt-2 text-sm font-medium hover:underline" style={{ color: '#1F3C62' }}>
            Try again
          </button>
        </div>
      )}

      {prepContent && (
        <div className="px-6 pb-8 space-y-8 border-t border-ds-border pt-6">
          {/* Briefing — first thing the interviewer sees */}
          {prepContent.briefing && (
            <div>
              <p className="mb-3" style={{ fontSize: '16px', fontWeight: 700, color: '#1F3C62' }}>
                What we know so far
              </p>
              <div className="border-l-3 pl-4 py-2" style={{ borderColor: '#1F3C62' }}>
                <p className="leading-relaxed" style={{ fontSize: '14px', color: '#1F3C62' }}>{prepContent.briefing}</p>
              </div>
            </div>
          )}

          {/* Focus questions */}
          <div>
            <p className="mb-4" style={{ fontSize: '16px', fontWeight: 700, color: '#1F3C62' }}>
              Your focus for this conversation
            </p>
            <div className="space-y-4">
              {prepContent.things_to_think_about.map((q, i) => {
                const key = `q-${i}`
                return (
                  <div key={i} className="bg-white rounded-lg px-5 py-4">
                    <p className="leading-relaxed" style={{ fontSize: '14px', fontWeight: 600, color: '#1F3C62' }}>{q.question}</p>
                    <p className="mt-2 italic leading-relaxed" style={{ fontSize: '13px', color: '#3B5578' }}>{q.note}</p>
                    <button
                      onClick={() => toggleNotes(key)}
                      className="mt-3 hover:underline"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#1F3C62' }}
                    >
                      {expandedNotes[key] ? '− Hide notes' : '+ Your notes'}
                    </button>
                    {expandedNotes[key] && (
                      <textarea
                        value={notes[key] || ''}
                        onChange={(e) => updateNote(key, e.target.value)}
                        placeholder="Your thoughts on this..."
                        rows={2}
                        className="mt-2 w-full px-3 py-2 border border-ds-border rounded-lg bg-white focus:outline-none resize-y"
                        style={{ fontSize: '14px', color: '#1F3C62' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-ds-border" />

          {/* Conversation territories */}
          <div>
            <p className="mb-4" style={{ fontSize: '16px', fontWeight: 700, color: '#1F3C62' }}>
              Conversation territories
            </p>
            <div className="space-y-4">
              {prepContent.conversation_topics.map((t, i) => {
                const tagStyle = TAG_STYLES[t.tag] || TAG_STYLES.probe
                const key = `t-${i}`
                return (
                  <div key={i} className="bg-white border border-ds-border rounded-lg px-5 py-4">
                    <span className={`inline-block px-2 py-0.5 rounded mb-2 ${tagStyle.className}`} style={{ fontSize: '11px', fontWeight: 600 }}>
                      {tagStyle.label}
                    </span>
                    <p className="leading-relaxed" style={{ fontSize: '14px', color: '#1F3C62' }}>
                      <span style={{ fontWeight: 600 }}>{t.topic}</span> — {t.text}
                    </p>
                    <div className="mt-2 pl-3 border-l-2" style={{ borderColor: '#1F3C62' }}>
                      <p className="italic leading-relaxed" style={{ fontSize: '13px', color: '#3B5578' }}>{t.starter}</p>
                    </div>
                    <button
                      onClick={() => toggleNotes(key)}
                      className="mt-3 hover:underline"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#1F3C62' }}
                    >
                      {expandedNotes[key] ? '− Hide notes' : '+ Your notes'}
                    </button>
                    {expandedNotes[key] && (
                      <textarea
                        value={notes[key] || ''}
                        onChange={(e) => updateNote(key, e.target.value)}
                        placeholder="Your thoughts on this..."
                        rows={2}
                        className="mt-2 w-full px-3 py-2 border border-ds-border rounded-lg bg-white focus:outline-none resize-y"
                        style={{ fontSize: '14px', color: '#1F3C62' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-ds-border" />

          {/* General scratchpad — always visible */}
          <div>
            <p className="mb-2" style={{ fontSize: '16px', fontWeight: 700, color: '#1F3C62' }}>
              Additional notes
            </p>
            <textarea
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
              placeholder="Anything else — impressions, follow-ups, open questions."
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-white focus:outline-none resize-y"
              style={{ fontSize: '14px', color: '#1F3C62', border: '1.5px solid #1F3C62' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
