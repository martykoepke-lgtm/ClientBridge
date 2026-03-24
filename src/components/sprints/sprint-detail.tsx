'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sprint, ProjectPhase, SprintDeliverable, SprintBlocker, TimeSession, Feedback } from '@/lib/types'

interface SprintDetailProps {
  sprint: Sprint
  phase?: ProjectPhase
  deliverables: SprintDeliverable[]
  blockers: SprintBlocker[]
  hours: number
  feedbackCount: number
  projectId: string
  onBack: () => void
}

export default function SprintDetail({ sprint, phase, deliverables: initialDeliverables, blockers: initialBlockers, hours, feedbackCount, projectId, onBack }: SprintDetailProps) {
  const supabase = createClient()
  const [deliverables, setDeliverables] = useState(initialDeliverables)
  const [blockers, setBlockers] = useState(initialBlockers)
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([])
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([])
  const [editingPlan, setEditingPlan] = useState(false)
  const [planText, setPlanText] = useState(sprint.sprint_plan || '')
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryText, setSummaryText] = useState(sprint.sprint_summary || '')
  const [sprintStatus, setSprintStatus] = useState(sprint.status)
  const [newDeliverable, setNewDeliverable] = useState('')
  const [newBlocker, setNewBlocker] = useState('')
  const [newBlockerOwner, setNewBlockerOwner] = useState<'developer' | 'client'>('developer')

  useEffect(() => {
    loadSprintData()
  }, [sprint.id])

  async function loadSprintData() {
    const [timeRes, fbRes] = await Promise.all([
      supabase
        .from('time_sessions')
        .select('*')
        .eq('project_id', projectId)
        .gte('start_time', sprint.start_date)
        .lte('start_time', sprint.end_date + 'T23:59:59')
        .not('duration_minutes', 'is', null)
        .order('start_time', { ascending: true }),
      supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', sprint.start_date)
        .lte('created_at', sprint.end_date + 'T23:59:59')
        .order('created_at', { ascending: false }),
    ])
    if (timeRes.data) setTimeSessions(timeRes.data)
    if (fbRes.data) setFeedbackItems(fbRes.data)
  }

  async function updateSprintStatus(status: 'planned' | 'active' | 'completed') {
    await supabase.from('sprints').update({ status }).eq('id', sprint.id)
    setSprintStatus(status)
  }

  async function savePlan() {
    await supabase.from('sprints').update({ sprint_plan: planText }).eq('id', sprint.id)
    setEditingPlan(false)
  }

  async function saveSummary() {
    await supabase.from('sprints').update({ sprint_summary: summaryText }).eq('id', sprint.id)
    setEditingSummary(false)
  }

  async function addDeliverable() {
    if (!newDeliverable.trim()) return
    const { data } = await supabase.from('sprint_deliverables').insert({
      sprint_id: sprint.id,
      label: newDeliverable.trim(),
      sort_order: deliverables.length,
    }).select().single()
    if (data) setDeliverables([...deliverables, data])
    setNewDeliverable('')
  }

  async function toggleDeliverable(d: SprintDeliverable) {
    const nextStatus = d.status === 'done' ? 'todo' : d.status === 'todo' ? 'in_progress' : 'done'
    await supabase.from('sprint_deliverables').update({ status: nextStatus }).eq('id', d.id)
    setDeliverables(deliverables.map(x => x.id === d.id ? { ...x, status: nextStatus } : x))
  }

  async function addBlocker() {
    if (!newBlocker.trim()) return
    const { data } = await supabase.from('sprint_blockers').insert({
      sprint_id: sprint.id,
      description: newBlocker.trim(),
      owner: newBlockerOwner,
    }).select().single()
    if (data) setBlockers([...blockers, data])
    setNewBlocker('')
  }

  async function resolveBlocker(blockerId: string) {
    await supabase.from('sprint_blockers').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', blockerId)
    setBlockers(blockers.map(b => b.id === blockerId ? { ...b, status: 'resolved', resolved_at: new Date().toISOString() } : b))
  }

  const doneCount = deliverables.filter(d => d.status === 'done').length
  const totalHours = timeSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60
  const activeBlockers = blockers.filter(b => b.status === 'active')
  const daysRemaining = Math.max(0, Math.ceil((new Date(sprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const progress = deliverables.length > 0 ? Math.round((doneCount / deliverables.length) * 100) : sprint.progress_percent

  const statusColors = {
    submitted: 'text-blue-400', reviewed: 'text-gray-400', in_progress: 'text-amber-400',
    change_made: 'text-purple-400', approved: 'text-green-400', needs_revision: 'text-orange-400',
    resolved: 'text-green-400', deferred: 'text-gray-500', dismissed: 'text-gray-500',
  }

  const typeColors = {
    bug: 'bg-[rgba(239,68,68,0.1)] text-red-400',
    ux: 'bg-[rgba(245,158,11,0.1)] text-amber-400',
    feature_request: 'bg-[rgba(34,197,94,0.1)] text-green-400',
    content: 'bg-[rgba(139,92,246,0.1)] text-purple-400',
    general: 'bg-gray-800 text-gray-400',
  }

  return (
    <div>
      {/* Back link */}
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-[#F59E0B] mb-4 flex items-center gap-1 transition-colors">
        &larr; Back to Sprint Board
      </button>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">Sprint {sprint.sprint_number}: {sprint.title}</h2>
          <div className="flex items-center gap-2">
            <select
              value={sprintStatus}
              onChange={e => updateSprintStatus(e.target.value as 'planned' | 'active' | 'completed')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
          {phase && (
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
              {phase.name}
            </span>
          )}
          <span>{new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {sprintStatus === 'active' && <span className="text-[#F59E0B]">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>}
        </div>
        <div className="max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-semibold text-white">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${sprintStatus === 'completed' ? 'bg-green-500' : 'bg-[#F59E0B]'}`} style={{ width: `${sprintStatus === 'completed' ? 100 : progress}%` }} />
          </div>
        </div>
      </div>

      {/* Plan / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Sprint Plan</h4>
          {editingPlan ? (
            <div>
              <textarea value={planText} onChange={e => setPlanText(e.target.value)} rows={6} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-600 resize-none" placeholder="Describe the sprint goal, key decisions, and dependencies..." />
              <div className="flex gap-2 mt-2">
                <button onClick={savePlan} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B]">Save</button>
                <button onClick={() => { setEditingPlan(false); setPlanText(sprint.sprint_plan || '') }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              {planText ? (
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{planText}</div>
              ) : (
                <div className="text-sm text-gray-600 italic">No plan written yet.</div>
              )}
              <button onClick={() => setEditingPlan(true)} className="mt-3 text-xs text-gray-500 hover:text-[#F59E0B] transition-colors">Edit Plan</button>
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Sprint Summary</h4>
          {editingSummary ? (
            <div>
              <textarea value={summaryText} onChange={e => setSummaryText(e.target.value)} rows={6} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-600 resize-none" placeholder="What was delivered, what was deferred, lessons learned..." />
              <div className="flex gap-2 mt-2">
                <button onClick={saveSummary} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B]">Save</button>
                <button onClick={() => { setEditingSummary(false); setSummaryText(sprint.sprint_summary || '') }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              {summaryText ? (
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{summaryText}</div>
              ) : (
                <div className="text-sm text-gray-600 italic">Summary is written at the end of each sprint.</div>
              )}
              <button onClick={() => setEditingSummary(true)} className="mt-3 text-xs text-gray-500 hover:text-[#F59E0B] transition-colors">Edit Summary</button>
            </div>
          )}
        </div>
      </div>

      {/* Deliverables */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white">Deliverables</h4>
          <span className="text-sm text-gray-500">{doneCount} / {deliverables.length} complete</span>
        </div>
        {deliverables.map(d => (
          <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-gray-800/50 last:border-0">
            <button
              onClick={() => toggleDeliverable(d)}
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px] border-2 transition-colors ${
                d.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              {d.status === 'done' && '\u2713'}
            </button>
            <span className={`flex-1 text-sm ${d.status === 'done' ? 'line-through text-gray-500' : 'text-gray-200'}`}>{d.label}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              d.status === 'done' ? 'bg-[rgba(34,197,94,0.1)] text-green-400'
                : d.status === 'in_progress' ? 'bg-[rgba(245,158,11,0.1)] text-amber-400'
                : 'bg-gray-800 text-gray-500'
            }`}>
              {d.status === 'done' ? 'done' : d.status === 'in_progress' ? 'in progress' : 'todo'}
            </span>
          </div>
        ))}
        <div className="flex gap-2 mt-3">
          <input value={newDeliverable} onChange={e => setNewDeliverable(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDeliverable()} placeholder="Add a deliverable..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
          <button onClick={addDeliverable} className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600">Add</button>
        </div>
      </div>

      {/* Time Logged */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white">Time Logged This Sprint</h4>
          <span className="text-sm font-semibold text-white">{totalHours.toFixed(1)} hrs</span>
        </div>
        {timeSessions.length === 0 ? (
          <p className="text-sm text-gray-600 italic">No time logged during this sprint window.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Day</th>
                <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Category</th>
                <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Duration</th>
                <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {timeSessions.map(s => (
                <tr key={s.id} className="border-b border-gray-800/50">
                  <td className="py-2 px-3 text-gray-300">{new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="py-2 px-3 text-gray-400">{s.category_name}</td>
                  <td className="py-2 px-3 text-gray-300">{((s.duration_minutes || 0) / 60).toFixed(1)}h</td>
                  <td className="py-2 px-3 text-gray-500 truncate max-w-[200px]">{s.description || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700">
                <td colSpan={2} className="py-2 px-3 font-semibold text-white">Sprint total: {totalHours.toFixed(1)}h</td>
                <td colSpan={2} className="py-2 px-3 text-gray-400">Daily avg: {timeSessions.length > 0 ? (totalHours / new Set(timeSessions.map(s => new Date(s.start_time).toDateString())).size).toFixed(1) : '0'}h</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Feedback */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white">Feedback Received</h4>
          <span className="text-sm text-gray-500">{feedbackItems.length} item{feedbackItems.length !== 1 ? 's' : ''}</span>
        </div>
        {feedbackItems.length === 0 ? (
          <p className="text-sm text-gray-600 italic">No feedback received during this sprint window.</p>
        ) : (
          feedbackItems.map(fb => (
            <div key={fb.id} className="flex items-center gap-3 py-3 border-b border-gray-800/50 last:border-0">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${typeColors[fb.feedback_type] || typeColors.general}`}>
                {fb.feedback_type === 'feature_request' ? 'Feature' : fb.feedback_type}
              </span>
              <span className="flex-1 text-sm text-gray-300 truncate">&ldquo;{fb.title}&rdquo;</span>
              <span className={`text-[11px] font-semibold ${statusColors[fb.status] || 'text-gray-500'}`}>
                {fb.status.replace('_', ' ')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Blockers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white">Blockers</h4>
          {activeBlockers.length > 0 && <span className="text-sm text-red-400">{activeBlockers.length} active</span>}
        </div>
        {blockers.length === 0 && (
          <p className="text-sm text-gray-600 italic">No blockers.</p>
        )}
        {blockers.filter(b => b.status === 'active').map(b => (
          <div key={b.id} className="p-4 bg-[rgba(239,68,68,0.05)] border border-red-500/30 rounded-lg mb-2">
            <div className="text-[11px] font-bold uppercase text-red-400 mb-1">Active Blocker</div>
            <div className="text-sm text-gray-200 mb-2">{b.description}</div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Raised: {new Date(b.raised_at).toLocaleDateString()} &middot; Owner: {b.owner}</span>
              <button onClick={() => resolveBlocker(b.id)} className="text-xs text-gray-400 hover:text-green-400 transition-colors">Mark Resolved</button>
            </div>
          </div>
        ))}
        {blockers.filter(b => b.status === 'resolved').map(b => (
          <div key={b.id} className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg mb-2 opacity-60">
            <div className="text-[11px] font-bold uppercase text-gray-500 mb-1">Resolved</div>
            <div className="text-sm text-gray-400">{b.description}</div>
            <span className="text-[11px] text-gray-600">Resolved: {b.resolved_at ? new Date(b.resolved_at).toLocaleDateString() : '—'}</span>
          </div>
        ))}
        <div className="flex gap-2 mt-3">
          <input value={newBlocker} onChange={e => setNewBlocker(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBlocker()} placeholder="Describe the blocker..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
          <select value={newBlockerOwner} onChange={e => setNewBlockerOwner(e.target.value as 'developer' | 'client')} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none">
            <option value="developer">Dev</option>
            <option value="client">Client</option>
          </select>
          <button onClick={addBlocker} className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600">Add</button>
        </div>
      </div>

      {/* Demo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h4 className="font-bold text-white mb-3">Demo</h4>
        {sprint.demo_date ? (
          <div>
            <div className="text-sm font-semibold text-white">{new Date(sprint.demo_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(sprint.demo_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            <div className="text-sm text-gray-400 mt-1">30 minutes &middot; Status: <span className={sprint.demo_status === 'completed' ? 'text-green-400' : sprint.demo_status === 'scheduled' ? 'text-amber-400' : 'text-gray-500'}>{sprint.demo_status.replace('_', ' ')}</span></div>
            {sprint.demo_notes && <div className="text-sm text-gray-500 mt-2 italic">&ldquo;{sprint.demo_notes}&rdquo;</div>}
          </div>
        ) : (
          <p className="text-sm text-gray-600 italic">No demo scheduled for this sprint.</p>
        )}
      </div>
    </div>
  )
}
