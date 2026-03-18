'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Project, Category, TimeSession } from '@/lib/types'

export function TimerBar() {
  const pathname = usePathname()
  const supabase = createClient()

  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeSession, setActiveSession] = useState<TimeSession | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [stopNote, setStopNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [switching, setSwitching] = useState(false)

  // Load projects, categories, and check for active session
  useEffect(() => {
    loadData()
  }, [])

  // Auto-select project when on a project page
  useEffect(() => {
    const match = pathname.match(/\/projects\/([^/]+)/)
    if (match && !activeSession) {
      setSelectedProjectId(match[1])
    }
  }, [pathname, activeSession])

  // Live timer
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0)
      return
    }

    function tick() {
      const start = new Date(activeSession!.start_time).getTime()
      const now = Date.now()
      setElapsed(Math.floor((now - start) / 1000))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  const loadData = useCallback(async () => {
    const [projectsRes, categoriesRes, sessionRes] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'active').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('time_sessions').select('*, project:projects(*)').is('end_time', null).limit(1).single(),
    ])

    if (projectsRes.data) setProjects(projectsRes.data)
    if (categoriesRes.data) {
      setCategories(categoriesRes.data)
      if (categoriesRes.data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categoriesRes.data[0].id)
      }
    }
    if (sessionRes.data && !sessionRes.error) {
      setActiveSession(sessionRes.data)
    }
  }, [])

  async function handleStart() {
    if (!selectedProjectId || !selectedCategoryId) return
    setStarting(true)

    const category = categories.find(c => c.id === selectedCategoryId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('time_sessions').insert({
      project_id: selectedProjectId,
      developer_id: user.id,
      category_id: selectedCategoryId,
      category_name: category?.name ?? 'Other',
      start_time: new Date().toISOString(),
      source: 'manual',
    }).select('*, project:projects(*)').single()

    if (data && !error) {
      setActiveSession(data)
    }
    setStarting(false)
  }

  async function handleStop() {
    if (!activeSession) return
    setStopping(true)

    const now = new Date()
    const start = new Date(activeSession.start_time)
    const durationMinutes = Math.round(((now.getTime() - start.getTime()) / 60000) * 100) / 100

    await supabase.from('time_sessions').update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
      description: stopNote.trim() || null,
    }).eq('id', activeSession.id)

    // Fire-and-forget AI summary generation
    const sessionId = activeSession.id
    const projectName = (activeSession.project as any)?.name ?? 'Unknown'
    const categoryName = activeSession.category_name
    const description = stopNote.trim() || null
    generateAiSummary(sessionId, projectName, categoryName, durationMinutes, description)

    setActiveSession(null)
    setStopNote('')
    setShowNote(false)
    setExpanded(false)
    setStopping(false)
  }

  async function generateAiSummary(sessionId: string, projectName: string, categoryName: string, durationMinutes: number, description: string | null) {
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, projectName, categoryName, durationMinutes, description }),
      })
      const data = await res.json()
      if (data.summary) {
        await supabase.from('time_sessions').update({ ai_summary: data.summary }).eq('id', sessionId)
      }
    } catch {
      // Silently fail — summary is optional
    }
  }

  // Quick switch: close current session, immediately start new one with different category
  async function handleCategorySwitch(newCategoryId: string) {
    if (!activeSession || switching) return
    if (newCategoryId === activeSession.category_id) return
    setSwitching(true)

    const now = new Date()
    const start = new Date(activeSession.start_time)
    const durationMinutes = Math.round(((now.getTime() - start.getTime()) / 60000) * 100) / 100

    // Close current session
    await supabase.from('time_sessions').update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
    }).eq('id', activeSession.id)

    // Start new session with the new category, same project
    const newCategory = categories.find(c => c.id === newCategoryId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSwitching(false); return }

    const { data, error } = await supabase.from('time_sessions').insert({
      project_id: activeSession.project_id,
      developer_id: user.id,
      category_id: newCategoryId,
      category_name: newCategory?.name ?? 'Other',
      start_time: now.toISOString(),
      source: 'manual',
    }).select('*, project:projects(*)').single()

    if (data && !error) {
      setActiveSession(data)
    }
    setSwitching(false)
  }

  function formatTime(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const activeProject = activeSession?.project as Project | undefined

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Expanded category switcher panel */}
      {expanded && activeSession && (
        <div className="border-t border-gray-800 bg-gray-900/98 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-xs text-gray-500 mb-2">Switch category (keeps timer running):</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                const isActive = cat.id === activeSession.category_id
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySwitch(cat.id)}
                    disabled={switching || isActive}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      isActive
                        ? 'border-white/30 text-white'
                        : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                    } ${switching ? 'opacity-50' : ''}`}
                    style={isActive ? { backgroundColor: cat.color + '30', borderColor: cat.color } : undefined}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main timer bar */}
      <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 gap-4">
            {activeSession ? (
              <>
                {/* Active session display */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
                  <span className="text-lg font-mono font-bold text-white tabular-nums">
                    {formatTime(elapsed)}
                  </span>
                  <span className="text-sm text-gray-400 truncate">
                    <span className="text-white font-medium">{activeProject?.name}</span>
                  </span>
                  {/* Category button — click to expand switcher */}
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border border-gray-700 hover:border-gray-500 transition-colors"
                    style={{ color: categories.find(c => c.id === activeSession.category_id)?.color }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: categories.find(c => c.id === activeSession.category_id)?.color }}
                    />
                    {activeSession.category_name}
                    <span className="text-gray-600 ml-0.5">{expanded ? '▾' : '▸'}</span>
                  </button>
                </div>

                {/* Stop controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {showNote ? (
                    <input
                      type="text"
                      value={stopNote}
                      onChange={(e) => setStopNote(e.target.value)}
                      placeholder="What did you work on?"
                      className="w-48 px-3 py-1 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleStop()
                        if (e.key === 'Escape') { setShowNote(false); setStopNote('') }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setShowNote(true)}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      + Note
                    </button>
                  )}
                  <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="px-4 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-lg transition-colors"
                  >
                    {stopping ? 'Stopping...' : 'Stop'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Idle — project + category selection + start */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-500 shrink-0">Timer</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px]"
                  >
                    <option value="">Select project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[160px]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!selectedProjectId || !selectedCategoryId || starting}
                  className="px-4 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors shrink-0"
                >
                  {starting ? 'Starting...' : 'Start'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
