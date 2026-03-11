import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side stage insert using service role key to bypass RLS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, stage_order, visible_in_client_portal } = body

    if (!search_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('stages')
      .insert({
        search_id,
        name,
        stage_order: stage_order ?? 0,
        visible_in_client_portal: visible_in_client_portal ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('Stage insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Stages API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create stage'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
