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
      max_tokens: 1500,
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
          content: `Research the company "${companyName}" and return ONLY a JSON object with these fields. No other text, no markdown, no explanation. Just the JSON.

{
  "company_description": "2-3 sentence description of what the company does",
  "company_industry": "primary industry",
  "company_size": "approximate employee count or range",
  "company_address": "headquarters city and state/country",
  "company_founded": "year founded",
  "company_website": "company website URL",
  "company_linkedin": "LinkedIn company page URL",
  "company_type": "public, private, or nonprofit",
  "company_stock_ticker": "stock ticker if public, empty string if not",
  "company_specialties": ["array", "of", "key", "specialties"]
}

If you cannot find information for a field, use an empty string or empty array. Return ONLY valid JSON.`,
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
    let companyData

    try {
      companyData = JSON.parse(cleaned)
    } catch {
      console.error("Failed to parse company intel response:", cleaned)
      return NextResponse.json(
        { error: "Failed to parse company research results" },
        { status: 500 }
      )
    }

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (companyData.company_description) updateFields.company_description = companyData.company_description
    if (companyData.company_industry) updateFields.company_industry = companyData.company_industry
    if (companyData.company_size) updateFields.company_size = companyData.company_size
    if (companyData.company_address) updateFields.company_address = companyData.company_address
    if (companyData.company_founded) updateFields.company_founded = companyData.company_founded
    if (companyData.company_website) updateFields.company_website = companyData.company_website
    if (companyData.company_linkedin) updateFields.company_linkedin = companyData.company_linkedin
    if (companyData.company_type) updateFields.company_type = companyData.company_type
    if (companyData.company_stock_ticker) updateFields.company_stock_ticker = companyData.company_stock_ticker
    if (companyData.company_specialties?.length > 0) updateFields.company_specialties = companyData.company_specialties

    const { error: updateError } = await supabaseAdmin
      .from("searches")
      .update(updateFields)
      .eq("id", searchId)

    if (updateError) {
      console.error("Failed to save company intel:", updateError)
      return NextResponse.json(
        { error: "Failed to save company research" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: companyData })
  } catch (error) {
    console.error("Company intel error:", error)
    return NextResponse.json(
      { error: "Failed to research company" },
      { status: 500 }
    )
  }
}
