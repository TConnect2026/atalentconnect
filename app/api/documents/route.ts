import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, type, file_url } = body

    if (!search_id || !name || !file_url) {
      return NextResponse.json(
        { error: 'Missing required fields: search_id, name, file_url' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('documents')
      .insert({
        search_id,
        name,
        type: type || 'other',
        file_url,
        visible_to_portal: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Document insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Documents API POST error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
