import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Server-side upload using service role key to bypass storage RLS.
//
// NOTE ON FIRM AUTHORIZATION: this endpoint is a generic bucket+path uploader
// used by many callers and does not currently take a searchId. We gate on
// Supabase SSR auth so only authenticated firm users can reach it, but we
// cannot verify that the specific upload path belongs to the caller's firm.
// Any caller operating on search-scoped uploads should be migrated to pass
// `searchId` in the formData so we can add `requireFirmAccessToSearch` here.
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const ssr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    )
    const { data: { user }, error: authError } = await ssr.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
