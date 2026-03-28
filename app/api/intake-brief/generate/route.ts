import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  getQuestionsForOrgType,
  OrgType,
} from '@/lib/intake-questions'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, orgType, searchContext } = await request.json()

    if (!orgType) {
      return NextResponse.json({ error: 'Org type is required' }, { status: 400 })
    }

    const questionPool = getQuestionsForOrgType(orgType as OrgType)

    const questionsForPrompt = questionPool
      .map((q) => `[${q.id}] (${q.attribute}) ${q.text}`)
      .join('\n')

    const prompt = `You are a seasoned executive recruiter with 15+ years of retained search experience. You read between the lines. You know what job descriptions don't say is often more important than what they do say.

Your job is to review the job description below and recommend which intake questions will unlock the most important information for this specific search.

ORG TYPE: ${orgType}
${searchContext ? `SEARCH CONTEXT: ${searchContext}` : ''}

JOB DESCRIPTION:
${jobDescription || 'No job description provided — recommend based on org type only.'}

AVAILABLE QUESTIONS:
${questionsForPrompt}

Instructions:
- Select 12-16 questions that will surface what this JD is NOT saying
- Always include all decision-making questions — they apply to every search
- Always include "What happened to the last person in this role?" if it exists
- Prioritize probe questions when the JD is vague or corporate
- Look for signals: Is this a backfill? Is there urgency? Is the comp range wide?
- For each recommended question, write one plain direct sentence explaining why it matters for this search
- Write like a recruiter briefing a colleague — not a consultant writing a report

Respond ONLY with valid JSON in this exact format:
{
  "recommendedIds": ["id1", "id2"],
  "rationale": {
    "id1": "one sentence why this question matters",
    "id2": "one sentence why this question matters"
  },
  "jdSignals": [
    "brief observation about what the JD reveals or conceals"
  ]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const clean = content.text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const validIds = new Set(questionPool.map((q) => q.id))
    const validRecommendedIds = parsed.recommendedIds.filter((id: string) => validIds.has(id))

    const recommendedQuestions = validRecommendedIds.map((id: string) => {
      const question = questionPool.find((q) => q.id === id)!
      return { ...question, rationale: parsed.rationale[id] || null }
    })

    return NextResponse.json({
      recommendedIds: validRecommendedIds,
      recommendedQuestions,
      rationale: parsed.rationale,
      jdSignals: parsed.jdSignals || [],
    })
  } catch (error) {
    console.error('Intake brief generation error:', error)
    return NextResponse.json({ error: 'Failed to generate intake recommendations' }, { status: 500 })
  }
}