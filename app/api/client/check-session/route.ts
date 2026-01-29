import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionToken, secureLink } = await request.json()

    if (!sessionToken || !secureLink) {
      return NextResponse.json(
        { valid: false },
        { status: 200 }
      )
    }

    // Find the search by secure link
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('id')
      .eq('secure_link', secureLink)
      .single()

    if (searchError || !search) {
      return NextResponse.json(
        { valid: false },
        { status: 200 }
      )
    }

    // Find the session
    const { data: session, error: sessionError } = await supabase
      .from('client_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('search_id', search.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { valid: false },
        { status: 200 }
      )
    }

    // Check if session has expired
    const now = new Date()
    const expiresAt = new Date(session.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false },
        { status: 200 }
      )
    }

    // Update last accessed time and portal_last_accessed_at for the contact
    await supabase
      .from('client_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id)

    // Update contact's portal_last_accessed_at
    await supabase
      .from('contacts')
      .update({ portal_last_accessed_at: new Date().toISOString() })
      .eq('search_id', search.id)
      .eq('email', session.email)

    // Get contact's access level
    const { data: contact } = await supabase
      .from('contacts')
      .select('access_level')
      .eq('search_id', search.id)
      .eq('email', session.email)
      .single()

    return NextResponse.json({
      valid: true,
      email: session.email,
      accessLevel: contact?.access_level || 'full_access'
    })
  } catch (error) {
    console.error('Error in check-session:', error)
    return NextResponse.json(
      { valid: false },
      { status: 200 }
    )
  }
}
