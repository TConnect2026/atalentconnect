import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, stage_order, interview_format, visible_in_client_portal, interviewer_ids, shift, is_presentation_stage } = body

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
        is_presentation_stage: !!is_presentation_stage,
      })
      .select()
      .single()

    if (error) {
      console.error('Stage insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // At most one presentation stage per search: clear the flag on the others.
    if (is_presentation_stage) {
      const { error: clearErr } = await auth.supabaseAdmin
        .from('stages')
        .update({ is_presentation_stage: false })
        .eq('search_id', search_id)
        .neq('id', data.id)
      if (clearErr) console.error('Clear other presentation stages error:', clearErr)
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
    const { id, name, interview_format, interviewer_ids, is_presentation_stage } = body

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
        is_presentation_stage: !!is_presentation_stage,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Stage update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // At most one presentation stage per search: clear the flag on the others.
    if (is_presentation_stage) {
      const { error: clearErr } = await auth.supabaseAdmin
        .from('stages')
        .update({ is_presentation_stage: false })
        .eq('search_id', stage.search_id)
        .neq('id', id)
      if (clearErr) console.error('Clear other presentation stages error:', clearErr)
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Stages API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update stage'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing stage id' }, { status: 400 })
    }

    // Resolve the stage's owning search and verify firm ownership before deleting
    // (same resource-to-search auth pattern as PATCH).
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
    const admin = auth.supabaseAdmin

    // Block only on ACTIVE candidates (status not 'archived'; NULL counts as
    // active, matching the kanban's `status !== 'archived'` grouping). Archived
    // candidates don't block — they're re-homed below.
    const { count, error: countErr } = await admin
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('stage_id', id)
      .or('status.is.null,status.neq.archived')
    if (countErr) {
      console.error('Stage delete candidate-count error:', countErr)
      return NextResponse.json({ error: countErr.message }, { status: 400 })
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Move the candidates in this stage before deleting it.', hasActiveCandidates: true },
        { status: 409 }
      )
    }

    // Clear dependents BEFORE deleting the stage so FK constraints don't error.
    // No transaction/RPC available here, so the stage is deleted LAST — a mid-way
    // failure returns an error without ever half-deleting the stage itself.
    // (interview_feedback cascades off interviews; stage_note_attachments off
    // candidate_stage_notes; stage_guides off the stage — all ON DELETE CASCADE.)

    // 1. Interviews for this stage (per-candidate records for a removed stage).
    const { error: ivErr } = await admin.from('interviews').delete().eq('stage_id', id)
    if (ivErr) {
      console.error('Stage delete — interviews cleanup error:', ivErr)
      return NextResponse.json({ error: ivErr.message }, { status: 400 })
    }

    // 2. Archived candidates still pointing here would trip candidates.stage_id
    //    (NOT NULL + ON DELETE RESTRICT). Re-home them to the lowest-order
    //    remaining stage (the entry stage) instead of nulling (NOT NULL forbids).
    const { data: fallback } = await admin
      .from('stages')
      .select('id')
      .eq('search_id', stage.search_id)
      .neq('id', id)
      .order('stage_order', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (fallback?.id) {
      const { error: rehomeErr } = await admin
        .from('candidates')
        .update({ stage_id: fallback.id })
        .eq('stage_id', id)
      if (rehomeErr) {
        console.error('Stage delete — archived candidate re-home error:', rehomeErr)
        return NextResponse.json({ error: rehomeErr.message }, { status: 400 })
      }
    }

    // 3. Per-stage notes for this stage (attachments cascade off them).
    const { error: notesErr } = await admin.from('candidate_stage_notes').delete().eq('stage_id', id)
    if (notesErr) {
      console.error('Stage delete — stage-notes cleanup error:', notesErr)
      return NextResponse.json({ error: notesErr.message }, { status: 400 })
    }

    // 4. Detach stage-tagged activity (notes/files) from this stage so a FK can't
    //    block; stage_change logs store stage names as text and are untouched.
    const { error: actErr } = await admin
      .from('candidate_activity')
      .update({ stage_id: null })
      .eq('stage_id', id)
    if (actErr) {
      console.error('Stage delete — activity detach error:', actErr)
      return NextResponse.json({ error: actErr.message }, { status: 400 })
    }

    // 5. Finally the stage itself.
    const { error } = await admin.from('stages').delete().eq('id', id)
    if (error) {
      console.error('Stage delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('Stages API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete stage'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
