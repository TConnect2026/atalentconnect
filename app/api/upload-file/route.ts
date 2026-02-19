import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side upload using service role key to bypass storage RLS
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = formData.get('path') as string

    if (!file || !bucket || !path) {
      return NextResponse.json({ error: 'Missing file, bucket, or path' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({ publicUrl })
  } catch (err: any) {
    console.error('Upload API error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
