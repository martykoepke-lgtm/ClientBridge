'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Client, Project } from '@/lib/types'

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [vercelUrl, setVercelUrl] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
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
    setLoading(false)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{client.name}</h1>
          <p className="text-gray-400 mt-1">
            {[client.company, client.email].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Project'}
        </button>
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
                placeholder="e.g., ÆSCULA Platform"
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
