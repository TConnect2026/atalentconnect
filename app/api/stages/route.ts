import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, stage_order, visible_in_client_portal, interviewer_ids } = body

    if (!search_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
      .from('stages')
      .insert({
        search_id,
        name,
        stage_order: stage_order ?? 0,
        visible_in_client_portal: visible_in_client_portal ?? false,
        // interviewer_ids holds the selected Interview Team (panelists) ids,
        // stored as raw panelist ids to match how the panelist portal reads
        // this column. Optional: null when no participants were selected.
        interviewer_ids: Array.isArray(interviewer_ids) && interviewer_ids.length > 0 ? interviewer_ids : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Stage insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Stages API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create stage'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, interview_format, interviewer_ids } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // The PATCH body carries no search_id, so resolve it from the stage row
    // (service-role read) and verify firm ownership before writing — same
    // resource-to-search auth pattern used elsewhere in api-auth.
    const lookup = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: stage, error: stageError } = await lookup
      .from('stages')
      .select('id, search_id')
      .eq('id', id)
      .single()
    if (stageError || !stage?.search_id) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }

    const auth = await requireFirmAccessToSearch(stage.search_id)
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
      .from('stages')
      .update({
        name,
        interview_format: interview_format ?? null,
        interviewer_ids: Array.isArray(interviewer_ids) && interviewer_ids.length > 0 ? interviewer_ids : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Stage update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Stages API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update stage'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
