import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

type Category = 'the_role' | 'the_context' | 'the_candidate' | 'the_process'

interface QuestionOut {
  question: string
  rationale: string
}

export async function POST(request: NextRequest) {
  try {
    const { companyName, companyData, news, positionTitle, positionSpec } = await request.json()

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 })
    }

    const facts: string[] = []
    if (companyData?.company_description) facts.push(`Description: ${companyData.company_description}`)
    if (companyData?.company_industry) facts.push(`Industry: ${companyData.company_industry}`)
    if (companyData?.company_size) facts.push(`Size: ${companyData.company_size}`)
    if (companyData?.company_address) facts.push(`HQ: ${companyData.company_address}`)
    if (companyData?.company_founded) facts.push(`Founded: ${companyData.company_founded}`)
    if (companyData?.company_type) facts.push(`Type: ${companyData.company_type}`)
    if (Array.isArray(companyData?.company_specialties) && companyData.company_specialties.length) {
      facts.push(`Specialties: ${companyData.company_specialties.join(', ')}`)
    }

    const newsLines = Array.isArray(news) && news.length
      ? news.slice(0, 5).map((n: any) => `- ${n.title}${n.date ? ` (${n.date})` : ''}: ${n.summary || ''}`).join('\n')
      : '(none)'

    const specBlock = positionSpec && String(positionSpec).trim().length > 0
      ? `\nPOSITION SPEC:\n${String(positionSpec).slice(0, 8000)}`
      : ''

    const prompt = `You are a senior retained search recruiter preparing for an intake call. Generate 8–12 client-intake questions for hiring a ${positionTitle || 'leader'} at ${companyName}, organized into four categories.

CATEGORIES (use these exact keys):
- the_role: what this person will actually do and be measured on
- the_context: why this role exists now, what happened before
- the_candidate: must-haves, nice-to-haves, dealbreakers
- the_process: timeline, decision-making, competing priorities

REQUIREMENTS:
- Every question must reference something specific to this company — its size, industry, recent news, specialties, or the spec. No generic questions.
- Absolutely no "tell me about a time…" — these go to the client, not a candidate.
- 8–12 questions total across the four categories. At least one in each.
- For each question include a short "rationale" (one line, <= 15 words) explaining why this question matters for this search.

COMPANY FACTS:
${facts.join('\n') || '(no company intel on file)'}

RECENT NEWS:
${newsLines}
${specBlock}

Return ONLY valid JSON with this shape — no markdown, no prose outside the JSON:
{
  "the_role": [{ "question": "...", "rationale": "..." }],
  "the_context": [{ "question": "...", "rationale": "..." }],
  "the_candidate": [{ "question": "...", "rationale": "..." }],
  "the_process": [{ "question": "...", "rationale": "..." }]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }
    const cleaned = text.replace(/```json|```/g, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse questions response:', cleaned.slice(0, 500))
      return NextResponse.json({ error: 'Failed to parse question generation response' }, { status: 500 })
    }

    const normalize = (arr: unknown): QuestionOut[] =>
      Array.isArray(arr)
        ? (arr as any[])
            .filter((q) => q && typeof q === 'object' && q.question)
            .map((q) => ({
              question: String(q.question),
              rationale: String(q.rationale || ''),
            }))
        : []

    const categories: Record<Category, QuestionOut[]> = {
      the_role: normalize(parsed.the_role),
      the_context: normalize(parsed.the_context),
      the_candidate: normalize(parsed.the_candidate),
      the_process: normalize(parsed.the_process),
    }

    return NextResponse.json({ categories })
  } catch (err: any) {
    console.error('Questions generation error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
