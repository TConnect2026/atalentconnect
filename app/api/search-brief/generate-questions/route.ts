import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireFirmAccessToSearch } from "@/lib/api-auth"
import { logAnthropicUsage } from "@/lib/anthropic-usage"
import {
  ALL_QUESTIONS,
  getClosingQuestions,
  type IntakeQuestion,
  type QuestionAttribute,
} from "@/lib/intake-questions"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Section id used on the wire + in the persisted JSONB.
type SectionId =
  | "role_basics"
  | "compensation"
  | "timeline_process"
  | "great_candidate"
  | "before_market"

const SECTION_ORDER: { id: SectionId; label: string }[] = [
  { id: "role_basics", label: "Role Basics" },
  { id: "compensation", label: "Compensation" },
  { id: "timeline_process", label: "Timeline and Process" },
  { id: "great_candidate", label: "What a Great Candidate Looks Like" },
  // before_market always renders last — enforced both here and on the
  // frontend so reorders by the AI can't move it.
  { id: "before_market", label: "Before We Go to Market" },
]

// Maps library attributes onto the 5 user-facing sections. team_culture,
// mission_alignment, and hidden_disqualifier default to great_candidate.
function sectionForAttribute(attr: QuestionAttribute): SectionId {
  switch (attr) {
    case "business_context":
    case "decision_making":
    case "governance_leadership":
    case "success_picture":
      return "role_basics"
    case "compensation":
      return "compensation"
    case "timeline_process":
      return "timeline_process"
    case "great_candidate":
    case "working_style":
    case "failure_pattern":
      return "great_candidate"
    case "before_market":
      return "before_market"
    default:
      return "great_candidate"
  }
}

// Final wire/persistence shape — what the API returns and what gets stored
// in searches.generated_question_set.
interface GeneratedQuestion {
  id: string
  text: string
  source: "library" | "custom"
  library_id?: string
}
interface GeneratedSection {
  id: SectionId
  label: string
  questions: GeneratedQuestion[]
}
interface GeneratedQuestionSet {
  sections: GeneratedSection[]
  generated_at: string
}

// Raw selection emitted by the AI. We keep the AI's job narrow: pick
// library ids (we resolve text server-side, guaranteeing parity with the
// library) and emit any custom questions as full text strings.
interface AISelection {
  library_ids: string[]
  custom_questions: Array<{ section: SectionId; text: string }>
}

function buildSections(selection: AISelection): GeneratedSection[] {
  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]))
  const buckets: Record<SectionId, GeneratedQuestion[]> = {
    role_basics: [],
    compensation: [],
    timeline_process: [],
    great_candidate: [],
    before_market: [],
  }
  const seenLibrary = new Set<string>()

  // Library picks first — resolved against the canonical text.
  for (const id of selection.library_ids || []) {
    if (seenLibrary.has(id)) continue
    const q = byId.get(id)
    if (!q) continue
    seenLibrary.add(id)
    const section = sectionForAttribute(q.attribute)
    buckets[section].push({
      id: `lib_${q.id}`,
      text: q.text,
      source: "library",
      library_id: q.id,
    })
  }

  // Custom AI-generated questions go where the AI told us, defaulting to
  // great_candidate if the section name is unrecognized.
  for (const custom of selection.custom_questions || []) {
    if (!custom?.text?.trim()) continue
    const section = (SECTION_ORDER.find((s) => s.id === custom.section)?.id ??
      "great_candidate") as SectionId
    if (section === "before_market") continue // closing block is library-only
    const cid = `custom_${Math.random().toString(36).slice(2, 10)}`
    buckets[section].push({
      id: cid,
      text: custom.text.trim(),
      source: "custom",
    })
  }

  // Closing questions (before_market) always go in last — sourced directly
  // from the library, regardless of what the AI did or didn't select.
  const closing = getClosingQuestions()
  for (const q of closing) {
    if (seenLibrary.has(q.id)) continue
    seenLibrary.add(q.id)
    buckets.before_market.push({
      id: `lib_${q.id}`,
      text: q.text,
      source: "library",
      library_id: q.id,
    })
  }

  return SECTION_ORDER.map((s) => ({
    id: s.id,
    label: s.label,
    questions: buckets[s.id],
  })).filter((s) => s.questions.length > 0 || s.id === "before_market")
}

// Compact library payload sent to the AI — id, text, attribute, optional
// orgTypes scope. The AI sees what's available and picks what fits.
function libraryForPrompt(): string {
  return ALL_QUESTIONS.map((q: IntakeQuestion) => {
    const scope = q.universal ? "universal" : q.orgTypes.join("|") || "n/a"
    return `${q.id} [${q.attribute}, ${scope}] ${q.text}`
  }).join("\n")
}

const STYLE_RULES = `Style rules (non-negotiable):
- Never use "tell me about a time" or "walk me through a time".
- Never write in first person ("I need to...", "I want to...").
- Never give second-person directives ("you need to...", "you'll want to...").
- Write as neutral, direct statements addressed to a client.
- Use "culture" — never "culture fit".
- No SaaS-speak, no HR-compliance language, no em dashes.
If a candidate library question violates these rules, skip it — don't include it.`

