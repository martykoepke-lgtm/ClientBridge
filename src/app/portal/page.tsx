import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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
        <p className="text-gray-500 text-sm">If you are a developer, <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">go to the developer dashboard</Link>.</p>
      </div>
    )
  }

  // Get projects for this client
  const { data: projects } = await supabase
    .from('projects')
    .select('*, contracts:contracts(id, status)')
    .eq('client_id', client.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  // Get recent feedback count
  const { count: feedbackCount } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .in('project_id', (projects ?? []).map(p => p.id))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome, {client.name}</h1>
        <p className="text-gray-400 mt-1">{client.company || 'Your project portal'}</p>
      </div>

      {/* Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(projects ?? []).map(project => {
          const contracts = project.contracts as { id: string; status: string }[] | null
          const activeContract = contracts?.find((c: { status: string }) => c.status === 'active' || c.status === 'sent' || c.status === 'client_signed')
          const hasContract = !!activeContract

          return (
            <Link
              key={project.id}
              href={`/portal/project/${project.id}`}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-6 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {project.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-300">
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {hasContract && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    Contract
                  </span>
                )}
                {project.vercel_url && <span>Live App</span>}
              </div>
            </Link>
          )
        })}
      </div>

      {(!projects || projects.length === 0) && (
        <div className="text-center py-16 text-gray-500">
          <p>No active projects yet. Your developer will add projects here as they get started.</p>
        </div>
      )}
    </div>
  )
}
