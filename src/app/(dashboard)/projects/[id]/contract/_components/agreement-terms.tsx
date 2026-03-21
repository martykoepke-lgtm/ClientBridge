import { useState, useEffect } from 'react'
import type { Contract, ContractSection } from '@/lib/types'
import { getDefaultSections } from './contract-template'

interface Props {
  contract: Contract
  onChange: (updates: Partial<Contract>) => void
}

// Sections that are managed by other tabs (scope, milestones, revenue share)
const MANAGED_SECTIONS = ['scope_of_work', 'cash_compensation', 'revenue_share', 'performance_accelerator', 'revenue_share_cap']

export default function AgreementTerms({ contract, onChange }: Props) {
  const [sections, setSections] = useState<ContractSection[]>(
    contract.sections?.length ? contract.sections : getDefaultSections()
  )

  useEffect(() => {
    if (contract.sections?.length) {
      setSections(contract.sections)
    }
  }, [contract.sections])

  function updateSection(id: string, updates: Partial<ContractSection>) {
    const updated = sections.map(s => s.id === id ? { ...s, ...updates } : s)
    setSections(updated)
    onChange({ sections: updated })
  }

  function updateSubsection(sectionId: string, subId: string, content: string) {
    const updated = sections.map(s => {
      if (s.id !== sectionId) return s
      return {
        ...s,
        subsections: s.subsections.map(sub =>
          sub.id === subId ? { ...sub, content } : sub
        ),
      }
    })
    setSections(updated)
    onChange({ sections: updated })
  }

  function toggleSection(id: string) {
    setSections(sections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s))
  }

  function resetSection(id: string) {
    const defaults = getDefaultSections()
    const defaultSection = defaults.find(s => s.id === id)
    if (defaultSection) {
      const updated = sections.map(s => s.id === id ? { ...defaultSection, collapsed: false } : s)
      setSections(updated)
      onChange({ sections: updated })
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Terms (stays as form fields) */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Terms</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Payment Method</label>
            <select
              value={contract.payment_method ?? ''}
              onChange={(e) => onChange({ payment_method: e.target.value || null })}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="ach">ACH / Bank Transfer</option>
              <option value="wire">Wire Transfer</option>
              <option value="check">Check</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Net Terms (days)</label>
            <input
              type="number"
              min="0"
              value={contract.net_terms ?? ''}
              onChange={(e) => onChange({ net_terms: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="e.g. 15"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[10px] text-gray-600 mt-1">How many days the client has to pay after receiving an invoice. &quot;Net 15&quot; = pay within 15 days.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Late Fee (%/month)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={contract.late_fee_percent ?? ''}
              onChange={(e) => onChange({ late_fee_percent: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="e.g. 1.5"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Agreement Date */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Agreement Date</label>
        <input
          type="date"
          value={contract.agreement_date ?? ''}
          onChange={(e) => onChange({ agreement_date: e.target.value || null })}
          className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Change Order Policy */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Change Order Policy</label>
        <textarea
          value={contract.change_order_policy ?? ''}
          onChange={(e) => onChange({ change_order_policy: e.target.value || null })}
          placeholder="e.g. Work outside agreed scope requires written change order and may affect timeline and cost..."
          rows={6}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical"
        />
      </div>

      {/* Contract Sections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contract Sections</h4>
          <button
            onClick={() => {
              const defaults = getDefaultSections()
              // Only reset non-managed sections (keep scope, milestones, revenue share as-is)
              const updated = sections.map(s => {
                if (MANAGED_SECTIONS.includes(s.id)) return s
                const def = defaults.find(d => d.id === s.id)
                return def ? { ...def, collapsed: s.collapsed } : s
              })
              setSections(updated)
              onChange({ sections: updated })
            }}
            className="text-xs text-gray-500 hover:text-amber-400 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Reset all terms to defaults
          </button>
        </div>
        <div className="space-y-2">
          {sections.map(section => {
            const isManaged = MANAGED_SECTIONS.includes(section.id)
            return (
              <div key={section.id} className="border border-gray-800 rounded-lg overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-600 w-6">{section.number}.</span>
                    <span className="text-sm font-medium text-gray-300">{section.title}</span>
                    {isManaged && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">auto</span>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs">{section.collapsed ? '▸' : '▾'}</span>
                </button>

                {/* Section content */}
                {!section.collapsed && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-800/50">
                    {isManaged ? (
                      <p className="text-xs text-gray-500 italic">
                        This section is managed by the {section.id === 'scope_of_work' ? 'Scope' : section.id === 'cash_compensation' ? 'Milestones' : 'Revenue Share'} tab. The content below is default template text for the preview.
                      </p>
                    ) : null}

                    {/* Main content */}
                    {section.content && (
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSection(section.id, { content: e.target.value })}
                        rows={Math.max(2, Math.ceil(section.content.length / 100))}
                        className="w-full mt-2 px-3 py-2 text-sm bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical leading-relaxed"
                      />
                    )}

                    {/* Subsections */}
                    {section.subsections.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {section.subsections.map(sub => (
                          <div key={sub.id} className="pl-4 border-l-2 border-gray-800">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-mono text-gray-600">{sub.id}</span>
                              <span className="text-xs font-medium text-gray-400">{sub.title}</span>
                            </div>
                            <textarea
                              value={sub.content}
                              onChange={(e) => updateSubsection(section.id, sub.id, e.target.value)}
                              rows={Math.max(2, Math.ceil(sub.content.length / 100))}
                              className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reset link */}
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => resetSection(section.id)}
                        className="text-xs text-gray-500 hover:text-amber-400 transition-colors px-2 py-1 rounded hover:bg-gray-800"
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Additional Notes</label>
        <textarea
          value={contract.additional_notes ?? ''}
          onChange={(e) => onChange({ additional_notes: e.target.value || null })}
          placeholder="Anything else to document..."
          rows={2}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical"
        />
      </div>
    </div>
  )
}
