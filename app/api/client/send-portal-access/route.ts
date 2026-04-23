import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const { contactId } = await request.json()

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Look up the contact's search_id (via service role) so we can gate on
    // the firm owning that search before doing anything else.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: contactLookup, error: lookupError } = await admin
      .from('contacts')
      .select('search_id')
      .eq('id', contactId)
      .single()

    if (lookupError || !contactLookup?.search_id) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    const auth = await requireFirmAccessToSearch(contactLookup.search_id)
    if (!auth.ok) return auth.response

    // Re-fetch contact with joined search for the full details needed below.
    const { data: contact, error: contactError } = await auth.supabaseAdmin
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
    const { error: updateError } = await auth.supabaseAdmin
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
