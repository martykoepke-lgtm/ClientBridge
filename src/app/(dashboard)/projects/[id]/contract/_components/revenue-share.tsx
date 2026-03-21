import { useState, useEffect } from 'react'
import type { RevenueSharePhase, RevenueEntry } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  phases: RevenueSharePhase[]
  entries: RevenueEntry[]
  contractId: string
  onChange: () => void
  globalCap?: number
}

const PHASE_COLORS = [
  { bg: 'bg-blue-900/30', border: 'border-blue-800', text: 'text-blue-300', badge: 'bg-blue-900/50 text-blue-300' },
  { bg: 'bg-teal-900/30', border: 'border-teal-800', text: 'text-teal-300', badge: 'bg-teal-900/50 text-teal-300' },
  { bg: 'bg-purple-900/30', border: 'border-purple-800', text: 'text-purple-300', badge: 'bg-purple-900/50 text-purple-300' },
  { bg: 'bg-amber-900/30', border: 'border-amber-800', text: 'text-amber-300', badge: 'bg-amber-900/50 text-amber-300' },
]

export default function RevenueShare({ phases, entries, contractId, onChange, globalCap }: Props) {
  const supabase = createClient()
  const [revInputs, setRevInputs] = useState<Record<string, string>>({})
  const [localPhases, setLocalPhases] = useState<RevenueSharePhase[]>(phases)

  useEffect(() => { setLocalPhases(phases) }, [phases])

  async function addPhase(ongoing: boolean) {
    await supabase.from('revenue_share_phases').insert({
      contract_id: contractId,
      name: ongoing ? 'Ongoing' : `Phase ${localPhases.length + 1}`,
      percentage: 0,
      is_ongoing: ongoing,
      duration_months: ongoing ? null : 12,
      sort_order: localPhases.length,
    })
    onChange()
  }

  function updatePhaseLocal(id: string, updates: Partial<RevenueSharePhase>) {
    setLocalPhases(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  async function savePhase(id: string) {
    const p = localPhases.find(ph => ph.id === id)
    if (!p) return
    await supabase.from('revenue_share_phases').update({
      name: p.name, percentage: p.percentage, total_cap: p.total_cap,
      monthly_floor: p.monthly_floor, duration_months: p.duration_months,
      start_trigger: p.start_trigger, reporting_method: p.reporting_method,
    }).eq('id', id)
  }

  async function deletePhase(id: string) {
    await supabase.from('revenue_share_phases').delete().eq('id', id)
    onChange()
  }

  async function addRevenueEntry(phaseId: string) {
    const phaseEntries = entries.filter(e => e.phase_id === phaseId)
    const lastEntry = phaseEntries[phaseEntries.length - 1]
    let nextMonth: Date

    if (lastEntry) {
      nextMonth = new Date(lastEntry.month + 'T00:00:00')
      nextMonth.setMonth(nextMonth.getMonth() + 1)
    } else {
      nextMonth = new Date()
      nextMonth.setDate(1)
    }

    const monthStr = nextMonth.toISOString().split('T')[0]
    const clientRev = parseFloat(revInputs[phaseId] || '0') || 0
    const phase = localPhases.find(p => p.id === phaseId)
    const share = clientRev * ((phase?.percentage ?? 0) / 100)

    // Apply floor
    const floor = phase?.monthly_floor ?? 0
    const actualShare = (clientRev > 0 && floor > 0 && share < floor) ? floor : share

    await supabase.from('revenue_entries').insert({
      phase_id: phaseId,
      month: monthStr,
      client_revenue: clientRev,
      developer_share: actualShare,
    })
    setRevInputs({ ...revInputs, [phaseId]: '' })
    onChange()
  }

  async function deleteEntry(id: string) {
    await supabase.from('revenue_entries').delete().eq('id', id)
    onChange()
  }

  // Calculate totals — use global cap from contract, fallback to sum of phase caps
  const totalEarned = entries.reduce((sum, e) => sum + e.developer_share, 0)
  const totalCap = globalCap ?? localPhases.reduce((sum, p) => sum + (p.total_cap ?? 0), 0)
  const capProgress = totalCap > 0 ? Math.min(100, (totalEarned / totalCap) * 100) : 0
  const capMet = totalCap > 0 && totalEarned >= totalCap

  return (
    <div className="space-y-6">
      {/* Cap summary */}
      {(localPhases.length > 0 && entries.length > 0) && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500">Earned to Date</div>
              <div className="text-lg font-semibold text-white">${totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500">Remaining to Cap</div>
              <div className="text-lg font-semibold text-white">
                {totalCap > 0 ? `$${Math.max(0, totalCap - totalEarned).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500">Status</div>
              <div className={`text-lg font-semibold ${capMet ? 'text-green-400' : 'text-amber-400'}`}>
                {capMet ? 'Cap Met' : entries.length > 0 ? 'In Progress' : '—'}
              </div>
            </div>
          </div>
          {totalCap > 0 && (
            <div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${capProgress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>$0</span>
                <span>${totalCap.toLocaleString()} cap</span>
              </div>
            </div>
          )}
          {capMet && (
            <div className="mt-3 px-4 py-2 bg-green-900/30 border border-green-800 rounded-lg text-sm text-green-300">
              Cap reached — this revenue share agreement is complete.
            </div>
          )}
        </div>
      )}

      {/* Phase cards */}
      {localPhases.map((phase, i) => {
        const color = PHASE_COLORS[i % PHASE_COLORS.length]
        const phaseEntries = entries.filter(e => e.phase_id === phase.id)
        const phaseTotal = phaseEntries.reduce((sum, e) => sum + e.developer_share, 0)

        return (
          <div key={phase.id} className={`border ${color.border} rounded-lg p-4 ${color.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.badge}`}>
                  {phase.is_ongoing ? 'Ongoing' : `${phase.duration_months ?? 12} months`}
                </span>
              </div>
              <button onClick={() => deletePhase(phase.id)} className="text-xs text-gray-600 hover:text-red-400">Remove</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <input
                type="text"
                value={phase.name}
                onChange={(e) => updatePhaseLocal(phase.id, { name: e.target.value })}
                onBlur={() => savePhase(phase.id)}
                placeholder="Phase name"
                className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={phase.percentage || ''}
                  onChange={(e) => updatePhaseLocal(phase.id, { percentage: parseFloat(e.target.value) || 0 })}
                  onBlur={() => savePhase(phase.id)}
                  placeholder="Share %"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  value={phase.total_cap ?? ''}
                  onChange={(e) => updatePhaseLocal(phase.id, { total_cap: e.target.value ? parseFloat(e.target.value) : null })}
                  onBlur={() => savePhase(phase.id)}
                  placeholder="Cap"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {!phase.is_ongoing && (
                <input
                  type="number"
                  min="1"
                  value={phase.duration_months ?? ''}
                  onChange={(e) => updatePhaseLocal(phase.id, { duration_months: parseInt(e.target.value) || null })}
                  onBlur={() => savePhase(phase.id)}
                  placeholder="Months"
                  className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={phase.start_trigger ?? ''}
                onChange={(e) => updatePhaseLocal(phase.id, { start_trigger: e.target.value || null })}
                onBlur={() => savePhase(phase.id)}
                placeholder="Start trigger (e.g. First paying subscriber)"
                className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={phase.reporting_method ?? ''}
                onChange={(e) => updatePhaseLocal(phase.id, { reporting_method: e.target.value || null })}
                onBlur={() => savePhase(phase.id)}
                placeholder="Reporting method (e.g. Monthly revenue statement)"
                className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Revenue entries table */}
            {phaseEntries.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-xs text-gray-500 font-semibold pb-2">Month</th>
                      <th className="text-right text-xs text-gray-500 font-semibold pb-2">Client Revenue</th>
                      <th className="text-right text-xs text-gray-500 font-semibold pb-2">Your Share</th>
                      <th className="text-right text-xs text-gray-500 font-semibold pb-2">Cumulative</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseEntries.map((entry, ei) => {
                      const cumulative = phaseEntries.slice(0, ei + 1).reduce((s, e) => s + e.developer_share, 0)
                      return (
                        <tr key={entry.id} className="border-b border-gray-800/50">
                          <td className="py-2 text-gray-300">
                            {new Date(entry.month + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2 text-right text-gray-400">${entry.client_revenue.toLocaleString()}</td>
                          <td className="py-2 text-right font-medium text-white">${entry.developer_share.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 text-right text-gray-500">${cumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="py-2 text-right">
                            <button onClick={() => deleteEntry(entry.id)} className="text-gray-600 hover:text-red-400 text-xs">×</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-gray-500">Phase total: <strong className={color.text}>${phaseTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                </div>
              </div>
            )}

            {/* Add entry */}
            <div className="flex items-center gap-2 mt-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  value={revInputs[phase.id] ?? ''}
                  onChange={(e) => setRevInputs({ ...revInputs, [phase.id]: e.target.value })}
                  placeholder="Client revenue this month"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => addRevenueEntry(phase.id)}
                className="px-4 py-2 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                + Add Month
              </button>
            </div>
          </div>
        )
      })}

      {/* Add phase buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => addPhase(false)}
          className="px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
        >
          + Timed Phase
        </button>
        <button
          onClick={() => addPhase(true)}
          className="px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
        >
          + Ongoing Phase
        </button>
      </div>
    </div>
  )
}
