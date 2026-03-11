import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side candidate insert using service role key to bypass RLS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      search_id,
      stage_id,
      first_name,
      last_name,
      email,
      phone,
      current_company,
      current_title,
      location,
      linkedin_url,
      recruiter_notes,
      summary,
      photo_url,
      resume_url,
      status,
    } = body

    if (!search_id || !stage_id || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields: search_id, stage_id, first_name, last_name' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        search_id,
        stage_id,
        first_name,
        last_name,
        email: email || '',
        phone: phone || null,
        current_company: current_company || null,
        current_title: current_title || null,
        location: location || null,
        linkedin_url: linkedin_url || null,
        recruiter_notes: recruiter_notes || null,
        summary: summary || null,
        photo_url: photo_url || null,
        resume_url: resume_url || null,
        status: status || 'active',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Candidate insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err: unknown) {
    console.error('Candidates API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to add candidate'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
