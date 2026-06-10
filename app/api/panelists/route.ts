import { NextRequest, NextResponse } from 'next/server'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, title, email, notes, linkedin_url, source_contact_id } = body

    // Direct adds require a title; promotions derive the title from the source
    // contact (title -> role -> null), so a title need not be supplied there.
    if (!search_id || !name || (!source_contact_id && !title)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    let insertTitle: string | null = title ?? null

    // Idempotent promotion: if a panelist already exists for this search with
    // this source_contact_id, return it instead of inserting a duplicate.
    if (source_contact_id) {
      const { data: existing } = await auth.supabaseAdmin
        .from('panelists')
        .select('*')
        .eq('search_id', search_id)
        .eq('source_contact_id', source_contact_id)
        .maybeSingle()
      if (existing) return NextResponse.json(existing)

      // Title fallback for promotions: the contact's title, else its role on
      // the search, else null (panelists.title is nullable).
      const { data: contact } = await auth.supabaseAdmin
        .from('contacts')
        .select('title, role')
        .eq('id', source_contact_id)
        .eq('search_id', search_id)
        .maybeSingle()
      insertTitle = (contact?.title || '').trim() || (contact?.role || '').trim() || null
    }

    const { data, error } = await auth.supabaseAdmin
      .from('panelists')
      .insert({
        search_id,
        name,
        title: insertTitle,
        email: email || null,
        notes: notes || null,
        linkedin_url: linkedin_url || null,
        source_contact_id: source_contact_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Panelist insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Panelists API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create panelist'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, search_id, name, title, email, notes, linkedin_url } = body

    if (!id || !search_id || !name || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
      .from('panelists')
      .update({
        name,
        title,
        email: email || null,
        notes: notes || null,
        linkedin_url: linkedin_url || null,
      })
      .eq('id', id)
      .eq('search_id', search_id)
      .select()
      .single()

    if (error) {
      console.error('Panelist update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Panelists API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update panelist'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, search_id, source_contact_id } = body

    if (!search_id || (!id && !source_contact_id)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    // Un-promote path: remove the panelist that was promoted from this contact.
    // Guarded: refuse if that panelist is assigned to any stage (its id present
    // in stages.interviewer_ids), so a stage assignment can't be silently
    // orphaned. We only READ interviewer_ids here, never modify it.
    if (source_contact_id && !id) {
      const { data: existing, error: findErr } = await auth.supabaseAdmin
        .from('panelists')
        .select('id')
        .eq('search_id', search_id)
        .eq('source_contact_id', source_contact_id)
        .maybeSingle()
      if (findErr) {
        console.error('Panelist lookup error:', findErr)
        return NextResponse.json({ error: findErr.message }, { status: 400 })
      }
      // Nothing to remove — treat as success (idempotent un-promote).
      if (!existing) return NextResponse.json({ ok: true, deleted: false })

      const { data: stageRows, error: stageErr } = await auth.supabaseAdmin
        .from('stages')
        .select('id, interviewer_ids')
        .eq('search_id', search_id)
      if (stageErr) {
        console.error('Stage lookup error:', stageErr)
        return NextResponse.json({ error: stageErr.message }, { status: 400 })
      }
      const assigned = (stageRows || []).some(
        (s: { interviewer_ids: string[] | null }) =>
          Array.isArray(s.interviewer_ids) && s.interviewer_ids.includes(existing.id)
      )
      if (assigned) {
        return NextResponse.json(
          { error: 'assigned to a stage', assignedToStage: true },
          { status: 409 }
        )
      }

      const { error: delErr } = await auth.supabaseAdmin
        .from('panelists')
        .delete()
        .eq('id', existing.id)
        .eq('search_id', search_id)
      if (delErr) {
        console.error('Panelist delete error:', delErr)
        return NextResponse.json({ error: delErr.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true, deleted: true })
    }

    // Existing by-id delete (Interview Team page remove) — behavior unchanged.
    const { error } = await auth.supabaseAdmin
      .from('panelists')
      .delete()
      .eq('id', id)
      .eq('search_id', search_id)

    if (error) {
      console.error('Panelist delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('Panelists API error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete panelist'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
