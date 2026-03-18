'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TimeSession, Project, Category } from '@/lib/types'

export default function TimePage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<TimeSession[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Manual entry form
  const [formProject, setFormProject] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Week calculation
  const { weekStart, weekEnd, weekLabel } = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset + (weekOffset * 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return {
      weekStart: monday,
      weekEnd: sunday,
      weekLabel: weekOffset === 0 ? 'This Week' : `${fmt(monday)} — ${fmt(sunday)}`,
    }
  }, [weekOffset])

  useEffect(() => {
    loadData()
  }, [weekStart, weekEnd])

  async function loadData() {
    setLoading(true)
    const [sessionsRes, projectsRes, categoriesRes] = await Promise.all([
      supabase
        .from('time_sessions')
        .select('*, project:projects(*)')
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: false }),
      supabase.from('projects').select('*').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
    ])

    if (sessionsRes.data) setSessions(sessionsRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    setLoading(false)
  }

  // Group sessions by day
  const groupedSessions = useMemo(() => {
    const groups: Record<string, TimeSession[]> = {}
    for (const session of sessions) {
      const day = new Date(session.start_time).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
      if (!groups[day]) groups[day] = []
      groups[day].push(session)
    }
    return groups
  }, [sessions])

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const byProject: Record<string, { name: string; color: string; hours: number; rate: number | null }> = {}
    const byCategory: Record<string, { name: string; color: string; hours: number }> = {}
    let totalMinutes = 0

    for (const session of sessions) {
      const mins = session.duration_minutes ?? 0
      totalMinutes += mins
      const proj = session.project as Project | undefined

      // By project
      const pId = session.project_id
      if (!byProject[pId]) {
        byProject[pId] = {
          name: proj?.name ?? 'Unknown',
          color: proj?.color ?? '#4a9eff',
          hours: 0,
          rate: proj?.hourly_rate ?? null,
        }
      }
      byProject[pId].hours += mins / 60

      // By category
      const cName = session.category_name
      if (!byCategory[cName]) {
        const cat = categories.find(c => c.name === cName)
        byCategory[cName] = { name: cName, color: cat?.color ?? '#6b7280', hours: 0 }
      }
      byCategory[cName].hours += mins / 60
    }

    return { byProject, byCategory, totalHours: totalMinutes / 60 }
  }, [sessions, categories])

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const category = categories.find(c => c.id === formCategory)
    const startTime = new Date(`${formDate}T${formStart}`)
    const endTime = new Date(`${formDate}T${formEnd}`)
    const durationMinutes = Math.round(((endTime.getTime() - startTime.getTime()) / 60000) * 100) / 100

    if (durationMinutes <= 0) {
      setSaving(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('time_sessions').insert({
      project_id: formProject,
      developer_id: user.id,
      category_id: formCategory,
      category_name: category?.name ?? 'Other',
      description: formDescription.trim() || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      source: 'manual',
    })

    setShowAddForm(false)
    setFormDescription('')
    setSaving(false)
    await loadData()
  }

  async function handleDeleteSession(id: string) {
    await supabase.from('time_sessions').delete().eq('id', id)
    await loadData()
  }

  async function handleUpdateDescription(id: string, description: string) {
    await supabase.from('time_sessions').update({ description: description || null }).eq('id', id)
    setEditingId(null)
    await loadData()
  }

  function formatDuration(minutes: number | null) {
    if (!minutes) return '—'
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  function formatTimeRange(start: string, end: string | null) {
    const s = new Date(start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (!end) return `${s} — now`
    const e = new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `${s} — ${e}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Entry'}
        </button>
      </div>

      {/* Manual Entry Form */}
      {showAddForm && (
        <form onSubmit={handleAddEntry} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Project</label>
              <select
                value={formProject}
                onChange={(e) => setFormProject(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Start</label>
              <input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">End</label>
              <input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
          <div className="mt-3">
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </form>
      )}

      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          ← Previous
        </button>
        <span className="text-sm font-medium text-white">{weekLabel}</span>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 0}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No sessions this week.</p>
          <p className="text-sm mt-2">Start a timer from the bar below, or add a manual entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session Log */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(groupedSessions).map(([day, daySessions]) => {
              const dayTotal = daySessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
              return (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-300">{day}</h3>
                    <span className="text-xs text-gray-500">{formatDuration(dayTotal)}</span>
                  </div>
                  <div className="space-y-1">
                    {daySessions.map(session => {
                      const proj = session.project as Project | undefined
                      const isLive = !session.end_time
                      return (
                        <div
                          key={session.id}
                          className={`bg-gray-900 border rounded-lg px-4 py-3 flex items-center justify-between group ${
                            isLive ? 'border-green-800' : 'border-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: proj?.color ?? '#4a9eff' }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white font-semibold truncate">
                                  {proj?.name ?? 'Unknown'}
                                </span>
                                <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-800 rounded">
                                  {session.category_name}
                                </span>
                                {isLive && (
                                  <span className="text-xs text-green-400 font-medium">LIVE</span>
                                )}
                              </div>
                              {editingId === session.id ? (
                                <input
                                  type="text"
                                  defaultValue={session.description ?? ''}
                                  autoFocus
                                  className="mt-1 w-full text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  onBlur={(e) => handleUpdateDescription(session.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateDescription(session.id, (e.target as HTMLInputElement).value)
                                    if (e.key === 'Escape') setEditingId(null)
                                  }}
                                />
                              ) : (
                                <p
                                  className="text-xs text-gray-500 truncate cursor-pointer hover:text-gray-300"
                                  onClick={() => setEditingId(session.id)}
                                >
                                  {session.description || session.ai_summary || 'Click to add note...'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="text-xs text-gray-500">
                              {formatTimeRange(session.start_time, session.end_time)}
                            </span>
                            <span className="text-sm font-mono text-white min-w-[50px] text-right">
                              {isLive ? '...' : formatDuration(session.duration_minutes)}
                            </span>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weekly Summary Sidebar */}
          <div className="space-y-6">
            {/* Total */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Week Total</h3>
              <p className="text-3xl font-bold text-white">{weeklySummary.totalHours.toFixed(1)}h</p>
              {Object.values(weeklySummary.byProject).some(p => p.rate) && (
                <p className="text-lg text-green-400 mt-1">
                  ${Object.values(weeklySummary.byProject)
                    .filter(p => p.rate)
                    .reduce((sum, p) => sum + p.hours * (p.rate ?? 0), 0)
                    .toFixed(2)}
                </p>
              )}
            </div>

            {/* By Project */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">By Project</h3>
              <div className="space-y-2">
                {Object.values(weeklySummary.byProject)
                  .sort((a, b) => b.hours - a.hours)
                  .map(p => (
                    <div key={p.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm text-gray-300">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-white font-mono">{p.hours.toFixed(1)}h</span>
                        {p.rate && (
                          <span className="text-xs text-green-400 ml-2">${(p.hours * p.rate).toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* By Category */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">By Category</h3>
              <div className="space-y-2">
                {Object.values(weeklySummary.byCategory)
                  .sort((a, b) => b.hours - a.hours)
                  .map(c => (
                    <div key={c.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-sm text-gray-300">{c.name}</span>
                      </div>
                      <span className="text-sm text-white font-mono">{c.hours.toFixed(1)}h</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
