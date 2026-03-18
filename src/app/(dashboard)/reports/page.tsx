'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Project, Category, TimeSession, ComplexityProfile } from '@/lib/types'

type ViewMode = 'project' | 'compare' | 'quote'

type ProjectWithClient = Project & {
  client?: { name: string; id: string } | null
}

export default function ReportsPage() {
  const supabase = createClient()
  const [view, setView] = useState<ViewMode>('project')
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sessions, setSessions] = useState<TimeSession[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [projectsRes, categoriesRes, sessionsRes] = await Promise.all([
      supabase.from('projects').select('*, client:clients(name, id)').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('time_sessions').select('*, project:projects(name, hourly_rate, quoted_amount, estimated_hours, billing_type, color, complexity_profile, client:clients(name))').not('duration_minutes', 'is', null).order('start_time', { ascending: false }),
    ])

    const projectsData = projectsRes.data ?? []
    setProjects(projectsData)
    setCategories(categoriesRes.data ?? [])
    setSessions(sessionsRes.data ?? [])
    if (projectsData.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsData[0].id)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="flex bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setView('project')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'project' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Project Deep Dive
          </button>
          <button
            onClick={() => setView('compare')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'compare' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Cross-Project
          </button>
          <button
            onClick={() => setView('quote')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'quote' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Quoting Assistant
          </button>
        </div>
      </div>

      {view === 'project' ? (
        <ProjectDeepDive
          projects={projects}
          categories={categories}
          sessions={sessions}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />
      ) : view === 'compare' ? (
        <CrossProjectComparison
          projects={projects}
          categories={categories}
          sessions={sessions}
        />
      ) : (
        <QuotingAssistant
          projects={projects}
          sessions={sessions}
        />
      )}
    </div>
  )
}

// ─── Project Deep Dive ──────────────────────────────────────────────────────

function ProjectDeepDive({
  projects, categories, sessions, selectedProjectId, onSelectProject,
}: {
  projects: ProjectWithClient[]
  categories: Category[]
  sessions: TimeSession[]
  selectedProjectId: string
  onSelectProject: (id: string) => void
}) {
  const project = projects.find(p => p.id === selectedProjectId)
  const projectSessions = useMemo(
    () => sessions.filter(s => s.project_id === selectedProjectId),
    [sessions, selectedProjectId]
  )

  const totalHours = useMemo(
    () => projectSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60,
    [projectSessions]
  )

  // Hours by category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; minutes: number; color: string }> = {}
    for (const s of projectSessions) {
      const cat = categories.find(c => c.id === s.category_id)
      const key = s.category_id ?? s.category_name
      if (!map[key]) {
        map[key] = { name: s.category_name, minutes: 0, color: cat?.color ?? '#666' }
      }
      map[key].minutes += s.duration_minutes ?? 0
    }
    return Object.values(map).sort((a, b) => b.minutes - a.minutes)
  }, [projectSessions, categories])

  // Weekly hours trend
  const weeklyTrend = useMemo(() => {
    const weekMap: Record<string, number> = {}
    for (const s of projectSessions) {
      const d = new Date(s.start_time)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      weekMap[key] = (weekMap[key] ?? 0) + (s.duration_minutes ?? 0) / 60
    }
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, hours]) => ({ week, hours }))
  }, [projectSessions])

  // Effective rate calculation
  const effectiveRate = useMemo(() => {
    if (!project || totalHours === 0) return null
    if (project.billing_type === 'flat_rate' && project.quoted_amount) {
      return project.quoted_amount / totalHours
    }
    if (project.hourly_rate) {
      return project.hourly_rate
    }
    return null
  }, [project, totalHours])

  const totalRevenue = useMemo(() => {
    if (!project) return 0
    if (project.billing_type === 'flat_rate' && project.quoted_amount) {
      return project.quoted_amount
    }
    if (project.hourly_rate) {
      return totalHours * project.hourly_rate
    }
    return 0
  }, [project, totalHours])

  // Hours vs estimate
  const estimateProgress = project?.estimated_hours ? (totalHours / project.estimated_hours) * 100 : null

  return (
    <div>
      {/* Project selector */}
      <div className="mb-6">
        <select
          value={selectedProjectId}
          onChange={(e) => onSelectProject(e.target.value)}
          className="px-4 py-2.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px]"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.client ? `(${p.client.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {!project ? (
        <p className="text-gray-400">Select a project to view its report.</p>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Total Hours" value={`${totalHours.toFixed(1)}h`} />
            <MetricCard
              label={project.billing_type === 'flat_rate' ? 'Effective Rate' : 'Hourly Rate'}
              value={effectiveRate ? `$${effectiveRate.toFixed(2)}/hr` : 'Not set'}
              color={project.billing_type === 'flat_rate' && effectiveRate
                ? (effectiveRate >= 100 ? 'text-green-400' : effectiveRate >= 60 ? 'text-yellow-400' : 'text-red-400')
                : undefined
              }
            />
            <MetricCard
              label={project.billing_type === 'flat_rate' ? 'Quoted Amount' : 'Total Billable'}
              value={`$${totalRevenue.toFixed(2)}`}
              color={totalRevenue > 0 ? 'text-green-400' : undefined}
            />
            <MetricCard
              label="Sessions"
              value={projectSessions.length.toString()}
            />
          </div>

          {/* Estimate Progress */}
          {estimateProgress !== null && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Hours vs Estimate</span>
                <span className={`text-sm font-medium ${
                  estimateProgress > 100 ? 'text-red-400' : estimateProgress > 80 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {totalHours.toFixed(1)}h / {project.estimated_hours}h ({estimateProgress.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${
                    estimateProgress > 100 ? 'bg-red-500' : estimateProgress > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(estimateProgress, 100)}%` }}
                />
              </div>
              {estimateProgress > 100 && (
                <p className="text-xs text-red-400 mt-2">
                  Over estimate by {(totalHours - project.estimated_hours!).toFixed(1)}h
                  {effectiveRate && project.billing_type === 'flat_rate' && (
                    <> — effective rate dropped to ${effectiveRate.toFixed(2)}/hr</>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Category Breakdown + Weekly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Category Breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Time by Category</h3>
              {categoryBreakdown.length === 0 ? (
                <p className="text-gray-500 text-sm">No sessions yet.</p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.map(cat => {
                    const hours = cat.minutes / 60
                    const pct = totalHours > 0 ? (hours / totalHours) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm text-gray-300">{cat.name}</span>
                          </div>
                          <span className="text-sm text-gray-400">{hours.toFixed(1)}h ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Weekly Trend */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Weekly Hours</h3>
              {weeklyTrend.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const maxHours = Math.max(...weeklyTrend.map(w => w.hours))
                    return weeklyTrend.map(w => (
                      <div key={w.week} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20 shrink-0">
                          {new Date(w.week + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                          <div
                            className="h-5 rounded-full bg-[#F59E0B] flex items-center justify-end pr-2"
                            style={{ width: `${Math.max((w.hours / maxHours) * 100, 8)}%` }}
                          >
                            <span className="text-xs text-[#09090B] font-semibold">{w.hours.toFixed(1)}h</span>
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Session Log with AI Summaries */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Session Log</h3>
            </div>
            {projectSessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">No sessions recorded.</div>
            ) : (
              <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
                {projectSessions.map(s => {
                  const cat = categories.find(c => c.id === s.category_id)
                  const hours = (s.duration_minutes ?? 0) / 60
                  return (
                    <div key={s.id} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? '#666' }} />
                          <span className="text-xs text-gray-500">
                            {new Date(s.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-600">
                            {new Date(s.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            {s.end_time && ` – ${new Date(s.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                          </span>
                          <span className="text-xs font-medium text-gray-400">{s.category_name}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{hours.toFixed(1)}h</span>
                      </div>
                      {(s.ai_summary || s.description) && (
                        <p className="text-sm text-gray-400 mt-1 ml-4">
                          {s.ai_summary ?? s.description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Complexity Profile Summary */}
          {project.complexity_profile && Object.keys(project.complexity_profile).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Project Profile</h3>
              <div className="flex flex-wrap gap-1.5">
                {project.complexity_profile.app_type && (
                  <Tag label={project.complexity_profile.app_type.replace(/_/g, ' ')} />
                )}
                {project.complexity_profile.audience && (
                  <Tag label={project.complexity_profile.audience.toUpperCase()} />
                )}
                {project.complexity_profile.multi_tenant && <Tag label="Multi-tenant" color="blue" />}
                {project.complexity_profile.auth_level && project.complexity_profile.auth_level !== 'none' && (
                  <Tag label={`Auth: ${project.complexity_profile.auth_level}`} />
                )}
                {project.complexity_profile.database_complexity && project.complexity_profile.database_complexity !== 'none' && (
                  <Tag label={`DB: ${project.complexity_profile.database_complexity}`} />
                )}
                {(project.complexity_profile.integrations ?? []).map(i => (
                  <Tag key={i} label={i} color="blue" />
                ))}
                {(project.complexity_profile.features ?? []).map(f => (
                  <Tag key={f} label={f.replace(/_/g, ' ')} color="purple" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Cross-Project Comparison ───────────────────────────────────────────────

function CrossProjectComparison({
  projects, categories, sessions,
}: {
  projects: ProjectWithClient[]
  categories: Category[]
  sessions: TimeSession[]
}) {
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'rate' | 'accuracy'>('hours')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const projectStats = useMemo(() => {
    return projects.map(p => {
      const pSessions = sessions.filter(s => s.project_id === p.id)
      const totalMinutes = pSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
      const totalHours = totalMinutes / 60
      const sessionCount = pSessions.length

      // Category breakdown
      const catMap: Record<string, { name: string; minutes: number; color: string }> = {}
      for (const s of pSessions) {
        const cat = categories.find(c => c.id === s.category_id)
        const key = s.category_id ?? s.category_name
        if (!catMap[key]) catMap[key] = { name: s.category_name, minutes: 0, color: cat?.color ?? '#666' }
        catMap[key].minutes += s.duration_minutes ?? 0
      }
      const topCategories = Object.values(catMap).sort((a, b) => b.minutes - a.minutes).slice(0, 3)

      // Effective rate
      let effectiveRate: number | null = null
      let totalRevenue = 0
      if (p.billing_type === 'flat_rate' && p.quoted_amount && totalHours > 0) {
        effectiveRate = p.quoted_amount / totalHours
        totalRevenue = p.quoted_amount
      } else if (p.hourly_rate) {
        effectiveRate = p.hourly_rate
        totalRevenue = totalHours * p.hourly_rate
      }

      // Estimate accuracy
      const estimateAccuracy = p.estimated_hours && totalHours > 0
        ? (totalHours / p.estimated_hours) * 100
        : null

      // Complexity score
      const cp = p.complexity_profile ?? {}
      let complexityScore = 0
      if (cp.multi_tenant) complexityScore += 2
      if (cp.auth_level === 'oauth') complexityScore += 1
      if (cp.auth_level === 'sso') complexityScore += 2
      if (cp.database_complexity === 'simple') complexityScore += 1
      if (cp.database_complexity === 'complex') complexityScore += 3
      if (cp.deployment === 'complex') complexityScore += 1
      complexityScore += (cp.integrations?.length ?? 0)
      complexityScore += (cp.features?.length ?? 0) * 0.5

      return {
        project: p,
        totalHours,
        sessionCount,
        effectiveRate,
        totalRevenue,
        estimateAccuracy,
        complexityScore,
        topCategories,
      }
    }).filter(s => s.sessionCount > 0)
  }, [projects, sessions, categories])

  const sorted = useMemo(() => {
    return [...projectStats].sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name': cmp = a.project.name.localeCompare(b.project.name); break
        case 'hours': cmp = a.totalHours - b.totalHours; break
        case 'rate': cmp = (a.effectiveRate ?? 0) - (b.effectiveRate ?? 0); break
        case 'accuracy': cmp = (a.estimateAccuracy ?? 0) - (b.estimateAccuracy ?? 0); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [projectStats, sortBy, sortDir])

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const sortIcon = (col: typeof sortBy) => {
    if (sortBy !== col) return '↕'
    return sortDir === 'desc' ? '↓' : '↑'
  }

  // Aggregate stats
  const totalAllHours = projectStats.reduce((sum, s) => sum + s.totalHours, 0)
  const totalAllRevenue = projectStats.reduce((sum, s) => sum + s.totalRevenue, 0)
  const avgEffectiveRate = totalAllHours > 0 ? totalAllRevenue / totalAllHours : 0

  return (
    <div>
      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Projects" value={projectStats.length.toString()} />
        <MetricCard label="Total Hours (All)" value={`${totalAllHours.toFixed(1)}h`} />
        <MetricCard label="Total Revenue" value={`$${totalAllRevenue.toFixed(2)}`} color="text-green-400" />
        <MetricCard label="Avg Effective Rate" value={avgEffectiveRate > 0 ? `$${avgEffectiveRate.toFixed(2)}/hr` : 'N/A'} />
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left">
                  <button onClick={() => handleSort('name')} className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-white">
                    Project {sortIcon('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('hours')} className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-white">
                    Hours {sortIcon('hours')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('rate')} className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-white">
                    Eff. Rate {sortIcon('rate')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('accuracy')} className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-white">
                    vs Estimate {sortIcon('accuracy')}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Complexity</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Categories</span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No projects with time data yet.
                  </td>
                </tr>
              ) : sorted.map(row => {
                const rateColor = row.effectiveRate
                  ? (row.effectiveRate >= 100 ? 'text-green-400' : row.effectiveRate >= 60 ? 'text-yellow-400' : 'text-red-400')
                  : 'text-gray-500'
                const estColor = row.estimateAccuracy
                  ? (row.estimateAccuracy <= 100 ? 'text-green-400' : row.estimateAccuracy <= 120 ? 'text-yellow-400' : 'text-red-400')
                  : 'text-gray-500'

                return (
                  <tr key={row.project.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/projects/${row.project.id}`} className="text-white font-semibold hover:text-blue-400 transition-colors">
                        {row.project.name}
                      </Link>
                      {row.project.client && (
                        <p className="text-xs text-gray-500">{row.project.client.name}</p>
                      )}
                      <div className="flex gap-1 mt-1">
                        {row.project.complexity_profile?.app_type && (
                          <span className="text-xs text-gray-600">{row.project.complexity_profile.app_type.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white font-semibold">{row.totalHours.toFixed(1)}h</span>
                      <p className="text-xs text-gray-500">{row.sessionCount} sessions</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${rateColor}`}>
                        {row.effectiveRate ? `$${row.effectiveRate.toFixed(0)}/hr` : '—'}
                      </span>
                      <p className="text-xs text-gray-500">
                        {row.project.billing_type === 'flat_rate' ? 'flat' : row.project.billing_type ?? 'hourly'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${estColor}`}>
                        {row.estimateAccuracy ? `${row.estimateAccuracy.toFixed(0)}%` : '—'}
                      </span>
                      {row.project.estimated_hours && (
                        <p className="text-xs text-gray-500">est. {row.project.estimated_hours}h</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.complexityScore > 0 ? (
                        <span className={`text-sm font-medium ${
                          row.complexityScore <= 3 ? 'text-green-400' :
                          row.complexityScore <= 7 ? 'text-yellow-400' :
                          row.complexityScore <= 12 ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {row.complexityScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {row.topCategories.map(cat => (
                          <div key={cat.name} className="flex items-center gap-1" title={`${cat.name}: ${(cat.minutes / 60).toFixed(1)}h`}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs text-gray-400">{(cat.minutes / 60).toFixed(1)}h</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${row.totalRevenue > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {row.totalRevenue > 0 ? `$${row.totalRevenue.toFixed(0)}` : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      {sorted.length >= 2 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Insights</h3>
          <div className="space-y-2 text-sm text-gray-400">
            {(() => {
              const withEstimates = sorted.filter(s => s.estimateAccuracy !== null)
              const overEstimate = withEstimates.filter(s => s.estimateAccuracy! > 110)
              const bestRate = sorted.reduce((best, s) => (s.effectiveRate ?? 0) > (best.effectiveRate ?? 0) ? s : best, sorted[0])
              const worstRate = sorted.filter(s => s.effectiveRate).reduce((worst, s) => (s.effectiveRate ?? Infinity) < (worst.effectiveRate ?? Infinity) ? s : worst, sorted[0])

              const insights: string[] = []

              if (overEstimate.length > 0) {
                insights.push(`${overEstimate.length} of ${withEstimates.length} projects with estimates exceeded their estimated hours. Consider adding a ${Math.round((overEstimate.reduce((sum, s) => sum + (s.estimateAccuracy! - 100), 0) / overEstimate.length))}% buffer to future estimates.`)
              }

              if (bestRate.effectiveRate && worstRate.effectiveRate && bestRate.project.id !== worstRate.project.id) {
                insights.push(`Best effective rate: ${bestRate.project.name} at $${bestRate.effectiveRate.toFixed(0)}/hr. Lowest: ${worstRate.project.name} at $${worstRate.effectiveRate.toFixed(0)}/hr.`)
              }

              if (avgEffectiveRate > 0) {
                insights.push(`Your average effective rate across all projects is $${avgEffectiveRate.toFixed(0)}/hr.`)
              }

              return insights.length > 0 ? insights.map((insight, i) => (
                <p key={i}>{insight}</p>
              )) : <p>Add more project data to generate insights.</p>
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Quoting Assistant ──────────────────────────────────────────────────────

function QuotingAssistant({
  projects, sessions,
}: {
  projects: ProjectWithClient[]
  sessions: TimeSession[]
}) {
  const supabase = createClient()

  // Build profile for the new quote
  const [quoteName, setQuoteName] = useState('')
  const [appType, setAppType] = useState('')
  const [audience, setAudience] = useState('')
  const [authLevel, setAuthLevel] = useState('')
  const [dbComplexity, setDbComplexity] = useState('')
  const [multiTenant, setMultiTenant] = useState(false)
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  // Manual estimate inputs — user can override or start from scratch
  const [manualHours, setManualHours] = useState('')
  const [manualRate, setManualRate] = useState('')
  const [billingType, setBillingType] = useState<'hourly' | 'flat_rate'>('hourly')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Assign to existing client
  const [selectedClientId, setSelectedClientId] = useState('')

  const integrationOptions: { name: string; tip: string; hours: number }[] = [
    { name: 'Stripe', tip: 'Payment processing — checkout, subscriptions, invoicing', hours: 12 },
    { name: 'Email/SMTP', tip: 'Sending emails — transactional, notifications, newsletters (e.g. SendGrid, Resend)', hours: 6 },
    { name: 'AI/LLM', tip: 'AI features — chatbots, summaries, content generation (e.g. Claude, OpenAI)', hours: 10 },
    { name: 'OAuth Provider', tip: 'Login with Google, GitHub, etc. — social sign-in buttons', hours: 6 },
    { name: 'Analytics', tip: 'Usage tracking — page views, events, funnels (e.g. Google Analytics, Mixpanel)', hours: 4 },
    { name: 'Cloud Storage', tip: 'File/image hosting — uploads stored in S3, Supabase Storage, Cloudinary', hours: 8 },
    { name: 'SMS/Twilio', tip: 'Text messages — verification codes, appointment reminders', hours: 6 },
    { name: 'Maps/Geo', tip: 'Maps or location features — address lookup, store locators (e.g. Google Maps)', hours: 8 },
    { name: 'CMS', tip: 'Content management — blog posts, pages, or media managed by non-developers (e.g. Sanity, Contentful)', hours: 10 },
    { name: 'Calendar', tip: 'Calendar sync — scheduling, event management (e.g. Google Calendar API)', hours: 8 },
    { name: 'Webhooks', tip: 'Automated triggers — your app reacts to events from other services in real-time', hours: 6 },
    { name: 'Search', tip: 'Full-text search — fast, typo-tolerant search across content (e.g. Algolia, Meilisearch)', hours: 8 },
  ]
  const featureOptions: { name: string; tip: string; hours: number }[] = [
    { name: 'Dashboard', tip: 'Overview page with stats, charts, and key metrics at a glance', hours: 12 },
    { name: 'Admin Panel', tip: 'Backend management area — manage users, settings, data (separate from the main app)', hours: 16 },
    { name: 'User Profiles', tip: 'User account pages — settings, avatars, personal info', hours: 8 },
    { name: 'Notifications', tip: 'In-app alerts — new messages, status changes, reminders', hours: 8 },
    { name: 'File Upload', tip: 'Users can upload files — images, documents, attachments', hours: 6 },
    { name: 'Real-time', tip: 'Live updates without refresh — chat, collaborative editing, live feeds (uses WebSockets)', hours: 14 },
    { name: 'Search', tip: 'Search bar for users to find content within the app', hours: 6 },
    { name: 'Reports/Export', tip: 'Generate reports or export data as CSV, PDF, etc.', hours: 10 },
    { name: 'Multi-language', tip: 'Support multiple languages — translated UI, content localization', hours: 12 },
    { name: 'Dark Mode', tip: 'Light/dark theme toggle with saved preference', hours: 4 },
    { name: 'Mobile Responsive', tip: 'Works well on phones and tablets — responsive layout', hours: 8 },
    { name: 'API', tip: 'Public or internal API — other apps or services can connect to your system', hours: 12 },
    { name: 'Scheduling/Jobs', tip: 'Automated background tasks — daily emails, data cleanup, recurring reports', hours: 8 },
    { name: 'Role-Based Access', tip: 'Different permission levels — admin, editor, viewer, etc.', hours: 10 },
    { name: 'Lesson/Course Builder', tip: 'Create and organize educational content — lessons, modules, quizzes (for LMS apps)', hours: 20 },
    { name: 'Progress Tracking', tip: 'Track user completion — progress bars, streaks, achievements', hours: 10 },
  ]

  const [hoveredTip, setHoveredTip] = useState<string | null>(null)

  function toggleArray(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
  }

  function calcScore(cp: ComplexityProfile): number {
    let score = 0
    if (cp.multi_tenant) score += 2
    if (cp.auth_level === 'oauth') score += 1
    if (cp.auth_level === 'sso') score += 2
    if (cp.auth_level === 'basic') score += 0.5
    if (cp.database_complexity === 'simple') score += 1
    if (cp.database_complexity === 'complex') score += 3
    if (cp.deployment === 'complex') score += 1
    score += (cp.integrations?.length ?? 0)
    score += (cp.features?.length ?? 0) * 0.5
    return score
  }

  const newProfile: ComplexityProfile = {
    app_type: appType as ComplexityProfile['app_type'] || undefined,
    audience: audience as ComplexityProfile['audience'] || undefined,
    auth_level: authLevel as ComplexityProfile['auth_level'] || undefined,
    database_complexity: dbComplexity as ComplexityProfile['database_complexity'] || undefined,
    multi_tenant: multiTenant,
    integrations: selectedIntegrations,
    features: selectedFeatures,
  }
  const newScore = calcScore(newProfile)

  // Historical data
  const projectData = useMemo(() => {
    return projects.map(p => {
      const pSessions = sessions.filter(s => s.project_id === p.id)
      const totalHours = pSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60
      const cp = p.complexity_profile ?? {}
      const score = calcScore(cp)
      return { project: p, totalHours, score, sessionCount: pSessions.length }
    }).filter(d => d.sessionCount > 0 && d.totalHours > 0)
  }, [projects, sessions])

  const similarProjects = useMemo(() => {
    if (newScore === 0) return []
    return projectData
      .filter(d => Math.abs(d.score - newScore) <= 3)
      .sort((a, b) => Math.abs(a.score - newScore) - Math.abs(b.score - newScore))
  }, [projectData, newScore])

  // AI-suggested estimate from historical data
  const suggestion = useMemo(() => {
    if (projectData.length === 0 || newScore === 0) return null

    const pool = similarProjects.length > 0 ? similarProjects : projectData
    const avgHours = pool.reduce((sum, d) => sum + d.totalHours, 0) / pool.length

    const withEstimates = pool.filter(d => d.project.estimated_hours)
    let bufferPct = 0
    if (withEstimates.length > 0) {
      const avgOverrun = withEstimates.reduce((sum, d) => {
        return sum + ((d.totalHours / d.project.estimated_hours!) - 1)
      }, 0) / withEstimates.length
      bufferPct = Math.max(0, Math.round(avgOverrun * 100))
    }

    const suggestedHours = avgHours * (1 + bufferPct / 100)

    const withRates = pool.filter(d => {
      if (d.project.billing_type === 'flat_rate' && d.project.quoted_amount) return true
      if (d.project.hourly_rate) return true
      return false
    })
    let avgRate = 0
    if (withRates.length > 0) {
      avgRate = withRates.reduce((sum, d) => {
        if (d.project.billing_type === 'flat_rate' && d.project.quoted_amount) {
          return sum + d.project.quoted_amount / d.totalHours
        }
        return sum + (d.project.hourly_rate ?? 0)
      }, 0) / withRates.length
    }

    return {
      avgHours,
      suggestedHours: Math.round(suggestedHours),
      bufferPct,
      avgRate: Math.round(avgRate),
      suggestedFlat: Math.round(suggestedHours * avgRate),
      basedOn: pool.length,
      isSimilar: similarProjects.length > 0,
    }
  }, [similarProjects, projectData, newScore])

  // Use AI suggestion to pre-fill manual inputs
  function applySuggestion() {
    if (!suggestion) return
    setManualHours(suggestion.suggestedHours.toString())
    if (suggestion.avgRate > 0) setManualRate(suggestion.avgRate.toString())
  }

  // Auto-estimated hours from selections
  const baseHoursByAppType: Record<string, number> = {
    marketing_site: 20, web_app: 40, dashboard: 30, api_backend: 25,
    mobile_app: 50, chrome_extension: 20, e_commerce: 60,
    learning_management: 80, booking_platform: 50, social_platform: 70,
  }
  const autoEstimatedHours = useMemo(() => {
    let h = baseHoursByAppType[appType] ?? 0
    if (authLevel === 'basic') h += 4
    if (authLevel === 'oauth') h += 8
    if (authLevel === 'sso') h += 14
    if (dbComplexity === 'simple') h += 4
    if (dbComplexity === 'complex') h += 12
    if (multiTenant) h += 16
    for (const int of selectedIntegrations) {
      const opt = integrationOptions.find(o => o.name === int)
      if (opt) h += opt.hours
    }
    for (const feat of selectedFeatures) {
      const opt = featureOptions.find(o => o.name === feat)
      if (opt) h += opt.hours
    }
    return h
  }, [appType, authLevel, dbComplexity, multiTenant, selectedIntegrations, selectedFeatures])

  // Calculate final quote
  const hours = parseFloat(manualHours) || 0
  const rate = parseFloat(manualRate) || 0
  const totalQuote = billingType === 'flat_rate' ? hours * rate : 0

  // Get unique clients for the dropdown
  const uniqueClients = useMemo(() => {
    const seen = new Set<string>()
    return projects
      .filter(p => p.client && !seen.has(p.client.id) && seen.add(p.client.id))
      .map(p => p.client!)
  }, [projects])

  async function handleSaveAsProject() {
    if (!quoteName.trim() || !selectedClientId) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase.from('projects').insert({
      client_id: selectedClientId,
      developer_id: user.id,
      name: quoteName.trim(),
      status: 'active',
      billing_type: billingType,
      hourly_rate: rate || null,
      quoted_amount: billingType === 'flat_rate' ? totalQuote || null : null,
      estimated_hours: hours || null,
      complexity_profile: newProfile,
      review_token: crypto.randomUUID(),
      review_link_active: false,
    })

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-6">
        Build a project profile, get data-driven suggestions (if historical data exists), set your estimate, and save as a new project.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Profile Builder */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Project Profile</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">App Type</label>
                <select value={appType} onChange={e => setAppType(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select...</option>
                  <option value="marketing_site">Marketing Site</option>
                  <option value="web_app">Web App</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="api_backend">API Backend</option>
                  <option value="mobile_app">Mobile App</option>
                  <option value="chrome_extension">Chrome Extension</option>
                  <option value="e_commerce">E-Commerce Store</option>
                  <option value="learning_management">Learning Management (LMS)</option>
                  <option value="booking_platform">Booking / Scheduling Platform</option>
                  <option value="social_platform">Social / Community Platform</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Audience</label>
                <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select...</option>
                  <option value="b2b">B2B</option>
                  <option value="b2c">B2C</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Auth Level</label>
                <select value={authLevel} onChange={e => setAuthLevel(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select...</option>
                  <option value="none">None — no login needed</option>
                  <option value="basic">Basic — email/password login</option>
                  <option value="oauth">OAuth — login with Google, GitHub, etc.</option>
                  <option value="sso">SSO — enterprise single sign-on (SAML)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Database</label>
                <select value={dbComplexity} onChange={e => setDbComplexity(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select...</option>
                  <option value="none">None — static content only</option>
                  <option value="simple">Simple — a few tables, basic queries</option>
                  <option value="complex">Complex — many tables, relationships, migrations</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setMultiTenant(!multiTenant)}
                  onMouseEnter={() => setHoveredTip('multi-tenant')}
                  onMouseLeave={() => setHoveredTip(null)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    multiTenant ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  Multi-tenant
                </button>
                {hoveredTip === 'multi-tenant' && (
                  <div className="absolute z-20 bottom-full left-0 mb-1 w-56 px-3 py-2 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-lg shadow-xl pointer-events-none">
                    Multiple organizations share the same app but see only their own data (e.g., Slack workspaces, Shopify stores)
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Integrations <span className="text-gray-600">— hover for details</span></label>
              <div className="flex flex-wrap gap-1.5">
                {integrationOptions.map(i => (
                  <div key={i.name} className="relative">
                    <button
                      onClick={() => setSelectedIntegrations(toggleArray(selectedIntegrations, i.name))}
                      onMouseEnter={() => setHoveredTip(`int-${i.name}`)}
                      onMouseLeave={() => setHoveredTip(null)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        selectedIntegrations.includes(i.name) ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {i.name} <span className="text-gray-600 ml-0.5">~{i.hours}h</span>
                    </button>
                    {hoveredTip === `int-${i.name}` && (
                      <div className="absolute z-20 bottom-full left-0 mb-1 w-56 px-3 py-2 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-lg shadow-xl pointer-events-none">
                        {i.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Features <span className="text-gray-600">— hover for details</span></label>
              <div className="flex flex-wrap gap-1.5">
                {featureOptions.map(f => (
                  <div key={f.name} className="relative">
                    <button
                      onClick={() => setSelectedFeatures(toggleArray(selectedFeatures, f.name))}
                      onMouseEnter={() => setHoveredTip(`feat-${f.name}`)}
                      onMouseLeave={() => setHoveredTip(null)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        selectedFeatures.includes(f.name) ? 'bg-purple-900/50 border-purple-700 text-purple-300' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {f.name} <span className="text-gray-600 ml-0.5">~{f.hours}h</span>
                    </button>
                    {hoveredTip === `feat-${f.name}` && (
                      <div className="absolute z-20 bottom-full left-0 mb-1 w-56 px-3 py-2 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-lg shadow-xl pointer-events-none">
                        {f.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Complexity Score</span>
                <span className={`text-lg font-bold ${
                  newScore <= 3 ? 'text-green-400' : newScore <= 7 ? 'text-yellow-400' : newScore <= 12 ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {newScore.toFixed(1)}
                </span>
              </div>
              {autoEstimatedHours > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Feature-Based Estimate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-400">{autoEstimatedHours}h</span>
                    <button
                      onClick={() => setManualHours(autoEstimatedHours.toString())}
                      className="px-2 py-0.5 text-xs bg-blue-900/50 border border-blue-800 text-blue-300 rounded hover:bg-blue-800/50 transition-colors"
                    >
                      Use
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Similar Historical Projects */}
          {projectData.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                {similarProjects.length > 0 ? `Similar Projects (${similarProjects.length})` : 'All Projects with Data'}
              </h3>
              <div className="space-y-2">
                {(similarProjects.length > 0 ? similarProjects : projectData).map(d => {
                  const dRate = d.project.billing_type === 'flat_rate' && d.project.quoted_amount
                    ? d.project.quoted_amount / d.totalHours
                    : d.project.hourly_rate ?? 0
                  return (
                    <div key={d.project.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div>
                        <Link href={`/projects/${d.project.id}`} className="text-sm text-white hover:text-blue-400 transition-colors">
                          {d.project.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${
                            d.score <= 3 ? 'text-green-500' : d.score <= 7 ? 'text-yellow-500' : 'text-orange-500'
                          }`}>
                            Score: {d.score.toFixed(1)}
                          </span>
                          {d.project.estimated_hours && (
                            <span className={`text-xs ${
                              d.totalHours > d.project.estimated_hours ? 'text-red-500' : 'text-gray-600'
                            }`}>
                              est. {d.project.estimated_hours}h → actual {d.totalHours.toFixed(1)}h
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-white font-semibold">{d.totalHours.toFixed(1)}h</span>
                        {dRate > 0 && <p className="text-xs text-gray-500">${dRate.toFixed(0)}/hr</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Estimate & Save */}
        <div className="space-y-6">
          {/* AI Suggestion */}
          {suggestion && (
            <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wide">Data-Driven Suggestion</h3>
                <button
                  onClick={applySuggestion}
                  className="px-3 py-1 text-xs font-medium bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors"
                >
                  Use These Numbers
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Suggested Hours</p>
                  <p className="text-xl font-bold text-white">{suggestion.suggestedHours}h</p>
                  {suggestion.bufferPct > 0 && (
                    <p className="text-xs text-amber-400">+{suggestion.bufferPct}% buffer</p>
                  )}
                </div>
                {suggestion.avgRate > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Suggested Rate</p>
                    <p className="text-xl font-bold text-white">${suggestion.avgRate}/hr</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Based on {suggestion.basedOn} {suggestion.isSimilar ? 'similar' : ''} project{suggestion.basedOn !== 1 ? 's' : ''} averaging {suggestion.avgHours.toFixed(1)}h
              </p>
            </div>
          )}

          {/* Manual Estimate Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Your Estimate</h3>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Billing Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBillingType('hourly')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    billingType === 'hourly' ? 'bg-gray-800 border-gray-600 text-white' : 'border-gray-700 text-gray-500'
                  }`}
                >
                  Hourly
                </button>
                <button
                  onClick={() => setBillingType('flat_rate')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    billingType === 'flat_rate' ? 'bg-gray-800 border-gray-600 text-white' : 'border-gray-700 text-gray-500'
                  }`}
                >
                  Flat Rate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estimated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={manualHours}
                  onChange={e => setManualHours(e.target.value)}
                  placeholder="e.g., 40"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hourly Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={manualRate}
                  onChange={e => setManualRate(e.target.value)}
                  placeholder="e.g., 125"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Live calculation */}
            {hours > 0 && rate > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                {billingType === 'flat_rate' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Quoted Amount</span>
                      <span className="text-lg font-bold text-green-400">${totalQuote.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">{hours}h × ${rate}/hr</span>
                      <span className="text-xs text-gray-500">effective rate if on-estimate</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Estimated Total</span>
                      <span className="text-lg font-bold text-green-400">${(hours * rate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">{hours}h × ${rate}/hr</span>
                      <span className="text-xs text-gray-500">billed by the hour</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Save as Project */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Save as Project</h3>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Project Name</label>
              <input
                type="text"
                value={quoteName}
                onChange={e => setQuoteName(e.target.value)}
                placeholder="e.g., New Client Portal"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Client</label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a client...</option>
                {uniqueClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveAsProject}
              disabled={saving || !quoteName.trim() || !selectedClientId}
              className="w-full py-2.5 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
            >
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Create Project with Estimate'}
            </button>

            {saved && (
              <p className="text-xs text-green-400 text-center">Project created with complexity profile, estimated hours, and billing settings.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared Components ──────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-white'}`}>{value}</p>
    </div>
  )
}

function Tag({ label, color = 'gray' }: { label: string; color?: 'gray' | 'blue' | 'purple' }) {
  const colors = {
    gray: 'bg-gray-800 text-gray-400',
    blue: 'bg-blue-900/30 text-blue-300',
    purple: 'bg-purple-900/30 text-purple-300',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[color]}`}>
      {label}
    </span>
  )
}
