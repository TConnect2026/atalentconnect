import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const runtime = 'nodejs'
export const maxDuration = 45

export async function POST(request: NextRequest) {
  try {
    const { notes, transcript, candidateName, stageName, interviewerName } =
      (await request.json()) as {
        notes?: string
        transcript?: string
        candidateName?: string
        stageName?: string
        interviewerName?: string
      }

    const notesTrim = (notes || '').trim()
    const transcriptTrim = (transcript || '').trim()

    if (!notesTrim && !transcriptTrim) {
      return NextResponse.json(
        { error: 'Nothing to summarize — provide interview notes or a transcript.' },
        { status: 400 },
      )
    }

    // Truncate aggressively to keep cost/latency predictable — full transcripts can be huge.
    const MAX = 25000
    const clip = (s: string) => (s.length > MAX ? s.slice(0, MAX) + '\n…[truncated]' : s)

    const prompt = `Summarize the following interview in 3-4 sentences of plain prose.

Focus on:
- What the candidate revealed about themselves, their experience, or their situation
- What the interviewer learned, confirmed, or validated
- Signals, concerns, or unresolved threads worth carrying forward
- Any clear indication of fit or friction

Rules:
- 3 to 4 sentences total, prose (not bullets)
- Do NOT editorialize or speculate beyond the source material
- Do NOT quote long strings verbatim — synthesize
- Write for another interviewer who will pick up this thread in the next round

Context:
- Stage: ${stageName || 'Interview'}
- Candidate: ${candidateName || 'Candidate'}
- Interviewer: ${interviewerName || 'Unknown'}

${transcriptTrim ? `Transcript:\n${clip(transcriptTrim)}\n` : ''}${notesTrim ? `\nRecruiter's notes:\n${clip(notesTrim)}\n` : ''}
Return only the summary text — no preamble, no markdown, no headings.`

    const res = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = res.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()

    if (!summary) {
      return NextResponse.json(
        { error: 'Model returned an empty summary.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ summary })
  } catch (err) {
    console.error('[summarize-conversation] error:', err)
    const e = err as { message?: string }
    return NextResponse.json(
      { error: e?.message || 'Failed to generate summary' },
      { status: 500 },
    )
  }
}
