'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Client, Project } from '@/lib/types'

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [vercelUrl, setVercelUrl] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editStreet, setEditStreet] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editZip, setEditZip] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const [clientRes, projectsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('projects').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])

    setClient(clientRes.data)
    setProjects(projectsRes.data ?? [])
    if (clientRes.data) {
      setEditName(clientRes.data.name)
      setEditEmail(clientRes.data.email ?? '')
      setEditCompany(clientRes.data.company ?? '')
      setEditPhone(clientRes.data.phone ?? '')
      setEditStreet(clientRes.data.street ?? '')
      setEditCity(clientRes.data.city ?? '')
      setEditState(clientRes.data.state ?? '')
      setEditZip(clientRes.data.zip ?? '')
    }
    setLoading(false)
  }

  async function handleSaveClient() {
    if (!client) return
    setSaving(true)
    const updates = {
      name: editName,
      email: editEmail || null,
      company: editCompany || null,
      phone: editPhone || null,
      street: editStreet || null,
      city: editCity || null,
      state: editState || null,
      zip: editZip || null,
    }
    await supabase.from('clients').update(updates).eq('id', client.id)
    setClient({ ...client, ...updates })
    setEditing(false)
    setSaving(false)
  }

  async function handleDeleteClient() {
    await supabase.from('clients').delete().eq('id', id)
    router.push('/clients')
  }

  async function handleInviteClient() {
    if (!client?.email) return
    setInviting(true)
    try {
      const res = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, email: client.email }),
      })
      const data = await res.json()
      if (data.portalUrl) {
        setInviteUrl(data.portalUrl)
        setClient({ ...client, invited_at: new Date().toISOString() })
      }
    } catch (err) {
      console.error('Invite error:', err)
    }
    setInviting(false)
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('projects').insert({
      client_id: id,
      developer_id: user.id,
      name: projectName,
      description: projectDesc || null,
      vercel_url: vercelUrl || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
    })

    if (!error) {
      setProjectName('')
      setProjectDesc('')
      setVercelUrl('')
      setHourlyRate('')
      setShowForm(false)
      loadData()
    }
    setSaving(false)
  }

  function getReviewLink(token: string) {
    return `${window.location.origin}/review/${token}`
  }

  async function copyReviewLink(token: string) {
    await navigator.clipboard.writeText(getReviewLink(token))
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>
  }

  if (!client) {
    return <div className="text-gray-400 text-center py-12">Client not found.</div>
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/clients" className="hover:text-white transition-colors">Clients</Link>
        <span>/</span>
        <span className="text-white">{client.name}</span>
      </div>

      {/* Client Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Company</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. (555) 123-4567"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Street Address</label>
              <input
                type="text"
                value={editStreet}
                onChange={(e) => setEditStreet(e.target.value)}
                placeholder="123 Main St, Suite 100"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">City</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">State</label>
                <input
                  type="text"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="e.g. Virginia"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">ZIP</label>
                <input
                  type="text"
                  value={editZip}
                  onChange={(e) => setEditZip(e.target.value)}
                  placeholder="ZIP"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveClient} disabled={saving || !editName} className="px-4 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-700 text-[#09090B] rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{client.name}</h1>
              <p className="text-gray-400 mt-1">
                {[client.company, client.email, client.phone].filter(Boolean).join(' · ')}
              </p>
              {(client.street || client.city || client.state) && (
                <p className="text-gray-500 text-sm mt-1">
                  {[client.street, [client.city, client.state, client.zip].filter(Boolean).join(', ')].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {client.email && !client.invite_accepted_at && (
                inviteUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">Invited!</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteUrl); }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Copy Link
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleInviteClient}
                    disabled={inviting}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {inviting ? 'Sending...' : client.invited_at ? 'Resend Invite' : 'Invite to Portal'}
                  </button>
                )
              )}
              {client.invite_accepted_at && (
                <span className="px-3 py-1.5 text-xs bg-green-900/50 text-green-300 rounded-full">Portal Active</span>
              )}
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
              >
                {showForm ? 'Cancel' : 'Add Project'}
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Delete client + all projects?</span>
                  <button onClick={handleDeleteClient} className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm text-gray-500 hover:text-red-400 transition-colors">
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Project Form */}
      {showForm && (
        <form
          onSubmit={handleCreateProject}
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., AESCULA Platform"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Vercel URL
              </label>
              <input
                type="url"
                value={vercelUrl}
                onChange={(e) => setVercelUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://your-app.vercel.app"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Hourly Rate
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Brief description of the project"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
        </div>

        {projects.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 mb-2">No projects yet.</p>
            <p className="text-gray-500 text-sm">Add a project with a Vercel URL to start collecting feedback.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {projects.map((project) => (
              <div key={project.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-white font-semibold hover:text-blue-400 transition-colors"
                  >
                    {project.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      project.status === 'active'
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {project.status}
                    </span>
                    <Link
                      href={`/projects/${project.id}`}
                      className="px-3 py-1 rounded text-xs font-medium bg-[#F59E0B] hover:bg-[#D97706] text-white transition-colors"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => copyReviewLink(project.review_token)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      title="Copy review link"
                    >
                      Copy Review Link
                    </button>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {[project.vercel_url, project.hourly_rate ? `$${project.hourly_rate}/hr` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
