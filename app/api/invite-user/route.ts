import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, role, firmId } = await request.json()

    if (!firstName || !lastName || !email || !role || !firmId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Verify the requesting user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if requesting user is an admin of the firm
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, firm_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'administrator' || profile.firm_id !== firmId) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can invite users' },
        { status: 403 }
      )
    }

    // Use Supabase admin client to invite user
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Generate invite link directly (doesn't send email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: {
          firm_id: firmId,
          role: role,
          first_name: firstName,
          last_name: lastName,
        },
        redirectTo: `${request.nextUrl.origin}/auth/accept-invite`,
      },
    })

    if (linkError) {
      console.error('Generate link error:', linkError)
      return NextResponse.json(
        { error: linkError.message },
        { status: 400 }
      )
    }

    const manualLink = linkData?.properties?.action_link

    // Try to send email (but don't fail if this doesn't work)
    let emailSent = false
    try {
      const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          firm_id: firmId,
          role: role,
          first_name: firstName,
          last_name: lastName,
        },
        redirectTo: `${request.nextUrl.origin}/auth/accept-invite`,
      })

      if (!emailError) {
        emailSent = true
      }
    } catch (emailErr) {
      console.log('Email sending failed, but we have manual link:', emailErr)
    }

    return NextResponse.json({
      success: true,
      emailSent,
      manualLink: manualLink,
      message: emailSent ? 'Invitation sent successfully' : 'User created. Use manual link to invite.',
    })
  } catch (error) {
    console.error('Invite user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
