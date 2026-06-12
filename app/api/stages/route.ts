import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, stage_order, interview_format, visible_in_client_portal, interviewer_ids, shift } = body

    if (!search_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    const targetOrder = stage_order ?? 0

    // Insert-at-position: make room by shifting existing stages up, then insert
    // at targetOrder. Only when `shift` is set — the append and Prospect-seed
    // paths pass no shift and insert as-is. Guard: order 0 (the entry stage)
    // must never be displaced, so an insert position must be >= 1.
    if (shift) {
      if (typeof targetOrder !== 'number' || targetOrder < 1) {
        return NextResponse.json(
          { error: 'Insert position must be >= 1; the entry stage at order 0 cannot be displaced' },
          { status: 400 }
        )
      }
      // Shift back-to-front (highest stage_order first) so no two rows ever
      // transiently share an order (there is no uniqueness constraint).
      const { data: toShift, error: shiftSelErr } = await auth.supabaseAdmin
        .from('stages')
        .select('id, stage_order')
        .eq('search_id', search_id)
        .gte('stage_order', targetOrder)
        .order('stage_order', { ascending: false })
      if (shiftSelErr) {
        console.error('Stage shift lookup error:', shiftSelErr)
        return NextResponse.json({ error: shiftSelErr.message }, { status: 400 })
      }
      for (const s of toShift || []) {
        const { error: bumpErr } = await auth.supabaseAdmin
          .from('stages')
          .update({ stage_order: s.stage_order + 1 })
          .eq('id', s.id)
        if (bumpErr) {
          console.error('Stage shift update error:', bumpErr)
          return NextResponse.json({ error: bumpErr.message }, { status: 400 })
        }
      }
    }

    const { data, error } = await auth.supabaseAdmin
      .from('stages')
      .insert({
        search_id,
        name,
        stage_order: targetOrder,
        // Persist the format chosen in the Add Stage dialog at creation time
        // (matches the column the PATCH path writes). Was previously dropped.
        interview_format: interview_format ?? null,
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
