import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side client feedback insert using service role key to bypass RLS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { candidate_id, search_id, reviewer_name, reviewer_email, recommendation, notes } = body

    if (!candidate_id || !search_id || !reviewer_email || !recommendation) {
      return NextResponse.json(
        { error: 'Missing required fields: candidate_id, search_id, reviewer_email, recommendation' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('client_feedback')
      .insert({
        candidate_id,
        search_id,
        reviewer_name: reviewer_name || 'Client',
        reviewer_email,
        recommendation,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Client feedback insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Client feedback API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to submit feedback'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
