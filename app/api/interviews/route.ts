import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side interview management using service role key to bypass RLS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { candidate_id, search_id, stage_id, scheduled_at, status } = body

    if (!candidate_id || !search_id || !stage_id) {
      return NextResponse.json(
        { error: 'Missing required fields: candidate_id, search_id, stage_id' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('interviews')
      .insert({
        candidate_id,
        search_id,
        stage_id,
        scheduled_at: scheduled_at || null,
        status: status || 'scheduled',
        interviewer_name: body.interviewer_name || '',
        interviewer_email: body.interviewer_email || '',
        interview_type: body.interview_type || 'video',
      })
      .select()
      .single()

    if (error) {
      console.error('Interview insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Interviews API POST error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create interview'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing interview id' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('interviews')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Interview update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Interviews API PATCH error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update interview'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
