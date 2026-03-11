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

    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 30) // 30 days

    // Find ALL active searches where this email is a contact with portal access
    const { data: contactSearches } = await supabase
      .from('contacts')
      .select('search_id')
      .eq('email', magicLink.email)
      .neq('access_level', 'no_portal_access')

    // Get unique search IDs including the one from the magic link
    const searchIds = new Set<string>([magicLink.search_id])
    if (contactSearches) {
      contactSearches.forEach(c => searchIds.add(c.search_id))
    }

    // Filter to only active searches and get their details
    const { data: activeSearches } = await supabase
      .from('searches')
      .select('id, secure_link, company_name, position_title, status')
      .in('id', Array.from(searchIds))
      .in('status', ['active', 'pending'])

    // Create sessions for all active searches
    const searchSessions: Array<{
      secureLink: string
      sessionToken: string
      companyName: string
      positionTitle: string
      status: string
    }> = []

    for (const search of (activeSearches || [])) {
      const sessionToken = crypto.randomUUID()

      const { error: sessionError } = await supabase
        .from('client_sessions')
        .insert({
          search_id: search.id,
          email: magicLink.email,
          session_token: sessionToken,
          expires_at: sessionExpiresAt.toISOString()
        })

      if (!sessionError) {
        searchSessions.push({
          secureLink: search.secure_link,
          sessionToken,
          companyName: search.company_name,
          positionTitle: search.position_title,
          status: search.status
        })
      }
    }

    // If no sessions were created, something went wrong
    if (searchSessions.length === 0) {
      throw new Error('Failed to create any sessions')
    }

    // Find the primary session (the one matching the magic link's search)
    const primarySession = searchSessions.find(s =>
      activeSearches?.some(as => as.id === magicLink.search_id && as.secure_link === s.secureLink)
    ) || searchSessions[0]

    return NextResponse.json({
      success: true,
      sessionToken: primarySession.sessionToken,
      secureLink: primarySession.secureLink,
      expiresAt: sessionExpiresAt.toISOString(),
      searches: searchSessions
    })
  } catch (error) {
    console.error('Error in verify-token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
