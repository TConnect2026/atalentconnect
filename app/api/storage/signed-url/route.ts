import { NextRequest, NextResponse } from 'next/server'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

const ALLOWED_BUCKETS = [
  'documents',
  'candidate-photos',
  'candidateresumes',
  'stagenotefiles',
  'client-logos',
  'recruiter-files',
  'portal-covers',
  'interview-transcripts',
  'interview-guides',
] as const

const SIGNED_URL_TTL_SECONDS = 3600

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { bucket, path, search_id } = body

    if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json(
        { error: `Invalid bucket. Must be one of: ${ALLOWED_BUCKETS.join(', ')}` },
        { status: 400 }
      )
    }

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'path is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (err: unknown) {
    console.error('Signed URL API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create signed URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
