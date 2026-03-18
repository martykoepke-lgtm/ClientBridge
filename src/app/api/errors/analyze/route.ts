import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// Primary AI Agent — Error Analyzer & Resolver
// SAFETY RULES:
// 1. This agent is READ-ONLY for code — it NEVER modifies, deletes, or creates source files
// 2. It ONLY writes to the error_log table (resolution_notes and status fields)
// 3. It analyzes error data and produces human-readable reports
// 4. Auto-resolve is limited to: exact duplicates, transient network errors, known noise
// 5. Anything uncertain gets flagged for developer review, never auto-resolved
// 6. All actions are logged and auditable via the resolution_notes field

const ANALYSIS_PROMPT = `You are an error analysis agent for a web application called ClientBridge. Your role is to analyze proxy and application errors and produce a structured diagnosis.

RULES — READ CAREFULLY:
- You are a READ-ONLY analyst. You do NOT fix code, modify files, or take any action.
- You ONLY classify errors and write reports. A human developer will act on your findings.
- You must NEVER recommend deleting code, dropping tables, or destructive actions.
- If you are uncertain about a root cause, say "uncertain" — never guess.
- Be concise and direct. Developers read these reports quickly.

For each error, produce a JSON response with exactly these fields:
{
  "rootCause": "One sentence explaining what caused this error",
  "classification": "duplicate | transient | config | code_bug | external | unknown",
  "severity": "noise | low | medium | high | critical",
  "actionTaken": "What this analysis determined (e.g., 'Identified as duplicate — 4 copies auto-resolved')",
  "recommendation": "What the developer should do, if anything. Say 'No action needed' for noise.",
  "autoResolve": true/false
}

Auto-resolve criteria (set autoResolve: true ONLY for these):
- Exact duplicate errors (same type + message appearing multiple times)
- Transient network errors (fetch failed, timeout, DNS resolution)
- HTTP 503/502 responses (temporary unavailability)

Do NOT auto-resolve:
- Authentication errors
- Database errors
- Errors with unique messages (not duplicates)
- Anything you're not 100% certain is safe to resolve
- Code bugs or configuration issues

Respond with ONLY the JSON object. No markdown, no explanation outside the JSON.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { errorIds } = await req.json()

  if (!errorIds || !Array.isArray(errorIds) || errorIds.length === 0) {
    return NextResponse.json({ error: 'errorIds array is required' }, { status: 400 })
  }

  // Fetch the errors
  const { data: errors, error: fetchError } = await supabase
    .from('error_log')
    .select('*, project:projects(name)')
    .in('id', errorIds)
    .order('created_at', { ascending: false })

  if (fetchError || !errors || errors.length === 0) {
    return NextResponse.json({ error: 'No errors found' }, { status: 404 })
  }

  // Group duplicates (same error_type + message)
  const groups: Record<string, typeof errors> = {}
  for (const err of errors) {
    const key = `${err.error_type}::${err.message}`
    if (!groups[key]) groups[key] = []
    groups[key].push(err)
  }

  // Set all to "analyzing" status
  await supabase
    .from('error_log')
    .update({ status: 'analyzing' })
    .in('id', errorIds)

  const client = new Anthropic({ apiKey })
  const results: Array<{ id: string; analysis: Record<string, unknown>; status: string }> = []

  for (const [key, groupErrors] of Object.entries(groups)) {
    const representative = groupErrors[0]
    const duplicateCount = groupErrors.length

    const errorContext = `Error Type: ${representative.error_type}
Message: ${representative.message}
URL: ${representative.url || 'N/A'}
Source: ${representative.source}
Project: ${representative.project?.name || 'Unknown'}
Duplicate Count: ${duplicateCount} identical errors
Raw Error: ${(representative.raw_error || 'N/A').slice(0, 500)}
User Agent: ${representative.user_agent || 'N/A'}`

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: errorContext }],
      })

      const text = response.content[0]
      let analysis: Record<string, unknown> = {}

      if (text.type === 'text') {
        try {
          // Extract JSON from response — Claude sometimes wraps it in markdown
          const raw = text.text.trim()
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
        } catch {
          analysis = {
            rootCause: 'AI response could not be parsed',
            classification: 'unknown',
            severity: 'medium',
            actionTaken: 'Analysis produced but response format was invalid',
            recommendation: 'Manual review required',
            autoResolve: false,
          }
        }
      }

      // If duplicates, update the action taken
      if (duplicateCount > 1) {
        analysis.actionTaken = `${duplicateCount} identical errors found. ${duplicateCount - 1} duplicates auto-resolved. ${analysis.actionTaken || ''}`
        analysis.autoResolve = true
      }

      // Build resolution report
      const report = `## AI Analysis Report
**Root Cause:** ${analysis.rootCause}
**Classification:** ${analysis.classification}
**Severity:** ${analysis.severity}
**Action Taken:** ${analysis.actionTaken}
**Recommendation:** ${analysis.recommendation}`

      // Determine status
      const newStatus = analysis.autoResolve ? 'resolved' : 'acknowledged'

      // Update the representative error (keep one)
      await supabase
        .from('error_log')
        .update({
          status: newStatus,
          resolution_notes: report,
        })
        .eq('id', representative.id)

      results.push({ id: representative.id, analysis, status: newStatus })

      // Auto-resolve duplicates (all except the representative)
      if (duplicateCount > 1) {
        const duplicateIds = groupErrors.slice(1).map(e => e.id)
        await supabase
          .from('error_log')
          .update({
            status: 'resolved',
            resolution_notes: `Duplicate of error ${representative.id}. Auto-resolved by AI.`,
          })
          .in('id', duplicateIds)

        for (const dupId of duplicateIds) {
          results.push({ id: dupId, analysis: { duplicate: true, parentId: representative.id }, status: 'resolved' })
        }
      }
    } catch (err) {
      console.error('AI analysis error:', err)
      // On AI failure, set back to new
      for (const e of groupErrors) {
        await supabase
          .from('error_log')
          .update({ status: 'new', resolution_notes: 'AI analysis failed. Manual review required.' })
          .eq('id', e.id)
        results.push({ id: e.id, analysis: { error: 'AI call failed' }, status: 'new' })
      }
    }
  }

  return NextResponse.json({ results, analyzed: results.length })
}
