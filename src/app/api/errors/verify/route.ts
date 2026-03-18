import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// Backup AI Agent — Neutral Verifier
// SAFETY RULES:
// 1. This agent is READ-ONLY — it NEVER modifies code, files, or infrastructure
// 2. It ONLY writes to error_log.resolution_notes (appends verification report)
// 3. It acts as an independent second opinion on the primary agent's analysis
// 4. It is SKEPTICAL by design — its job is to catch mistakes, not agree blindly
// 5. If it disagrees, it escalates to "needs_attention" status for human review
// 6. It cannot override a human decision — only flag concerns

const VERIFIER_PROMPT = `You are a VERIFICATION agent — a neutral, skeptical second opinion. Another AI agent analyzed an error and proposed a resolution. Your job is to double-check its work.

RULES — READ CAREFULLY:
- You are independent from the primary agent. Do NOT defer to its judgment.
- You are READ-ONLY. You do not fix code or take any action.
- Your ONLY output is a verification report.
- Be skeptical: assume the primary agent MIGHT be wrong.
- If you disagree with the primary analysis, say so clearly.
- If the primary agent auto-resolved something that looks risky, flag it.
- You CANNOT delete, modify, or touch any code or files. You only write reports.

Evaluate:
1. Is the root cause identification correct?
2. Is the classification appropriate?
3. Was the auto-resolve decision safe? (If auto-resolved, should it have been?)
4. Are there patterns or risks the primary agent missed?
5. Is the recommendation actionable and safe?

Respond with ONLY this JSON:
{
  "agrees": true/false,
  "confidence": "high" | "medium" | "low",
  "verdict": "One sentence: your conclusion",
  "concerns": "Any concerns or things the primary agent missed. Say 'None' if clean.",
  "shouldEscalate": false
}

Set shouldEscalate: true if:
- The primary agent auto-resolved something that looks like a real bug
- The root cause seems wrong or incomplete
- There's a pattern suggesting a deeper issue
- You have low confidence in the primary analysis`

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

  // Fetch analyzed errors (ones that have resolution_notes from primary agent)
  const { data: errors, error: fetchError } = await supabase
    .from('error_log')
    .select('*, project:projects(name)')
    .in('id', errorIds)

  if (fetchError || !errors || errors.length === 0) {
    return NextResponse.json({ error: 'No errors found' }, { status: 404 })
  }

  const client = new Anthropic({ apiKey })
  const results: Array<{ id: string; verification: Record<string, unknown>; finalStatus: string }> = []

  for (const err of errors) {
    // Skip duplicates that just point to a parent
    if (err.resolution_notes?.startsWith('Duplicate of error')) {
      results.push({ id: err.id, verification: { skipped: true, reason: 'duplicate' }, finalStatus: err.status })
      continue
    }

    const verificationContext = `ORIGINAL ERROR:
Type: ${err.error_type}
Message: ${err.message}
URL: ${err.url || 'N/A'}
Project: ${err.project?.name || 'Unknown'}
Raw Error: ${(err.raw_error || 'N/A').slice(0, 500)}

PRIMARY AGENT'S ANALYSIS:
${err.resolution_notes || 'No analysis available'}

Current Status: ${err.status}`

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: VERIFIER_PROMPT,
        messages: [{ role: 'user', content: verificationContext }],
      })

      const text = response.content[0]
      let verification: Record<string, unknown> = {}

      if (text.type === 'text') {
        try {
          const raw = text.text.trim()
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          verification = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
        } catch {
          verification = {
            agrees: false,
            confidence: 'low',
            verdict: 'Verification response could not be parsed',
            concerns: 'AI response format was invalid — manual review recommended',
            shouldEscalate: true,
          }
        }
      }

      // Determine final status based on verification
      let finalStatus = err.status
      if (verification.shouldEscalate) {
        finalStatus = 'needs_attention'
      } else if (verification.agrees && err.status === 'resolved') {
        finalStatus = 'verified'
      }

      // Append verification report to resolution_notes
      const verificationReport = `

---
## Verification Report
**Verdict:** ${verification.verdict}
**Agrees with Analysis:** ${verification.agrees ? 'Yes' : 'No'}
**Confidence:** ${verification.confidence}
**Concerns:** ${verification.concerns}
${verification.shouldEscalate ? '**ESCALATED — Requires developer attention**' : ''}`

      await supabase
        .from('error_log')
        .update({
          status: finalStatus,
          resolution_notes: (err.resolution_notes || '') + verificationReport,
        })
        .eq('id', err.id)

      results.push({ id: err.id, verification, finalStatus })
    } catch (aiErr) {
      console.error('AI verification error:', aiErr)
      results.push({ id: err.id, verification: { error: 'Verification failed' }, finalStatus: err.status })
    }
  }

  return NextResponse.json({ results, verified: results.length })
}
