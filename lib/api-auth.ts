import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface FirmAccessSuccess {
  ok: true
  userId: string
  firmId: string
  supabaseAdmin: SupabaseClient
}

interface FirmAccessFailure {
  ok: false
  response: NextResponse
}

type FirmAccessResult = FirmAccessSuccess | FirmAccessFailure

/**
 * Authenticate the caller (Supabase SSR cookie session) and verify the user's
 * firm owns the given search. Returns `{ok: true, userId, firmId, supabaseAdmin}`
 * on success, or `{ok: false, response}` with the correct error status to return
 * from the route.
 *
 * Any internal API route that accepts a searchId (directly or via a resource
 * tied to a search) must gate on this before reading or writing data.
 */
export async function requireFirmAccessToSearch(searchId: string | null | undefined): Promise<FirmAccessResult> {
  if (!searchId) {
    return { ok: false, response: NextResponse.json({ error: 'searchId is required' }, { status: 400 }) }
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
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.firm_id) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // Service-role client bypasses RLS for a clean firm-ownership lookup. We
  // don't want RLS false-negatives to leak as "Search not found" when the
  // real issue is the caller lacks read access under a stricter policy.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: search, error: searchError } = await supabaseAdmin
    .from('searches')
    .select('id, firm_id')
    .eq('id', searchId)
    .single()

  if (searchError || !search) {
    return { ok: false, response: NextResponse.json({ error: 'Search not found' }, { status: 404 }) }
  }

  if (search.firm_id !== profile.firm_id) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, firmId: profile.firm_id, supabaseAdmin }
}

/**
 * Same as requireFirmAccessToSearch but resolves searchId from a candidateId.
 * Returns an additional `candidate` with id and search_id on success.
 */
export async function requireFirmAccessToCandidate(candidateId: string | null | undefined): Promise<
  FirmAccessResult & { candidate?: { id: string; search_id: string } }
> {
  if (!candidateId) {
    return { ok: false, response: NextResponse.json({ error: 'candidateId is required' }, { status: 400 }) }
  }
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: candidate, error } = await supabaseAdmin
    .from('candidates')
    .select('id, search_id')
    .eq('id', candidateId)
    .single()
  if (error || !candidate?.search_id) {
    return { ok: false, response: NextResponse.json({ error: 'Candidate not found' }, { status: 404 }) }
  }
  const result = await requireFirmAccessToSearch(candidate.search_id)
  if (!result.ok) return result
  return { ...result, candidate: { id: candidate.id, search_id: candidate.search_id } }
}

/**
 * Same as requireFirmAccessToSearch but resolves searchId from an interviewId.
 * Returns an additional `interview` with id and search_id on success.
 */
export async function requireFirmAccessToInterview(interviewId: string | null | undefined): Promise<
  FirmAccessResult & { interview?: { id: string; search_id: string } }
> {
  if (!interviewId) {
    return { ok: false, response: NextResponse.json({ error: 'interviewId is required' }, { status: 400 }) }
  }
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: interview, error } = await supabaseAdmin
    .from('interviews')
    .select('id, search_id')
    .eq('id', interviewId)
    .single()
  if (error || !interview?.search_id) {
    return { ok: false, response: NextResponse.json({ error: 'Interview not found' }, { status: 404 }) }
  }
  const result = await requireFirmAccessToSearch(interview.search_id)
  if (!result.ok) return result
  return { ...result, interview: { id: interview.id, search_id: interview.search_id } }
}
