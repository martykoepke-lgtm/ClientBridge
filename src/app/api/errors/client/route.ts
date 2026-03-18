import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Client-side error ingestion endpoint
// No auth required — clients are anonymous reviewers
// Rate-limited and deduplicated to prevent abuse/flooding

// Simple in-memory rate limiter (resets on server restart)
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW = 5 * 60 * 1000 // 5 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    errorType,
    message,
    stack,
    sourceFile,
    line,
    column,
    pageUrl,
    projectUrl,
    userAgent,
  } = body as Record<string, string | number | null>

  if (!message || !errorType) {
    return NextResponse.json({ error: 'message and errorType are required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Resolve project_id from the project URL origin
  let projectId: string | null = null
  if (projectUrl) {
    try {
      const origin = new URL(String(projectUrl)).origin
      const { data } = await supabase
        .from('projects')
        .select('id')
        .ilike('vercel_url', `${origin}%`)
        .limit(1)
      if (data?.[0]) projectId = data[0].id
    } catch { /* best effort */ }
  }

  // Deduplicate: skip if same error_type + message exists for this project in last hour
  if (projectId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('error_log')
      .select('id')
      .eq('project_id', projectId)
      .eq('error_type', String(errorType))
      .eq('message', String(message).slice(0, 1000))
      .gte('created_at', oneHourAgo)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ deduplicated: true })
    }
  }

  // Build raw_error with stack trace and source location
  const rawParts: string[] = []
  if (sourceFile) rawParts.push(`Source: ${sourceFile}:${line || '?'}:${column || '?'}`)
  if (stack) rawParts.push(String(stack))
  const rawError = rawParts.join('\n') || null

  // Insert into error_log
  const { error: insertError } = await supabase.from('error_log').insert({
    project_id: projectId,
    error_type: String(errorType),
    tier: 1,
    message: String(message).slice(0, 1000),
    url: pageUrl ? String(pageUrl) : null,
    raw_error: rawError,
    user_agent: userAgent ? String(userAgent) : null,
    source: 'client',
    status: 'new',
  })

  if (insertError) {
    console.error('Failed to log client error:', insertError)
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }

  return NextResponse.json({ logged: true })
}
