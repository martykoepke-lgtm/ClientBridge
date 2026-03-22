'use client'

import { useState, useEffect, useRef, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { computeProjectStage } from '@/lib/portal-utils'
import ScreenshotCapture from '@/components/review/screenshot-capture'
import type { Project, Feedback, Contract, Milestone, ScopeItem, TimeSession, ProjectDocument } from '@/lib/types'
import DocumentList from '@/components/documents/document-list'

type Tab = 'overview' | 'scope' | 'contract' | 'review' | 'feedback' | 'activity'

export default function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [contract, setContract] = useState<Contract | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([])
  const [outOfScopeItems, setOutOfScopeItems] = useState<ScopeItem[]>([])
  const [sessions, setSessions] = useState<TimeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [signName, setSignName] = useState('')
  const [signAgreed, setSignAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)

  // Feedback form state
  const [fbScreenPage, setFbScreenPage] = useState('')
  const [fbType, setFbType] = useState('general')
  const [fbTitle, setFbTitle] = useState('')
  const [fbQ1, setFbQ1] = useState('') // What were you trying to do?
  const [fbQ2, setFbQ2] = useState('') // What went wrong or what didn't you like?
  const [fbQ3, setFbQ3] = useState('') // What would you like to see instead?
  const [fbSeverity, setFbSeverity] = useState('normal')
  const [fbSubmitting, setFbSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')
  const [screenshotData, setScreenshotData] = useState<string | null>(null)
  const [showCapture, setShowCapture] = useState(false)
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([])
  const [contractCollapsed, setContractCollapsed] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const [projectRes, feedbackRes, contractRes, inScopeRes, outScopeRes, sessionsRes, docsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('feedback').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('contracts').select('*').eq('project_id', id).in('status', ['active', 'sent', 'client_signed', 'draft']).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('scope_items').select('*').eq('project_id', id).eq('in_scope', true).order('sort_order'),
      supabase.from('scope_items').select('*').eq('project_id', id).eq('in_scope', false).order('sort_order'),
      supabase.from('time_sessions').select('*').eq('project_id', id).not('duration_minutes', 'is', null).order('start_time', { ascending: false }).limit(20),
      supabase.from('project_documents').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])

    if (projectRes.data) setProject(projectRes.data)
    if (feedbackRes.data) setFeedback(feedbackRes.data)
    if (inScopeRes.data) setScopeItems(inScopeRes.data)
    if (outScopeRes.data) setOutOfScopeItems(outScopeRes.data)
    if (sessionsRes.data) setSessions(sessionsRes.data)
    if (docsRes.data) setProjectDocuments(docsRes.data)

    if (contractRes.data && !contractRes.error) {
      setContract(contractRes.data)
      const { data: ms } = await supabase.from('milestones').select('*').eq('contract_id', contractRes.data.id).order('sort_order')
      if (ms) setMilestones(ms)
    }

    setLoading(false)
  }

  // Listen for postMessage from proxied app for URL tracking
  useEffect(() => {
    if (!project) return
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'clientbridge:context') {
        const url = event.data.url || ''
        const msgTitle = event.data.title || ''
        const isCBDomain = url.includes('clientbridge.dev') || url.includes('clientbridge.vercel.app')
        const isProxyUrl = url.includes('/api/proxy')
        if (url && !isCBDomain && !isProxyUrl) {
          setCurrentUrl(url)
        }
        if (msgTitle) setCurrentTitle(msgTitle)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [project])

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!project) return
    setFbSubmitting(true)

    const screenUrl = currentUrl || project.vercel_url || null
    const screenTitle = fbScreenPage.trim() || currentTitle || null

    // Combine three guided questions into structured description
    const descriptionParts = []
    if (fbQ1.trim()) descriptionParts.push(`**What I was trying to do:** ${fbQ1.trim()}`)
    if (fbQ2.trim()) descriptionParts.push(`**What went wrong / what I didn't like:** ${fbQ2.trim()}`)
    if (fbQ3.trim()) descriptionParts.push(`**What I'd like to see instead:** ${fbQ3.trim()}`)
    const description = descriptionParts.join('\n\n')

    const { error: insertError } = await supabase.from('feedback').insert({
      project_id: project.id,
      client_id: project.client_id,
      screen_url: screenUrl,
      screen_title: screenTitle,
      screenshot_url: screenshotData || null,
      feedback_type: fbType,
      title: fbTitle,
      description,
      severity: fbSeverity,
    })

    if (!insertError) {
      setFeedbackSubmitted(true)
      setFbScreenPage('')
      setFbTitle('')
      setFbQ1('')
      setFbQ2('')
      setFbQ3('')
      setFbType('general')
      setFbSeverity('normal')
      setScreenshotData(null)
      // Reload feedback list
      const { data: newFeedback } = await supabase.from('feedback').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
      if (newFeedback) setFeedback(newFeedback)
    }
    setFbSubmitting(false)
  }

  async function handleSign() {
    if (!signName.trim() || !signAgreed || !contract) return
    setSigning(true)
    setSignError(null)

    try {
      const res = await fetch('/api/contract-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          signatureName: signName.trim(),
          agreed: true,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        setSignError(error || 'Failed to sign contract')
        setSigning(false)
        return
      }

      const { contract: updated } = await res.json()
      setContract(updated)
    } catch {
      setSignError('Network error — please try again')
    }
    setSigning(false)
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Loading...</div>
  if (!project) return <div className="text-gray-400 text-center py-12">Project not found.</div>

  const totalHours = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60
  const activeFeedback = feedback.filter(f => !['dismissed', 'resolved'].includes(f.status))
  const resolvedFeedback = feedback.filter(f => ['resolved', 'approved', 'change_made'].includes(f.status))
  const completedScope = scopeItems.filter(s => s.is_complete).length
  const stage = computeProjectStage(project, scopeItems.length, contract)

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'scope', label: `Scope (${scopeItems.length})`, show: scopeItems.length > 0 || outOfScopeItems.length > 0 },
    { id: 'contract', label: 'Contract & Docs', show: !!contract && contract.status !== 'draft' || projectDocuments.length > 0 },
    { id: 'review', label: 'Review App', show: !!project.vercel_url },
    { id: 'feedback', label: `Feedback (${feedback.length})`, show: true },
    { id: 'activity', label: 'Activity', show: true },
  ]
  const visibleTabs = tabs.filter(t => t.show)

  // Review tab uses full viewport
  const isFullWidth = activeTab === 'review'

  return (
    <div className="-mx-6 sm:-mx-8 lg:-mx-10 -mt-8">
      {/* Secondary nav bar with project info + tabs */}
      <div className="border-b border-[#1C1C22] bg-[#0C0C0E]/60 sticky top-14 z-40">
        <div className="px-6 sm:px-8 lg:px-10">
          {/* Project header row */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/portal" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                &larr;
              </Link>
              <h1 className="text-sm font-semibold text-white truncate">{project.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${stage.color} ${stage.textColor}`}>
                {stage.label}
              </span>
            </div>
            {activeTab === 'review' && (
              <a
                href={project.vercel_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition-colors"
              >
                Open in new tab
              </a>
            )}
          </div>
          {/* Tab strip */}
          <div className="flex gap-0.5 overflow-x-auto -mb-px">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contract pending alert */}
      {stage.stage === 'contract_pending' && activeTab === 'overview' && (
        <div className="px-6 sm:px-8 lg:px-10 pt-4">
          <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-amber-400 text-lg">!</span>
            <div>
              <p className="text-sm font-medium text-amber-300">Your contract is ready for review</p>
              <p className="text-xs text-amber-400/70 mt-0.5">Please review the terms and sign to proceed</p>
            </div>
            <button
              onClick={() => setActiveTab('contract')}
              className="ml-auto px-4 py-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors"
            >
              Review Contract
            </button>
          </div>
        </div>
      )}

      {/* ═══ REVIEW TAB — proxied app + feedback submission panel ═══ */}
      {activeTab === 'review' && project.vercel_url && (
        <div className="flex" style={{ height: 'calc(100vh - 112px)' }}>
          {/* App view — takes all available space */}
          <div className="flex-1 min-w-0 relative">
            <iframe
              src={`/api/proxy?url=${encodeURIComponent(project.vercel_url)}`}
              className="w-full h-full border-0"
              title="Application Review"
            />
            {/* Bottom bar with URL + fallback */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#0C0C0E]/95 border-t border-gray-800 px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate">{currentUrl || project.vercel_url}</span>
              <a
                href={project.vercel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap ml-3"
              >
                Open in new tab
              </a>
            </div>
          </div>

          {/* Feedback submission panel — always visible on right */}
          <div className="w-80 xl:w-96 border-l border-[#1C1C22] bg-[#0C0C0E] flex flex-col overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Submit Feedback</h3>
              <p className="text-[11px] text-gray-600 mt-0.5">Describe what you see and what you'd like changed</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {feedbackSubmitted ? (
                <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-6 rounded-lg text-center">
                  <p className="font-medium text-sm">Feedback submitted!</p>
                  <p className="text-xs mt-1 text-green-400">Your developer will review it shortly.</p>
                  <button
                    onClick={() => setFeedbackSubmitted(false)}
                    className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-colors"
                  >
                    Add More Feedback
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                  {/* Auto-detected page */}
                  {currentUrl && (
                    <div className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-green-400">Tracking your location</span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono break-all">{currentUrl}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Page / Screen</label>
                    <input
                      type="text"
                      value={fbScreenPage}
                      onChange={(e) => setFbScreenPage(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder={currentUrl ? 'Override detected page (optional)' : 'e.g., Dashboard, Settings'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                    <select
                      value={fbType}
                      onChange={(e) => setFbType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="bug">Bug — Something isn't working</option>
                      <option value="content">Content — Text or media changes</option>
                      <option value="ux">UX — Layout or usability</option>
                      <option value="feature_request">Feature — Something new</option>
                      <option value="general">General — Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Summary <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={fbTitle}
                      onChange={(e) => setFbTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder="Brief summary of your feedback"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">What were you trying to do? <span className="text-red-400">*</span></label>
                    <textarea
                      value={fbQ1}
                      onChange={(e) => setFbQ1(e.target.value)}
                      required
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                      placeholder="Describe what you were doing in the app..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">What went wrong or what didn't you like?</label>
                    <textarea
                      value={fbQ2}
                      onChange={(e) => setFbQ2(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                      placeholder="What happened that was unexpected or frustrating..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">What would you like to see instead?</label>
                    <textarea
                      value={fbQ3}
                      onChange={(e) => setFbQ3(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                      placeholder="Your ideal experience or suggestion..."
                    />
                  </div>

                  {/* Screenshot capture */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Screenshot</label>
                    {screenshotData ? (
                      <div className="relative">
                        <img
                          src={screenshotData}
                          alt="Captured screenshot"
                          className="w-full rounded-lg border border-gray-800 cursor-pointer hover:opacity-90"
                          onClick={() => window.open(screenshotData!, '_blank')}
                        />
                        <button
                          type="button"
                          onClick={() => setScreenshotData(null)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          x
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCapture(true)}
                          className="mt-1 text-[10px] text-amber-400 hover:text-amber-300"
                        >
                          Retake screenshot
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCapture(true)}
                        className="w-full px-3 py-3 text-xs bg-gray-900 border border-gray-800 border-dashed rounded-lg text-gray-500 hover:text-amber-400 hover:border-amber-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>📸</span> Capture Screenshot
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['low', 'normal', 'high', 'critical'] as const).map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setFbSeverity(level)}
                          className={`py-1.5 text-[10px] font-medium rounded-lg border transition-colors capitalize ${
                            fbSeverity === level
                              ? level === 'critical' ? 'bg-red-900/50 border-red-700 text-red-300'
                              : level === 'high' ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                              : level === 'normal' ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                              : 'bg-gray-800 border-gray-600 text-gray-300'
                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={fbSubmitting}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/40 disabled:cursor-not-allowed text-black text-xs font-semibold rounded-lg transition-colors"
                  >
                    {fbSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </form>
              )}

              {/* Link to full feedback list */}
              {feedback.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800 text-center">
                  <button onClick={() => setActiveTab('feedback')} className="text-[11px] text-amber-400 hover:text-amber-300">
                    View all {feedback.length} feedback items
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ NON-REVIEW TABS — full width with padding ═══ */}
      {activeTab !== 'review' && (
        <div className="px-6 sm:px-8 lg:px-10 py-6">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Hours Invested</p>
                  <p className="text-2xl font-bold text-white">{totalHours.toFixed(1)}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Scope Progress</p>
                  <p className="text-2xl font-bold text-white">{completedScope}/{scopeItems.length}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Active Feedback</p>
                  <p className="text-2xl font-bold text-amber-400">{activeFeedback.length}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold text-green-400">{resolvedFeedback.length}</p>
                </div>
              </div>

              {/* Scope progress */}
              {scopeItems.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Scope Progress</h3>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${scopeItems.length > 0 ? (completedScope / scopeItems.length) * 100 : 0}%` }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    {scopeItems.slice(0, 12).map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className={item.is_complete ? 'text-green-500' : 'text-gray-600'}>{item.is_complete ? '✓' : '○'}</span>
                        <span className={item.is_complete ? 'text-gray-500 line-through' : 'text-gray-300'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {scopeItems.length > 12 && (
                    <button onClick={() => setActiveTab('scope')} className="text-xs text-amber-400 hover:text-amber-300 mt-2">
                      View all {scopeItems.length} items
                    </button>
                  )}
                </div>
              )}

              {/* Milestones */}
              {milestones.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Milestones</h3>
                  <div className="space-y-2">
                    {milestones.map((m, i) => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-500">{i + 1}</span>
                          <span className="text-sm text-gray-300">{m.title || 'Untitled'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-white">${(m.amount || 0).toLocaleString()}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            m.status === 'paid' ? 'bg-green-900/50 text-green-300' :
                            m.status === 'invoiced' ? 'bg-blue-900/50 text-blue-300' :
                            'bg-gray-800 text-gray-500'
                          }`}>{m.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live app link */}
              {project.vercel_url && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Live Application</h3>
                  <div className="flex items-center gap-3">
                    <a href={project.vercel_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
                      {project.vercel_url}
                    </a>
                    <button
                      onClick={() => setActiveTab('review')}
                      className="px-3 py-1 text-xs font-medium bg-teal-900/50 text-teal-300 hover:bg-teal-900 rounded-full transition-colors"
                    >
                      Review in Portal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scope Tab */}
          {activeTab === 'scope' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">In Scope</h3>
                {scopeItems.length === 0 ? (
                  <p className="text-gray-500 text-sm">No scope items defined yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {scopeItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className={item.is_complete ? 'text-green-500' : 'text-gray-600'}>{item.is_complete ? '✓' : '○'}</span>
                        <span className={item.is_complete ? 'text-gray-500 line-through' : 'text-gray-300'}>{item.label}</span>
                        {item.source !== 'custom' && item.source_id && (
                          <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{item.source_id}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {outOfScopeItems.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Out of Scope</h3>
                  <div className="space-y-1.5">
                    {outOfScopeItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-500">
                        <span>—</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contract Tab */}
          {activeTab === 'contract' && (
            <div className="max-w-4xl">
              {contract ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl">
                  <button
                    onClick={() => setContractCollapsed(!contractCollapsed)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-800/30 transition-colors rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-gray-500 transition-transform ${contractCollapsed ? '' : 'rotate-90'}`}>&#9654;</span>
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Contract Agreement</h3>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      contract.status === 'active' ? 'bg-green-900/50 text-green-300' :
                      contract.status === 'sent' ? 'bg-amber-900/50 text-amber-300' :
                      contract.status === 'client_signed' ? 'bg-blue-900/50 text-blue-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>{
                      contract.status === 'sent' ? 'Awaiting Your Signature' :
                      contract.status === 'client_signed' ? 'Awaiting Counter-Signature' :
                      contract.status === 'active' ? 'Fully Executed' :
                      contract.status
                    }</span>
                  </button>

                  {!contractCollapsed && (
                  <div className="px-8 pb-8">

                  <div className="space-y-5 mb-8">
                    {(contract.sections ?? []).map((section: { number: number; title: string; content: string; subsections?: { id: string; title: string; content: string }[] }) => (
                      <div key={section.number}>
                        <h4 className="text-sm font-semibold text-white mb-1.5">{section.number}. {section.title}</h4>
                        {section.content && <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{section.content}</p>}
                        {section.subsections?.map(sub => (
                          <div key={sub.id} className="ml-4 mt-2">
                            <h5 className="text-xs font-semibold text-gray-400">{sub.id}. {sub.title}</h5>
                            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{sub.content}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Milestones table */}
                  {milestones.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Payment Schedule</h4>
                      <div className="border border-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-800/50">
                              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">#</th>
                              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Milestone</th>
                              <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Amount</th>
                              <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {milestones.map((m, i) => (
                              <tr key={m.id} className="border-t border-gray-800">
                                <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                                <td className="px-4 py-2.5 text-gray-300">{m.title}</td>
                                <td className="px-4 py-2.5 text-right text-white font-medium">${(m.amount || 0).toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    m.status === 'paid' ? 'bg-green-900/50 text-green-300' :
                                    m.status === 'invoiced' ? 'bg-blue-900/50 text-blue-300' :
                                    'bg-gray-800 text-gray-500'
                                  }`}>{m.status}</span>
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-gray-700">
                              <td colSpan={2} className="px-4 py-2.5 text-gray-400 font-medium">Total</td>
                              <td className="px-4 py-2.5 text-right text-white font-bold">${milestones.reduce((s, m) => s + (m.amount || 0), 0).toLocaleString()}</td>
                              <td />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Signature block */}
                  {contract.status === 'sent' && (
                    <div className="border-t border-gray-800 pt-6">
                      <h4 className="text-sm font-semibold text-white mb-1">Sign this Agreement</h4>
                      <p className="text-xs text-gray-500 mb-4">By typing your name and checking the box below, you are providing a legally binding electronic signature.</p>

                      {signError && (
                        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-2 rounded-lg text-sm mb-4">{signError}</div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Type your full legal name</label>
                          <input
                            type="text"
                            value={signName}
                            onChange={(e) => setSignName(e.target.value)}
                            placeholder="Full name as signature"
                            className="w-full max-w-sm px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input type="checkbox" checked={signAgreed} onChange={(e) => setSignAgreed(e.target.checked)} className="rounded border-gray-600 mt-0.5" />
                          <span className="text-sm text-gray-400">I have read and agree to all terms outlined in this agreement, including scope of work, payment terms, and all additional provisions.</span>
                        </label>
                        <button
                          onClick={handleSign}
                          disabled={!signName.trim() || !signAgreed || signing}
                          className="px-6 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                        >
                          {signing ? 'Signing...' : 'Sign Contract'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Signed confirmation */}
                  {contract.client_signature_name && (
                    <div className="border-t border-gray-800 pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-sm text-green-400 font-medium">Signed by {contract.client_signature_name}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {contract.client_signature_date && `Signed on ${new Date(contract.client_signature_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                        {contract.status === 'client_signed' && ' — awaiting contractor counter-signature'}
                        {contract.status === 'active' && contract.contractor_signature_name && ` · Counter-signed by ${contract.contractor_signature_name}`}
                      </p>
                    </div>
                  )}

                  {/* Download PDF */}
                  <div className="border-t border-gray-800 pt-4 mt-6">
                    <a
                      href={`/api/contract-pdf?contractId=${contract.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
                    >
                      Download Contract PDF
                    </a>
                  </div>
                  </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No contract has been shared yet.</p>
              )}

              {/* Documents Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Project Documents</h3>
                  <span className="text-xs text-gray-500">{projectDocuments.length} document{projectDocuments.length !== 1 ? 's' : ''}</span>
                </div>
                <DocumentList
                  projectId={id}
                  documents={projectDocuments}
                  onDocumentsChange={setProjectDocuments}
                  canUpload={true}
                  canDelete={(doc) => doc.uploaded_by_role === 'client'}
                  role="client"
                />
              </div>
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl">
              <div className="divide-y divide-gray-800">
                {feedback.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No feedback submitted yet.</div>
                ) : feedback.map(item => (
                  <div key={item.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.severity === 'critical' ? 'bg-red-500' : item.severity === 'high' ? 'bg-amber-500' : item.severity === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm text-white truncate">{item.title}</span>
                        <span className="text-xs text-gray-600 hidden md:inline">
                          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-3 whitespace-nowrap ${
                        item.status === 'resolved' || item.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                        item.status === 'in_progress' || item.status === 'reviewed' ? 'bg-amber-900/50 text-amber-300' :
                        item.status === 'change_made' ? 'bg-purple-900/50 text-purple-300' :
                        item.status === 'dismissed' ? 'bg-gray-800 text-gray-500' :
                        'bg-blue-900/50 text-blue-300'
                      }`}>{item.status.replace(/_/g, ' ')}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1 ml-4 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Recent Work Sessions</h3>
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No work sessions recorded yet.</p>
              ) : (
                <div className="space-y-1">
                  {sessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-16">
                          {new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-gray-400">{s.category_name}</span>
                        {s.ai_summary && <span className="text-gray-600 text-xs truncate max-w-md hidden md:inline">{s.ai_summary}</span>}
                      </div>
                      <span className="text-white font-medium">{((s.duration_minutes ?? 0) / 60).toFixed(1)}h</span>
                    </div>
                  ))}
                  <div className="pt-3 flex justify-end">
                    <span className="text-sm text-gray-400">Total: <strong className="text-white">{totalHours.toFixed(1)} hours</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Screenshot capture modal */}
      {showCapture && (
        <ScreenshotCapture
          onCapture={(dataUrl) => {
            setScreenshotData(dataUrl)
            setShowCapture(false)
          }}
          onCancel={() => setShowCapture(false)}
        />
      )}
    </div>
  )
}
