import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  getQuestionsForOrgType,
  getClosingQuestions,
  OrgType,
  ATTRIBUTE_LABELS,
} from '@/lib/intake-questions'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { companyName, companyResearch, jobDescription, orgType, positionTitle } = await request.json()

    if (!orgType) {
      return NextResponse.json({ error: 'Org type is required' }, { status: 400 })
    }

    // Exclude the closing block from the AI selection pool — those are appended automatically
    const questionPool = getQuestionsForOrgType(orgType as OrgType)
      .filter((q) => q.attribute !== 'before_market')

    const questionsForPrompt = questionPool
      .map((q) => `[${q.id}] (${q.attribute}${q.isProbe ? ', probe' : ''}) ${q.text}`)
      .join('\n')

    const hasJD = !!jobDescription && jobDescription.trim().length > 0
    const hasResearch = !!companyResearch && Object.keys(companyResearch).length > 0

    const companyContext = hasResearch
      ? `COMPANY RESEARCH:
Company: ${companyResearch.company_name || companyName}
Industry: ${companyResearch.industry || 'Unknown'}
Description: ${companyResearch.description || 'N/A'}
Employees: ${companyResearch.employee_count || 'Unknown'}
Revenue/Budget: ${companyResearch.revenue_or_budget || 'Unknown'}
Ownership: ${companyResearch.ownership || 'Unknown'}
${companyResearch.funding?.stage ? `Funding: ${companyResearch.funding.stage}${companyResearch.funding.total_raised ? ` (${companyResearch.funding.total_raised})` : ''}` : ''}
${companyResearch.leadership?.length ? `Leadership: ${companyResearch.leadership.map((l: any) => `${l.name} (${l.title})`).join(', ')}` : ''}
${companyResearch.culture_signals?.length ? `Culture signals: ${companyResearch.culture_signals.join('; ')}` : ''}
${companyResearch.recent_news?.length ? `Recent news: ${companyResearch.recent_news.join('; ')}` : ''}
${companyResearch.risks_and_context?.length ? `Risks/context: ${companyResearch.risks_and_context.join('; ')}` : ''}`
      : `COMPANY: ${companyName}`

    const prompt = `You are a seasoned executive recruiter with 15+ years of retained search experience. You're preparing an intake brief — the structured document you bring to a client meeting to run a sharp intake conversation.

${companyContext}

ORG TYPE: ${orgType}
POSITION: ${positionTitle || 'Not specified'}

${hasJD ? `JOB DESCRIPTION:\n${jobDescription}` : 'No job description available — generate based on company research and org type.'}

QUESTION LIBRARY (select from these AND generate custom ones):
${questionsForPrompt}

AVAILABLE SECTIONS: ${Object.values(ATTRIBUTE_LABELS).join(', ')}

Your job is to build a complete intake question set. You have TWO sources:

1. LIBRARY QUESTIONS — Select 16-22 from the library above. Pick the ones that will surface what matters most for THIS specific company and role. Always include "What happened to the last person in this role?" if available. Always include decision-making questions.

   You MUST include at least 2 questions from each of these universal sections, regardless of org type:
   - great_candidate (What a Great Candidate Looks Like)
   - compensation (Compensation)
   - timeline_process (Timeline & Process)
   - working_style (Working Style & Partnership)
   - decision_making (Decision-Making)

2. CUSTOM QUESTIONS — Generate 4-8 additional questions tailored specifically to this company's situation, based on the research${hasJD ? ' and JD' : ''}. These should be things the library CAN'T cover — questions about specific business dynamics, leadership tensions, or market context unique to this company.

For each question (library or custom), assign it to a section from: ${Object.keys(ATTRIBUTE_LABELS).filter(k => k !== 'before_market').join(', ')}

Do NOT generate any questions in the "before_market" section — that section is reserved for a fixed closing template appended automatically.

${hasJD ? `Also analyze the JD for signals — what it reveals, conceals, or implies. Look for: backfill signals, urgency, comp range width, vague language hiding real problems, corporate-speak masking culture issues.` : `Without a JD, focus your analysis on what the company research tells you about likely organizational dynamics, challenges, and what the recruiter should probe during the intake.`}

Also recommend pre-filled values for the organization snapshot based on your research:
- numEmployees, revenueOrBudget, reportingTo (best guess for this level of role)
- isBackfill (true/false based on signals)
- Any org-type-specific extras you can infer

Respond ONLY with valid JSON:
{
  "libraryQuestions": [
    { "id": "question_id", "rationale": "why this question matters for this specific company" }
  ],
  "customQuestions": [
    { "section": "business_context", "text": "the custom question text", "rationale": "why this matters" }
  ],
  "signals": [
    "observation about what the ${hasJD ? 'JD and ' : ''}research reveals"
  ],
  "snapshotSuggestions": {
    "numEmployees": "value or null",
    "revenueOrBudget": "value or null",
    "reportingTo": "best guess or null",
    "isBackfill": false,
    "extras": { "key": "value" }
  }
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const clean = content.text.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    const parsed = JSON.parse(jsonMatch[0])

    // Validate library question IDs
    const validIds = new Set(questionPool.map((q) => q.id))
    const validLibraryQuestions = (parsed.libraryQuestions || [])
      .filter((lq: any) => validIds.has(lq.id))
      .map((lq: any) => {
        const question = questionPool.find((q) => q.id === lq.id)!
        return {
          id: lq.id,
          section: question.attribute,
          text: question.text,
          notes: '',
          rationale: lq.rationale || null,
          source: 'library' as const,
          isProbe: question.isProbe || false,
        }
      })

    // Build custom questions with generated IDs
    const customQuestions = (parsed.customQuestions || []).map((cq: any, i: number) => ({
      id: `custom_${Date.now()}_${i}`,
      section: cq.section || 'business_context',
      text: cq.text,
      notes: '',
      rationale: cq.rationale || null,
      source: 'ai_generated' as const,
      isProbe: false,
    }))

    // Append fixed closing block — these always appear last on every intake brief
    const closingQuestions = getClosingQuestions().map((q) => ({
      id: q.id,
      section: q.attribute,
      text: q.text,
      notes: '',
      rationale: null,
      source: 'library' as const,
      isProbe: false,
    }))

    // Merge and assign order within sections
    const allQuestions = [...validLibraryQuestions, ...customQuestions, ...closingQuestions]
    const sections = [...new Set(allQuestions.map((q: any) => q.section))]
    let globalOrder = 0
    for (const section of sections) {
      for (const q of allQuestions.filter((qq: any) => qq.section === section)) {
        q.order = globalOrder++
      }
    }

    return NextResponse.json({
      questions: allQuestions,
      signals: parsed.signals || [],
      snapshotSuggestions: parsed.snapshotSuggestions || {},
      generationPath: hasJD ? 'with_jd' : 'without_jd',
    })
  } catch (error) {
    console.error('Intake brief generation error:', error)
    return NextResponse.json({ error: 'Failed to generate intake brief' }, { status: 500 })
  }
}
