'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sprint, ProjectPhase, SprintDeliverable, SprintBlocker, Milestone } from '@/lib/types'

interface PortalSprintViewProps {
  sprints: Sprint[]
  phases: ProjectPhase[]
  deliverables: SprintDeliverable[]
  blockers: SprintBlocker[]
  milestones: Milestone[]
  projectId: string
}

export default function PortalSprintView({ sprints, phases, deliverables, blockers, milestones, projectId }: PortalSprintViewProps) {
  const supabase = createClient()
  const activeSprint = sprints.find(s => s.status === 'active')
  const activeBlockers = activeSprint ? blockers.filter(b => b.sprint_id === activeSprint.id && b.status === 'active' && b.owner === 'client') : []
  const activeDeliverables = activeSprint ? deliverables.filter(d => d.sprint_id === activeSprint.id) : []
  const doneCount = activeDeliverables.filter(d => d.status === 'done').length
  const progress = activeDeliverables.length > 0 ? Math.round((doneCount / activeDeliverables.length) * 100) : (activeSprint?.progress_percent || 0)

  async function markBlockerSent(blockerId: string) {
    await supabase.from('sprint_blockers').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', blockerId)
    // Optimistic update — parent will refresh on next load
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

  return (
    <div className="space-y-6">
      {/* Current Sprint Hero */}
      {activeSprint && (
        <div className="bg-gray-900 border-2 border-[#F59E0B] rounded-xl p-6 shadow-[0_0_0_1px_#F59E0B,0_4px_16px_rgba(245,158,11,0.1)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">{activeSprint.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                {phases.find(p => p.id === activeSprint.phase_id) && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: phases.find(p => p.id === activeSprint.phase_id)!.color }} />
                    {phases.find(p => p.id === activeSprint.phase_id)!.name}
                  </span>
                )}
                <span>&middot;</span>
                <span>{new Date(activeSprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {new Date(activeSprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(245,158,11,0.1)] text-[#FBBF24]">Active</span>
          </div>

          {/* Progress */}
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="text-white font-semibold">{doneCount} of {activeDeliverables.length} deliverables &middot; {progress}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* What's being built */}
          {activeSprint.description && (
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">What&apos;s being built this sprint:</h4>
              <p className="text-sm text-gray-300">{activeSprint.description}</p>
            </div>
          )}

          {/* Deliverables list */}
          {activeDeliverables.length > 0 && (
            <div className="mb-5">
              <div className="space-y-1">
                {activeDeliverables.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 ${
                      d.status === 'done' ? 'bg-green-500 text-white' : 'border border-gray-600'
                    }`}>
                      {d.status === 'done' && '\u2713'}
                    </span>
                    <span className={d.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-300'}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Demo */}
          {activeSprint.demo_date && (
            <div className="bg-gray-800/60 rounded-lg px-4 py-3 mb-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Next Demo</div>
              <div className="text-sm font-semibold text-white">
                {new Date(activeSprint.demo_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {new Date(activeSprint.demo_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
              {activeSprint.demo_notes && <div className="text-xs text-gray-500 mt-1">{activeSprint.demo_notes}</div>}
            </div>
          )}

          {/* Action Needed */}
          {activeBlockers.length > 0 && (
            <div className="bg-[rgba(245,158,11,0.08)] border border-[#F59E0B]/30 rounded-lg p-4 mb-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#FBBF24] mb-2">Action Needed From You &middot; {activeBlockers.length} item{activeBlockers.length !== 1 ? 's' : ''}</div>
              {activeBlockers.map(b => (
                <div key={b.id} className="mb-3 last:mb-0">
                  <p className="text-sm text-gray-200 mb-2">{b.description}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => markBlockerSent(b.id)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] transition-colors">I&apos;ve Sent This</button>
                    <span className="text-[11px] text-gray-500">Raised {new Date(b.raised_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sprint Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Sprint Timeline</h3>

        {phases.map(phase => {
          const phaseSprints = sprintsByPhase[phase.id] || []
          if (phaseSprints.length === 0) return null
          const isCurrentPhase = phaseSprints.some(s => s.status === 'active')

          return (
            <div key={phase.id} className="mb-5 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
                <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-gray-500">{phase.name}</span>
                {isCurrentPhase && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(245,158,11,0.1)] text-[#FBBF24]">Current</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {phaseSprints.map(sprint => {
                  const sprintDeliverables = deliverables.filter(d => d.sprint_id === sprint.id)
                  const sprintDone = sprintDeliverables.filter(d => d.status === 'done').length
                  const sprintProgress = sprintDeliverables.length > 0 ? Math.round((sprintDone / sprintDeliverables.length) * 100) : sprint.progress_percent

                  return (
                    <div key={sprint.id} className={`bg-gray-900 border rounded-xl p-4 ${
                      sprint.status === 'active' ? 'border-[#F59E0B] shadow-[0_0_0_1px_#F59E0B]' :
                      sprint.status === 'completed' ? 'border-gray-800 opacity-80' :
                      'border-gray-800 opacity-50'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-white">{sprint.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          sprint.status === 'completed' ? 'bg-[rgba(34,197,94,0.1)] text-green-400' :
                          sprint.status === 'active' ? 'bg-[rgba(245,158,11,0.1)] text-[#FBBF24]' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          {sprint.status === 'completed' ? 'Completed' : sprint.status === 'active' ? `Active \u00b7 ${sprintProgress}%` : 'Upcoming'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        Sprint {sprint.sprint_number} &middot; {new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {sprint.status === 'completed' && sprint.sprint_summary && (
                        <p className="text-xs text-gray-500 mt-1">{sprint.sprint_summary}</p>
                      )}
                      {sprint.status === 'active' && (
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${sprintProgress}%` }} />
                        </div>
                      )}
                      {sprint.status === 'completed' && (
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Payment Milestones */}
      {milestones.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Payment Milestones</h3>
          {milestones.map(m => (
            <div key={m.id} className="flex items-center gap-4 py-3 border-b border-gray-800/50 last:border-0">
              <span className="flex-1 text-sm text-gray-300">{m.title || 'Untitled'}</span>
              <span className="font-mono text-sm font-semibold text-white">${(m.amount || 0).toLocaleString()}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                m.status === 'paid' ? 'bg-[rgba(34,197,94,0.1)] text-green-400' :
                m.status === 'achieved' || m.status === 'invoiced' ? 'bg-[rgba(245,158,11,0.1)] text-[#FBBF24]' :
                'bg-gray-800 text-gray-500'
              }`}>
                {m.status === 'paid' ? 'Paid' : m.status === 'invoiced' ? 'Invoiced' : m.status === 'achieved' ? 'Achieved' : 'Upcoming'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
