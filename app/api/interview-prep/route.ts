import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const {
      candidateName,
      currentTitle,
      currentCompany,
      recruiterAssessment,
      positionTitle,
      companyName,
      stageName,
      previousFeedback,
    } = await request.json()

    const previousRoundContext = previousFeedback?.length > 0
      ? `\nPrevious interview feedback:\n${previousFeedback
          .map((f: { panelist_name: string; rating: string; comments?: string }) =>
            `- ${f.panelist_name}: ${
              f.rating === 'thumbs_up' ? 'Positive' :
              f.rating === 'thumbs_down' ? 'Concerns raised' : 'Mixed'
            }${f.comments ? ` — "${f.comments}"` : ''}`
          ).join('\n')}`
      : ''

    const isLaterRound = previousFeedback?.length > 0

    const prompt = `You are helping a hiring manager prep for an executive search interview. Your job is to help them think and be genuinely curious — not perform the role of "interviewer."

Candidate: ${candidateName}${currentTitle ? `, ${currentTitle}` : ''}${currentCompany ? ` at ${currentCompany}` : ''}.
Role: ${positionTitle} at ${companyName}.
Current stage: ${stageName || 'Interview'}.
${recruiterAssessment ? `\nRecruiter's assessment:\n${recruiterAssessment}` : ''}
${previousRoundContext}

Generate three pieces of content:

BRIEFING — "briefing": A 2-3 sentence plain-English summary of what is known about this candidate so far, written for someone who hasn't met them yet. Be direct and specific — mention their background, why they're being considered, and any notable strengths or open questions.

SET 1 — "things_to_think_about": 3 pre-interview reflection questions to help the INTERVIEWER clarify their own thinking before the conversation. Not questions to ask the candidate — questions to help the interviewer show up with genuine curiosity. Each has a "note" (1 sentence, why it matters for this specific candidate and role).

SET 2 — "conversation_topics": 4 conversation territories to explore with the candidate. For each:
- "tag": one of: "probe", "validate", "culture", "tradeoff"
- "topic": 4-6 word title
- "text": 1-2 sentences on what's worth exploring and why — be honest about tensions, don't just cheerlead
- "starter": how a curious, direct person would actually open this territory in real conversation

CRITICAL rules for starters:
- NEVER use "Tell me about a time" or "Walk me through a time" — these are performative interview formulas that produce rehearsed answers
- NEVER start with "Can you" or "Could you"
- CRITICAL: Never use "I", "you need", "you'll want", "so you", or any second-person directive language. Write all content as direct neutral statements. Not "You need clarity on leadership" but "Worth understanding what leadership indicators matter most here." Not "I need to know" but "The key question is..." Statements, not instructions.
- Write like a real human being having a real conversation — direct, specific, warm
- Reference actual details from the candidate's background or this specific role
- The goal is to open genuine territory, not trigger a rehearsed answer
- Good examples: "The ERP thing is interesting — we don't have one. How does that actually change your day-to-day?" or "I kept coming back to the 2021 move reading your resume. What was going on there?"
${isLaterRound ? '\nThis is a later round — focus on unresolved questions and discrepancies from previous interviews. Be specific about what still needs clarity.' : ''}

Return only valid JSON with keys "briefing" (string), "things_to_think_about" (array of {question, note}), and "conversation_topics" (array of {tag, topic, text, starter}). No markdown, no preamble.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Interview prep generation error:', err)
    return NextResponse.json({ error: 'Failed to generate prep content' }, { status: 500 })
  }
}
