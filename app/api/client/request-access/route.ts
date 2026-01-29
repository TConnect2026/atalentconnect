import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Request client portal access via magic link
 *
 * Security:
 * - Only sends link if email exists in contacts table
 * - Doesn't reveal which searches exist
 * - Magic links are single-use with 7-day expiration
 * - Rate limited (TODO: implement rate limiting)
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if email exists in contacts table (any search)
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id, search_id, name, access_level')
      .eq('email', email.toLowerCase())
      .neq('access_level', 'no_portal_access')

    if (contactError) {
      console.error('Error checking contacts:', contactError)
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      )
    }

    // If no contact found, return generic message (don't reveal)
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If your email is in our system, you will receive an access link.'
      })
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')

    // Set expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Get the first search (or you could send links to all searches)
    const contact = contacts[0]

    // Get search details
    const { data: search } = await supabase
      .from('searches')
      .select('secure_link, position_title, company_name')
      .eq('id', contact.search_id)
      .single()

    if (!search || !search.secure_link) {
      return NextResponse.json({
        error: 'Search portal not available'
      }, { status: 404 })
    }

    // Create magic link entry
    const { error: insertError } = await supabase
      .from('magic_links')
      .insert({
        search_id: contact.search_id,
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (insertError) {
      console.error('Error creating magic link:', insertError)
      return NextResponse.json(
        { error: 'Failed to create access link' },
        { status: 500 }
      )
    }

    // Send email with magic link
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client/${search.secure_link}/portal?token=${token}`

    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // For now, log the link
    console.log('Magic link for', email, ':', portalUrl)

    // In production, send email:
    /*
    await sendEmail({
      to: email,
      subject: `Your @talentconnect Portal Access Link`,
      html: `
        <p>Hi ${contact.name},</p>
        <p>Click below to access your search portal:</p>
        <p><a href="${portalUrl}">Access Portal →</a></p>
        <p>This link expires in 7 days.</p>
        <hr/>
        <p>Powered by @talentconnect</p>
      `
    })
    */

    return NextResponse.json({
      success: true,
      message: 'Access link sent to your email'
    })

  } catch (error) {
    console.error('Error requesting access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
