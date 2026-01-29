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
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .single()

    if (magicLinkError || !magicLink) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 404 }
      )
    }

    // Check if token has been used
    if (magicLink.used) {
      return NextResponse.json(
        { error: 'This magic link has already been used' },
        { status: 400 }
      )
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(magicLink.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This magic link has expired' },
        { status: 400 }
      )
    }

    // Mark magic link as used
    await supabase
      .from('magic_links')
      .update({ used: true })
      .eq('id', magicLink.id)

    // Create a session token (valid for 30 days)
    const sessionToken = crypto.randomUUID()
    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 30) // 30 days

    // Store session in database
    const { error: sessionError } = await supabase
      .from('client_sessions')
      .insert({
        search_id: magicLink.search_id,
        email: magicLink.email,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString()
      })

    if (sessionError) throw sessionError

    // Get search details
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('secure_link')
      .eq('id', magicLink.search_id)
      .single()

    if (searchError || !search) {
      throw new Error('Failed to fetch search details')
    }

    return NextResponse.json({
      success: true,
      sessionToken,
      secureLink: search.secure_link,
      expiresAt: sessionExpiresAt.toISOString()
    })
  } catch (error) {
    console.error('Error in verify-token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
