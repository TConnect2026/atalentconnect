import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { contactId } = await request.json()

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Get contact and search details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*, searches(*)')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    const search = contact.searches

    if (!search || !search.secure_link) {
      return NextResponse.json(
        { error: 'Search not found or missing secure link' },
        { status: 404 }
      )
    }

    // Generate portal access URL
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/${search.secure_link}`

    // Update contact with invite sent timestamp
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ portal_invite_sent_at: new Date().toISOString() })
      .eq('id', contactId)

    if (updateError) throw updateError

    // TODO: Send email with portal access link
    // For now, we'll log to console (you'll implement email sending later)
    console.log('='.repeat(80))
    console.log('PORTAL ACCESS EMAIL')
    console.log('='.repeat(80))
    console.log('To:', contact.email)
    console.log('Name:', contact.name)
    console.log('Subject:', `Access your ${search.company_name} - ${search.position_title} candidate portal`)
    console.log('Portal URL:', portalUrl)
    console.log('Access Level:', contact.access_level === 'full_access' ? 'Full Access' : 'Limited Access')
    console.log('='.repeat(80))

    return NextResponse.json({
      success: true,
      message: 'Portal access sent successfully',
      // Remove this in production - only for testing
      portalUrl,
      accessLevel: contact.access_level
    })
  } catch (error) {
    console.error('Error in send-portal-access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
