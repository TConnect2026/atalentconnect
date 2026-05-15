"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { IntakePanel } from "@/components/pipeline/intake-panel"

const supabase = createClient()

export default function SearchDetailsPage() {
  const params = useParams()
  const searchId = params.id as string

  const [search, setSearch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      const { data } = await supabase.from('searches').select('*').eq('id', searchId).single()
      if (!cancelled) {
        setSearch(data)
        setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [searchId])

  if (isLoading) {
    return <div className="p-6 text-sm text-text-muted">Loading…</div>
  }

  if (!search) {
    return <div className="p-6 text-sm text-red-600">Search not found.</div>
  }

  return <IntakePanel searchId={searchId} search={search} pageMode="search_details" />
}
