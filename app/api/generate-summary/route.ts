import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const VIDEO_AUDIO_EXTS = ['.mp4', '.webm', '.mov', '.mp3', '.wav', '.m4a', '.ogg']
const TEXT_EXTS = ['.txt']

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : ''
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, resumeUrl, fileUrl, fileName } = await req.json()

    if (!candidateId || (!resumeUrl && !fileUrl)) {
      return NextResponse.json({ error: 'Missing candidateId or file URL' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // Determine mode: transcript/document summarization vs resume summary
    const isTranscript = !!fileUrl && !resumeUrl
    const url = fileUrl || resumeUrl
    const ext = fileName ? getExtension(fileName) : ''

    // Reject video/audio files — they need a transcript
    if (isTranscript && VIDEO_AUDIO_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: 'Video/audio files require a transcript for summarization. Please upload a text or PDF transcript.' },
        { status: 400 }
      )
    }

    // Fetch the file
    const fileResponse = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 400 })
    }

    const buffer = await fileResponse.arrayBuffer()
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    let messageContent: Anthropic.MessageCreateParams['messages'][0]['content']
    let prompt: string

    if (isTranscript && TEXT_EXTS.includes(ext)) {
      // Plain text file — send as text content
      const textContent = new TextDecoder().decode(buffer)
      prompt = 'Summarize the key points from this interview transcript or document as 3-8 bullet points. Each bullet should start with "- ". Focus on: key discussion topics, decisions made, action items, notable insights, and any concerns raised. Be factual and concise.'
      messageContent = [
        { type: 'text' as const, text: textContent },
        { type: 'text' as const, text: prompt },
      ]
    } else {
      // PDF or other document — send as base64 document
      const base64 = Buffer.from(buffer).toString('base64')
      prompt = isTranscript
        ? 'Summarize the key points from this interview transcript or document as 3-8 bullet points. Each bullet should start with "- ". Focus on: key discussion topics, decisions made, action items, notable insights, and any concerns raised. Be factual and concise.'
        : 'Extract a concise professional summary from this resume as 3-6 bullet points. Each bullet should start with "- ". Cover: current role and responsibilities, key career achievements, areas of expertise, and education/credentials if notable. Be factual and concise — no fluff or subjective language.'
      messageContent = [
        {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        },
        { type: 'text' as const, text: prompt },
      ]
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: messageContent }],
    })

    const summary = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    return NextResponse.json({ summary })
  } catch (err: unknown) {
    console.error('Generate summary error:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate summary'
    const name = err instanceof Error ? err.name : ''
    if (name === 'TimeoutError' || message.includes('timeout')) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
