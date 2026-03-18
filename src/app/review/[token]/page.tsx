'use client'

import { useState, useEffect, useRef, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project, Feedback, TimeSession } from '@/lib/types'

type ViewMode = 'review' | 'feedback' | 'my-feedback' | 'progress'

export default function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [nameSubmitted, setNameSubmitted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('review')
  const [currentUrl, setCurrentUrl] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Feedback form state
  const [screenPage, setScreenPage] = useState('')
  const [feedbackType, setFeedbackType] = useState<string>('general')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('normal')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // My Feedback state
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  // Progress state
  const [progressSessions, setProgressSessions] = useState<TimeSession[]>([])
  const [progressFeedback, setProgressFeedback] = useState<Feedback[]>([])
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressTab, setProgressTab] = useState<'overview' | 'activity' | 'feedback'>('overview')
  const [lastVisit, setLastVisit] = useState<string | null>(null)
  const [showResolved, setShowResolved] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadProject()
    const saved = localStorage.getItem(`cb_name_${token}`)
    if (saved) {
      setClientName(saved)
      setNameSubmitted(true)
    }
  }, [token])

  // Listen for postMessage from proxied app tracking script
  useEffect(() => {
    if (!project) return

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'clientbridge:context') {
        const url = event.data.url || ''
        const msgTitle = event.data.title || ''
        // SAFETY: Never overwrite currentUrl with the ClientBridge domain itself.
        // The tracking script resolves proxy URLs back to the real app URL.
        // Only reject if the URL is literally the CB app (not a proxied app URL).
        // We check against our own known domains — NOT localhost, because the
        // proxied app's resolved URL will be its Vercel domain, not localhost.
        const isCBDomain = url.includes('clientbridge.dev') || url.includes('clientbridge.vercel.app')
        // Also reject if the URL is our proxy endpoint (tracking script fallback)
        const isProxyUrl = url.includes('/api/proxy')
        if (url && !isCBDomain && !isProxyUrl) {
          setCurrentUrl(url)
          // Persist in sessionStorage so the nav guard can recover
          sessionStorage.setItem(`cb_last_url_${token}`, url)
        }
        if (msgTitle) {
          setCurrentTitle(msgTitle)
        }
      }
      // Handle "Submit Feedback Instead" button from error overlay inside iframe
      if (event.data?.type === 'clientbridge:switchView' && event.data.view) {
        setViewMode(event.data.view as ViewMode)
      }
      // Handle navigation events — if iframe is leaving for OAuth,
      // we'll need to reload the proxy after the auth flow completes
      if (event.data?.type === 'clientbridge:navigation' && event.data.leaving) {
        // Store the last known URL so we can recover
        sessionStorage.setItem(`cb_last_url_${token}`, event.data.url || project?.vercel_url)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [project, token])

  // Guard: if the iframe navigates to a CLIENTBRIDGE page (e.g. /login, /signup,
  // /dashboard) after an OAuth redirect, detect it and reload the proxy.
  // CRITICAL: Do NOT reload for normal SPA navigation! When the proxied app uses
  // history.pushState or location.hash to navigate (e.g. from /#login to /#workdash),
  // the iframe URL changes from /api/proxy?url=... to /#workdash. This is NORMAL
  // client-side routing and must NOT be interfered with. The old guard was resetting
  // the iframe on every SPA navigation, which is why the URL was stuck.
  //
  // We only reload when the iframe is on a known ClientBridge route that means
  // something went wrong (OAuth redirect landed on CB login instead of the app).
  useEffect(() => {
    if (!project?.vercel_url || !iframeRef.current) return

    const CB_ROUTES = ['/login', '/signup', '/dashboard']

    const interval = setInterval(() => {
      try {
        const iframe = iframeRef.current
        if (!iframe) return
        const iframePath = iframe.contentWindow?.location?.pathname
        if (!iframePath) return

        // Only intervene if the iframe landed on an actual ClientBridge page.
        // This means an OAuth callback or redirect went wrong and sent the
        // client to CB's login/dashboard instead of back to their proxied app.
        const isOnCBPage = CB_ROUTES.some(route => iframePath.startsWith(route))
        if (isOnCBPage) {
          const lastUrl = sessionStorage.getItem(`cb_last_url_${token}`) || project.vercel_url || ''
          if (lastUrl) iframe.src = `/api/proxy?url=${encodeURIComponent(lastUrl)}`
        }
      } catch {
        // Cross-origin — iframe is on an external domain (Google OAuth etc.)
        // This is fine, it will redirect back and we'll catch it then
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [project, token])

  // Load feedback when switching to My Feedback view
  useEffect(() => {
    if (viewMode === 'my-feedback' && project) {
      loadFeedback()
    }
  }, [viewMode, project])

  // Load progress data
  useEffect(() => {
    if (viewMode === 'progress' && project) {
      loadProgress()
    }
  }, [viewMode, project])

  async function loadProject() {
    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('review_token', token)
      .eq('review_link_active', true)
      .single()

    if (fetchError || !data) {
      setError('This review link is not valid or has been revoked.')
    } else {
      setProject(data)
      setCurrentUrl(data.vercel_url || '')
    }
    setLoading(false)
  }

  async function loadFeedback() {
    if (!project) return
    setFeedbackLoading(true)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (data) setFeedbackItems(data)
    setFeedbackLoading(false)
  }

  async function loadProgress() {
    if (!project) return
    setProgressLoading(true)

    // Load last visit timestamp from localStorage
    const lastVisitKey = `cb_last_visit_${token}`
    const storedLastVisit = localStorage.getItem(lastVisitKey)
    setLastVisit(storedLastVisit)

    const [sessionsRes, feedbackRes] = await Promise.all([
      supabase
        .from('time_sessions')
        .select('*')
        .eq('project_id', project.id)
        .not('duration_minutes', 'is', null)
        .order('start_time', { ascending: false }),
      supabase
        .from('feedback')
        .select('*')
        .eq('project_id', project.id)
        .order('updated_at', { ascending: false }),
    ])

    if (sessionsRes.data) setProgressSessions(sessionsRes.data)
    if (feedbackRes.data) setProgressFeedback(feedbackRes.data)

    // Update last visit timestamp
    localStorage.setItem(lastVisitKey, new Date().toISOString())

    setProgressLoading(false)
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (clientName.trim()) {
      localStorage.setItem(`cb_name_${token}`, clientName.trim())
      setNameSubmitted(true)
    }
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!project) return
    setSubmitting(true)

    // Always capture the REAL current URL from the iframe tracking, not a manual override.
    // The manual screenPage field is for the *title/label* override only.
    // screen_url should always be the actual URL the client is on.
    const screenUrl = currentUrl || project?.vercel_url || null
    const screenTitle = screenPage.trim() || currentTitle || null

    const { error: insertError } = await supabase.from('feedback').insert({
      project_id: project.id,
      client_id: project.client_id,
      screen_url: screenUrl,
      screen_title: screenTitle,
      feedback_type: feedbackType,
      title,
      description,
      severity,
    })

    if (!insertError) {
      setSubmitted(true)
      setScreenPage('')
      setTitle('')
      setDescription('')
      setFeedbackType('general')
      setSeverity('normal')

      setTimeout(() => {
        setSubmitted(false)
        setViewMode('my-feedback')
      }, 2000)
    }

    setSubmitting(false)
  }

  async function handleClientAction(feedbackId: string, newStatus: 'approved' | 'needs_revision') {
    await supabase
      .from('feedback')
      .update({ status: newStatus })
      .eq('id', feedbackId)
    await loadFeedback()
    // Also refresh progress feedback if on progress tab
    if (viewMode === 'progress' && project) {
      const { data } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', project.id)
        .order('updated_at', { ascending: false })
      if (data) setProgressFeedback(data)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Link Not Available</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!nameSubmitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Review: {project?.name}</h1>
            <p className="text-gray-400 mt-2">Enter your name to start reviewing</p>
          </div>
          <form
            onSubmit={handleNameSubmit}
            className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-4"
          >
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] font-semibold rounded-lg transition-colors"
            >
              Start Reviewing
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Group feedback by screen
  const resolvedStatuses = ['approved', 'resolved', 'dismissed']
  const activeFeedback = feedbackItems.filter(f => !resolvedStatuses.includes(f.status))
  const resolvedFeedback = feedbackItems.filter(f => resolvedStatuses.includes(f.status))

  function groupByScreen(items: Feedback[]) {
    const groups: Record<string, Feedback[]> = {}
    for (const item of items) {
      const screen = item.screen_url || item.screen_title || 'General'
      if (!groups[screen]) groups[screen] = []
      groups[screen].push(item)
    }
    return groups
  }

  const activeGroups = groupByScreen(activeFeedback)
  const resolvedGroups = groupByScreen(resolvedFeedback)

  // Count items needing client action
  const needsActionCount = feedbackItems.filter(f => f.status === 'change_made').length

  return (
    <div className="h-screen flex flex-col bg-[#09090B]">
      {/* Top Bar */}
      <div className="grid grid-cols-3 items-center px-6 sm:px-8 lg:px-10 py-2 bg-[#0C0C0E]/80 backdrop-blur-sm border-b border-[#1C1C22] shrink-0">
        {/* Left: ClientBridge brand */}
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="38" height="38" rx="8" stroke="#FAFAFA" strokeWidth="2" fill="none"/>
            <text x="10" y="30" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#FAFAFA">cb</text>
          </svg>
          <span className="text-sm font-extrabold text-white tracking-tight">ClientBridge</span>
        </div>
        {/* Center: Project name + live URL */}
        <div className="flex flex-col items-center min-w-0">
          <span className="text-sm font-semibold text-[#A1A1AA]">
            {project?.name}
          </span>
          {currentUrl && (
            <span className="text-[11px] text-[#52525B] font-mono truncate max-w-[400px]">
              {(() => { try { const u = new URL(currentUrl); return u.pathname + u.hash; } catch { return currentUrl; } })()}
            </span>
          )}
        </div>
        {/* Right: Nav + user */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-[#52525B] mr-2">{clientName}</span>
          <button
            onClick={() => setViewMode('review')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'review'
                ? 'bg-[#18181B] text-white'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            Review App
          </button>
          <button
            onClick={() => {
              setViewMode('feedback')
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'feedback'
                ? 'bg-[#F59E0B] text-[#09090B] font-semibold'
                : 'bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/30'
            }`}
          >
            Give Feedback
          </button>
          <button
            onClick={() => setViewMode('my-feedback')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors relative ${
              viewMode === 'my-feedback'
                ? 'bg-[#18181B] text-white'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            My Feedback
            {needsActionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F59E0B] text-[#09090B] text-[10px] font-bold rounded-full flex items-center justify-center">
                {needsActionCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode('progress')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'progress'
                ? 'bg-[#18181B] text-white'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            Progress
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Iframe — visible in review mode, and on desktop in feedback mode */}
        {(viewMode === 'review' || viewMode === 'feedback') && (
          <div className={`flex-1 ${viewMode === 'feedback' ? 'hidden sm:block' : ''}`}>
            {project?.vercel_url ? (
              <iframe
                ref={iframeRef}
                src={`/api/proxy?url=${encodeURIComponent(project.vercel_url)}`}
                className="w-full h-full border-0"
                title={`Review: ${project.name}`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <p>No app URL configured yet. You can still submit feedback.</p>
              </div>
            )}
          </div>
        )}

        {/* Feedback Form Panel */}
        {viewMode === 'feedback' && (
          <div className="w-full sm:w-96 bg-gray-900 border-l border-gray-800 overflow-y-auto shrink-0">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Submit Feedback</h2>
              <p className="text-sm text-gray-400 mb-6">
                Tell us what page you&apos;re on and what you&apos;d like changed.
              </p>

              {submitted ? (
                <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-6 rounded-lg text-center">
                  <p className="font-medium">Feedback submitted!</p>
                  <p className="text-sm mt-1 text-green-400">Your developer will review it shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Page / Screen
                    </label>
                    {currentUrl ? (
                      <div className="px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-lg mb-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentUrl === project?.vercel_url ? 'bg-[#71717A]' : 'bg-[#22C55E] animate-pulse'}`}></span>
                          <span className={`text-xs shrink-0 ${currentUrl === project?.vercel_url ? 'text-[#71717A]' : 'text-[#22C55E]'}`}>
                            {currentUrl === project?.vercel_url ? 'Your app' : 'Live — tracking your location'}
                          </span>
                        </div>
                        <p className="text-sm text-[#A1A1AA] font-mono break-all">{currentUrl}</p>
                        {currentTitle && currentTitle !== currentUrl ? (
                          <p className="text-xs text-[#52525B] mt-1">{currentTitle}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={screenPage}
                      onChange={(e) => setScreenPage(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={currentTitle ? 'Override auto-detected page (optional)' : 'e.g., Dashboard, Settings, Patient List'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {currentTitle || currentUrl ? 'Page detected automatically. Override above if needed.' : 'What page or tab are you viewing in the app right now?'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bug">Bug — Something isn&apos;t working</option>
                      <option value="content">Content — Text or media needs changes</option>
                      <option value="ux">UX — Layout, flow, or usability issue</option>
                      <option value="feature_request">Feature — I&apos;d like something new</option>
                      <option value="general">General — Other feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Summary <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief summary of your feedback"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Details <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={5}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Describe what you see, what you expected, and any steps to reproduce..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Priority</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['low', 'normal', 'high', 'critical'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setSeverity(level)}
                          className={`py-2 text-xs font-medium rounded-lg border transition-colors capitalize ${
                            severity === level
                              ? level === 'critical'
                                ? 'bg-red-900/50 border-red-700 text-red-300'
                                : level === 'high'
                                  ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                                  : level === 'normal'
                                    ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                                    : 'bg-gray-800 border-gray-600 text-gray-300'
                              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 disabled:cursor-not-allowed text-[#09090B] font-semibold rounded-lg transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Progress View */}
        {viewMode === 'progress' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
              <h2 className="text-xl font-bold text-white mb-2">Project Progress</h2>
              <p className="text-sm text-gray-500 mb-6">See what&apos;s been happening with your project.</p>

              {progressLoading ? (
                <p className="text-gray-400 text-center py-12">Loading progress...</p>
              ) : (() => {
                const totalHours = progressSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60
                const totalSessions = progressSessions.length
                const resolvedCount = progressFeedback.filter(f => ['approved', 'resolved', 'change_made'].includes(f.status)).length
                const activeCount = progressFeedback.filter(f => ['submitted', 'reviewed', 'in_progress'].includes(f.status)).length

                // What's new since last visit
                const newSinceLastVisit = lastVisit ? {
                  sessions: progressSessions.filter(s => new Date(s.start_time) > new Date(lastVisit)),
                  feedbackUpdated: progressFeedback.filter(f => new Date(f.updated_at) > new Date(lastVisit) && f.status !== 'submitted'),
                  feedbackResolved: progressFeedback.filter(f => new Date(f.updated_at) > new Date(lastVisit) && ['resolved', 'approved', 'change_made'].includes(f.status)),
                } : null

                const hasNewActivity = newSinceLastVisit && (newSinceLastVisit.sessions.length > 0 || newSinceLastVisit.feedbackUpdated.length > 0)

                // Group sessions by week
                const weekGroups: Record<string, TimeSession[]> = {}
                for (const s of progressSessions) {
                  const d = new Date(s.start_time)
                  const weekStart = new Date(d)
                  weekStart.setDate(d.getDate() - d.getDay())
                  const key = weekStart.toISOString().slice(0, 10)
                  if (!weekGroups[key]) weekGroups[key] = []
                  weekGroups[key].push(s)
                }
                const weeks = Object.entries(weekGroups).sort(([a], [b]) => b.localeCompare(a))

                return (
                  <>
                    {/* What's New Banner */}
                    {hasNewActivity && (
                      <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 mb-6">
                        <p className="text-sm font-medium text-blue-300 mb-2">Since your last visit</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {newSinceLastVisit.sessions.length > 0 && (
                            <span className="text-gray-300">
                              <span className="text-white font-semibold">{(newSinceLastVisit.sessions.reduce((s, x) => s + (x.duration_minutes ?? 0), 0) / 60).toFixed(1)}h</span> of new work across{' '}
                              <span className="text-white font-semibold">{newSinceLastVisit.sessions.length}</span> session{newSinceLastVisit.sessions.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {newSinceLastVisit.feedbackResolved.length > 0 && (
                            <span className="text-gray-300">
                              <span className="text-green-400 font-medium">{newSinceLastVisit.feedbackResolved.length}</span> feedback item{newSinceLastVisit.feedbackResolved.length !== 1 ? 's' : ''} addressed
                            </span>
                          )}
                          {newSinceLastVisit.feedbackUpdated.length > 0 && newSinceLastVisit.feedbackResolved.length === 0 && (
                            <span className="text-gray-300">
                              <span className="text-blue-400 font-medium">{newSinceLastVisit.feedbackUpdated.length}</span> feedback update{newSinceLastVisit.feedbackUpdated.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Hours Invested</p>
                        <p className="text-xl font-bold text-white">{totalHours.toFixed(1)}h</p>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Work Sessions</p>
                        <p className="text-xl font-bold text-white">{totalSessions}</p>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Feedback Active</p>
                        <p className="text-xl font-bold text-blue-400">{activeCount}</p>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Feedback Resolved</p>
                        <p className="text-xl font-bold text-green-400">{resolvedCount}</p>
                      </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 mb-6">
                      {([
                        { key: 'overview' as const, label: 'Overview' },
                        { key: 'activity' as const, label: 'Work Activity' },
                        { key: 'feedback' as const, label: 'Feedback Timeline' },
                      ]).map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setProgressTab(tab.key)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            progressTab === tab.key
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Overview Tab */}
                    {progressTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Recently addressed feedback */}
                        {(() => {
                          const recentlyAddressed = progressFeedback
                            .filter(f => ['change_made', 'resolved', 'approved'].includes(f.status))
                            .slice(0, 5)

                          if (recentlyAddressed.length === 0 && progressSessions.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <p className="text-gray-400">No activity recorded yet.</p>
                                <p className="text-gray-500 text-sm mt-2">Your developer will start tracking progress soon.</p>
                              </div>
                            )
                          }

                          return (
                            <>
                              {recentlyAddressed.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Recently Addressed</h3>
                                  <div className="space-y-2">
                                    {recentlyAddressed.map(item => (
                                      <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <TypeIcon type={item.feedback_type} />
                                            <span className="text-sm text-white truncate">{item.title}</span>
                                          </div>
                                          <StatusBadge status={item.status} />
                                        </div>
                                        {item.developer_notes && (
                                          <div className="mt-2 ml-7 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                            <p className="text-xs font-medium text-blue-400 mb-1">Developer</p>
                                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.developer_notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recent work sessions */}
                              {progressSessions.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Recent Work</h3>
                                  <div className="space-y-2">
                                    {progressSessions.slice(0, 5).map(s => (
                                      <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-start gap-3">
                                        <span className="text-xs text-gray-500 mt-0.5 shrink-0 w-14">
                                          {(s.duration_minutes ? s.duration_minutes / 60 : 0).toFixed(1)}h
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{s.category_name}</span>
                                            <span className="text-xs text-gray-600">
                                              {new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                          </div>
                                          {(s.ai_summary || s.description) && (
                                            <p className="text-sm text-gray-300 mt-1">{s.ai_summary ?? s.description}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* Activity Tab */}
                    {progressTab === 'activity' && (
                      <div className="space-y-6">
                        {weeks.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-400">No work sessions recorded yet.</p>
                          </div>
                        ) : weeks.map(([weekKey, weekSessions]) => {
                          const weekDate = new Date(weekKey + 'T00:00:00')
                          const weekEnd = new Date(weekDate)
                          weekEnd.setDate(weekDate.getDate() + 6)
                          const weekHours = weekSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60

                          const dayGroups: Record<string, TimeSession[]> = {}
                          for (const s of weekSessions) {
                            const dayKey = new Date(s.start_time).toISOString().slice(0, 10)
                            if (!dayGroups[dayKey]) dayGroups[dayKey] = []
                            dayGroups[dayKey].push(s)
                          }
                          const days = Object.entries(dayGroups).sort(([a], [b]) => b.localeCompare(a))

                          return (
                            <div key={weekKey} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-300">
                                  Week of {weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-sm text-gray-400">{weekHours.toFixed(1)}h</span>
                              </div>
                              <div className="divide-y divide-gray-800/50">
                                {days.map(([dayKey, daySessions]) => (
                                  <div key={dayKey} className="px-5 py-3">
                                    <p className="text-xs font-medium text-gray-500 mb-2">
                                      {new Date(dayKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </p>
                                    <div className="space-y-2">
                                      {daySessions.map(s => (
                                        <div key={s.id} className="flex items-start gap-3">
                                          <span className="text-xs text-gray-600 mt-0.5 shrink-0 w-14">
                                            {(s.duration_minutes ? s.duration_minutes / 60 : 0).toFixed(1)}h
                                          </span>
                                          <div className="min-w-0">
                                            <span className="text-xs text-gray-400">{s.category_name}</span>
                                            {(s.ai_summary || s.description) && (
                                              <p className="text-sm text-gray-300 mt-0.5">
                                                {s.ai_summary ?? s.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Feedback Timeline Tab */}
                    {progressTab === 'feedback' && (
                      <div className="space-y-6">
                        {progressFeedback.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-400">No feedback submitted yet.</p>
                            <button
                              onClick={() => {
                                setViewMode('feedback')
                              }}
                              className="mt-3 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
                            >
                              Give Feedback
                            </button>
                          </div>
                        ) : (() => {
                          // Group feedback by status category
                          const needsAction = progressFeedback.filter(f => f.status === 'change_made')
                          const inProgress = progressFeedback.filter(f => ['in_progress', 'reviewed'].includes(f.status))
                          const waiting = progressFeedback.filter(f => f.status === 'submitted')
                          const done = progressFeedback.filter(f => ['approved', 'resolved'].includes(f.status))
                          const other = progressFeedback.filter(f => ['deferred', 'dismissed', 'needs_revision'].includes(f.status))

                          const sections = [
                            { title: 'Needs Your Review', items: needsAction, color: 'text-purple-300', dot: 'bg-purple-400' },
                            { title: 'In Progress', items: inProgress, color: 'text-amber-300', dot: 'bg-amber-400' },
                            { title: 'Submitted — Awaiting Review', items: waiting, color: 'text-blue-300', dot: 'bg-blue-400' },
                            { title: 'Completed', items: done, color: 'text-green-300', dot: 'bg-green-400' },
                            { title: 'Other', items: other, color: 'text-gray-400', dot: 'bg-gray-500' },
                          ].filter(s => s.items.length > 0)

                          return sections.map(section => (
                            <div key={section.title}>
                              <h3 className={`text-sm font-semibold ${section.color} uppercase tracking-wide mb-3 flex items-center gap-2`}>
                                <span className={`w-2 h-2 rounded-full ${section.dot}`} />
                                {section.title} ({section.items.length})
                              </h3>
                              <div className="space-y-2">
                                {section.items.map(item => (
                                  <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                                    <button
                                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <TypeIcon type={item.feedback_type} />
                                        <div className="min-w-0">
                                          <span className="text-sm text-white truncate block">{item.title}</span>
                                          {item.screen_title && (
                                            <span className="text-xs text-gray-500">{item.screen_title}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-xs text-gray-600">{new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        <StatusBadge status={item.status} />
                                        <span className={`text-gray-500 text-xs transition-transform ${expandedId === item.id ? 'rotate-90' : ''}`}>&#9654;</span>
                                      </div>
                                    </button>

                                    {expandedId === item.id && (
                                      <div className="px-4 pb-4 border-t border-gray-800">
                                        <div className="mt-3 space-y-3">
                                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.description}</p>

                                          <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <span>Submitted {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            <SeverityDot severity={item.severity} />
                                            <span className="capitalize">{item.severity} priority</span>
                                          </div>

                                          {item.developer_notes && (
                                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                              <p className="text-xs font-medium text-blue-400 mb-1">Developer Response</p>
                                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.developer_notes}</p>
                                            </div>
                                          )}

                                          {item.status === 'change_made' && (
                                            <div className="flex gap-2 pt-1">
                                              <button
                                                onClick={() => handleClientAction(item.id, 'approved')}
                                                className="flex-1 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                                              >
                                                Approve
                                              </button>
                                              <button
                                                onClick={() => handleClientAction(item.id, 'needs_revision')}
                                                className="flex-1 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                                              >
                                                Needs Revision
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* My Feedback Dashboard */}
        {viewMode === 'my-feedback' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">My Feedback</h2>
                <button
                  onClick={loadFeedback}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Refresh
                </button>
              </div>

              {feedbackLoading ? (
                <p className="text-gray-400 text-center py-12">Loading feedback...</p>
              ) : feedbackItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No feedback submitted yet.</p>
                  <button
                    onClick={() => {
                      setViewMode('feedback')
                    }}
                    className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
                  >
                    Give Feedback
                  </button>
                </div>
              ) : (
                <>
                  {/* Needs Your Action */}
                  {needsActionCount > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-400 rounded-full" />
                        Needs Your Review ({needsActionCount})
                      </h3>
                      <div className="space-y-3">
                        {feedbackItems
                          .filter(f => f.status === 'change_made')
                          .map(item => (
                            <FeedbackCard
                              key={item.id}
                              item={item}
                              expanded={expandedId === item.id}
                              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                              onAction={handleClientAction}
                              showActions
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Active Feedback by Screen */}
                  {Object.keys(activeGroups).length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                        Active ({activeFeedback.length})
                      </h3>
                      {Object.entries(activeGroups).map(([screen, items]) => (
                        <div key={screen} className="mb-4">
                          <p className="text-xs font-medium text-gray-400 mb-2 px-1">{screen}</p>
                          <div className="space-y-2">
                            {items.map(item => (
                              <FeedbackCard
                                key={item.id}
                                item={item}
                                expanded={expandedId === item.id}
                                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                onAction={handleClientAction}
                                showActions={item.status === 'change_made'}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resolved Toggle */}
                  {resolvedFeedback.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowResolved(!showResolved)}
                        className="text-sm text-gray-400 hover:text-white transition-colors mb-3 flex items-center gap-2"
                      >
                        <span className={`transition-transform ${showResolved ? 'rotate-90' : ''}`}>&#9654;</span>
                        Resolved ({resolvedFeedback.length})
                      </button>
                      {showResolved && (
                        <div>
                          {Object.entries(resolvedGroups).map(([screen, items]) => (
                            <div key={screen} className="mb-4">
                              <p className="text-xs font-medium text-gray-500 mb-2 px-1">{screen}</p>
                              <div className="space-y-2">
                                {items.map(item => (
                                  <FeedbackCard
                                    key={item.id}
                                    item={item}
                                    expanded={expandedId === item.id}
                                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                    onAction={handleClientAction}
                                    showActions={false}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Components ---

function FeedbackCard({
  item,
  expanded,
  onToggle,
  onAction,
  showActions,
}: {
  item: Feedback
  expanded: boolean
  onToggle: () => void
  onAction: (id: string, status: 'approved' | 'needs_revision') => void
  showActions: boolean
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <TypeIcon type={item.feedback_type} />
          <span className="text-sm text-white truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <StatusBadge status={item.status} />
          <span className={`text-gray-500 text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800">
          <div className="mt-3 space-y-3">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.description}</p>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
              <SeverityDot severity={item.severity} />
              <span className="capitalize">{item.severity} priority</span>
            </div>

            {item.developer_notes && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-1">Developer Note</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.developer_notes}</p>
              </div>
            )}

            {showActions && item.status === 'change_made' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onAction(item.id, 'approved')}
                  className="flex-1 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => onAction(item.id, 'needs_revision')}
                  className="flex-1 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                >
                  Needs Revision
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    bug: '🐛',
    content: '📝',
    ux: '🎨',
    feature_request: '💡',
    general: '💬',
  }
  return <span className="text-sm shrink-0">{icons[type] ?? '💬'}</span>
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
    submitted: 'Submitted',
    reviewed: 'Reviewed',
    in_progress: 'In Progress',
    change_made: 'Change Made',
    approved: 'Approved',
    needs_revision: 'Needs Revision',
    resolved: 'Resolved',
    deferred: 'Deferred',
    dismissed: 'Dismissed',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${colors[status] ?? colors.submitted}`}>
      {labels[status] ?? status}
    </span>
  )
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-500',
    normal: 'bg-blue-500',
    high: 'bg-amber-500',
    critical: 'bg-red-500',
  }

  return <span className={`w-1.5 h-1.5 rounded-full ${colors[severity] ?? colors.normal}`} />
}
