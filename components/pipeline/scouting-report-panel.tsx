"use client"

import { useState, useEffect, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase-client"

const supabase = createClient()

interface ScoutingReportPanelProps {
  searchId: string
  search: any
  onUpdate?: () => void
}

export function ScoutingReportPanel({ searchId, search, onUpdate }: ScoutingReportPanelProps) {
  const [marketLandscape, setMarketLandscape] = useState(search?.market_landscape || "")
  const [targetCompanies, setTargetCompanies] = useState(search?.target_companies || "")
  const [compBenchmarking, setCompBenchmarking] = useState(search?.comp_benchmarking || "")
  const [isSaving, setIsSaving] = useState(false)

  const saveField = useCallback(async (field: string, value: string) => {
    setIsSaving(true)
    try {
      await supabase
        .from('searches')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', searchId)
    } catch (err) {
      console.error('Error saving scouting report:', err)
    } finally {
      setIsSaving(false)
    }
  }, [searchId])

  return (
    <div className="px-6 pb-6 pt-3 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Research notes and market intelligence for this search.</p>
        {isSaving && <span className="text-[11px] text-text-muted">Saving...</span>}
      </div>

      <div>
        <Label className="text-base font-bold text-navy">Market Landscape</Label>
        <p className="text-xs text-text-muted mb-1.5">Industry trends, talent availability, market dynamics</p>
        <textarea
          value={marketLandscape}
          onChange={(e) => setMarketLandscape(e.target.value)}
          onBlur={() => saveField('market_landscape', marketLandscape)}
          placeholder="Notes on the talent market for this role..."
          className="w-full h-32 px-4 py-3 text-sm border border-ds-border rounded-lg bg-bg-page focus:border-navy focus:outline-none resize-y"
        />
      </div>

      <div>
        <Label className="text-base font-bold text-navy">Target Companies</Label>
        <p className="text-xs text-text-muted mb-1.5">Companies to source from, competitors, peer organizations</p>
        <textarea
          value={targetCompanies}
          onChange={(e) => setTargetCompanies(e.target.value)}
          onBlur={() => saveField('target_companies', targetCompanies)}
          placeholder="List target companies and sourcing strategy..."
          className="w-full h-32 px-4 py-3 text-sm border border-ds-border rounded-lg bg-bg-page focus:border-navy focus:outline-none resize-y"
        />
      </div>

      <div>
        <Label className="text-base font-bold text-navy">Compensation Benchmarking</Label>
        <p className="text-xs text-text-muted mb-1.5">Market comp data, ranges, equity benchmarks</p>
        <textarea
          value={compBenchmarking}
          onChange={(e) => setCompBenchmarking(e.target.value)}
          onBlur={() => saveField('comp_benchmarking', compBenchmarking)}
          placeholder="Compensation benchmarking notes..."
          className="w-full h-32 px-4 py-3 text-sm border border-ds-border rounded-lg bg-bg-page focus:border-navy focus:outline-none resize-y"
        />
      </div>
    </div>
  )
}
