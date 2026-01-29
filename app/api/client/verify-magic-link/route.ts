import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Verify magic link token and create session
 *
 * Security:
 * - Single-use tokens
 * - 7-day expiration
 * - Creates 30-day session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const { token, secureLink } = await request.json()

    if (!token || !secureLink) {
      return NextResponse.json(
        { error: 'Token and secure link are required' },
        { status: 400 }
      )
    }

    // Get search by secure link
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('id')
      .eq('secure_link', secureLink)
      .single()

    if (searchError || !search) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      )
    }

    // Verify magic link
    const { data: magicLink, error: linkError } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('search_id', search.id)
      .eq('used', false)
      .single()

    if (linkError || !magicLink) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 401 }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(magicLink.expires_at)

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Link has expired. Please request a new one.' },
        { status: 401 }
      )
    }

    // Mark magic link as used
    await supabase
      .from('magic_links')
      .update({ used: true })
      .eq('id', magicLink.id)

    // Get contact to determine access level
    const { data: contact } = await supabase
      .from('contacts')
      .select('access_level, name')
      .eq('email', magicLink.email)
      .eq('search_id', search.id)
      .single()

    // Create session token
    const sessionToken = randomBytes(32).toString('hex')

    // Set session expiration (30 days)
    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 30)

    // Create session
    const { error: sessionError } = await supabase
      .from('client_sessions')
      .insert({
        search_id: search.id,
        email: magicLink.email,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
        last_accessed_at: new Date().toISOString()
      })

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Update contact last accessed
    await supabase
      .from('contacts')
      .update({ portal_last_accessed_at: new Date().toISOString() })
      .eq('email', magicLink.email)
      .eq('search_id', search.id)

    return NextResponse.json({
      success: true,
      sessionToken,
      email: magicLink.email,
      accessLevel: contact?.access_level || 'full_access',
      clientName: contact?.name || ''
    })

  } catch (error) {
    console.error('Error verifying magic link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
