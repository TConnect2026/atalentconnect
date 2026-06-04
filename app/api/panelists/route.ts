import { NextRequest, NextResponse } from 'next/server'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, title, email, notes, linkedin_url } = body

    if (!search_id || !name || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
      .from('panelists')
      .insert({
        search_id,
        name,
        title,
        email: email || null,
        notes: notes || null,
        linkedin_url: linkedin_url || null,
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
    const { id, search_id } = body

    if (!id || !search_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

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
