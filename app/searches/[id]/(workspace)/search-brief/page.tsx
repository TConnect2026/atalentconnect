"use client"

export const dynamic = 'force-dynamic'

import { FileText, Sparkles } from "lucide-react"

export default function SearchBriefPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-6 h-6 text-navy" />
        <h1 className="text-2xl font-bold text-navy">Search Brief</h1>
      </div>
      <p className="text-sm text-text-muted mb-6">
        Generate a tailored question set to guide your client conversation.
        Pulls context from Company Intel, the JD, and the search Essentials.
      </p>

      <div className="bg-white border border-ds-border rounded-md p-6 space-y-5">
        <button
          type="button"
          onClick={() => alert('Search Brief generation coming soon.')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-navy hover:bg-navy/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Search Brief →
        </button>

        <p className="text-xs text-text-muted italic">
          Coming soon: AI-generated questions across business context, role
          definition, culture, decision-making, success metrics, and tradeoffs.
        </p>
      </div>
    </div>
  )
}
