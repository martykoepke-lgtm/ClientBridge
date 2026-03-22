'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Project, ProjectDocument } from '@/lib/types'
import DocumentList from '@/components/documents/document-list'

export default function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [projectRes, docsRes] = await Promise.all([
        supabase.from('projects').select('*, client:clients(*)').eq('id', id).single(),
        supabase.from('project_documents').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      ])
      if (projectRes.data) setProject(projectRes.data)
      if (docsRes.data) setDocuments(docsRes.data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="text-gray-400 text-center py-12">Loading...</div>
  if (!project) return <div className="text-gray-400 text-center py-12">Project not found.</div>

  const client = project.client as { name: string; id: string; company?: string } | undefined

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
        <span className="text-white">Documents</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-400 text-sm mt-1">{project.name} · {client?.company || client?.name || 'Client'}</p>
        </div>
        <span className="text-xs text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
      </div>

      <DocumentList
        projectId={id}
        documents={documents}
        onDocumentsChange={setDocuments}
        canUpload={true}
        canDelete={() => true}
        role="developer"
      />
    </div>
  )
}
