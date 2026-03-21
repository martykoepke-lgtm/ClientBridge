import { useState, useEffect } from 'react'
import type { Milestone, ScopeItem } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  milestones: Milestone[]
  scopeItems: ScopeItem[]
  contractId: string
  onChange: () => void // reload callback
}

export default function MilestoneList({ milestones, scopeItems, contractId, onChange }: Props) {
  const supabase = createClient()
  // Local state so typing doesn't trigger DB writes
  const [local, setLocal] = useState<Milestone[]>(milestones)

  useEffect(() => { setLocal(milestones) }, [milestones])

  function updateLocal(id: string, updates: Partial<Milestone>) {
    setLocal(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  async function saveMilestone(id: string) {
    const m = local.find(ms => ms.id === id)
    if (!m) return
    await supabase.from('milestones').update({
      title: m.title,
      description: m.description,
      amount: m.amount,
      due_date: m.due_date,
    }).eq('id', id)
  }

  async function addMilestone() {
    await supabase.from('milestones').insert({
      contract_id: contractId,
      title: '',
      amount: 0,
      sort_order: local.length,
    })
    onChange()
  }

  async function deleteMilestone(id: string) {
    await supabase.from('scope_items').update({ milestone_id: null }).eq('milestone_id', id)
    await supabase.from('milestones').delete().eq('id', id)
    onChange()
  }

  async function markStatus(id: string, status: 'invoiced' | 'paid') {
    const updates: Partial<Milestone> = { status }
    if (status === 'paid') updates.paid_at = new Date().toISOString()
    await supabase.from('milestones').update(updates).eq('id', id)
    onChange()
  }

  const total = local.reduce((sum, m) => sum + (m.amount || 0), 0)
  const paidTotal = local.filter(m => m.status === 'paid').reduce((sum, m) => sum + (m.amount || 0), 0)

  return (
    <div>
      {/* Summary */}
      {local.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500">Total Value</div>
            <div className="text-lg font-semibold text-white">${total.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500">Paid</div>
            <div className="text-lg font-semibold text-green-400">${paidTotal.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500">Remaining</div>
            <div className="text-lg font-semibold text-amber-400">${(total - paidTotal).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Milestone cards */}
      <div className="space-y-3">
        {local.map((m, i) => {
          const assignedScope = scopeItems.filter(s => s.milestone_id === m.id && s.in_scope)
          const completedScope = assignedScope.filter(s => s.is_complete).length
          return (
            <div key={m.id} className="border border-gray-800 rounded-lg p-4 bg-gray-800/50">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-xs font-semibold text-gray-400 flex-shrink-0 mt-1">
                  {i + 1}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px] gap-3">
                    <input
                      type="text"
                      value={m.title}
                      onChange={(e) => updateLocal(m.id, { title: e.target.value })}
                      onBlur={() => saveMilestone(m.id)}
                      placeholder="e.g. Signed agreement + project kickoff"
                      className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        value={m.amount || ''}
                        onChange={(e) => updateLocal(m.id, { amount: parseFloat(e.target.value) || 0 })}
                        onBlur={() => saveMilestone(m.id)}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="date"
                      value={m.due_date ?? ''}
                      onChange={(e) => { updateLocal(m.id, { due_date: e.target.value || null }); }}
                      onBlur={() => saveMilestone(m.id)}
                      className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <textarea
                    value={m.description ?? ''}
                    onChange={(e) => updateLocal(m.id, { description: e.target.value || null })}
                    onBlur={() => saveMilestone(m.id)}
                    placeholder="Deliverable details..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical"
                  />

                  {assignedScope.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(completedScope / assignedScope.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{completedScope}/{assignedScope.length} scope items</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.status === 'paid' ? 'bg-green-900/50 text-green-300' :
                      m.status === 'invoiced' ? 'bg-blue-900/50 text-blue-300' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {m.status}
                    </span>
                    {m.status === 'pending' && (
                      <button
                        onClick={() => markStatus(m.id, 'invoiced')}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Mark Invoiced
                      </button>
                    )}
                    {m.status === 'invoiced' && (
                      <button
                        onClick={() => markStatus(m.id, 'paid')}
                        className="text-xs text-green-400 hover:text-green-300"
                      >
                        Mark Paid
                      </button>
                    )}
                    {m.status !== 'paid' && m.amount > 0 && (
                      <a
                        href={`/api/invoice?milestoneId=${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Generate Invoice
                      </a>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => deleteMilestone(m.id)}
                      className="text-xs text-gray-600 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={addMilestone}
        className="mt-3 px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
      >
        + Add Milestone
      </button>

      {local.length > 0 && (
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-800">
          <span className="text-sm text-gray-500">Total milestone value</span>
          <span className="text-lg font-semibold text-white">${total.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
