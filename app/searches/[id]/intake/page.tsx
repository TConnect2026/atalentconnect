'use client'

// The standalone Intake Brief page is gone — the brief now opens as a
// slide-over from Essentials. This route stays in place to redirect any
// old bookmarks or in-app links to the search's main page.

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function IntakeBriefRedirect() {
  const params = useParams()
  const router = useRouter()
  const searchId = params?.id as string

  useEffect(() => {
    if (!searchId) return
    router.replace(`/searches/${searchId}/pipeline`)
  }, [searchId, router])

  return null
}
