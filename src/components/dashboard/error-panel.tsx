'use client'

import { useState } from 'react'

interface ErrorItem {
  id: string
  error_type: string
  message: string
  url: string | null
  raw_error: string | null
  source: string
  status: string
  resolution_notes: string | null
  created_at: string
  project?: { name: string } | null
}

export default function ErrorPanel({
  initialErrors,
  initialCount,
}: {
  initialErrors: ErrorItem[]
  initialCount: number
}) {
  const [errors, setErrors] = useState<ErrorItem[]>(initialErrors)
  const [errorCount, setErrorCount] = useState(initialCount)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  if (errorCount === 0 && errors.length === 0) return null

  async function handleAIReviewAll() {
    setAnalyzing(true)
    const ids = errors.filter(e => e.status === 'new' || e.status === 'needs_attention').map(e => e.id)
    if (ids.length === 0) { setAnalyzing(false); return }

    // Mark all as analyzing in UI
    setErrors(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: 'analyzing' } : e))

    try {
      // Step 1: Primary analysis
      const analyzeRes = await fetch('/api/errors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorIds: ids }),
      })
      const analyzeData = await analyzeRes.json()

      // Step 2: Verification (only on non-duplicate results)
      const toVerify = analyzeData.results
        ?.filter((r: any) => !r.analysis?.duplicate)
        .map((r: any) => r.id) ?? []

      if (toVerify.length > 0) {
        await fetch('/api/errors/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ errorIds: toVerify }),
        })
      }
    } catch (err) {
      console.error('AI review failed:', err)
    }

    // Refresh errors from server
    await refreshErrors()
    setAnalyzing(false)
  }

  async function handleAISingle(errorId: string) {
    setActionInProgress(errorId)
    setErrors(prev => prev.map(e => e.id === errorId ? { ...e, status: 'analyzing' } : e))

    try {
      await fetch('/api/errors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorIds: [errorId] }),
      })
      await fetch('/api/errors/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorIds: [errorId] }),
      })
    } catch (err) {
      console.error('AI analysis failed:', err)
    }

    await refreshErrors()
    setActionInProgress(null)
  }

  async function handleDismiss(errorId: string) {
    setActionInProgress(errorId)
    await fetch('/api/errors/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', errorIds: [errorId] }),
    })
    await refreshErrors()
    setActionInProgress(null)
  }

  async function handleResolve(errorId: string) {
    setActionInProgress(errorId)
    await fetch('/api/errors/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', errorIds: [errorId] }),
    })
    await refreshErrors()
    setActionInProgress(null)
  }

  async function handleClearResolved() {
    setActionInProgress('clearing')
    await fetch('/api/errors/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_resolved' }),
    })
    await refreshErrors()
    setActionInProgress(null)
  }

  async function refreshErrors() {
    try {
      const res = await fetch('/api/errors/list')
      const data = await res.json()
      setErrors(data.errors ?? [])
      setErrorCount(data.count ?? 0)
    } catch {
      // Fallback: just remove resolved from local state
      setErrors(prev => prev.filter(e => !['resolved', 'verified', 'ignored'].includes(e.status)))
      setErrorCount(prev => Math.max(0, prev - 1))
    }
  }

  const unresolvedCount = errors.filter(e => !['resolved', 'verified', 'ignored'].includes(e.status)).length
  const resolvedCount = errors.filter(e => ['resolved', 'verified', 'ignored'].includes(e.status)).length
  const hasNewErrors = errors.some(e => e.status === 'new' || e.status === 'needs_attention')

  return (
    <div className="mb-6 bg-[#18181B] border border-[#27272A] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <span className="text-[#EF4444] text-lg">&#9888;</span>
          <span className="text-sm font-semibold text-white">
            {unresolvedCount > 0
              ? `${unresolvedCount} unresolved error${unresolvedCount !== 1 ? 's' : ''}`
              : 'All errors resolved'}
          </span>
          {analyzing && (
            <span className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
              <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full animate-pulse" />
              AI analyzing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unresolvedCount > 1 && (
            <button
              onClick={async () => {
                const ids = errors.filter(e => !['resolved', 'verified', 'ignored'].includes(e.status)).map(e => e.id)
                if (!ids.length) return
                setActionInProgress('resolve-all')
                await fetch('/api/errors/update', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'resolve', errorIds: ids }),
                })
                await refreshErrors()
                setActionInProgress(null)
              }}
              disabled={!!actionInProgress}
              className="px-3 py-1.5 text-xs font-medium bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/30 rounded-lg transition-colors"
            >
              Resolve All ({unresolvedCount})
            </button>
          )}
          {hasNewErrors && (
            <button
              onClick={handleAIReviewAll}
              disabled={analyzing}
              className="px-3 py-1.5 text-xs font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 disabled:cursor-not-allowed text-[#09090B] rounded-lg transition-colors"
            >
              {analyzing ? 'Analyzing...' : 'AI Review All'}
            </button>
          )}
          {resolvedCount > 0 && (
            <button
              onClick={handleClearResolved}
              disabled={actionInProgress === 'clearing'}
              className="px-3 py-1.5 text-xs font-medium bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] rounded-lg transition-colors"
            >
              Clear Resolved ({resolvedCount})
            </button>
          )}
        </div>
      </div>

      {/* Error List */}
      <div className="divide-y divide-[#27272A]">
        {errors.map((err) => (
          <div key={err.id}>
            {/* Error Row */}
            <div
              className={`flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[#1C1C22] transition-all ${
                expandedId === err.id ? 'bg-[#1C1C22]' : ''
              } ${['resolved', 'verified', 'ignored'].includes(err.status) ? 'opacity-40' : ''}`}
              onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ErrorStatusBadge status={err.status} />
                {err.source === 'client' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F59E0B]/15 text-[#F59E0B] rounded shrink-0">
                    client
                  </span>
                )}
                <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded shrink-0 ${
                  ['resolved', 'verified', 'ignored'].includes(err.status)
                    ? 'bg-[#09090B] text-[#22C55E]'
                    : 'bg-[#09090B] text-[#EF4444]'
                }`}>
                  {['resolved', 'verified', 'ignored'].includes(err.status) ? 'resolved' : err.error_type}
                </span>
                <span className={`text-sm truncate ${['resolved', 'verified', 'ignored'].includes(err.status) ? 'text-[#52525B] line-through' : 'text-[#A1A1AA]'}`}>
                  {err.message.slice(0, 80)}{err.message.length > 80 ? '...' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs text-[#52525B]">{err.project?.name || 'Unknown'}</span>
                <span className="text-xs text-[#3F3F46]">
                  {new Date(err.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className={`text-[#52525B] text-xs transition-transform ${expandedId === err.id ? 'rotate-90' : ''}`}>
                  &#9654;
                </span>
              </div>
            </div>

            {/* Expanded Detail */}
            {expandedId === err.id && (
              <div className="px-5 pb-4 border-t border-[#1C1C22]">
                <div className="mt-3 space-y-3">
                  {/* Full error message */}
                  <div className="bg-[#09090B] rounded-lg p-3">
                    <p className="text-xs font-medium text-[#71717A] mb-1">Full Error</p>
                    <p className="text-sm text-[#A1A1AA] font-mono break-all">{err.message}</p>
                    {err.url && (
                      <p className="text-xs text-[#52525B] mt-1">URL: {err.url}</p>
                    )}
                  </div>

                  {/* AI Analysis Report */}
                  {err.resolution_notes && (
                    <div className="bg-[#0C1A0E] border border-[#22C55E]/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-[#22C55E] mb-2">AI Report</p>
                      <div className="text-sm text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">
                        {err.resolution_notes.split('\n').map((line, i) => {
                          if (line.startsWith('## ')) return <p key={i} className="text-white font-semibold mt-2 mb-1 text-xs uppercase tracking-wide">{line.replace('## ', '')}</p>
                          if (line.startsWith('**') && line.includes(':**')) {
                            const [label, ...rest] = line.split(':**')
                            return <p key={i}><span className="text-[#71717A] text-xs">{label.replace(/\*\*/g, '')}:</span> <span className="text-[#D4D4D8] text-sm">{rest.join(':**').replace(/\*\*/g, '')}</span></p>
                          }
                          if (line.startsWith('---')) return <hr key={i} className="border-[#27272A] my-2" />
                          if (line.includes('ESCALATED')) return <p key={i} className="text-[#EF4444] font-semibold text-xs mt-1">{line.replace(/\*\*/g, '')}</p>
                          if (line.trim()) return <p key={i}>{line}</p>
                          return null
                        })}
                      </div>
                    </div>
                  )}

                  {/* Raw error trace (collapsible) */}
                  {err.raw_error && (
                    <details className="group">
                      <summary className="text-xs text-[#52525B] cursor-pointer hover:text-[#71717A]">
                        Show stack trace
                      </summary>
                      <pre className="mt-2 bg-[#09090B] rounded-lg p-3 text-xs text-[#52525B] font-mono overflow-x-auto max-h-48 overflow-y-auto">
                        {err.raw_error}
                      </pre>
                    </details>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {(err.status === 'new' || err.status === 'needs_attention') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAISingle(err.id) }}
                        disabled={actionInProgress === err.id}
                        className="px-3 py-1.5 text-xs font-medium bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/30 rounded-lg transition-colors"
                      >
                        {actionInProgress === err.id ? 'Analyzing...' : 'Ask AI'}
                      </button>
                    )}
                    {err.status !== 'resolved' && err.status !== 'verified' && err.status !== 'ignored' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResolve(err.id) }}
                          disabled={!!actionInProgress}
                          className="px-3 py-1.5 text-xs font-medium bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/30 rounded-lg transition-colors"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismiss(err.id) }}
                          disabled={!!actionInProgress}
                          className="px-3 py-1.5 text-xs font-medium bg-[#27272A] text-[#71717A] hover:bg-[#3F3F46] rounded-lg transition-colors"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {(err.status === 'resolved' || err.status === 'verified') && (
                      <span className="text-xs text-[#22C55E]">Resolved</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-[#EF4444]/20 text-[#EF4444]',
    analyzing: 'bg-[#F59E0B]/20 text-[#F59E0B] animate-pulse',
    acknowledged: 'bg-[#3B82F6]/20 text-[#3B82F6]',
    resolved: 'bg-[#22C55E]/20 text-[#22C55E]',
    verified: 'bg-[#22C55E]/20 text-[#22C55E]',
    needs_attention: 'bg-[#A855F7]/20 text-[#A855F7]',
    ignored: 'bg-[#52525B]/20 text-[#52525B]',
  }

  const labels: Record<string, string> = {
    new: 'New',
    analyzing: 'Analyzing',
    acknowledged: 'Reviewed',
    resolved: 'Resolved',
    verified: 'Verified',
    needs_attention: 'Needs Attention',
    ignored: 'Dismissed',
  }

  return (
    <span className={`w-2 h-2 rounded-full shrink-0 ${
      status === 'new' ? 'bg-[#EF4444]' :
      status === 'analyzing' ? 'bg-[#F59E0B] animate-pulse' :
      status === 'needs_attention' ? 'bg-[#A855F7]' :
      status === 'resolved' || status === 'verified' ? 'bg-[#22C55E]' :
      'bg-[#52525B]'
    }`} title={labels[status] ?? status} />
  )
}
