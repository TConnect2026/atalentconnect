import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { panelistId, searchId } = await request.json()

    if (!panelistId || !searchId) {
      return NextResponse.json(
        { error: 'Panelist ID and search ID are required' },
        { status: 400 }
      )
    }

    // Find the panelist
    const { data: panelist, error: panelistError } = await supabase
      .from('panelists')
      .select('id, name, email')
      .eq('id', panelistId)
      .eq('search_id', searchId)
      .single()

    if (panelistError || !panelist) {
      return NextResponse.json(
        { error: 'Panelist not found' },
        { status: 404 }
      )
    }

    // Generate magic link token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7-day expiration

    // Store magic link
    const { error: magicLinkError } = await supabase
      .from('panelist_magic_links')
      .insert({
        search_id: searchId,
        panelist_id: panelistId,
        email: panelist.email,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (magicLinkError) throw magicLinkError

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/panelist/verify?token=${token}`

    // Log for development (email not yet integrated)
    console.log('=== PANELIST PORTAL LINK ===')
    console.log('Panelist:', panelist.name, `(${panelist.email})`)
    console.log('URL:', portalUrl)
    console.log('============================')

    return NextResponse.json({
      success: true,
      message: 'Portal link generated',
      portalUrl,
    })
  } catch (error) {
    console.error('Error in send-magic-link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
