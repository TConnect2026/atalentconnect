import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

type ParsedResume = {
  first_name: string
  last_name: string
  current_title: string
  current_company: string
  linkedin_url: string
  location: string
  email: string
  phone: string
}

const EMPTY: ParsedResume = {
  first_name: '',
  last_name: '',
  current_title: '',
  current_company: '',
  linkedin_url: '',
  location: '',
  email: '',
  phone: '',
}

const normalizeLinkedIn = (raw: string): string => {
  const v = raw.trim()
  if (!v) return ''
  // Strip protocol + optional www. so we can match on the core host+path
  const stripped = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  if (!/^linkedin\.com\//i.test(stripped)) return '' // not recognizable as a LinkedIn URL
  return `https://${stripped.replace(/\/+$/, '')}` // canonical form, no trailing slash
}

const extractJson = (text: string): ParsedResume => {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const objectMatch = trimmed.match(/\{[\s\S]*\}/)
  const raw = fenceMatch?.[1] ?? objectMatch?.[0] ?? trimmed
  const parsed = JSON.parse(raw) as Partial<ParsedResume>
  return {
    first_name: String(parsed.first_name ?? '').trim(),
    last_name: String(parsed.last_name ?? '').trim(),
    current_title: String(parsed.current_title ?? '').trim(),
    current_company: String(parsed.current_company ?? '').trim(),
    linkedin_url: normalizeLinkedIn(String(parsed.linkedin_url ?? '')),
    location: String(parsed.location ?? '').trim(),
    email: String(parsed.email ?? '').trim(),
    phone: String(parsed.phone ?? '').trim(),
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF must be under 10MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')

    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Extract the following fields from this resume and return ONLY a JSON object with these keys:

- first_name: candidate's first name
- last_name: candidate's last name
- current_title: the candidate's most recent job title (the one listed first, or the one marked as current/present)
- current_company: the employer for that most recent role
- linkedin_url: the candidate's LinkedIn profile URL. Look CAREFULLY for LinkedIn in the header/contact section at the top of the resume — it is usually listed alongside email and phone, often in short form. Scan the full document for any "linkedin.com" substring or "/in/" path segment. Accept every form resumes use:
  * "https://www.linkedin.com/in/jane-doe-123"
  * "linkedin.com/in/jane"
  * "www.linkedin.com/in/jane"
  * "LinkedIn: linkedin.com/in/jane"
  * "in/jane-doe" with a clear LinkedIn label or hyperlink nearby
  * Hyperlinked anchor text like "LinkedIn Profile" — extract the underlying URL from the PDF link
  Always return the canonical form "https://linkedin.com/in/<slug>": prepend "https://" if missing, strip any "www." prefix, drop any trailing slash, and keep the /in/<slug> path intact. Return empty string ONLY when there is no LinkedIn reference anywhere in the document — do not guess from the person's name.
- location: city and state/country of the candidate, otherwise empty string
- email: candidate's personal/contact email address, otherwise empty string
- phone: candidate's phone number exactly as written on the resume (keep formatting characters like dashes, dots, parentheses, country codes), otherwise empty string

For any field you cannot confidently determine, return an empty string "". Do not guess. Return only the raw JSON object — no prose, no markdown fences, no preamble.`,
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (!textBlock) {
      return NextResponse.json({ error: 'Model returned no text' }, { status: 502 })
    }

    let parsed: ParsedResume
    try {
      parsed = extractJson(textBlock.text)
    } catch (err) {
      console.error('Failed to parse extraction JSON:', textBlock.text, err)
      return NextResponse.json(
        { error: 'Failed to parse extraction response', raw: textBlock.text },
        { status: 502 },
      )
    }

    return NextResponse.json({ ...EMPTY, ...parsed })
  } catch (err: unknown) {
    console.error('Parse resume error:', err)
    const e = err as { message?: string; status?: number }
    const message = e?.message || 'Failed to parse resume'
    const status = typeof e?.status === 'number' ? e.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
