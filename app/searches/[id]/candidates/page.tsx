'use client'

// Legacy route: candidate pipeline now lives at /searches/[id]/pipeline.
// Redirect any bookmarks, deep links, or in-app navigation that still
// points here. Will be removed once the rest of the app stops referencing
// /candidates as a page (in-app nav still does — search-context-bar.tsx).

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CandidatesRedirect() {
  const params = useParams()
  const router = useRouter()
  const searchId = params?.id as string

  useEffect(() => {
    if (!searchId) return
    router.replace(`/searches/${searchId}/pipeline`)
  }, [searchId, router])

  return null
}
