import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logAnthropicUsage } from '@/lib/anthropic-usage'

const client = new Anthropic()

interface IntakeContext {
  company_name?: string
  position_title?: string
  company_description?: string
  company_industry?: string
  company_news?: Array<{ title?: string; summary?: string }>
  reason_for_opening?: string
  reports_to_title?: string
  position_location?: string
  work_arrangement?: string
  // Already-answered scaffolding (signals about what's known and what isn't)
  context_why_open?: string
  context_success_12mo?: string
  context_hard_not_on_jd?: string
  context_failure_profile?: string
  context_dont_ask_client?: string
}

export async function POST(request: NextRequest) {
  try {
    const { context } = (await request.json()) as { context?: IntakeContext }
    if (!context?.company_name && !context?.position_title) {
      return NextResponse.json({ error: 'company_name or position_title is required' }, { status: 400 })
    }

    const newsSnippets = (context.company_news || [])
      .slice(0, 6)
      .map((n) => `- ${n.title || ''}${n.summary ? `: ${n.summary}` : ''}`)
      .filter((s) => s.trim().length > 2)
      .join('\n')

    const prompt = `You are helping a retained executive recruiter prepare for a client intake conversation about a specific search. Generate 3-5 sharp, specific questions the recruiter should ask the client about THIS search.

Search context:
- Company: ${context.company_name || 'unknown'}
- Industry: ${context.company_industry || 'unknown'}
- Position: ${context.position_title || 'unknown'}
- Reports to: ${context.reports_to_title || 'unknown'}
- Location / arrangement: ${context.position_location || ''} ${context.work_arrangement || ''}
- Stated reason for opening: ${context.reason_for_opening || 'unknown'}

${newsSnippets ? `Recent company news:\n${newsSnippets}\n` : ''}
${context.company_description ? `Company description: ${context.company_description}\n` : ''}

Already captured (don't repeat these — ask different questions):
- Why open: ${context.context_why_open || '(blank)'}
- Success at 12 months: ${context.context_success_12mo || '(blank)'}
- What's hard not on JD: ${context.context_hard_not_on_jd || '(blank)'}
- Failure profile: ${context.context_failure_profile || '(blank)'}
- Don't ask client: ${context.context_dont_ask_client || '(blank)'}

Generate 3-5 questions that:
- Are SPECIFIC to this company, this role, this industry, this news — not generic recruiter questions
- Probe at things the recruiter likely doesn't know but the client does
- Are written in the recruiter's voice, to be asked of the client
- Avoid duplicating the scaffolding questions above

Return ONLY a JSON array of question strings. No prose, no markdown, no explanation. Example: ["Question one?", "Question two?"]`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    logAnthropicUsage('intake/suggested-questions', 'claude-sonnet-4-6', response.usage)

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }
    const cleaned = text.replace(/```json|```/g, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 })
    }

    const questions = Array.isArray(parsed)
      ? parsed.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, 5)
      : []

    return NextResponse.json({ questions })
  } catch (err: any) {
    console.error('intake/suggested-questions error:', err?.message || err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
