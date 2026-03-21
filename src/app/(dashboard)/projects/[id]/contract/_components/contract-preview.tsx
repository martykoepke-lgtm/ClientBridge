import type { Contract, Milestone, RevenueSharePhase, ScopeItem, Project } from '@/lib/types'

interface Props {
  contract: Contract
  milestones: Milestone[]
  phases: RevenueSharePhase[]
  scopeItems: ScopeItem[]
  project: Project
}

export default function ContractPreview({ contract, milestones, phases, scopeItems, project }: Props) {
  const client = project.client as { name: string; company?: string; email?: string } | undefined
  const inScope = scopeItems.filter(s => s.in_scope)
  const outScope = scopeItems.filter(s => !s.in_scope)
  const milestoneTotal = milestones.reduce((s, m) => s + (m.amount || 0), 0)
  const sections = contract.sections ?? []

  function dateLabel(val: string | null) {
    if (!val) return '—'
    return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Sections managed by other tabs get special rendering
  const SPECIAL_SECTIONS = ['scope_of_work', 'cash_compensation', 'revenue_share', 'performance_accelerator', 'revenue_share_cap']

  return (
    <div className="bg-gray-800/50 rounded-xl p-8 print:bg-white print:text-black" id="contract-preview">
      {/* Letterhead */}
      <div className="flex justify-between items-start border-b border-gray-700 print:border-gray-300 pb-4 mb-6">
        <div>
          <div className="text-lg font-semibold text-white print:text-black">Practical Informatics LLC</div>
          <div className="text-xs text-gray-500 mt-1">marty.koepke@practicalinformatics.com</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Independent Contractor Agreement</div>
          <div className="text-sm font-semibold text-white print:text-black">Revenue Share + Milestone</div>
        </div>
      </div>

      {/* Parties */}
      <div className="mb-6 text-sm text-gray-300 print:text-gray-700">
        This Independent Contractor Agreement is entered into as of {dateLabel(contract.agreement_date)}, by and between{' '}
        <strong>{client?.company || client?.name || '[CLIENT_NAME]'}</strong> (&quot;Company&quot;) and{' '}
        <strong>Practical Informatics LLC</strong> (&quot;Contractor&quot;).
      </div>

      {/* Render each section */}
      {sections.map(section => {
        // Special rendering for managed sections
        if (section.id === 'scope_of_work' && inScope.length > 0) {
          return (
            <div key={section.id} className="mb-5">
              <h3 className="text-sm font-semibold text-white print:text-black mb-2">{section.number}. {section.title}</h3>
              <div className="text-sm text-gray-300 print:text-gray-700 mb-2">{section.content}</div>
              <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-300 print:text-gray-700 ml-2">
                {inScope.map(item => <li key={item.id}>{item.label}</li>)}
              </ul>
              {outScope.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500 italic">Out of scope: </span>
                  <span className="text-xs text-gray-500">{outScope.map(i => i.label).join(', ')}</span>
                </div>
              )}
              {contract.change_order_policy && (
                <div className="mt-2 text-sm text-gray-400 italic">Change orders: {contract.change_order_policy}</div>
              )}
            </div>
          )
        }

        if (section.id === 'cash_compensation' && milestones.length > 0) {
          return (
            <div key={section.id} className="mb-5">
              <h3 className="text-sm font-semibold text-white print:text-black mb-2">{section.number}. {section.title}</h3>
              <div className="text-sm text-gray-300 print:text-gray-700 mb-2">{section.content}</div>
              <table className="w-full text-sm mb-2">
                <thead>
                  <tr className="border-b border-gray-700 print:border-gray-300">
                    <th className="text-left text-xs text-gray-500 font-semibold pb-1">Installment</th>
                    <th className="text-right text-xs text-gray-500 font-semibold pb-1">Amount</th>
                    <th className="text-right text-xs text-gray-500 font-semibold pb-1">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, i) => (
                    <tr key={m.id} className="border-b border-gray-800/50">
                      <td className="py-1.5 text-gray-300">{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</td>
                      <td className="py-1.5 text-right font-semibold text-white print:text-black">${(m.amount || 0).toLocaleString()}</td>
                      <td className="py-1.5 text-right text-gray-400">{m.title || '—'}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right text-white print:text-black">${milestoneTotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        }

        if (section.id === 'performance_accelerator' && phases.length > 0) {
          return (
            <div key={section.id} className="mb-5">
              <h3 className="text-sm font-semibold text-white print:text-black mb-2">{section.number}. {section.title}</h3>
              <div className="text-sm text-gray-300 print:text-gray-700 mb-2">{section.content}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-xs text-gray-500 pb-1">Period</th>
                    <th className="text-right text-xs text-gray-500 pb-1">Revenue Share Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map(p => (
                    <tr key={p.id} className="border-b border-gray-800/50">
                      <td className="py-1.5 text-gray-300">{p.name}</td>
                      <td className="py-1.5 text-right font-semibold text-white print:text-black">{p.percentage}% of Gross Revenue</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        // Skip special sections that have no data
        if (SPECIAL_SECTIONS.includes(section.id) && !section.content && section.subsections.length === 0) {
          return null
        }

        // Standard section rendering
        return (
          <div key={section.id} className="mb-5">
            <h3 className="text-sm font-semibold text-white print:text-black mb-2">{section.number}. {section.title}</h3>
            {section.content && (
              <div className="text-sm text-gray-300 print:text-gray-700 whitespace-pre-line">{section.content}</div>
            )}
            {section.subsections.length > 0 && (
              <div className="mt-2 space-y-2">
                {section.subsections.map(sub => (
                  <div key={sub.id} className="ml-4">
                    <div className="text-sm font-medium text-gray-400 mb-0.5">{sub.id}. {sub.title}</div>
                    <div className="text-sm text-gray-300 print:text-gray-700 whitespace-pre-line">{sub.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Payment Terms summary */}
      <div className="mb-5 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Payment Terms</div>
        <div className="text-sm text-gray-300">
          {[
            contract.payment_method ? `Payment via ${contract.payment_method.toUpperCase()}` : null,
            contract.net_terms ? `Net ${contract.net_terms} days` : null,
            contract.late_fee_percent ? `Late fee: ${contract.late_fee_percent}% per month` : null,
          ].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>

      {/* Signature block */}
      <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-gray-700 print:border-gray-300">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-3">COMPANY</div>
          <div className="h-10 border-b border-gray-600 print:border-gray-400 mb-1" />
          <div className="text-xs text-gray-500">Signature</div>
          <div className="h-6" />
          <div className="text-sm font-medium text-white print:text-black">{client?.name || '[Name]'}</div>
          <div className="text-xs text-gray-500">Printed Name</div>
          <div className="h-6" />
          <div className="text-xs text-gray-500">Title</div>
          <div className="h-6" />
          <div className="text-xs text-gray-500">Date</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-3">CONTRACTOR</div>
          <div className="h-10 border-b border-gray-600 print:border-gray-400 mb-1" />
          <div className="text-xs text-gray-500">Signature</div>
          <div className="h-6" />
          <div className="text-sm font-medium text-white print:text-black">Marty Koepke / Practical Informatics LLC</div>
          <div className="text-xs text-gray-500">Printed Name / Entity</div>
          <div className="h-6" />
          <div className="text-xs text-gray-500">Date</div>
        </div>
      </div>
    </div>
  )
}
