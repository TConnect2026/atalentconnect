import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionToken } = await request.json()

    if (!sessionToken) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    // Find the session
    const { data: session, error: sessionError } = await supabase
      .from('panelist_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    // Check expiration
    if (new Date() > new Date(session.expires_at)) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    // Update last accessed
    await supabase
      .from('panelist_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id)

    // Get panelist info
    const { data: panelist } = await supabase
      .from('panelists')
      .select('id, name, email, title')
      .eq('id', session.panelist_id)
      .single()

    return NextResponse.json({
      valid: true,
      searchId: session.search_id,
      panelistId: session.panelist_id,
      email: session.email,
      panelistName: panelist?.name || '',
      panelistTitle: panelist?.title || '',
    })
  } catch (error) {
    console.error('Error in check-session:', error)
    return NextResponse.json({ valid: false }, { status: 200 })
  }
}
