const PUBLIC_URL_MARKER = '/storage/v1/object/public/'

export function extractBucketAndPath(
  storedUrl: string
): { bucket: string; path: string } | null {
  const i = storedUrl.indexOf(PUBLIC_URL_MARKER)
  if (i === -1) return null
  const after = storedUrl.slice(i + PUBLIC_URL_MARKER.length)
  const slash = after.indexOf('/')
  if (slash === -1) return null
  const bucket = after.slice(0, slash)
  const path = after.slice(slash + 1)
  if (!bucket || !path) return null
  return { bucket, path }
}

export async function fetchSignedUrl(params: {
  bucket: string
  path: string
  search_id: string
}): Promise<string | null> {
  try {
    const res = await fetch('/api/storage/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.signedUrl ?? null
  } catch {
    return null
  }
}
