import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { companyName, companyWebsite, companyLocation, confirmedCompany } = await request.json()

    if (!companyName || companyName.trim().length < 2) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // If a confirmed company was selected from disambiguation, do a focused deep research
    if (confirmedCompany) {
      return await deepResearch(confirmedCompany)
    }

    // Build context hints from optional fields
    const hints = [
      companyWebsite ? `Website: ${companyWebsite}` : '',
      companyLocation ? `Location: ${companyLocation}` : '',
    ].filter(Boolean).join('\n')
    const hintsBlock = hints ? `\n\nAdditional context provided by the recruiter:\n${hints}` : ''

    // Step 1: Search and identify possible matches
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [
        {
          role: 'user',
          content: `Search for the company "${companyName}".${hintsBlock}

There may be multiple companies with similar names. Use the website and location hints (if provided) to narrow down which company is meant.

Return ONLY valid JSON — no markdown, no explanation.

If there is ONE clear, unambiguous match (e.g. searching "Stripe" clearly means Stripe the payments company, or the website/location makes it obvious), return:
{
  "ambiguous": false,
  "research": ${RESEARCH_SCHEMA}
}

If the name could refer to MULTIPLE companies and the hints aren't enough to disambiguate, return:
{
  "ambiguous": true,
  "candidates": [
    {
      "company_name": "official name",
      "industry": "primary industry",
      "headquarters": "city, state/country",
      "description": "one sentence — what this company does",
      "employee_count": "approximate headcount if known",
      "distinguisher": "one phrase that makes this company unique vs the others"
    }
  ]
}

Return 2-3 candidates maximum. Only flag as ambiguous if there are genuinely different companies that could match — not just because the company is less well known.`,
        },
      ],
    })

    let resultText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text
      }
    }

    const clean = resultText.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    const parsed = JSON.parse(jsonMatch[0])

    if (parsed.ambiguous && parsed.candidates?.length > 1) {
      return NextResponse.json({
        ambiguous: true,
        candidates: parsed.candidates,
      })
    }

    // Unambiguous — return the research directly
    const research = parsed.research || parsed
    delete research.ambiguous
    delete research.candidates
    return NextResponse.json({ ambiguous: false, research })
  } catch (error) {
    console.error('Company research error:', error)
    return NextResponse.json({ error: 'Failed to research company' }, { status: 500 })
  }
}

async function deepResearch(confirmedCompany: { company_name: string; industry: string; headquarters: string; description: string }) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [
        {
          role: 'user',
          content: `Research this specific company in depth:
Company: ${confirmedCompany.company_name}
Industry: ${confirmedCompany.industry}
HQ: ${confirmedCompany.headquarters}
Description: ${confirmedCompany.description}

Search for recent news, funding, leadership, and culture information about THIS specific company.

Return ONLY valid JSON — no markdown:
${RESEARCH_SCHEMA}`,
        },
      ],
    })

    let resultText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text
      }
    }

    const clean = resultText.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({ ambiguous: false, research: parsed })
  } catch (error) {
    console.error('Deep research error:', error)
    return NextResponse.json({ error: 'Failed to research company' }, { status: 500 })
  }
}

const RESEARCH_SCHEMA = `{
  "company_name": "official company name",
  "industry": "primary industry",
  "sub_industry": "specific sub-industry or sector",
  "description": "1-2 sentence description of what the company does",
  "headquarters": "city, state/country",
  "employee_count": "approximate headcount or range",
  "revenue_or_budget": "revenue estimate, budget, or funding total if available",
  "founded": "year founded",
  "org_type_signal": "startup | growth_pe | established_private | public_company | nonprofit | public_sector",
  "org_type_reasoning": "one sentence why this org type fits",
  "ownership": "public / private / PE-backed / family-owned / nonprofit / government etc.",
  "funding": {
    "stage": "Series A / Series B / IPO / bootstrapped / etc.",
    "total_raised": "total funding if applicable",
    "key_investors": "notable investors if applicable",
    "last_round": "most recent funding event if applicable"
  },
  "leadership": [
    { "name": "person name", "title": "their title", "tenure": "how long in role if known" }
  ],
  "culture_signals": [
    "observation about culture, values, or work environment"
  ],
  "recent_news": [
    "significant recent development, announcement, or event"
  ],
  "risks_and_context": [
    "anything a recruiter should know — layoffs, reorgs, controversies, market headwinds"
  ],
  "competitors": ["competitor 1", "competitor 2"],
  "confidence": "high | medium | low"
}`
