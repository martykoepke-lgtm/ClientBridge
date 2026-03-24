'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sprint, ProjectPhase, SprintDeliverable, SprintBlocker, Milestone } from '@/lib/types'
import SprintDetail from '@/components/sprints/sprint-detail'

export default function SprintsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [phases, setPhases] = useState<ProjectPhase[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [deliverables, setDeliverables] = useState<SprintDeliverable[]>([])
  const [blockers, setBlockers] = useState<SprintBlocker[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)

  // Phase creation
  const [showAddPhase, setShowAddPhase] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [newPhaseColor, setNewPhaseColor] = useState('#3B82F6')

  // Sprint creation
  const [showAddSprint, setShowAddSprint] = useState(false)
  const [newSprintTitle, setNewSprintTitle] = useState('')
  const [newSprintDesc, setNewSprintDesc] = useState('')
  const [newSprintPhase, setNewSprintPhase] = useState('')
  const [newSprintStart, setNewSprintStart] = useState('')
  const [newSprintEnd, setNewSprintEnd] = useState('')

  // Time/feedback stats per sprint
  const [sprintHours, setSprintHours] = useState<Record<string, number>>({})
  const [sprintFeedbackCounts, setSprintFeedbackCounts] = useState<Record<string, number>>({})

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [phasesRes, sprintsRes, deliverablesRes, blockersRes] = await Promise.all([
      supabase.from('project_phases').select('*').eq('project_id', id).order('phase_number'),
      supabase.from('sprints').select('*').eq('project_id', id).order('sprint_number'),
      supabase.from('sprint_deliverables').select('*').in('sprint_id',
        (await supabase.from('sprints').select('id').eq('project_id', id)).data?.map(s => s.id) || []
      ).order('sort_order'),
      supabase.from('sprint_blockers').select('*').in('sprint_id',
        (await supabase.from('sprints').select('id').eq('project_id', id)).data?.map(s => s.id) || []
      ),
    ])

    if (phasesRes.data) setPhases(phasesRes.data)
    if (sprintsRes.data) setSprints(sprintsRes.data)
    if (deliverablesRes.data) setDeliverables(deliverablesRes.data)
    if (blockersRes.data) setBlockers(blockersRes.data)

    // Load milestones for linking
    const contractRes = await supabase.from('contracts').select('id').eq('project_id', id).order('created_at', { ascending: false }).limit(1).single()
    if (contractRes.data) {
      const msRes = await supabase.from('milestones').select('*').eq('contract_id', contractRes.data.id).order('sort_order')
      if (msRes.data) setMilestones(msRes.data)
    }

    // Load time and feedback stats per sprint
    if (sprintsRes.data && sprintsRes.data.length > 0) {
      const hours: Record<string, number> = {}
      const fbCounts: Record<string, number> = {}

      for (const sprint of sprintsRes.data) {
        const timeRes = await supabase
          .from('time_sessions')
          .select('duration_minutes')
          .eq('project_id', id)
          .gte('start_time', sprint.start_date)
          .lte('start_time', sprint.end_date + 'T23:59:59')
          .not('duration_minutes', 'is', null)
        hours[sprint.id] = (timeRes.data || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60

        const fbRes = await supabase
          .from('feedback')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', id)
          .gte('created_at', sprint.start_date)
          .lte('created_at', sprint.end_date + 'T23:59:59')
        fbCounts[sprint.id] = fbRes.count || 0
      }

      setSprintHours(hours)
      setSprintFeedbackCounts(fbCounts)
    }

    setLoading(false)
  }

  const [phaseError, setPhaseError] = useState<string | null>(null)

  async function createPhase() {
    setPhaseError(null)
    if (!newPhaseName.trim()) { setPhaseError('Name is required'); return }

    const { error } = await supabase.from('project_phases').insert({
      project_id: id,
      name: newPhaseName.trim(),
      color: newPhaseColor,
      phase_number: phases.length + 1,
    })

    if (error) {
      setPhaseError(error.message)
      return
    }

    setNewPhaseName('')
    setShowAddPhase(false)
    loadData()
  }

  const [sprintError, setSprintError] = useState<string | null>(null)

  async function createSprint() {
    setSprintError(null)
    if (!newSprintTitle.trim()) { setSprintError('Title is required'); return }
    if (!newSprintStart) { setSprintError('Start date is required'); return }
    if (!newSprintEnd) { setSprintError('End date is required'); return }

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) { setSprintError('Not authenticated'); return }

    const { error } = await supabase.from('sprints').insert({
      project_id: id,
      developer_id: user.user.id,
      phase_id: newSprintPhase || null,
      sprint_number: sprints.length + 1,
      title: newSprintTitle.trim(),
      description: newSprintDesc.trim() || null,
      start_date: newSprintStart,
      end_date: newSprintEnd,
    })

    if (error) {
      setSprintError(error.message)
      return
    }

    setNewSprintTitle('')
    setNewSprintDesc('')
    setNewSprintPhase('')
    setNewSprintStart('')
    setNewSprintEnd('')
    setShowAddSprint(false)
    loadData()
  }

  const activeSprint = sprints.find(s => s.status === 'active')
  const selectedSprint = sprints.find(s => s.id === selectedSprintId)

  // If a sprint is selected, show detail view
  if (selectedSprint) {
    return (
      <SprintDetail
        sprint={selectedSprint}
        phase={phases.find(p => p.id === selectedSprint.phase_id)}
        deliverables={deliverables.filter(d => d.sprint_id === selectedSprint.id)}
        blockers={blockers.filter(b => b.sprint_id === selectedSprint.id)}
        hours={sprintHours[selectedSprint.id] || 0}
        feedbackCount={sprintFeedbackCounts[selectedSprint.id] || 0}
        projectId={id}
        onBack={() => { setSelectedSprintId(null); loadData() }}
      />
    )
  }

  if (loading) {
    return <div className="text-gray-500 text-sm py-12 text-center">Loading sprints...</div>
  }

  // Group sprints by phase
  const sprintsByPhase: Record<string, Sprint[]> = {}
  const unphased: Sprint[] = []
  for (const sprint of sprints) {
    if (sprint.phase_id) {
      if (!sprintsByPhase[sprint.phase_id]) sprintsByPhase[sprint.phase_id] = []
      sprintsByPhase[sprint.phase_id].push(sprint)
    } else {
      unphased.push(sprint)
    }
  }

  const phaseColors = ['#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#22C55E', '#EC4899']

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Sprints</h2>
          <p className="text-sm text-gray-500 mt-1">
            {sprints.length} sprint{sprints.length !== 1 ? 's' : ''} across {phases.length} phase{phases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddPhase(!showAddPhase)} className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
            + Phase
          </button>
          <button onClick={() => setShowAddSprint(!showAddSprint)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] transition-colors">
            + New Sprint
          </button>
        </div>
      </div>

      {/* Add Phase Form */}
      {showAddPhase && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">New Phase</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Name</label>
              <input value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)} placeholder="e.g. Foundation" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Color</label>
              <div className="flex gap-1">
                {phaseColors.map(c => (
                  <button key={c} onClick={() => setNewPhaseColor(c)} className="w-7 h-7 rounded-md border-2 transition-colors" style={{ backgroundColor: c, borderColor: newPhaseColor === c ? '#fff' : 'transparent' }} />
                ))}
              </div>
            </div>
            <button onClick={createPhase} className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B]">Create</button>
            <button onClick={() => setShowAddPhase(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-300">Cancel</button>
            {phaseError && <span className="text-red-400 text-sm ml-2">{phaseError}</span>}
          </div>
        </div>
      )}

      {/* Add Sprint Form */}
      {showAddSprint && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">New Sprint</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Title</label>
              <input value={newSprintTitle} onChange={e => setNewSprintTitle(e.target.value)} placeholder="e.g. Setup + Database Design" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phase</label>
              <select value={newSprintPhase} onChange={e => setNewSprintPhase(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-600">
                <option value="">No phase</option>
                {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <input value={newSprintDesc} onChange={e => setNewSprintDesc(e.target.value)} placeholder="What this sprint covers..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Start Date</label>
              <input type="date" value={newSprintStart} onChange={e => setNewSprintStart(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">End Date</label>
              <input type="date" value={newSprintEnd} onChange={e => setNewSprintEnd(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-600" />
            </div>
          </div>
          {sprintError && <div className="text-red-400 text-sm mb-2">{sprintError}</div>}
          <div className="flex gap-2">
            <button onClick={createSprint} className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B]">Create Sprint</button>
            <button onClick={() => setShowAddSprint(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Phase Bar */}
      {phases.length > 0 && (
        <div className="flex gap-[2px] rounded-lg overflow-hidden mb-7">
          {phases.map(phase => {
            const phaseSprintCount = sprintsByPhase[phase.id]?.length || 0
            return (
              <div key={phase.id} className="py-2 px-4 text-[11px] font-semibold text-white text-center cursor-default" style={{ backgroundColor: phase.color, flex: Math.max(phaseSprintCount, 1) }}>
                {phase.name}
              </div>
            )
          })}
        </div>
      )}

      {/* Sprint Cards by Phase */}
      {phases.length === 0 && sprints.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-2">No sprints yet</p>
          <p className="text-gray-600 text-xs">Start by creating a phase, then add sprints to it.</p>
        </div>
      )}

      {phases.map(phase => {
        const phaseSprints = sprintsByPhase[phase.id] || []
        if (phaseSprints.length === 0 && sprints.length > 0) return null
        return (
          <div key={phase.id} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
              <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-gray-500">{phase.name}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {phaseSprints.map(sprint => (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  phase={phase}
                  deliverables={deliverables.filter(d => d.sprint_id === sprint.id)}
                  blockers={blockers.filter(b => b.sprint_id === sprint.id)}
                  hours={sprintHours[sprint.id] || 0}
                  feedbackCount={sprintFeedbackCounts[sprint.id] || 0}
                  milestone={milestones.find(m => m.id === sprint.milestone_id)}
                  onClick={() => setSelectedSprintId(sprint.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Unphased sprints */}
      {unphased.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-gray-600" />
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-gray-500">No Phase Assigned</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unphased.map(sprint => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                deliverables={deliverables.filter(d => d.sprint_id === sprint.id)}
                blockers={blockers.filter(b => b.sprint_id === sprint.id)}
                hours={sprintHours[sprint.id] || 0}
                feedbackCount={sprintFeedbackCounts[sprint.id] || 0}
                onClick={() => setSelectedSprintId(sprint.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Sprint Strip */}
      {activeSprint && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 flex items-center justify-between text-sm mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="font-semibold text-white">Sprint {activeSprint.sprint_number} Active</span>
          </div>
          <span className="text-gray-400">{(sprintHours[activeSprint.id] || 0).toFixed(1)}h logged</span>
          <span className="text-gray-400">{sprintFeedbackCounts[activeSprint.id] || 0} feedback</span>
          <span className="text-gray-400">
            {blockers.filter(b => b.sprint_id === activeSprint.id && b.status === 'active').length > 0
              ? <span className="text-red-400">{blockers.filter(b => b.sprint_id === activeSprint.id && b.status === 'active').length} blocker{blockers.filter(b => b.sprint_id === activeSprint.id && b.status === 'active').length !== 1 ? 's' : ''}</span>
              : '0 blockers'
            }
          </span>
          {activeSprint.demo_date && (
            <span className="text-gray-400">Demo: {new Date(activeSprint.demo_date).toLocaleDateString()}</span>
          )}
          <span className="text-gray-500">Sprint {activeSprint.sprint_number} of {sprints.length}</span>
        </div>
      )}
    </div>
  )
}

// ===== Sprint Card Component =====
function SprintCard({ sprint, phase, deliverables, blockers, hours, feedbackCount, milestone, onClick }: {
  sprint: Sprint
  phase?: ProjectPhase
  deliverables: SprintDeliverable[]
  blockers: SprintBlocker[]
  hours: number
  feedbackCount: number
  milestone?: Milestone
  onClick: () => void
}) {
  const activeBlockers = blockers.filter(b => b.status === 'active').length
  const doneCount = deliverables.filter(d => d.status === 'done').length
  const totalCount = deliverables.length
  const progress = sprint.progress_percent || (totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0)

  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border rounded-xl p-5 cursor-pointer transition-all hover:bg-[#1f1f23] hover:border-gray-600 relative ${
        sprint.status === 'active'
          ? 'border-[#F59E0B] shadow-[0_0_0_1px_#F59E0B,0_4px_12px_rgba(245,158,11,0.15)]'
          : sprint.status === 'completed'
          ? 'border-gray-800 opacity-85'
          : 'border-gray-800 opacity-55 hover:opacity-75'
      }`}
    >
      {milestone && (
        <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(245,158,11,0.1)] text-[#F59E0B] font-mono">
          ${milestone.amount.toLocaleString()}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-semibold text-gray-500">Sprint {sprint.sprint_number}</span>
        <span className="text-[11px] text-gray-600">
          {new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="font-bold text-[15px] text-white mb-1">{sprint.title}</div>
      {sprint.description && (
        <div className="text-xs text-gray-500 mb-3 line-clamp-2">{sprint.description}</div>
      )}

      {(sprint.status === 'active' || sprint.status === 'completed') && (
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all ${sprint.status === 'completed' ? 'bg-green-500' : 'bg-[#F59E0B]'}`}
            style={{ width: `${sprint.status === 'completed' ? 100 : progress}%` }}
          />
        </div>
      )}

      {(sprint.status === 'active' || sprint.status === 'completed') && (
        <div className="flex gap-4 text-[11px] text-gray-500 mb-3">
          <span>{hours.toFixed(1)}h logged</span>
          <span>{feedbackCount} feedback</span>
          {activeBlockers > 0 && <span className="text-red-400">{activeBlockers} blocker{activeBlockers !== 1 ? 's' : ''}</span>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
          sprint.status === 'completed' ? 'bg-[rgba(34,197,94,0.1)] text-green-400'
            : sprint.status === 'active' ? 'bg-[rgba(245,158,11,0.1)] text-[#FBBF24]'
            : 'bg-gray-800 text-gray-500'
        }`}>
          {sprint.status === 'completed' ? 'Completed' : sprint.status === 'active' ? 'Active' : 'Planned'}
        </span>
        {sprint.status !== 'planned' && (
          <span className="text-[11px] text-gray-600 ml-auto">
            {totalCount > 0 ? `${doneCount}/${totalCount}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
