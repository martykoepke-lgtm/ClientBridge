'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Project, Feedback, Category, TimeSession, ComplexityProfile, ScopeItem, Contract } from '@/lib/types'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  // Time tracking state
  const [categories, setCategories] = useState<Category[]>([])
  const [activeSession, setActiveSession] = useState<TimeSession | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [totalHours, setTotalHours] = useState(0)
  const [weekHours, setWeekHours] = useState(0)
  const [recentSessions, setRecentSessions] = useState<TimeSession[]>([])
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectDesc, setEditProjectDesc] = useState('')
  const [editProjectUrl, setEditProjectUrl] = useState('')
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editSessionDuration, setEditSessionDuration] = useState('')
  const [editSessionDesc, setEditSessionDesc] = useState('')
  const router = useRouter()
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([])
  const [showScope, setShowScope] = useState(false)
  const [customScopeInput, setCustomScopeInput] = useState('')
  const [customOutScopeInput, setCustomOutScopeInput] = useState('')
  const [contract, setContract] = useState<Contract | null>(null)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [id])

  // Live timer
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0)
      return
    }
    function tick() {
      const start = new Date(activeSession!.start_time).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  async function loadData() {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const [projectRes, feedbackRes, categoriesRes, sessionRes, totalRes, weekRes, recentRes, scopeRes, contractRes] = await Promise.all([
      supabase.from('projects').select('*, client:clients(*)').eq('id', id).single(),
      supabase.from('feedback').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('time_sessions').select('*, project:projects(*)').is('end_time', null).limit(1).single(),
      supabase.from('time_sessions').select('duration_minutes').eq('project_id', id).not('duration_minutes', 'is', null),
      supabase.from('time_sessions').select('duration_minutes').eq('project_id', id).gte('start_time', weekStart.toISOString()).not('duration_minutes', 'is', null),
      supabase.from('time_sessions').select('*, project:projects(*)').eq('project_id', id).order('start_time', { ascending: false }).limit(5),
      supabase.from('scope_items').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('contracts').select('*').eq('project_id', id).in('status', ['draft', 'sent', 'client_signed', 'active']).order('created_at', { ascending: false }).limit(1).single(),
    ])

    setProject(projectRes.data)
    setFeedback(feedbackRes.data ?? [])
    if (categoriesRes.data) {
      setCategories(categoriesRes.data)
      if (categoriesRes.data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categoriesRes.data[0].id)
      }
    }
    if (sessionRes.data && !sessionRes.error) {
      setActiveSession(sessionRes.data)
    }
    if (totalRes.data) {
      setTotalHours(totalRes.data.reduce((sum: number, s: { duration_minutes: number }) => sum + s.duration_minutes, 0) / 60)
    }
    if (weekRes.data) {
      setWeekHours(weekRes.data.reduce((sum: number, s: { duration_minutes: number }) => sum + s.duration_minutes, 0) / 60)
    }
    if (recentRes.data) {
      setRecentSessions(recentRes.data)
    }
    if (scopeRes.data) {
      setScopeItems(scopeRes.data)
    }
    if (contractRes.data && !contractRes.error) {
      setContract(contractRes.data)
    }
    setLoading(false)
  }

  async function handleStartTimer() {
    if (!selectedCategoryId) return
    setStarting(true)
    const category = categories.find(c => c.id === selectedCategoryId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStarting(false); return }

    const { data, error } = await supabase.from('time_sessions').insert({
      project_id: id,
      developer_id: user.id,
      category_id: selectedCategoryId,
      category_name: category?.name ?? 'Other',
      start_time: new Date().toISOString(),
      source: 'manual',
    }).select('*, project:projects(*)').single()

    if (data && !error) setActiveSession(data)
    setStarting(false)
  }

  async function handleStopTimer() {
    if (!activeSession) return
    setStopping(true)
    const now = new Date()
    const start = new Date(activeSession.start_time)
    const durationMinutes = Math.round(((now.getTime() - start.getTime()) / 60000) * 100) / 100

    await supabase.from('time_sessions').update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
    }).eq('id', activeSession.id)

    setActiveSession(null)
    setStopping(false)
    loadData() // refresh stats
  }

  async function handleSwitchToThisProject() {
    if (!activeSession || !selectedCategoryId) return
    setStarting(true)
    const now = new Date()
    const start = new Date(activeSession.start_time)
    const durationMinutes = Math.round(((now.getTime() - start.getTime()) / 60000) * 100) / 100

    // Close current session
    await supabase.from('time_sessions').update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
    }).eq('id', activeSession.id)

    // Start new session on this project
    const category = categories.find(c => c.id === selectedCategoryId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStarting(false); return }

    const { data, error } = await supabase.from('time_sessions').insert({
      project_id: id,
      developer_id: user.id,
      category_id: selectedCategoryId,
      category_name: category?.name ?? 'Other',
      start_time: now.toISOString(),
      source: 'manual',
    }).select('*, project:projects(*)').single()

    if (data && !error) setActiveSession(data)
    setStarting(false)
  }

  function formatElapsed(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  async function handleSaveRate() {
    if (!project) return
    const rate = rateInput ? parseFloat(rateInput) : null
    await supabase.from('projects').update({ hourly_rate: rate }).eq('id', project.id)
    setProject({ ...project, hourly_rate: rate })
    setEditingRate(false)
  }

  async function updateProject(updates: Partial<Project>) {
    if (!project) return
    await supabase.from('projects').update(updates).eq('id', project.id)
    setProject({ ...project, ...updates })
  }

  async function updateProfile(updates: Partial<ComplexityProfile>) {
    if (!project) return
    const newProfile = { ...(project.complexity_profile ?? {}), ...updates }
    await supabase.from('projects').update({ complexity_profile: newProfile }).eq('id', project.id)
    setProject({ ...project, complexity_profile: newProfile })
  }

  function toggleProfileArray(field: 'integrations' | 'features', value: string) {
    if (!project) return
    const profile = project.complexity_profile ?? {}
    const current = profile[field] ?? []
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value]
    updateProfile({ [field]: updated })
  }

  // Safely get audience as array (handles old string format in DB)
  function getAudienceArray(profile: ComplexityProfile): string[] {
    const a = profile.audience
    if (!a) return []
    if (Array.isArray(a)) return a
    return [a as unknown as string] // old string format
  }

  function toggleProfileAudience(value: string) {
    if (!project) return
    const profile = project.complexity_profile ?? {}
    const current = getAudienceArray(profile)
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value]
    updateProfile({ audience: updated })
  }

  // Known integration and feature labels for scope generation
  const INTEGRATION_LABELS: Record<string, string> = {
    stripe: 'Stripe / Payments', email: 'Email (SendGrid/Resend)', ai: 'AI / LLM',
    google: 'Google (Cal/Drive/Sheets)', slack: 'Slack / Discord', analytics: 'Analytics',
    cms: 'CMS (Content Management)', maps: 'Maps / Geo', sms: 'SMS / Twilio',
    webhooks: 'Webhooks / 3rd-party APIs', oauth_providers: 'OAuth Providers',
    storage: 'Cloud Storage',
  }
  const FEATURE_LABELS: Record<string, string> = {
    rbac: 'Role-Based Access', file_uploads: 'File Uploads',
    realtime: 'Real-time Updates', notifications: 'Notifications',
    search: 'Search', reporting: 'Reporting / Dashboards', pdf: 'PDF Generation',
    scheduling: 'Scheduled Tasks', i18n: 'Multiple Languages',
    import_export: 'Data Import / Export', multi_step_forms: 'Multi-step Forms',
    data_viz: 'Charts / Graphs',
  }

  async function syncScopeFromProfile() {
    if (!project) return
    setSyncing(true)
    const profile = project.complexity_profile ?? {}
    const selectedIntegrations = profile.integrations ?? []
    const selectedFeatures = profile.features ?? []
    const existingBySource = new Map(
      scopeItems.filter(s => s.source !== 'custom').map(s => [`${s.source}:${s.source_id}`, s])
    )

    const upserts: Partial<ScopeItem>[] = []

    // Integrations
    for (const [intId, label] of Object.entries(INTEGRATION_LABELS)) {
      const key = `integration:${intId}`
      const existing = existingBySource.get(key)
      const inScope = selectedIntegrations.includes(intId)
      if (existing) {
        if (existing.in_scope !== inScope) {
          await supabase.from('scope_items').update({ in_scope: inScope }).eq('id', existing.id)
        }
      } else {
        upserts.push({
          project_id: id,
          source: 'integration',
          source_id: intId,
          label,
          in_scope: inScope,
          sort_order: upserts.length,
        })
      }
    }

    // Features
    for (const [featId, label] of Object.entries(FEATURE_LABELS)) {
      const key = `feature:${featId}`
      const existing = existingBySource.get(key)
      const inScope = selectedFeatures.includes(featId)
      if (existing) {
        if (existing.in_scope !== inScope) {
          await supabase.from('scope_items').update({ in_scope: inScope }).eq('id', existing.id)
        }
      } else {
        upserts.push({
          project_id: id,
          source: 'feature',
          source_id: featId,
          label,
          in_scope: inScope,
          sort_order: upserts.length + 100,
        })
      }
    }

    if (upserts.length > 0) {
      await supabase.from('scope_items').insert(upserts)
    }

    // Reload scope items
    const { data } = await supabase.from('scope_items').select('*').eq('project_id', id).order('sort_order')
    if (data) setScopeItems(data)
    setSyncing(false)
  }

  async function addCustomScopeItem(label: string, inScope: boolean) {
    if (!label.trim()) return
    const { data } = await supabase.from('scope_items').insert({
      project_id: id,
      source: 'custom',
      label: label.trim(),
      in_scope: inScope,
      sort_order: scopeItems.length,
    }).select('*').single()
    if (data) setScopeItems([...scopeItems, data])
  }

  async function toggleScopeComplete(item: ScopeItem) {
    await supabase.from('scope_items').update({ is_complete: !item.is_complete }).eq('id', item.id)
    setScopeItems(scopeItems.map(s => s.id === item.id ? { ...s, is_complete: !s.is_complete } : s))
  }

  async function toggleScopeInOut(item: ScopeItem) {
    await supabase.from('scope_items').update({ in_scope: !item.in_scope }).eq('id', item.id)
    setScopeItems(scopeItems.map(s => s.id === item.id ? { ...s, in_scope: !s.in_scope } : s))
  }

  async function deleteScopeItem(item: ScopeItem) {
    await supabase.from('scope_items').delete().eq('id', item.id)
    setScopeItems(scopeItems.filter(s => s.id !== item.id))
  }

  function startEditSession(s: TimeSession) {
    setEditingSessionId(s.id)
    setEditSessionDuration(s.duration_minutes ? (s.duration_minutes / 60).toFixed(2) : '')
    setEditSessionDesc(s.description ?? s.ai_summary ?? '')
  }

  async function saveSessionEdit() {
    if (!editingSessionId) return
    const hours = parseFloat(editSessionDuration) || 0
    const minutes = Math.round(hours * 60 * 100) / 100
    const session = recentSessions.find(s => s.id === editingSessionId)
    if (!session) return

    // Recalculate end_time from start_time + new duration
    const start = new Date(session.start_time)
    const end = new Date(start.getTime() + minutes * 60000)

    await supabase.from('time_sessions').update({
      duration_minutes: minutes,
      end_time: end.toISOString(),
      description: editSessionDesc || null,
    }).eq('id', editingSessionId)

    setEditingSessionId(null)
    loadData()
  }

  async function deleteSession(sessionId: string) {
    await supabase.from('time_sessions').delete().eq('id', sessionId)
    loadData()
  }

  function startEditProject() {
    if (!project) return
    setEditProjectName(project.name)
    setEditProjectDesc(project.description ?? '')
    setEditProjectUrl(project.vercel_url ?? '')
    setEditingProject(true)
  }

  async function saveProjectEdit() {
    if (!project) return
    await supabase.from('projects').update({
      name: editProjectName,
      description: editProjectDesc || null,
      vercel_url: editProjectUrl || null,
    }).eq('id', project.id)
    setProject({ ...project, name: editProjectName, description: editProjectDesc || null, vercel_url: editProjectUrl || null })
    setEditingProject(false)
  }

  async function deleteProject() {
    await supabase.from('projects').delete().eq('id', id)
    router.push(project?.client_id ? `/clients/${project.client_id}` : '/clients')
  }

  function getReviewLink() {
    if (!project) return ''
    return `${window.location.origin}/review/${project.review_token}`
  }

  async function copyReviewLink() {
    await navigator.clipboard.writeText(getReviewLink())
  }

  async function toggleReviewLink() {
    if (!project) return
    await supabase
      .from('projects')
      .update({ review_link_active: !project.review_link_active })
      .eq('id', project.id)
    loadData()
  }

  const filteredFeedback = feedback.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (typeFilter !== 'all' && item.feedback_type !== typeFilter) return false
    return true
  })

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>
  }

  if (!project) {
    return <div className="text-gray-400 text-center py-12">Project not found.</div>
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
        <span className="text-white">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="flex items-start justify-between mb-8">
        {editingProject ? (
          <div className="flex-1 mr-4 space-y-3">
            <input
              type="text"
              value={editProjectName}
              onChange={(e) => setEditProjectName(e.target.value)}
              className="w-full px-3 py-2 text-lg font-bold bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={editProjectDesc}
              onChange={(e) => setEditProjectDesc(e.target.value)}
              placeholder="Description"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="url"
              value={editProjectUrl}
              onChange={(e) => setEditProjectUrl(e.target.value)}
              placeholder="https://your-app.vercel.app"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <button onClick={saveProjectEdit} className="px-4 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] rounded-lg">Save</button>
              <button onClick={() => setEditingProject(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <button onClick={startEditProject} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Edit</button>
              {confirmDeleteProject ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Delete project?</span>
                  <button onClick={deleteProject} className="text-xs font-medium text-red-400 hover:text-red-300">Yes</button>
                  <button onClick={() => setConfirmDeleteProject(false)} className="text-xs text-gray-500 hover:text-white">No</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDeleteProject(true)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Delete</button>
              )}
            </div>
            {project.description && (
              <p className="text-gray-400 mt-1">{project.description}</p>
            )}
            {project.vercel_url && (
              <a
                href={project.vercel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                {project.vercel_url}
              </a>
            )}
          </div>
        )}
        {/* Contract status indicator — navigate via tabs above */}
        {contract && (
          <Link
            href={`/projects/${id}/contract`}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
              contract.status === 'client_signed'
                ? 'bg-blue-950/50 border border-blue-800 text-blue-200 hover:border-blue-600'
                : contract.status === 'active'
                ? 'bg-green-900/30 border border-green-800 text-green-300'
                : 'bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              contract.status === 'active' ? 'bg-green-400' :
              contract.status === 'client_signed' ? 'bg-blue-400 animate-pulse' :
              contract.status === 'sent' ? 'bg-purple-400' :
              'bg-gray-500'
            }`} />
            {contract.status === 'active' ? 'Contract Active' :
             contract.status === 'client_signed' ? 'Needs Counter-signature' :
             contract.status === 'sent' ? 'Awaiting Signature' :
             'Draft'}
          </Link>
        )}
      </div>

      {/* Review Link Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Client Review Link</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleReviewLink}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                project.review_link_active
                  ? 'bg-green-900/50 text-green-300 hover:bg-green-900'
                  : 'bg-red-900/50 text-red-300 hover:bg-red-900'
              }`}
            >
              {project.review_link_active ? 'Active' : 'Revoked'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 overflow-x-auto">
            {getReviewLink()}
          </code>
          <button
            onClick={copyReviewLink}
            className="px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Copy Link
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Share this link with your client. They can view the app and submit feedback without creating an account.
        </p>
      </div>

      {/* Project Profile & Billing */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Project Profile</h3>
            {(() => {
              const p = project.complexity_profile ?? {}
              const tags = [
                p.app_type?.replace('_', ' '),
                ...(Array.isArray(p.audience) ? p.audience : p.audience ? [p.audience] : []).map((a: string) => a.toUpperCase()),
                p.multi_tenant ? 'Multi-tenant' : null,
                ...(p.integrations ?? []),
              ].filter(Boolean)
              return tags.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  {tags.slice(0, 4).map(t => (
                    <span key={t} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{t}</span>
                  ))}
                  {tags.length > 4 && <span className="text-xs text-gray-500">+{tags.length - 4}</span>}
                </div>
              ) : (
                <span className="text-xs text-gray-500">Not configured</span>
              )
            })()}
          </div>
          <span className="text-gray-600 text-sm">{showProfile ? '▾' : '▸'}</span>
        </button>

        {showProfile && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-800 pt-4">
            {/* Billing Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Billing Type</label>
                <select
                  value={project.billing_type ?? 'hourly'}
                  onChange={(e) => updateProject({ billing_type: e.target.value as Project['billing_type'] })}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="flat_rate">Flat Rate</option>
                  <option value="retainer">Retainer</option>
                  <option value="milestone">Milestone</option>
                  <option value="hybrid">Hybrid (Time + Milestones)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  {project.billing_type === 'flat_rate' ? 'Quoted Amount' : project.billing_type === 'retainer' ? 'Monthly Retainer' : 'Hourly Rate'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={project.billing_type === 'hourly' ? (project.hourly_rate ?? '') : (project.quoted_amount ?? '')}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null
                      if (project.billing_type === 'hourly') {
                        updateProject({ hourly_rate: val })
                      } else {
                        updateProject({ quoted_amount: val })
                      }
                    }}
                    className="w-full pl-7 pr-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Estimated Hours</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={project.estimated_hours ?? ''}
                  onChange={(e) => updateProject({ estimated_hours: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* App Type & Audience */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">App Type</label>
                <select
                  value={project.complexity_profile?.app_type ?? ''}
                  onChange={(e) => updateProfile({ app_type: e.target.value as ComplexityProfile['app_type'] || undefined })}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="marketing_site">Marketing / Landing Site</option>
                  <option value="web_app">Web Application</option>
                  <option value="dashboard">Dashboard / Admin Panel</option>
                  <option value="api_backend">API / Backend Service</option>
                  <option value="mobile_app">Mobile App</option>
                  <option value="chrome_extension">Chrome Extension</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Audience</label>
                <div className="flex gap-1.5">
                  {[
                    { id: 'b2b', label: 'B2B' },
                    { id: 'b2c', label: 'B2C' },
                    { id: 'internal', label: 'Internal' },
                  ].map(item => {
                    const active = getAudienceArray(project.complexity_profile ?? {}).includes(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleProfileAudience(item.id)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-900/30 text-blue-300'
                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Access Model</label>
                <select
                  value={project.complexity_profile?.access ?? ''}
                  onChange={(e) => updateProfile({ access: e.target.value as ComplexityProfile['access'] || undefined })}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="public">Public</option>
                  <option value="org_whitelisted">Org-Whitelisted</option>
                  <option value="invite_only">Invite Only</option>
                  <option value="personal">Personal Use</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Auth Level</label>
                <select
                  value={project.complexity_profile?.auth_level ?? ''}
                  onChange={(e) => updateProfile({ auth_level: e.target.value as ComplexityProfile['auth_level'] || undefined })}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="none">None</option>
                  <option value="basic">Basic (Email/Password)</option>
                  <option value="oauth">OAuth / Social Login</option>
                  <option value="sso">SSO / Enterprise</option>
                </select>
              </div>
            </div>

            {/* Toggles Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Multi-tenant</label>
                <button
                  onClick={() => updateProfile({ multi_tenant: !project.complexity_profile?.multi_tenant })}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    project.complexity_profile?.multi_tenant
                      ? 'border-blue-600 bg-blue-900/30 text-blue-300'
                      : 'border-gray-700 bg-gray-800 text-gray-400'
                  }`}
                >
                  {project.complexity_profile?.multi_tenant ? 'Yes' : 'No'}
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Database Complexity</label>
                <select
                  value={project.complexity_profile?.database_complexity ?? ''}
                  onChange={(e) => updateProfile({ database_complexity: e.target.value as ComplexityProfile['database_complexity'] || undefined })}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="none">None</option>
                  <option value="simple">Simple (Single DB)</option>
                  <option value="complex">Complex (Multiple sources, migrations)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Deployment</label>
                <select
                  value={project.complexity_profile?.deployment ?? ''}
                  onChange={(e) => updateProfile({ deployment: e.target.value as ComplexityProfile['deployment'] || undefined })}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="simple">Simple (Vercel / Netlify)</option>
                  <option value="complex">Complex (Custom CI/CD, multiple envs)</option>
                </select>
              </div>
            </div>

            {/* Integrations */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Integrations</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'stripe', label: 'Stripe / Payments', desc: 'Accept payments, subscriptions, or invoices' },
                  { id: 'email', label: 'Email (SendGrid/Resend)', desc: 'Send transactional or marketing emails from the app' },
                  { id: 'ai', label: 'AI / LLM', desc: 'Use AI models for chat, summaries, or smart features' },
                  { id: 'google', label: 'Google (Cal/Drive/Sheets)', desc: 'Connect to Google Calendar, Drive, or Sheets' },
                  { id: 'slack', label: 'Slack / Discord', desc: 'Send notifications or updates to team chat channels' },
                  { id: 'analytics', label: 'Analytics', desc: 'Track how users interact with the app' },
                  { id: 'cms', label: 'CMS', desc: 'Content management — let non-developers edit pages and content' },
                  { id: 'maps', label: 'Maps / Geo', desc: 'Show maps, locations, or use address lookups' },
                  { id: 'sms', label: 'SMS / Twilio', desc: 'Send text messages for alerts, codes, or reminders' },
                  { id: 'webhooks', label: 'Webhooks / 3rd-party APIs', desc: 'Connect to outside services when events happen' },
                  { id: 'oauth_providers', label: 'OAuth Providers', desc: 'Let users sign in with Google, GitHub, etc.' },
                  { id: 'storage', label: 'Cloud Storage', desc: 'Store files, images, or documents in the cloud' },
                ].map(item => {
                  const active = (project.complexity_profile?.integrations ?? []).includes(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleProfileArray('integrations', item.id)}
                      title={item.desc}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors group relative ${
                        active
                          ? 'border-blue-600 bg-blue-900/30 text-blue-300'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`block text-[10px] leading-tight mt-0.5 ${active ? 'text-blue-400/70' : 'text-gray-600'}`}>{item.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Features</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'rbac', label: 'Role-Based Access', desc: 'Different permissions for admins, editors, viewers, etc.' },
                  { id: 'file_uploads', label: 'File Uploads', desc: 'Let users upload documents, images, or other files' },
                  { id: 'realtime', label: 'Real-time Updates', desc: 'Content updates live without refreshing the page' },
                  { id: 'notifications', label: 'Notifications', desc: 'Push alerts, email notices, or in-app messages' },
                  { id: 'search', label: 'Search', desc: 'Find content, users, or records by typing keywords' },
                  { id: 'reporting', label: 'Reporting / Dashboards', desc: 'Summary views with stats, charts, and data tables' },
                  { id: 'pdf', label: 'PDF Generation', desc: 'Create downloadable PDF documents from the app' },
                  { id: 'scheduling', label: 'Scheduled Tasks', desc: 'Automatic background jobs that run on a timer' },
                  { id: 'i18n', label: 'Multiple Languages', desc: 'Support for users who speak different languages' },
                  { id: 'import_export', label: 'Data Import / Export', desc: 'Bring data in from files or download it out' },
                  { id: 'multi_step_forms', label: 'Multi-step Forms', desc: 'Step-by-step wizards that guide users through input' },
                  { id: 'data_viz', label: 'Charts / Graphs', desc: 'Visual representations of data like bar charts and line graphs' },
                ].map(item => {
                  const active = (project.complexity_profile?.features ?? []).includes(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleProfileArray('features', item.id)}
                      title={item.desc}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        active
                          ? 'border-purple-600 bg-purple-900/30 text-purple-300'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`block text-[10px] leading-tight mt-0.5 ${active ? 'text-purple-400/70' : 'text-gray-600'}`}>{item.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Complexity Score */}
            {(() => {
              const p = project.complexity_profile ?? {}
              let score = 0
              if (p.multi_tenant) score += 2
              if (p.auth_level === 'oauth') score += 1
              if (p.auth_level === 'sso') score += 2
              if (p.database_complexity === 'simple') score += 1
              if (p.database_complexity === 'complex') score += 3
              if (p.deployment === 'complex') score += 1
              score += (p.integrations?.length ?? 0)
              score += (p.features?.length ?? 0) * 0.5
              const level = score <= 3 ? 'Simple' : score <= 7 ? 'Moderate' : score <= 12 ? 'Complex' : 'Highly Complex'
              const levelColor = score <= 3 ? 'text-green-400' : score <= 7 ? 'text-yellow-400' : score <= 12 ? 'text-orange-400' : 'text-red-400'
              return score > 0 ? (
                <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Complexity Score</span>
                  <span className={`text-sm font-medium ${levelColor}`}>
                    {level} ({score.toFixed(1)})
                  </span>
                </div>
              ) : null
            })()}
          </div>
        )}
      </div>

      {/* Scope Builder */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6">
        <button
          onClick={() => setShowScope(!showScope)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Project Scope</h3>
            {scopeItems.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {scopeItems.filter(s => s.in_scope).length} in scope
                </span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">
                  {scopeItems.filter(s => s.in_scope && s.is_complete).length}/{scopeItems.filter(s => s.in_scope).length} complete
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-500">Sync from profile to get started</span>
            )}
          </div>
          <span className="text-gray-600 text-sm">{showScope ? '▾' : '▸'}</span>
        </button>

        {showScope && (
          <div className="px-6 pb-6 border-t border-gray-800 pt-4">
            {/* Sync button */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={syncScopeFromProfile}
                disabled={syncing}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {syncing ? 'Syncing...' : scopeItems.length === 0 ? 'Generate Scope from Profile' : 'Sync from Profile'}
              </button>
              <span className="text-xs text-gray-500">
                Selected integrations & features become in-scope items. Custom items are preserved.
              </span>
            </div>

            {/* Two-column scope layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* In Scope */}
              <div>
                <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">In Scope</h4>
                <div className="space-y-1.5">
                  {scopeItems.filter(s => s.in_scope).map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => toggleScopeComplete(item)}
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          item.is_complete
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        {item.is_complete && <span className="text-xs">✓</span>}
                      </button>
                      <span className={`text-sm flex-1 ${item.is_complete ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                        {item.label}
                      </span>
                      {item.source !== 'custom' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                          {item.source}
                        </span>
                      )}
                      <button
                        onClick={() => toggleScopeInOut(item)}
                        className="text-xs text-gray-600 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Move out of scope"
                      >
                        →
                      </button>
                      {item.source === 'custom' && (
                        <button
                          onClick={() => deleteScopeItem(item)}
                          className="text-xs text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {scopeItems.filter(s => s.in_scope).length === 0 && (
                    <p className="text-xs text-gray-600 py-2">No items in scope yet</p>
                  )}
                </div>
                {/* Add custom in-scope item */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={customScopeInput}
                    onChange={(e) => setCustomScopeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customScopeInput.trim()) {
                        addCustomScopeItem(customScopeInput, true)
                        setCustomScopeInput('')
                      }
                    }}
                    placeholder="Add custom scope item..."
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <button
                    onClick={() => {
                      if (customScopeInput.trim()) {
                        addCustomScopeItem(customScopeInput, true)
                        setCustomScopeInput('')
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-green-900/30 border border-green-800 text-green-400 hover:bg-green-900/50 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Out of Scope */}
              <div>
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Out of Scope</h4>
                <div className="space-y-1.5">
                  {scopeItems.filter(s => !s.in_scope).map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-600 text-xs">—</span>
                      <span className="text-sm flex-1 text-gray-500">{item.label}</span>
                      {item.source !== 'custom' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                          {item.source}
                        </span>
                      )}
                      <button
                        onClick={() => toggleScopeInOut(item)}
                        className="text-xs text-gray-600 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Move in scope"
                      >
                        ←
                      </button>
                      {item.source === 'custom' && (
                        <button
                          onClick={() => deleteScopeItem(item)}
                          className="text-xs text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {scopeItems.filter(s => !s.in_scope).length === 0 && (
                    <p className="text-xs text-gray-600 py-2">Nothing explicitly excluded</p>
                  )}
                </div>
                {/* Add custom out-of-scope item */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={customOutScopeInput}
                    onChange={(e) => setCustomOutScopeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customOutScopeInput.trim()) {
                        addCustomScopeItem(customOutScopeInput, false)
                        setCustomOutScopeInput('')
                      }
                    }}
                    placeholder="Add exclusion..."
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    onClick={() => {
                      if (customOutScopeInput.trim()) {
                        addCustomScopeItem(customOutScopeInput, false)
                        setCustomOutScopeInput('')
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Scope progress bar */}
            {scopeItems.filter(s => s.in_scope).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Scope Completion</span>
                  <span className="text-xs text-gray-400">
                    {scopeItems.filter(s => s.in_scope && s.is_complete).length} / {scopeItems.filter(s => s.in_scope).length}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${(scopeItems.filter(s => s.in_scope && s.is_complete).length / scopeItems.filter(s => s.in_scope).length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Timer Card */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Time Tracker</h3>

          {activeSession && activeSession.project_id === id ? (
            // Active session on THIS project
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-2xl font-mono font-bold text-white tabular-nums">
                  {formatElapsed(elapsed)}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium border"
                  style={{
                    color: categories.find(c => c.id === activeSession.category_id)?.color,
                    borderColor: categories.find(c => c.id === activeSession.category_id)?.color + '50',
                    backgroundColor: categories.find(c => c.id === activeSession.category_id)?.color + '20',
                  }}
                >
                  {activeSession.category_name}
                </span>
              </div>
              <button
                onClick={handleStopTimer}
                disabled={stopping}
                className="px-5 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-lg transition-colors"
              >
                {stopping ? 'Stopping...' : 'Stop Timer'}
              </button>
            </div>
          ) : activeSession ? (
            // Active session on ANOTHER project
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                Currently tracking
                <span className="text-white font-semibold">
                  {(activeSession.project as Project | undefined)?.name ?? 'another project'}
                </span>
                <span className="text-gray-500">({formatElapsed(elapsed)})</span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleSwitchToThisProject}
                  disabled={starting}
                  className="px-4 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {starting ? 'Switching...' : 'Switch to This Project'}
                </button>
              </div>
            </div>
          ) : (
            // No active session — start one
            <div className="flex items-center gap-3">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleStartTimer}
                disabled={!selectedCategoryId || starting}
                className="px-5 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                {starting ? 'Starting...' : 'Start Timer'}
              </button>
            </div>
          )}
        </div>

        {/* Time Summary Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Time Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Total Hours</span>
              <span className="text-sm font-medium text-white">{totalHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">This Week</span>
              <span className="text-sm font-medium text-white">{weekHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
              <span className="text-sm text-gray-400">Rate</span>
              {editingRate ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="w-20 px-2 py-0.5 text-sm bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRate()
                      if (e.key === 'Escape') setEditingRate(false)
                    }}
                  />
                  <button onClick={handleSaveRate} className="text-xs text-blue-400 hover:text-blue-300">Save</button>
                </div>
              ) : (
                <button
                  onClick={() => { setRateInput(project?.hourly_rate?.toString() ?? ''); setEditingRate(true) }}
                  className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
                >
                  {project?.hourly_rate ? `$${project.hourly_rate}/hr` : 'Set rate'}
                </button>
              )}
            </div>
            {project?.hourly_rate && project.billing_type === 'hourly' && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Total Billable</span>
                <span className="text-sm font-medium text-green-400">
                  ${(totalHours * project.hourly_rate).toFixed(2)}
                </span>
              </div>
            )}
            {project?.billing_type === 'flat_rate' && project.quoted_amount && totalHours > 0 && (() => {
              const effectiveRate = project.quoted_amount / totalHours
              const estimatedHours = project.estimated_hours ?? 0
              const percentUsed = estimatedHours > 0 ? (totalHours / estimatedHours) * 100 : 0
              const isLow = effectiveRate < 50
              const isWarning = effectiveRate < 75 && !isLow
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Quoted Amount</span>
                    <span className="text-sm font-medium text-white">${project.quoted_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Effective Rate</span>
                    <span className={`text-sm font-medium ${isLow ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-green-400'}`}>
                      ${effectiveRate.toFixed(0)}/hr
                    </span>
                  </div>
                  {estimatedHours > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Hours Used</span>
                      <span className={`text-sm font-medium ${percentUsed > 100 ? 'text-red-400' : percentUsed > 80 ? 'text-amber-400' : 'text-white'}`}>
                        {totalHours.toFixed(1)} / {estimatedHours}h ({percentUsed.toFixed(0)}%)
                      </span>
                    </div>
                  )}
                  {(isLow || isWarning) && (
                    <div className={`mt-2 px-3 py-2 rounded-lg text-xs ${isLow ? 'bg-red-950/50 border border-red-900/50 text-red-300' : 'bg-amber-950/50 border border-amber-900/50 text-amber-300'}`}>
                      {isLow
                        ? `Effective rate has dropped below $50/hr. You've invested ${totalHours.toFixed(1)}h into a $${project.quoted_amount.toLocaleString()} project.`
                        : `Effective rate is trending down. Consider scoping remaining work carefully.`
                      }
                    </div>
                  )}
                </>
              )
            })()}
            {project?.billing_type === 'retainer' && project.quoted_amount && totalHours > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Retainer</span>
                <span className="text-sm font-medium text-white">${project.quoted_amount.toLocaleString()}/mo</span>
              </div>
            )}
          </div>

          {recentSessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-2">Recent Sessions</p>
              <div className="space-y-1.5">
                {recentSessions.map(s => (
                  editingSessionId === s.id ? (
                    <div key={s.id} className="p-2 bg-gray-800 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 w-10">Hours</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSessionDuration}
                          onChange={(e) => setEditSessionDuration(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 w-10">Note</label>
                        <input
                          type="text"
                          value={editSessionDesc}
                          onChange={(e) => setEditSessionDesc(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={saveSessionEdit} className="text-[10px] text-blue-400 hover:text-blue-300">Save</button>
                        <button onClick={() => setEditingSessionId(null)} className="text-[10px] text-gray-500 hover:text-white">Cancel</button>
                        <div className="flex-1" />
                        <button onClick={() => { deleteSession(s.id); setEditingSessionId(null) }} className="text-[10px] text-red-500 hover:text-red-400">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div key={s.id} className="flex items-center justify-between text-xs group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: categories.find(c => c.id === s.category_id)?.color ?? '#666' }}
                        />
                        <span className="text-gray-400 truncate">{s.category_name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-gray-500">
                          {s.duration_minutes ? `${(s.duration_minutes / 60).toFixed(1)}h` : '...'}
                        </span>
                        <button
                          onClick={() => startEditSession(s)}
                          className="text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Export Invoice Button */}
          {totalHours > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <a
                href={`/api/invoice?projectId=${project?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block text-center py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                Export Invoice PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Feedback ({filteredFeedback.length})
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="deferred">Deferred</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="bug">Bug</option>
              <option value="content">Content</option>
              <option value="ux">UX</option>
              <option value="feature_request">Feature Request</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {filteredFeedback.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400">
              {feedback.length === 0
                ? 'No feedback yet. Share the review link with your client to get started.'
                : 'No feedback matches your filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredFeedback.map((item) => (
              <Link
                key={item.id}
                href={`/projects/${id}/feedback/${item.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={item.feedback_type} />
                    <span className="text-white font-semibold truncate">{item.title}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 truncate">
                    {item.description}
                  </p>
                  {item.screen_url && (
                    <p className="text-xs text-gray-500 mt-1">
                      Screen: {item.screen_url}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <SeverityDot severity={item.severity} />
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
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

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-500',
    normal: 'bg-blue-500',
    high: 'bg-amber-500',
    critical: 'bg-red-500',
  }

  return <span className={`w-2 h-2 rounded-full ${colors[severity] ?? colors.normal}`} />
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-blue-900/50 text-blue-300',
    reviewed: 'bg-gray-800 text-gray-300',
    in_progress: 'bg-amber-900/50 text-amber-300',
    resolved: 'bg-green-900/50 text-green-300',
    deferred: 'bg-gray-800 text-gray-400',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? colors.new}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
