import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: searchId } = await params

    if (!searchId) {
      return NextResponse.json({ error: 'searchId is required' }, { status: 400 })
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.firm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Service role for the final delete so RLS owner_id checks don't silently no-op.
    // Authorization: the search must belong to the caller's firm.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: search, error: fetchError } = await supabaseAdmin
      .from('searches')
      .select('id, firm_id')
      .eq('id', searchId)
      .single()

    if (fetchError || !search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    if (search.firm_id !== profile.firm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // candidate_activity_search_id_fkey in the live DB was created without
    // ON DELETE CASCADE, so it blocks search delete. Clean those rows first.
    const { error: activityError } = await supabaseAdmin
      .from('candidate_activity')
      .delete()
      .eq('search_id', searchId)

    if (activityError) {
      console.error('Failed to clean candidate_activity:', activityError)
      return NextResponse.json(
        { error: activityError.message || 'Failed to clean candidate activity' },
        { status: 500 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('searches')
      .delete()
      .eq('id', searchId)

    if (deleteError) {
      console.error('Failed to delete search:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete search' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete search error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to delete search' },
      { status: 500 }
    )
  }
}
