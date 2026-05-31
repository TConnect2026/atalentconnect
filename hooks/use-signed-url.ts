import { useEffect, useState } from 'react'
import { extractBucketAndPath, fetchSignedUrl } from '@/lib/signed-url'

export function useSignedUrl(
  storedUrl: string | null | undefined,
  search_id: string | null | undefined
): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!storedUrl || !search_id) {
      setSignedUrl(null)
      return
    }

    const extracted = extractBucketAndPath(storedUrl)
    if (!extracted) {
      // Not a Supabase public URL — fall back to the URL as given.
      setSignedUrl(storedUrl)
      return
    }

    let cancelled = false
    setSignedUrl(null)

    fetchSignedUrl({ bucket: extracted.bucket, path: extracted.path, search_id }).then(
      (url) => {
        if (cancelled) return
        setSignedUrl(url)
      }
    )

    return () => {
      cancelled = true
    }
  }, [storedUrl, search_id])

  return signedUrl
}
