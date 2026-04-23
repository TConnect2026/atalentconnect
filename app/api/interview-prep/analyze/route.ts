import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

const anthropic = new Anthropic()

export const runtime = 'nodejs'
export const maxDuration = 60

const clip = (s: string, n = 8000) => (s.length > n ? s.slice(0, n) + '\n…[truncated]' : s)

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'no date'

const asString = (val: unknown): string => {
  if (val == null) return ''
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      candidateId,
      searchId,
      interviewId,
      stageName,
      notes,
      transcript,
    } = (await req.json()) as {
      candidateId?: string
      searchId?: string
      interviewId?: string
      stageName?: string
      notes?: string
      transcript?: string
    }

    const notesT = (notes || '').trim()
    const transcriptT = (transcript || '').trim()
    if (!notesT && !transcriptT) {
      return NextResponse.json(
        { error: 'Nothing to analyze — provide notes or a transcript first.' },
        { status: 400 },
      )
    }

    const auth = await requireFirmAccessToSearch(searchId)
    if (!auth.ok) return auth.response

    // ----- Pull supporting context -----
    const sb = auth.supabaseAdmin

    const candidatePromise = candidateId
      ? sb
          .from('candidates')
          .select('first_name, last_name, current_title, current_company, resume_url, recruiter_assessment, recruiter_notes')
          .eq('id', candidateId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const intakePromise = searchId
      ? sb
          .from('intake_briefs')
          .select('job_description_text, jd_signals, snapshot')
          .eq('search_id', searchId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const priorInterviewsPromise = candidateId
      ? sb
          .from('interviews')
          .select('id, scheduled_at, interviewer_name, interview_notes, interview_summary, stage_id')
          .eq('candidate_id', candidateId)
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true })
      : Promise.resolve({ data: [], error: null })

    const stagesPromise = searchId
      ? sb.from('stages').select('id, name').eq('search_id', searchId)
      : Promise.resolve({ data: [], error: null })

    const [candidateRes, intakeRes, priorRes, stagesRes] = await Promise.all([
      candidatePromise,
      intakePromise,
      priorInterviewsPromise,
      stagesPromise,
    ])

    const candidate = candidateRes.data as
      | {
          first_name?: string
          last_name?: string
          current_title?: string
          current_company?: string
          recruiter_assessment?: string
          recruiter_notes?: string
        }
      | null
    const intake = intakeRes.data as
      | { job_description_text?: string; jd_signals?: unknown; snapshot?: unknown }
      | null
    const priorInterviews = (priorRes.data || []) as Array<{
      id: string
      scheduled_at: string | null
      interviewer_name: string | null
      interview_notes: string | null
      interview_summary: string | null
      stage_id: string | null
    }>
    const stages = (stagesRes.data || []) as Array<{ id: string; name: string }>
    const stageNameById = new Map(stages.map(s => [s.id, s.name]))

    // Exclude the interview being analyzed from the "prior interviews" list.
    const others = priorInterviews.filter(iv => iv.id !== interviewId)

    // ----- Build context sections -----
    const candidateName = candidate ? `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() : 'Candidate'
    const recruiterAssessment = candidate?.recruiter_assessment || candidate?.recruiter_notes || ''

    const jdBlock = intake?.job_description_text
      ? `\n==== POSITION PROFILE / JD ====\n${clip(intake.job_description_text, 4000)}\n`
      : ''
    const jdSignalsBlock = intake?.jd_signals
      ? `\n==== KEY ROLE SIGNALS ====\n${clip(asString(intake.jd_signals), 2000)}\n`
      : ''
    const snapshotBlock = intake?.snapshot
      ? `\n==== ORG SNAPSHOT ====\n${clip(asString(intake.snapshot), 1500)}\n`
      : ''

    const priorInterviewsBlock =
      others.length > 0
        ? `\n==== PREVIOUS CONVERSATIONS ====\n` +
          others
            .map((iv, idx) => {
              const stage = iv.stage_id ? stageNameById.get(iv.stage_id) : null
              const header = `#${idx + 1} ${stage || 'Interview'} — ${fmtDate(iv.scheduled_at)}${iv.interviewer_name ? ` — ${iv.interviewer_name}` : ''}`
              const body = iv.interview_summary?.trim()
                ? `Summary: ${clip(iv.interview_summary, 1500)}`
                : iv.interview_notes?.trim()
                  ? `Notes: ${clip(iv.interview_notes, 2000)}`
                  : 'Notes: (none captured)'
              return `${header}\n${body}`
            })
            .join('\n\n') +
          '\n'
        : ''

    const prompt = `You are analyzing an executive interview conversation to help the search team decide what to pursue next.

==== CANDIDATE ====
${candidateName}${candidate?.current_title ? `, ${candidate.current_title}` : ''}${candidate?.current_company ? ` at ${candidate.current_company}` : ''}
${recruiterAssessment ? `\nRecruiter's assessment:\n${recruiterAssessment}\n` : ''}${jdBlock}${jdSignalsBlock}${snapshotBlock}${priorInterviewsBlock}
==== THIS CONVERSATION ====
Stage: ${stageName || 'Interview'}
${transcriptT ? `\nTranscript:\n${clip(transcriptT, 20000)}\n` : ''}${notesT ? `\nRecruiter's notes:\n${clip(notesT, 6000)}\n` : ''}
==== YOUR TASK ====
Produce a structured analysis of THIS conversation, grounded in the source material above.

Return only valid JSON with this exact shape:
{
  "summary": "3-4 sentences of plain prose synthesizing what this conversation revealed. Do not repeat what prior rounds already established — focus on what this specific conversation added.",
  "key_themes": ["4-7 concise theme labels (3-6 words each) — the dominant topics the conversation surfaced. Write as noun phrases, not full sentences."],
  "areas_to_explore": ["3-5 specific topics the NEXT interviewer should probe. Each should be a short phrase or sentence. Reference concrete details the candidate said (or didn't say). Avoid generic interview topics — only include areas where this specific conversation pointed forward."],
  "flags": ["0-4 flags only if present. Use the format 'Flag: <what>'. Examples: inconsistencies vs prior rounds, non-answers, compensation/timing concerns, anything the search team should surface. Use [] if none — do not invent."]
}

Rules:
- Be specific and grounded in the source material. Do not speculate.
- Do NOT repeat themes already surfaced in prior-round summaries above. If this conversation reinforced a prior theme, add nuance or note the confirmation; don't re-report it as new.
- Return ONLY the JSON object — no prose before, no markdown fences, no commentary.`

    const res = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    })

    const text = res.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const cleaned = text.replace(/^```json\s*|```$/g, '').trim()
    const analysis = JSON.parse(cleaned)

    // Basic shape guard.
    if (typeof analysis.summary !== 'string') {
      throw new Error('Model did not return a valid analysis shape')
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('[analyze-conversation] error:', err)
    const e = err as { message?: string }
    return NextResponse.json(
      { error: e?.message || 'Failed to analyze conversation' },
      { status: 500 },
    )
  }
}
