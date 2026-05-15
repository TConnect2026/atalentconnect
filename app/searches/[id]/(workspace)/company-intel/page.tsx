"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { CompanyDetailsPanel } from "@/components/pipeline/company-details-panel"

const supabase = createClient()

export default function CompanyIntelPage() {
  const params = useParams()
  const searchId = params.id as string

  const [search, setSearch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase.from('searches').select('*').eq('id', searchId).single()
    setSearch(data)
    setIsLoading(false)
  }, [searchId])

  useEffect(() => { load() }, [load])

  if (isLoading) return <div className="p-6 text-sm text-text-muted">Loading…</div>
  if (!search) return <div className="p-6 text-sm text-red-600">Search not found.</div>

  return (
    <div className="max-w-5xl mx-auto">
      <CompanyDetailsPanel searchId={searchId} search={search} hideOwnHeader onUpdate={load} />
    </div>
  )
}
