import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeProjectStage } from '@/lib/portal-utils'

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login')
  }

  // Find client record linked to this auth user
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <h1 className="text-xl font-bold text-white mb-2">No Portal Access</h1>
        <p className="text-gray-400 mb-4">
          Your account is not linked to a client profile. If you received an invitation, please use the link from your email.
        </p>
      </div>
    )
  }

  // Get projects with scope counts and contract status
  const { data: projects } = await supabase
    .from('projects')
    .select('*, contracts:contracts(id, status), scope_items:scope_items(id)')
    .eq('client_id', client.id)
    .in('status', ['active', 'completed'])
    .order('updated_at', { ascending: false })

  // Get feedback counts per project
  const projectIds = (projects ?? []).map(p => p.id)
  let feedbackCounts: Record<string, number> = {}
  if (projectIds.length > 0) {
    const { data: feedbackData } = await supabase
      .from('feedback')
      .select('project_id')
      .in('project_id', projectIds)

    feedbackData?.forEach(f => {
      feedbackCounts[f.project_id] = (feedbackCounts[f.project_id] || 0) + 1
    })
  }

  // Compute stages and sort by priority
  const projectsWithStage = (projects ?? []).map(project => {
    const contracts = project.contracts as { id: string; status: string }[] | null
    const latestContract = contracts?.find(c =>
      ['active', 'client_signed', 'sent', 'draft'].includes(c.status)
    )
    const scopeCount = (project.scope_items as { id: string }[] | null)?.length || 0
    const stage = computeProjectStage(project, scopeCount, latestContract)
    const feedbackCount = feedbackCounts[project.id] || 0

    return { ...project, stage, scopeCount, latestContract, feedbackCount }
  }).sort((a, b) => a.stage.priority - b.stage.priority)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome, {client.name}</h1>
        <p className="text-gray-400 mt-1">{client.company || 'Your project portal'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectsWithStage.map(project => (
          <Link
            key={project.id}
            href={`/portal/project/${project.id}`}
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-6 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                {project.name}
              </h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${project.stage.color} ${project.stage.textColor}`}>
                {project.stage.label}
              </span>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              {project.stage.description}
            </p>

            {project.description && (
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500">
              {project.scopeCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  {project.scopeCount} scope items
                </span>
              )}
              {project.latestContract && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Contract
                </span>
              )}
              {project.vercel_url && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
                  Live App
                </span>
              )}
              {project.feedbackCount > 0 && (
                <span>{project.feedbackCount} feedback</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {(!projects || projects.length === 0) && (
        <div className="text-center py-16 text-gray-500">
          <p>No projects yet. Your developer will add projects here as they get started.</p>
        </div>
      )}
    </div>
  )
}
