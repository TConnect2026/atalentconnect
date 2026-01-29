import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, secureLink } = await request.json()

    if (!email || !secureLink) {
      return NextResponse.json(
        { error: 'Email and secure link are required' },
        { status: 400 }
      )
    }

    // Find the search by secure link
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('id, company_name, position_title')
      .eq('secure_link', secureLink)
      .single()

    if (searchError || !search) {
      return NextResponse.json(
        { error: 'Invalid secure link' },
        { status: 404 }
      )
    }

    // Check if email is authorized (exists in contacts for this search)
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('email')
      .eq('search_id', search.id)
      .eq('email', email)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Email not authorized for this search' },
        { status: 403 }
      )
    }

    // Generate magic link token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiration

    // Store magic link in database
    const { error: magicLinkError } = await supabase
      .from('magic_links')
      .insert({
        search_id: search.id,
        email,
        token,
        expires_at: expiresAt.toISOString()
      })

    if (magicLinkError) throw magicLinkError

    // Generate magic link URL
    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/verify?token=${token}`

    // TODO: Send email with magic link
    // For now, we'll return the magic link in the response (you'll implement email sending later)
    console.log('Magic link:', magicLinkUrl)
    console.log('Email would be sent to:', email)
    console.log('Subject: Access your', search.company_name, '-', search.position_title, 'search')

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to your email',
      // Remove this in production - only for testing
      magicLink: magicLinkUrl
    })
  } catch (error) {
    console.error('Error in verify-email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
