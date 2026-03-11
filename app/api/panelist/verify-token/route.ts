import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find the magic link
    const { data: magicLink, error: magicLinkError } = await supabase
      .from('panelist_magic_links')
      .select('*')
      .eq('token', token)
      .single()

    if (magicLinkError || !magicLink) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 404 }
      )
    }

    // Check if used
    if (magicLink.used) {
      return NextResponse.json(
        { error: 'This link has already been used' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > new Date(magicLink.expires_at)) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 400 }
      )
    }

    // Mark as used
    await supabase
      .from('panelist_magic_links')
      .update({ used: true })
      .eq('id', magicLink.id)

    // Create session (30-day)
    const sessionToken = crypto.randomUUID()
    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 30)

    const { error: sessionError } = await supabase
      .from('panelist_sessions')
      .insert({
        search_id: magicLink.search_id,
        panelist_id: magicLink.panelist_id,
        email: magicLink.email,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
      })

    if (sessionError) throw sessionError

    return NextResponse.json({
      success: true,
      sessionToken,
      searchId: magicLink.search_id,
      panelistId: magicLink.panelist_id,
    })
  } catch (error) {
    console.error('Error in verify-token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
