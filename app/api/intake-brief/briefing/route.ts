import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { companyName, companyData, news, positionTitle } = await request.json()

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
      : 'No recent news items on file.'

    const prompt = `You are briefing a recruiter before a client intake meeting. Write a 3–4 sentence narrative briefing about ${companyName} for the ${positionTitle || 'role'} they're hiring.

The briefing should tell the story of where this company is right now and why that matters for this hire. Use the specific details below — don't be generic.

COMPANY FACTS:
${facts.join('\n') || '(no company intel on file)'}

RECENT NEWS:
${newsLines}

Return ONLY the 3–4 sentence briefing as plain prose. No preamble, no headers, no bullets.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }

    return NextResponse.json({ briefing: text.trim() })
  } catch (err: any) {
    console.error('Briefing generation error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to generate briefing' },
      { status: 500 }
    )
  }
}
