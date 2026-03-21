'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Project, Feedback, Contract, Milestone, ScopeItem, TimeSession } from '@/lib/types'

type Tab = 'overview' | 'review' | 'contract' | 'activity'

export default function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [contract, setContract] = useState<Contract | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([])
  const [sessions, setSessions] = useState<TimeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [signName, setSignName] = useState('')
  const [signAgreed, setSignAgreed] = useState(false)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const [projectRes, feedbackRes, contractRes, scopeRes, sessionsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('feedback').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('contracts').select('*').eq('project_id', id).in('status', ['active', 'sent', 'client_signed', 'draft']).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('scope_items').select('*').eq('project_id', id).eq('in_scope', true).order('sort_order'),
      supabase.from('time_sessions').select('*').eq('project_id', id).not('duration_minutes', 'is', null).order('start_time', { ascending: false }).limit(20),
    ])

    if (projectRes.data) setProject(projectRes.data)
    if (feedbackRes.data) setFeedback(feedbackRes.data)
    if (scopeRes.data) setScopeItems(scopeRes.data)
    if (sessionsRes.data) setSessions(sessionsRes.data)

    if (contractRes.data && !contractRes.error) {
      setContract(contractRes.data)
      // Load milestones
      const { data: ms } = await supabase.from('milestones').select('*').eq('contract_id', contractRes.data.id).order('sort_order')
      if (ms) setMilestones(ms)
    }

    setLoading(false)
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Loading...</div>
  if (!project) return <div className="text-gray-400 text-center py-12">Project not found.</div>

  const totalHours = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60
  const activeFeedback = feedback.filter(f => !['dismissed', 'resolved'].includes(f.status))
  const resolvedFeedback = feedback.filter(f => ['resolved', 'approved', 'change_made'].includes(f.status))
  const completedScope = scopeItems.filter(s => s.is_complete).length

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'review', label: `Feedback (${feedback.length})` },
    { id: 'contract', label: 'Contract' },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/portal" className="hover:text-white transition-colors">Portal</Link>
        <span>/</span>
        <span className="text-white">{project.name}</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">{project.name}</h1>
      {project.description && <p className="text-gray-400 mb-6">{project.description}</p>}

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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500">Hours Invested</p>
              <p className="text-2xl font-bold text-white">{totalHours.toFixed(1)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500">Scope Progress</p>
              <p className="text-2xl font-bold text-white">{completedScope}/{scopeItems.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500">Active Feedback</p>
              <p className="text-2xl font-bold text-amber-400">{activeFeedback.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-green-400">{resolvedFeedback.length}</p>
            </div>
          </div>

          {/* Scope progress */}
          {scopeItems.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Scope Progress</h3>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completedScope / scopeItems.length) * 100}%` }} />
              </div>
              <div className="space-y-1">
                {scopeItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <span className={item.is_complete ? 'text-green-500' : 'text-gray-600'}>{item.is_complete ? '✓' : '○'}</span>
                    <span className={item.is_complete ? 'text-gray-500 line-through' : 'text-gray-300'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Milestones</h3>
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-500">{i + 1}</span>
                      <span className="text-sm text-gray-300">{m.title || 'Untitled'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">${(m.amount || 0).toLocaleString()}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.status === 'paid' ? 'bg-green-900/50 text-green-300' :
                        m.status === 'invoiced' ? 'bg-blue-900/50 text-blue-300' :
                        'bg-gray-800 text-gray-500'
                      }`}>{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review app link */}
          {project.vercel_url && (
            <a
              href={project.vercel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-6 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-1">Live Application</h3>
              <p className="text-blue-400 text-sm">{project.vercel_url}</p>
            </a>
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'review' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="divide-y divide-gray-800">
            {feedback.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No feedback submitted yet.</div>
            ) : feedback.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full ${
                    item.severity === 'critical' ? 'bg-red-500' : item.severity === 'high' ? 'bg-amber-500' : item.severity === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-white truncate">{item.title}</span>
                  <span className="text-gray-600 truncate hidden md:inline">{item.description?.slice(0, 60)}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-3 ${
                  item.status === 'resolved' || item.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                  item.status === 'in_progress' || item.status === 'reviewed' ? 'bg-amber-900/50 text-amber-300' :
                  item.status === 'change_made' ? 'bg-purple-900/50 text-purple-300' :
                  item.status === 'dismissed' ? 'bg-gray-800 text-gray-500' :
                  'bg-blue-900/50 text-blue-300'
                }`}>{item.status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract Tab */}
      {activeTab === 'contract' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          {contract ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Contract</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  contract.status === 'active' ? 'bg-green-900/50 text-green-300' :
                  contract.status === 'sent' ? 'bg-blue-900/50 text-blue-300' :
                  'bg-gray-800 text-gray-400'
                }`}>{contract.status}</span>
              </div>
              {/* Render contract sections read-only */}
              <div className="space-y-4">
                {(contract.sections ?? []).map((section: { number: number; title: string; content: string; subsections: { id: string; title: string; content: string }[] }) => (
                  <div key={section.number}>
                    <h4 className="text-sm font-semibold text-white mb-1">{section.number}. {section.title}</h4>
                    {section.content && <p className="text-sm text-gray-400 leading-relaxed">{section.content}</p>}
                    {section.subsections?.map(sub => (
                      <div key={sub.id} className="ml-4 mt-2">
                        <h5 className="text-xs font-semibold text-gray-400">{sub.id}. {sub.title}</h5>
                        <p className="text-sm text-gray-500 leading-relaxed">{sub.content}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {/* Signature block */}
              {(contract.status === 'sent') && (
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <h4 className="text-sm font-semibold text-white mb-3">Sign this Agreement</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Type your full legal name</label>
                      <input
                        type="text"
                        value={signName}
                        onChange={(e) => setSignName(e.target.value)}
                        placeholder="Full name as signature"
                        className="w-full max-w-sm px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={signAgreed}
                        onChange={(e) => setSignAgreed(e.target.checked)}
                        className="rounded border-gray-600"
                      />
                      <span className="text-sm text-gray-400">I have read and agree to all terms in this agreement</span>
                    </label>
                    <button
                      onClick={async () => {
                        if (!signName.trim() || !signAgreed) return
                        setSigning(true)
                        await supabase.from('contracts').update({
                          status: 'client_signed',
                          client_signature_name: signName.trim(),
                          client_signature_date: new Date().toISOString(),
                        }).eq('id', contract.id)
                        setContract({ ...contract, status: 'client_signed' as any, client_signature_name: signName.trim(), client_signature_date: new Date().toISOString() })
                        setSigning(false)
                      }}
                      disabled={!signName.trim() || !signAgreed || signing}
                      className="px-6 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                    >
                      {signing ? 'Signing...' : 'Sign Contract'}
                    </button>
                  </div>
                </div>
              )}

              {/* Signed confirmation */}
              {contract.client_signature_name && (
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-sm text-green-400 font-medium">Signed by {contract.client_signature_name}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {contract.client_signature_date && `Signed on ${new Date(contract.client_signature_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                    {contract.status === 'client_signed' && ' — awaiting contractor counter-signature'}
                    {contract.status === 'active' && contract.contractor_signature_name && ` · Counter-signed by ${contract.contractor_signature_name}`}
                  </p>
                </div>
              )}

              {/* Download PDF */}
              <div className="mt-6 pt-4 border-t border-gray-800">
                <a
                  href={`/api/contract-pdf?contractId=${contract.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  Download Contract PDF
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No contract has been shared yet.</p>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Recent Work Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No work sessions recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16">
                      {new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-gray-400">{s.category_name}</span>
                    {s.ai_summary && <span className="text-gray-600 text-xs truncate max-w-xs hidden md:inline">{s.ai_summary}</span>}
                  </div>
                  <span className="text-white font-medium">{((s.duration_minutes ?? 0) / 60).toFixed(1)}h</span>
                </div>
              ))}
              <div className="pt-3 flex justify-end">
                <span className="text-sm text-gray-400">Total: <strong className="text-white">{totalHours.toFixed(1)} hours</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
