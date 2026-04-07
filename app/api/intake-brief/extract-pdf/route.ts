import { NextRequest, NextResponse } from 'next/server'

// Import the actual parser directly, skipping the wrapper that runs
// a test PDF read on import (breaks in webpack/Next.js bundling)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js')

export async function POST(request: NextRequest) {
  console.log('[extract-pdf] POST handler called')
  try {
    const formData = await request.formData()
    console.log('[extract-pdf] FormData parsed')

    const file = formData.get('file') as File
    if (!file) {
      console.log('[extract-pdf] No file in form data')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[extract-pdf] File received:', file.name, 'size:', file.size, 'type:', file.type)

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[extract-pdf] Buffer created, length:', buffer.length)

    const data = await pdfParse(buffer)
    console.log('[extract-pdf] PDF parsed, text length:', data.text?.length || 0)

    if (!data.text || data.text.trim().length === 0) {
      return NextResponse.json({ error: 'No text content found in PDF' }, { status: 400 })
    }

    return NextResponse.json({ text: data.text })
  } catch (error: any) {
    console.error('[extract-pdf] Error:', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Failed to extract text from PDF' },
      { status: 500 }
    )
  }
}
