'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Feedback, Project, ComplexityProfile } from '@/lib/types'

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string; feedbackId: string }>
}) {
  const { id, feedbackId } = use(params)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [status, setStatus] = useState('')
  const [devNotes, setDevNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [feedbackId])

  async function loadData() {
    const [feedbackRes, projectRes] = await Promise.all([
      supabase.from('feedback').select('*').eq('id', feedbackId).single(),
      supabase.from('projects').select('*, client:clients(*)').eq('id', id).single(),
    ])

    if (feedbackRes.data) {
      setFeedback(feedbackRes.data)
      setStatus(feedbackRes.data.status)
      setDevNotes(feedbackRes.data.developer_notes ?? '')
    }
    setProject(projectRes.data)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    await supabase
      .from('feedback')
      .update({
        status,
        developer_notes: devNotes || null,
      })
      .eq('id', feedbackId)
    await loadData()
    setSaving(false)
  }

  function generatePrompt(): string {
    if (!feedback || !project) return ''

    const client = project.client as { name: string } | undefined
    const cp = project.complexity_profile ?? {}

    // Build tech context from complexity profile
    const techContext: string[] = []
    if (cp.app_type) techContext.push(`App Type: ${cp.app_type.replace('_', ' ')}`)
    if (cp.audience) techContext.push(`Audience: ${cp.audience.toUpperCase()}`)
    if (cp.auth_level && cp.auth_level !== 'none') techContext.push(`Auth: ${cp.auth_level.toUpperCase()}`)
    if (cp.database_complexity) techContext.push(`Database: ${cp.database_complexity}`)
    if (cp.multi_tenant) techContext.push(`Multi-tenant: yes`)
    if (cp.integrations?.length) techContext.push(`Integrations: ${cp.integrations.join(', ')}`)
    if (cp.features?.length) techContext.push(`Key Features: ${cp.features.join(', ')}`)

    // Build the deployment URL context
    const urlContext = project.vercel_url ? `- Production URL: ${project.vercel_url}` : ''

    // Infer likely file locations from the screen URL
    const screenHint = feedback.screen_url ? inferFileHint(feedback.screen_url, project.vercel_url) : ''

    return `## Client Feedback — ${project.name}
**Client:** ${client?.name ?? 'Unknown'}
**Screen:** ${feedback.screen_url ?? 'Not specified'}
**Type:** ${feedback.feedback_type.replace('_', ' ')}
**Severity:** ${feedback.severity}
**Submitted:** ${new Date(feedback.created_at).toLocaleString()}

### Client's Description:
**${feedback.title}**

${feedback.description}

### Screen Context:
- URL/Route: ${feedback.screen_url ?? 'Not captured'}
- Page Title: ${feedback.screen_title ?? 'Not captured'}
${urlContext}${screenHint ? `\n- Likely file path: ${screenHint}` : ''}

${techContext.length > 0 ? `### Project Tech Profile:\n${techContext.map(t => `- ${t}`).join('\n')}\n` : ''}${devNotes ? `### Developer Notes:\n${devNotes}\n` : ''}
### Action Requested:
Based on this ${feedback.feedback_type.replace('_', ' ')} feedback${feedback.severity === 'critical' ? ' (CRITICAL PRIORITY)' : feedback.severity === 'high' ? ' (HIGH PRIORITY)' : ''}, please:
1. ${feedback.feedback_type === 'bug'
      ? 'Identify the root cause of the bug described above'
      : feedback.feedback_type === 'content'
        ? 'Locate the content that needs updating'
        : feedback.feedback_type === 'ux'
          ? 'Analyze the UX issue and propose an improvement'
          : feedback.feedback_type === 'feature_request'
            ? 'Design and implement the requested feature'
            : 'Review and address the feedback'}
2. ${feedback.feedback_type === 'bug'
      ? 'Fix the issue and verify it doesn\'t introduce regressions'
      : feedback.feedback_type === 'content'
        ? 'Make the content changes exactly as described by the client'
        : feedback.feedback_type === 'ux'
          ? 'Implement the UX improvement with minimal disruption to existing flows'
          : feedback.feedback_type === 'feature_request'
            ? 'Implement with clean, maintainable code that fits the existing architecture'
            : 'Make the necessary changes'}
3. Summarize what was changed and why`
  }

  function inferFileHint(screenUrl: string, vercelUrl: string | null): string {
    // Extract route path from the screen URL
    let route = screenUrl
    if (vercelUrl && screenUrl.startsWith(vercelUrl)) {
      route = screenUrl.slice(vercelUrl.length)
    }
    // Clean up the route
    route = route.replace(/^https?:\/\/[^/]+/, '')
    if (!route || route === '/') return 'src/app/page.tsx'
    // Convert route to likely Next.js App Router file path
    const segments = route.split('/').filter(Boolean)
    const path = segments.map(s => {
      // UUID-like segments are likely dynamic routes
      if (/^[0-9a-f-]{8,}$/i.test(s)) return '[id]'
      return s
    }).join('/')
    return `src/app/${path}/page.tsx (or nearby components)`
  }

  async function copyPrompt() {
    const prompt = generatePrompt()
    await navigator.clipboard.writeText(prompt)

    // Also save the generated prompt to the DB
    await supabase
      .from('feedback')
      .update({ generated_prompt: prompt })
      .eq('id', feedbackId)

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>
  }

  if (!feedback || !project) {
    return <div className="text-gray-400 text-center py-12">Feedback not found.</div>
  }

  const client = project.client as { name: string; id: string } | undefined

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/clients" className="hover:text-white transition-colors">Clients</Link>
        <span>/</span>
        {client && (
          <>
            <Link href={`/clients/${client.id}`} className="hover:text-white transition-colors">
              {client.name}
            </Link>
            <span>/</span>
          </>
        )}
        <Link href={`/projects/${id}`} className="hover:text-white transition-colors">
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-white truncate">{feedback.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feedback Detail */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <TypeBadge type={feedback.feedback_type} />
              <SeverityBadge severity={feedback.severity} />
              <StatusBadge status={feedback.status} />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">{feedback.title}</h1>

            {feedback.screen_url && (
              <p className="text-sm text-gray-400 mb-4">
                Screen: <span className="text-gray-300">{feedback.screen_url}</span>
                {feedback.screen_title && <> — {feedback.screen_title}</>}
              </p>
            )}

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-200 whitespace-pre-wrap">{feedback.description}</p>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Submitted {new Date(feedback.created_at).toLocaleString()}
            </p>
          </div>

          {/* Generated Prompt */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Generated Prompt</h2>
              <button
                onClick={copyPrompt}
                className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <pre className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto font-mono">
              {generatePrompt()}
            </pre>
            <p className="text-xs text-gray-500 mt-3">
              Paste this prompt into Claude Code or Cursor to action this feedback.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Notes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Manage</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="in_progress">In Progress</option>
                <option value="change_made">Change Made — Pending Client Review</option>
                <option value="approved">Client Approved</option>
                <option value="needs_revision">Client Needs Revision</option>
                <option value="resolved">Resolved</option>
                <option value="deferred">Deferred</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Developer Notes</label>
              <textarea
                value={devNotes}
                onChange={(e) => setDevNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add your notes about this feedback..."
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Screenshot */}
          {feedback.screenshot_url && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Screenshot</h3>
              <img
                src={feedback.screenshot_url}
                alt="Feedback screenshot"
                className="w-full rounded-lg border border-gray-700"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    bug: 'bg-red-900/50 text-red-300',
    content: 'bg-purple-900/50 text-purple-300',
    ux: 'bg-amber-900/50 text-amber-300',
    feature_request: 'bg-green-900/50 text-green-300',
    general: 'bg-gray-800 text-gray-300',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] ?? colors.general}`}>
      {type.replace('_', ' ')}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-800 text-gray-400',
    normal: 'bg-blue-900/50 text-blue-300',
    high: 'bg-amber-900/50 text-amber-300',
    critical: 'bg-red-900/50 text-red-300',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] ?? colors.normal}`}>
      {severity}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: 'bg-blue-900/50 text-blue-300',
    reviewed: 'bg-gray-800 text-gray-300',
    in_progress: 'bg-amber-900/50 text-amber-300',
    change_made: 'bg-purple-900/50 text-purple-300',
    approved: 'bg-green-900/50 text-green-300',
    needs_revision: 'bg-orange-900/50 text-orange-300',
    resolved: 'bg-green-900/50 text-green-300',
    deferred: 'bg-gray-800 text-gray-400',
    dismissed: 'bg-gray-800 text-gray-500',
    new: 'bg-blue-900/50 text-blue-300',
  }

  const labels: Record<string, string> = {
    change_made: 'change made',
    needs_revision: 'needs revision',
    in_progress: 'in progress',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? colors.submitted}`}>
      {labels[status] ?? status}
    </span>
  )
}
