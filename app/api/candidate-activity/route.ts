import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side candidate activity insert using service role key to bypass RLS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      candidate_id,
      search_id,
      activity_type,
      content,
      visibility_level,
      created_by,
      author_name,
      follow_up_date,
    } = body

    if (!candidate_id || !search_id || !activity_type) {
      return NextResponse.json(
        { error: 'Missing required fields: candidate_id, search_id, activity_type' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('candidate_activity')
      .insert({
        candidate_id,
        search_id,
        activity_type,
        content: content || null,
        visibility_level: visibility_level || 'team_only',
        created_by: created_by || null,
        author_name: author_name || null,
        follow_up_date: follow_up_date || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Candidate activity insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Candidate activity API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to add activity'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
