'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Project, Contract, Milestone, RevenueSharePhase, RevenueEntry, ScopeItem } from '@/lib/types'
import ScopeSummary from './_components/scope-summary'
import AgreementTerms from './_components/agreement-terms'
import MilestoneList from './_components/milestone-list'
import RevenueShare from './_components/revenue-share'
import ContractPreview from './_components/contract-preview'
import { getDefaultSections } from './_components/contract-template'

type Tab = 'agreement' | 'milestones' | 'revshare' | 'preview'

const DEFAULT_CHANGE_ORDER_POLICY = `Any work requested by Company that falls outside the agreed-upon scope of work as defined in this Agreement shall require a written change order before work begins. Change orders must include: (a) a description of the requested change; (b) the estimated impact on timeline; and (c) any additional cost. Contractor will provide a change order estimate within 3 business days of the request. No work on out-of-scope items will commence until the change order is approved in writing by both parties. Approved change orders become part of this Agreement and may result in adjusted milestone dates and/or additional fees.`

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [phases, setPhases] = useState<RevenueSharePhase[]>([])
  const [entries, setEntries] = useState<RevenueEntry[]>([])
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('agreement')
  const [saved, setSaved] = useState(false)

  const loadData = useCallback(async () => {
    const [projectRes, scopeRes] = await Promise.all([
      supabase.from('projects').select('*, client:clients(*)').eq('id', id).single(),
      supabase.from('scope_items').select('*').eq('project_id', id).order('sort_order'),
    ])

    if (projectRes.data) setProject(projectRes.data)
    if (scopeRes.data) setScopeItems(scopeRes.data)

    // Try to load existing contract
    const { data: contractData } = await supabase
      .from('contracts')
      .select('*')
      .eq('project_id', id)
      .in('status', ['draft', 'sent', 'client_signed', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (contractData) {
      // Backfill sections — add missing new sections, replace any with old placeholders individually
      const defaults = getDefaultSections()
      if (!contractData.sections || contractData.sections.length === 0) {
        contractData.sections = defaults
        await supabase.from('contracts').update({ sections: contractData.sections }).eq('id', contractData.id)
      } else if (contractData.sections.length < defaults.length) {
        const existingIds = new Set(contractData.sections.map((s: { id: string }) => s.id))
        const missing = defaults.filter(s => !existingIds.has(s.id))
        if (missing.length > 0) {
          contractData.sections = [...contractData.sections, ...missing]
          await supabase.from('contracts').update({ sections: contractData.sections }).eq('id', contractData.id)
        }
      }
      // Backfill change order policy if empty
      if (!contractData.change_order_policy) {
        contractData.change_order_policy = DEFAULT_CHANGE_ORDER_POLICY
        await supabase.from('contracts').update({ change_order_policy: contractData.change_order_policy }).eq('id', contractData.id)
      }
      setContract(contractData)
      await loadContractData(contractData.id)
    } else {
      // Create a new draft contract
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: newContract } = await supabase.from('contracts').insert({
          project_id: id,
          developer_id: user.id,
          status: 'draft',
          sections: getDefaultSections(),
          payment_method: 'ach',
          net_terms: 15,
          late_fee_percent: 1.5,
          change_order_policy: DEFAULT_CHANGE_ORDER_POLICY,
        }).select('*').single()
        if (newContract) {
          setContract(newContract)
        }
      }
    }

    setLoading(false)
  }, [id])

  async function loadContractData(contractId: string) {
    const [milestonesRes, phasesRes] = await Promise.all([
      supabase.from('milestones').select('*').eq('contract_id', contractId).order('sort_order'),
      supabase.from('revenue_share_phases').select('*').eq('contract_id', contractId).order('sort_order'),
    ])

    if (milestonesRes.data) setMilestones(milestonesRes.data)

    if (phasesRes.data) {
      setPhases(phasesRes.data)
      // Load entries for all phases
      if (phasesRes.data.length > 0) {
        const phaseIds = phasesRes.data.map(p => p.id)
        const { data: entriesData } = await supabase
          .from('revenue_entries')
          .select('*')
          .in('phase_id', phaseIds)
          .order('month')
        if (entriesData) setEntries(entriesData)
      }
    }
  }

  useEffect(() => { loadData() }, [loadData])

  function handleContractUpdate(updates: Partial<Contract>) {
    if (!contract) return
    setContract({ ...contract, ...updates })
    // Auto-save toggles and important fields immediately
    if ('has_revenue_share' in updates || 'revenue_share_cap' in updates || 'revenue_share_start' in updates) {
      supabase.from('contracts').update(updates).eq('id', contract.id)
    }
  }

  async function handleSave() {
    if (!contract) return
    setSaving(true)
    await supabase.from('contracts').update({
      payment_method: contract.payment_method,
      net_terms: contract.net_terms,
      late_fee_percent: contract.late_fee_percent,
      ip_ownership: contract.ip_ownership,
      termination_clause: contract.termination_clause,
      change_order_policy: contract.change_order_policy,
      additional_notes: contract.additional_notes,
      agreement_date: contract.agreement_date,
      has_revenue_share: contract.has_revenue_share,
      revenue_share_cap: contract.revenue_share_cap,
      revenue_share_start: contract.revenue_share_start,
      sections: contract.sections,
    }).eq('id', contract.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleDelete() {
    if (!contract) return
    await supabase.from('contracts').delete().eq('id', contract.id)
    router.push(`/projects/${id}`)
  }

  async function activateContract() {
    if (!contract) return
    await supabase.from('contracts').update({ status: 'active' }).eq('id', contract.id)
    setContract({ ...contract, status: 'active' })
  }

  async function reloadMilestones() {
    if (!contract) return
    await loadContractData(contract.id)
  }

  function handlePrint() {
    if (!contract) return
    window.open(`/api/contract-pdf?contractId=${contract.id}`, '_blank')
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>
  }

  if (!project) {
    return <div className="text-gray-400 text-center py-12">Project not found.</div>
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Could not load or create a contract. Make sure the database migration (<code className="text-gray-500">006_contract_scope_system.sql</code>) has been applied.</p>
        <Link href={`/projects/${id}`} className="text-blue-400 hover:text-blue-300 text-sm">← Back to project</Link>
      </div>
    )
  }

  const client = project.client as { name: string; id: string; company?: string } | undefined
  const tabs: { id: Tab; label: string }[] = [
    { id: 'agreement', label: 'Agreement' },
    { id: 'milestones', label: `Milestones (${milestones.length})` },
    { id: 'revshare', label: 'Revenue Share' },
    { id: 'preview', label: 'Preview' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/clients" className="hover:text-white transition-colors">Clients</Link>
        <span>/</span>
        {client && (
          <>
            <Link href={`/clients/${client.id}`} className="hover:text-white transition-colors">{client.name}</Link>
            <span>/</span>
          </>
        )}
        <Link href={`/projects/${id}`} className="hover:text-white transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-white">Contract</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing Agreement</h1>
          <p className="text-gray-400 text-sm mt-1">{project.name} · {client?.company || client?.name || 'Client'}</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs bg-green-900/50 text-green-300 px-3 py-1 rounded-full">Saved</span>
          )}
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            contract.status === 'active' ? 'bg-green-900/50 text-green-300' :
            contract.status === 'client_signed' ? 'bg-blue-900/50 text-blue-300' :
            contract.status === 'sent' ? 'bg-purple-900/50 text-purple-300' :
            contract.status === 'draft' ? 'bg-amber-900/50 text-amber-300' :
            'bg-gray-800 text-gray-400'
          }`}>
            {contract.status === 'client_signed' ? 'Awaiting Counter-Signature' :
             contract.status === 'sent' ? 'Sent for Signature' :
             contract.status}
          </span>
          <button onClick={handlePrint} className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors">
            Print / Export
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-700 text-[#09090B] rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Agreement'}
          </button>
          {contract.status === 'draft' && (
            <button
              onClick={async () => {
                await handleSave()
                await supabase.from('contracts').update({ status: 'sent', sent_for_signature_at: new Date().toISOString() }).eq('id', contract.id)
                setContract({ ...contract, status: 'sent' as const, sent_for_signature_at: new Date().toISOString() })
              }}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Send for Signature
            </button>
          )}
          {contract.status === 'client_signed' && (
            <button
              onClick={async () => {
                const name = prompt('Type your full name to counter-sign:')
                if (!name) return
                await supabase.from('contracts').update({
                  status: 'active',
                  contractor_signature_name: name,
                  contractor_signature_date: new Date().toISOString(),
                }).eq('id', contract.id)
                setContract({ ...contract, status: 'active' as const, contractor_signature_name: name, contractor_signature_date: new Date().toISOString() })
              }}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
            >
              Counter-sign & Activate
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete this contract?</span>
              <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg">Yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm text-gray-500 hover:text-red-400 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Counter-signature banner */}
      {contract.status === 'client_signed' && (
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-blue-200 font-medium text-sm">Client has signed this contract</p>
            <p className="text-blue-400 text-xs mt-0.5">
              Signed by {contract.client_signature_name} on {contract.client_signature_date ? new Date(contract.client_signature_date).toLocaleDateString() : 'unknown date'}.
              Counter-sign to activate the contract.
            </p>
          </div>
          <button
            onClick={async () => {
              const name = prompt('Type your full name to counter-sign:')
              if (!name) return
              await supabase.from('contracts').update({
                status: 'active',
                contractor_signature_name: name,
                contractor_signature_date: new Date().toISOString(),
              }).eq('id', contract.id)
              setContract({ ...contract, status: 'active' as const, contractor_signature_name: name, contractor_signature_date: new Date().toISOString() })
            }}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            Counter-sign & Activate
          </button>
        </div>
      )}

      {/* Sent banner */}
      {contract.status === 'sent' && (
        <div className="mb-6 p-4 bg-purple-900/30 border border-purple-800 rounded-xl">
          <p className="text-purple-200 font-medium text-sm">Contract sent for client signature</p>
          <p className="text-purple-400 text-xs mt-0.5">
            Sent {contract.sent_for_signature_at ? new Date(contract.sent_for_signature_at).toLocaleDateString() : ''}. Waiting for the client to review and sign.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white font-medium border border-gray-700'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'agreement' && (
        <div className="space-y-6">
          {/* Scope summary card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Scope of Work</h3>
              <Link href={`/projects/${id}`} className="text-xs text-blue-400 hover:text-blue-300">
                Edit scope on project page →
              </Link>
            </div>
            <ScopeSummary scopeItems={scopeItems} />
          </div>

          {/* Agreement terms card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Terms</h3>
            <AgreementTerms contract={contract} onChange={handleContractUpdate} />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-700 text-[#09090B] rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save Agreement'}
            </button>
            <button onClick={() => setActiveTab('milestones')} className="px-5 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors">
              Next: Milestones →
            </button>
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Development Milestones</h3>
          <MilestoneList
            milestones={milestones}
            scopeItems={scopeItems}
            contractId={contract.id}
            onChange={reloadMilestones}
          />
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-800">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-700 text-[#09090B] rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setActiveTab('revshare')} className="px-5 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors">
              Next: Revenue Share →
            </button>
          </div>
        </div>
      )}

      {activeTab === 'revshare' && (
        <div className="space-y-6">
          {/* Revenue share toggle */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Revenue Share</h3>
              <button
                onClick={() => handleContractUpdate({ has_revenue_share: !contract.has_revenue_share })}
                className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                  contract.has_revenue_share
                    ? 'border-green-600 bg-green-900/30 text-green-300'
                    : 'border-gray-700 bg-gray-800 text-gray-400'
                }`}
              >
                {contract.has_revenue_share ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {contract.has_revenue_share ? (
              <div className="space-y-4">
                {/* Global cap & start */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Total Revenue Share Cap ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        value={contract.revenue_share_cap ?? ''}
                        onChange={(e) => handleContractUpdate({ revenue_share_cap: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="e.g. 75000"
                        className="w-full pl-7 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">Total combined payout across all phases. Once reached, all revenue share stops.</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Revenue Share Start Date</label>
                    <input
                      type="date"
                      value={contract.revenue_share_start ?? ''}
                      onChange={(e) => handleContractUpdate({ revenue_share_start: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">When revenue share tracking begins (typically first revenue date).</p>
                  </div>
                </div>

                <RevenueShare
                  phases={phases}
                  entries={entries}
                  contractId={contract.id}
                  onChange={reloadMilestones}
                  globalCap={contract.revenue_share_cap ?? undefined}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Enable revenue share to add percentage-based phases, track monthly client revenue, and calculate your share toward a cap.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Agreement Preview</h3>
              <button onClick={handlePrint} className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors">
                Print / Export PDF
              </button>
            </div>
            <ContractPreview
              contract={contract}
              milestones={milestones}
              phases={phases}
              scopeItems={scopeItems}
              project={project}
            />
          </div>
        </div>
      )}
    </div>
  )
}
