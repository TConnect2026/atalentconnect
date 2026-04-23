import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireFirmAccessToSearch } from "@/lib/api-auth"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { searchId, companyName } = await request.json()

    if (!searchId || !companyName) {
      return NextResponse.json(
        { error: "searchId and companyName are required" },
        { status: 400 }
      )
    }

    const auth = await requireFirmAccessToSearch(searchId)
    if (!auth.ok) return auth.response
    const supabaseAdmin = auth.supabaseAdmin

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Find the 5 most recent news items about the company "${companyName}". Return ONLY a JSON object with this exact shape. No other text, no markdown, no explanation. Just the JSON.

{
  "news": [
    {
      "title": "article headline",
      "source": "publication or site name",
      "date": "YYYY-MM-DD",
      "summary": "one-sentence summary of the article",
      "url": "direct URL to the article"
    }
  ]
}

Sort by most recent first. Include exactly 5 items. Each summary must be a single sentence. Return ONLY valid JSON.`,
        },
      ],
    })

    let responseText = ""
    for (const block of response.content) {
      if (block.type === "text") {
        responseText += block.text
      }
    }

    const cleaned = responseText.replace(/```json|```/g, "").trim()
    let parsed: { news?: unknown }

    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error("Failed to parse company news response:", cleaned)
      return NextResponse.json(
        { error: "Failed to parse news results" },
        { status: 500 }
      )
    }

    const news = Array.isArray(parsed.news)
      ? (parsed.news as any[])
          .filter((n) => n && typeof n === "object")
          .map((n) => ({
            title: String(n.title || ""),
            source: String(n.source || ""),
            date: String(n.date || ""),
            summary: String(n.summary || ""),
            url: String(n.url || ""),
          }))
          .slice(0, 5)
      : []

    const { error: updateError } = await supabaseAdmin
      .from("searches")
      .update({
        company_news: news,
        updated_at: new Date().toISOString(),
      })
      .eq("id", searchId)

    if (updateError) {
      console.error("Failed to save company news:", updateError)
      return NextResponse.json(
        { error: "Failed to save news" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, news })
  } catch (error) {
    console.error("Company news error:", error)
    return NextResponse.json(
      { error: "Failed to fetch company news" },
      { status: 500 }
    )
  }
}
