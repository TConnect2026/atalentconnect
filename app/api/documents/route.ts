import { NextRequest, NextResponse } from 'next/server'
import { requireFirmAccessToSearch } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { search_id, name, type, file_url } = body

    if (!search_id || !name || !file_url) {
      return NextResponse.json(
        { error: 'Missing required fields: search_id, name, file_url' },
        { status: 400 }
      )
    }

    const auth = await requireFirmAccessToSearch(search_id)
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
      .from('documents')
      .insert({
        search_id,
        name,
        type: type || 'other',
        file_url,
        visible_to_portal: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Document insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Documents API POST error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
