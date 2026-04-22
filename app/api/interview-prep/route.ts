import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic()

export const runtime = 'nodejs'
export const maxDuration = 60

type PanelistFeedback = {
  panelist_name: string
  rating: string
  comments?: string | null
}

type InterviewRow = {
  id: string
  scheduled_at: string | null
  interviewer_name: string | null
  interview_notes: string | null
  stage_id: string | null
  status: string | null
}

type StageRow = { id: string; name: string }

type IntakeBriefRow = {
  job_description_text: string | null
  jd_signals: unknown
  snapshot: unknown
  company_research: unknown
}

const serverClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'no date'

const truncate = (s: string, n = 2500) =>
  s.length > n ? s.slice(0, n) + '…[truncated]' : s

const asString = (val: unknown): string => {
  if (val == null) return ''
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

// Web-search step: ask Claude with the web_search server-tool to research
// the candidate's current company and return a concise, factual summary.
// Returns an empty string on failure — the main prep flow continues without it.
const researchCompany = async (company: string): Promise<string> => {
  if (!company?.trim()) return ''

  const researchPrompt = `Research ${company} for an executive interview prep. Use web search to find SPECIFIC, FACTUAL, RECENT information:

- Recent news (last 12 months): major announcements, product launches, partnerships, acquisitions
- Funding & financial: latest round, valuation, public/private status, recent financial reports
- Leadership: recent C-suite hires or departures, board changes, any founder/CEO transitions
- Size: current employee count, recent headcount growth or layoffs
- Challenges: known business challenges, competitive pressures, regulatory issues, public criticism, strategy pivots
- Culture signals: recent Glassdoor themes, public statements on values, notable employee moves

Return a tight plain-text summary (300-500 words max) organized under those same headings. Include dates wherever you have them (month/year). If you can't find something concrete under a heading, say "No recent public signal" rather than speculate. Cite sources briefly inline like "(per TechCrunch, Aug 2025)". Do NOT make up facts. If a claim isn't supported by search results, leave it out.`

  try {
    const res = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1800,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ] as unknown as Anthropic.Tool[],
      messages: [{ role: 'user', content: researchPrompt }],
    })

    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()

    return text
  } catch (err) {
    console.warn('[interview-prep] company research failed, continuing without it:', err)
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      candidateId,
      searchId,
      candidateName,
      currentTitle,
      currentCompany,
      recruiterAssessment,
      positionTitle,
      companyName,
      stageName,
      previousFeedback,
    } = await request.json()

    // ----- Fetch server-side context -----
    const sb = serverClient()

    // All interviews for this candidate, oldest first, excluding cancelled.
    const interviewsPromise = candidateId
      ? sb
          .from('interviews')
          .select('id, scheduled_at, interviewer_name, interview_notes, stage_id, status')
          .eq('candidate_id', candidateId)
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true })
      : Promise.resolve({ data: [] as InterviewRow[], error: null })

    // Intake brief (JD text + signals + org snapshot).
    const intakePromise = searchId
      ? sb
          .from('intake_briefs')
          .select('job_description_text, jd_signals, snapshot, company_research')
          .eq('search_id', searchId)
          .maybeSingle()
      : Promise.resolve({ data: null as IntakeBriefRow | null, error: null })

    // Stages for resolving stage names on previous interviews.
    const stagesPromise = searchId
      ? sb.from('stages').select('id, name').eq('search_id', searchId)
      : Promise.resolve({ data: [] as StageRow[], error: null })

    // Kick off the company research in parallel with Supabase fetches so total wall time ≈ max(research, db).
    const researchPromise = researchCompany(currentCompany || '')

    const [interviewsRes, intakeRes, stagesRes, companyResearch] = await Promise.all([
      interviewsPromise,
      intakePromise,
      stagesPromise,
      researchPromise,
    ])

    const interviews = (interviewsRes.data || []) as InterviewRow[]
    const intake = (intakeRes.data || null) as IntakeBriefRow | null
    const stages = (stagesRes.data || []) as StageRow[]
    const stageNameById = new Map(stages.map(s => [s.id, s.name]))

    // Only include interviews that have actually happened (past scheduled_at) AND
    // exclude the current stage itself so the prompt is "what prior interviewers covered".
    const now = Date.now()
    const pastInterviews = interviews.filter(iv =>
      iv.scheduled_at && new Date(iv.scheduled_at).getTime() < now
    )

    // ----- Format prompt sections -----

    const jdBlock = intake?.job_description_text
      ? `\n==== POSITION PROFILE / JD ====\n${truncate(intake.job_description_text, 4000)}\n`
      : ''

    const jdSignalsBlock =
      intake?.jd_signals && (Array.isArray(intake.jd_signals) ? intake.jd_signals.length > 0 : true)
        ? `\n==== KEY ROLE SIGNALS (from intake brief) ====\n${truncate(asString(intake.jd_signals), 2000)}\n`
        : ''

    const orgSnapshotBlock = intake?.snapshot
      ? `\n==== ORG SNAPSHOT ====\n${truncate(asString(intake.snapshot), 1500)}\n`
      : ''

    const previousInterviewsBlock =
      pastInterviews.length > 0
        ? `\n==== PREVIOUS CONVERSATIONS (chronological) ====\n` +
          pastInterviews
            .map((iv, idx) => {
              const stage = iv.stage_id ? stageNameById.get(iv.stage_id) : null
              const header = `#${idx + 1} ${stage || 'Interview'} — ${fmtDate(iv.scheduled_at)}${iv.interviewer_name ? ` — Interviewer: ${iv.interviewer_name}` : ''}`
              const notes = iv.interview_notes?.trim()
                ? `Notes: ${truncate(iv.interview_notes, 1500)}`
                : 'Notes: (no written notes captured)'
              return `${header}\n${notes}`
            })
            .join('\n\n') +
          '\n'
        : '\n==== PREVIOUS CONVERSATIONS ====\n(No prior interviews — this is an early-round conversation.)\n'

    const companyResearchBlock = companyResearch
      ? `\n==== CURRENT EMPLOYER CONTEXT (web research on ${currentCompany}) ====\n${companyResearch}\n`
      : ''

    const panelistFeedbackBlock =
      previousFeedback?.length > 0
        ? `\n==== PANELIST QUICK FEEDBACK ====\n${(previousFeedback as PanelistFeedback[])
            .map(
              (f) =>
                `- ${f.panelist_name}: ${
                  f.rating === 'thumbs_up'
                    ? 'Positive'
                    : f.rating === 'thumbs_down'
                      ? 'Concerns raised'
                      : 'Mixed'
                }${f.comments ? ` — "${f.comments}"` : ''}`,
            )
            .join('\n')}\n`
        : ''

    const isLaterRound = pastInterviews.length > 0

    const prompt = `You are helping a hiring manager prep for an executive search interview. Your job is to help them think and be genuinely curious — not perform the role of "interviewer."

==== ROLE ====
${positionTitle} at ${companyName}
Current stage: ${stageName || 'Interview'}
${jdBlock}${jdSignalsBlock}${orgSnapshotBlock}
==== CANDIDATE ====
${candidateName}${currentTitle ? `, ${currentTitle}` : ''}${currentCompany ? ` at ${currentCompany}` : ''}
${recruiterAssessment ? `\nRecruiter's assessment:\n${recruiterAssessment}\n` : ''}${companyResearchBlock}${previousInterviewsBlock}${panelistFeedbackBlock}
==== YOUR TASK ====
Generate prep for the NEXT conversation — the one happening now. You are writing for THIS interviewer, not the ones who came before.

