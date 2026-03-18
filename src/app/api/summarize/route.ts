import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ summary: null, error: 'No API key configured' }, { status: 200 })
  }

  const { sessionId, projectName, categoryName, durationMinutes, description } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const hours = (durationMinutes / 60).toFixed(1)

  const prompt = `Generate a concise one-line summary (max 15 words) of a developer work session. This will be shown to clients as a progress update.

Project: ${projectName}
Category: ${categoryName}
Duration: ${hours} hours
${description ? `Developer note: ${description}` : 'No description provided.'}

Guidelines:
- Write from a third-person developer perspective ("Worked on...", "Built...", "Fixed...", "Configured...")
- Be specific but brief — clients should understand what happened
- If no description, infer from the category name
- Never mention duration or time
- Never say "the developer" — just start with the action verb

Summary:`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]
    const summary = text.type === 'text' ? text.text.trim() : null

    return NextResponse.json({ summary, sessionId })
  } catch (err) {
    console.error('AI summary error:', err)
    return NextResponse.json({ summary: null, error: 'AI call failed' }, { status: 200 })
  }
}