export async function POST(request: NextRequest) {
  try {
    const { searchId } = await request.json()
    if (!searchId || typeof searchId !== "string") {
      return NextResponse.json({ error: "searchId is required" }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(searchId)
    if (!auth.ok) return auth.response
    const supabaseAdmin = auth.supabaseAdmin

    const [searchRes, contactsRes] = await Promise.all([
      supabaseAdmin
        .from("searches")
        .select(
          [
            "id",
            "company_name",
            "position_title",
            "search_type",
            "context_narrative",
            "reports_to",
            "direct_reports",
            "compensation",
            "company_description",
            "company_industry",
            "company_size",
            "company_type",
            "company_news",
            "position_location",
            "work_arrangement",
            "open_to_relocation",
            "reason_for_opening",
          ].join(", ")
        )
        .eq("id", searchId)
        .maybeSingle(),
      supabaseAdmin
        .from("contacts")
        .select("name, title, role")
        .eq("search_id", searchId),
    ])
    if (searchRes.error) {
      return NextResponse.json(
        { error: `Failed to load search: ${searchRes.error.message}` },
        { status: 500 }
      )
    }
    const search: any = searchRes.data || {}
    const contacts = Array.isArray(contactsRes.data) ? contactsRes.data : []

    const contextBlock = JSON.stringify(
      {
        company_name: search.company_name || null,
        position_title: search.position_title || null,
        search_type: search.search_type || null,
        reason_for_opening: search.reason_for_opening || null,
        reports_to: search.reports_to || null,
        direct_reports: Array.isArray(search.direct_reports)
          ? search.direct_reports
          : [],
        position_location: search.position_location || null,
        work_arrangement: search.work_arrangement || null,
        open_to_relocation: !!search.open_to_relocation,
        compensation: search.compensation || null,
        context_narrative: search.context_narrative || null,
        company_description: search.company_description || null,
        company_industry: search.company_industry || null,
        company_size: search.company_size || null,
        company_type: search.company_type || null,
        company_news: search.company_news || null,
        contacts: contacts
          .filter((c: any) => (c?.name || "").trim() || (c?.title || "").trim())
          .map((c: any) => ({
            name: c.name,
            title: c.title,
            role: c.role,
          })),
      },
      null,
      2
    )

    const userPrompt = `You are preparing a question set an executive recruiter will use during a client intake conversation about an open executive search.

SEARCH CONTEXT (JSON):
${contextBlock}

QUESTION LIBRARY (id [attribute, scope] text):
${libraryForPrompt()}

${STYLE_RULES}

TASK:
1. Pick the most relevant library questions for THIS search. Aim for roughly 3-6 library questions per section across these sections:
   - role_basics (library attributes: business_context, decision_making, governance_leadership, success_picture)
   - compensation (library attribute: compensation)
   - timeline_process (library attribute: timeline_process)
   - great_candidate (library attributes: great_candidate, working_style, failure_pattern, team_culture, mission_alignment, hidden_disqualifier)
2. Generate 2-3 NEW custom questions that are specifically tailored to this company, position, and any context you can pull from company_description, company_industry, company_news, context_narrative, reason_for_opening, or the position_title. Distribute them across role_basics and great_candidate as appropriate. Custom questions must obey the style rules.
3. DO NOT include any "before_market" library questions — those are appended automatically on the server.

OUTPUT — return ONLY a single JSON object, no commentary, no markdown:
{
  "library_ids": ["dm_3", "pe_bc_1", ...],
  "custom_questions": [
    { "section": "role_basics", "text": "..." },
    { "section": "great_candidate", "text": "..." }
  ]
}`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: userPrompt }],
    })
    logAnthropicUsage(
      "search-brief/generate-questions",
      "claude-sonnet-4-6",
      response.usage
    )

    let raw = ""
    for (const block of response.content) {
      if (block.type === "text") raw += block.text
    }
    const cleaned = raw.replace(/```json|```/g, "").trim()
    let selection: AISelection
    try {
      selection = JSON.parse(cleaned)
    } catch {
      console.error("Failed to parse AI response:", cleaned)
      return NextResponse.json(
        { error: "Model returned malformed JSON" },
        { status: 502 }
      )
    }

    const sections = buildSections(selection)
    const out: GeneratedQuestionSet = {
      sections,
      generated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseAdmin
      .from("searches")
      .update({ generated_question_set: out, updated_at: new Date().toISOString() })
      .eq("id", searchId)
    if (updateError) {
      console.error("Failed to save question set:", updateError)
      return NextResponse.json(
        { error: "Failed to save question set" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, questionSet: out })
  } catch (err: any) {
    console.error("generate-questions error:", err?.message || err)
    return NextResponse.json(
      { error: err?.message || "Failed to generate question set" },
      { status: 500 }
    )
  }
}