BUILD ON WHAT'S ALREADY BEEN LEARNED. Do not repeat territory that previous interviewers already covered in their notes. Specifically:
- Identify what prior conversations revealed about this candidate
- Identify what's still UNTESTED — areas the JD or role signals suggest matter but haven't been probed
- Identify UNRESOLVED TENSIONS — places where prior notes show ambiguity, disagreement between interviewers, or surface-level answers that deserve a deeper follow-up
- Tailor questions to fill those gaps. If prior notes already established the candidate's P&L experience, don't ask about it again — move to the next unanswered question
- When a prior conversation touched something but didn't resolve it, reference it specifically (e.g. "Picking up the [topic] thread from [prior interviewer] — what I'd want to understand is...")

GROUND QUESTIONS IN WHAT'S ACTUALLY HAPPENING AT THEIR COMPANY. The CURRENT EMPLOYER CONTEXT section above contains specific, factual, recent information about ${currentCompany || 'the candidate\'s current employer'}. Use it:
- Reference specific events, products, numbers, dates, or leadership changes from that section
- Do NOT invent or speculate beyond what's in that section — only cite things explicitly stated there
- Tie the question to a concrete reality: "Your team just went through [X] — how did that land on the floor?" beats "How do you handle organizational change?"
- Avoid generic questions. If an otherwise-useful question would work for any candidate at any company, rewrite it with a specific detail from the research
- If the research says "No recent public signal" under a heading, that area is off-limits — don't fabricate

Generate three pieces of content:

BRIEFING — "briefing": A 2-3 sentence plain-English summary of where things stand with this candidate. If there are prior interviews, synthesize what's been learned and what remains open. If this is round 1, summarize who they are and why they're being considered. Write for someone walking into the conversation fresh.

SET 1 — "things_to_think_about": 3 pre-interview reflection questions to help THIS interviewer clarify their own thinking before the conversation. Not questions to ask the candidate — questions to help the interviewer show up with genuine curiosity. Each has a "note" (1 sentence, why it matters for this specific candidate, this specific role, and this specific moment in the process).

SET 2 — "conversation_topics": 4 conversation territories to explore with the candidate. Each territory should be distinct from what prior interviewers covered. For each:
- "tag": one of: "probe", "validate", "culture", "tradeoff"
- "topic": 4-6 word title
- "text": 1-2 sentences on what's worth exploring and why — be honest about tensions and unresolved threads from prior conversations, don't just cheerlead
- "starter": how a curious, direct person would actually open this territory in real conversation

CRITICAL rules for starters:
- NEVER use "Tell me about a time" or "Walk me through a time" — these are performative interview formulas that produce rehearsed answers
- NEVER start with "Can you" or "Could you"
- CRITICAL: Never use "I", "you need", "you'll want", "so you", or any second-person directive language. Write all content as direct neutral statements. Not "You need clarity on leadership" but "Worth understanding what leadership indicators matter most here." Not "I need to know" but "The key question is..." Statements, not instructions.
- Write like a real human being having a real conversation — direct, specific, warm
- Reference actual details from the candidate's background, this specific role, OR prior conversation notes
- The goal is to open genuine territory, not trigger a rehearsed answer
- Good examples: "The ERP thing is interesting — we don't have one. How does that actually change your day-to-day?" or "Sarah in the last round heard about the 2021 move but didn't get to why. What was actually going on there?"
${isLaterRound ? '\nThis is a later round — previous interviewers have already covered ground. Do NOT duplicate their questions. Focus on unresolved questions, discrepancies, and deeper layers of topics that were touched but not landed.' : '\nThis is the first conversation — set a strong foundation. Future interviewers will build on what this one covers.'}

Return only valid JSON with keys "briefing" (string), "things_to_think_about" (array of {question, note}), and "conversation_topics" (array of {tag, topic, text, starter}). No markdown, no preamble.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2500,
      thinking: { type: 'adaptive' },
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
