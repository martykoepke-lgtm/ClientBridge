'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Client } from '@/lib/types'

interface ClientHealth {
  clientId: string
  lastReviewDate: string | null
  totalFeedback: number
  activeFeedback: number
  resolvedFeedback: number
  projectCount: number
  daysSinceLastReview: number | null
  score: 'active' | 'warm' | 'cold' | 'new'
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [healthMap, setHealthMap] = useState<Record<string, ClientHealth>>({})
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    const [clientsRes, reviewsRes, feedbackRes, projectsRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('review_sessions').select('client_id, session_start').order('session_start', { ascending: false }),
      supabase.from('feedback').select('client_id, status'),
      supabase.from('projects').select('client_id'),
    ])

    const clientsData = clientsRes.data ?? []
    setClients(clientsData)

    // Build health map
    const reviews = reviewsRes.data ?? []
    const feedback = feedbackRes.data ?? []
    const projects = projectsRes.data ?? []
    const now = new Date()

    const health: Record<string, ClientHealth> = {}
    for (const c of clientsData) {
      const clientReviews = reviews.filter(r => r.client_id === c.id)
      const clientFeedback = feedback.filter(f => f.client_id === c.id)
      const clientProjects = projects.filter(p => p.client_id === c.id)
      const lastReview = clientReviews[0]?.session_start ?? null
      const daysSince = lastReview ? Math.floor((now.getTime() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24)) : null
      const resolvedStatuses = ['approved', 'resolved', 'dismissed']
      const activeStatuses = ['submitted', 'reviewed', 'in_progress', 'change_made', 'needs_revision']

      let score: ClientHealth['score'] = 'new'
      if (daysSince !== null) {
        if (daysSince <= 7) score = 'active'
        else if (daysSince <= 21) score = 'warm'
        else score = 'cold'
      }

      health[c.id] = {
        clientId: c.id,
        lastReviewDate: lastReview,
        totalFeedback: clientFeedback.length,
        activeFeedback: clientFeedback.filter(f => activeStatuses.includes(f.status)).length,
        resolvedFeedback: clientFeedback.filter(f => resolvedStatuses.includes(f.status)).length,
        projectCount: clientProjects.length,
        daysSinceLastReview: daysSince,
        score,
      }
    }
    setHealthMap(health)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('clients').insert({
      developer_id: user.id,
      name,
      email: email || null,
      company: company || null,
    })

    if (!error) {
      setName('')
      setEmail('')
      setCompany('')
      setShowForm(false)
      loadClients()
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Client'}
        </button>
      </div>

      {/* Add Client Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Client name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Company name"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Add Client'}
            </button>
          </div>
        </form>
      )}

      {/* Client List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 mb-2">No clients yet.</p>
            <p className="text-gray-500 text-sm">Add your first client to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {clients.map((client) => {
              const h = healthMap[client.id]
              const scoreColors = {
                active: 'bg-green-500',
                warm: 'bg-yellow-500',
                cold: 'bg-red-500',
                new: 'bg-gray-500',
              }
              const scoreLabels = {
                active: 'Active',
                warm: 'Warm',
                cold: 'Cold',
                new: 'New',
              }
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {h && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${scoreColors[h.score]}`}
                        title={`${scoreLabels[h.score]} — ${h.daysSinceLastReview !== null ? `last review ${h.daysSinceLastReview}d ago` : 'no review sessions'}`}
                      />
                    )}
                    <div>
                      <p className="text-white font-semibold">{client.name}</p>
                      <p className="text-sm text-gray-400">
                        {[client.company, client.email].filter(Boolean).join(' · ') || 'No details'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {h && h.totalFeedback > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {h.activeFeedback > 0 && <span className="text-blue-400">{h.activeFeedback} active</span>}
                          {h.activeFeedback > 0 && h.resolvedFeedback > 0 && ' · '}
                          {h.resolvedFeedback > 0 && <span className="text-green-500">{h.resolvedFeedback} resolved</span>}
                        </p>
                      </div>
                    )}
                    {h && h.daysSinceLastReview !== null && (
                      <span className={`text-xs ${h.daysSinceLastReview <= 7 ? 'text-gray-500' : h.daysSinceLastReview <= 21 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {h.daysSinceLastReview === 0 ? 'Today' : h.daysSinceLastReview === 1 ? 'Yesterday' : `${h.daysSinceLastReview}d ago`}
                      </span>
                    )}
                    {h && h.projectCount > 0 && (
                      <span className="text-xs text-gray-600">{h.projectCount} project{h.projectCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
