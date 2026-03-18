import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ErrorPanel from '@/components/dashboard/error-panel'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get counts
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  const { data: recentFeedback } = await supabase
    .from('feedback')
    .select('*, project:projects(name, client:clients(name))')
    .order('created_at', { ascending: false })
    .limit(10)

  const { count: newFeedbackCount } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted')

  // Time tracking stats
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [activeSessionRes, weekTimeRes] = await Promise.all([
    supabase.from('time_sessions').select('*, project:projects(name)').is('end_time', null).limit(1).single(),
    supabase.from('time_sessions').select('duration_minutes, project:projects(name, hourly_rate)').gte('start_time', weekStart.toISOString()).not('duration_minutes', 'is', null),
  ])

  const activeSession = activeSessionRes.data && !activeSessionRes.error ? activeSessionRes.data : null
  const weekSessions = weekTimeRes.data ?? []
  const weekHours = weekSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes ?? 0), 0) / 60
  const weekBillable = weekSessions.reduce((sum: number, s: any) => {
    const proj = Array.isArray(s.project) ? s.project[0] : s.project
    const rate = proj?.hourly_rate ?? 0
    return sum + ((s.duration_minutes ?? 0) / 60) * rate
  }, 0)

  // Error monitoring - fetch all non-cleared errors (not just 'new')
  const { data: recentErrors, count: errorCount } = await supabase
    .from('error_log')
    .select('*, project:projects(name)', { count: 'exact' })
    .not('status', 'in', '("ignored")')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      {/* Error Management Panel */}
      <ErrorPanel initialErrors={recentErrors ?? []} initialCount={errorCount ?? 0} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Clients" value={clientCount ?? 0} href="/clients" />
        <StatCard label="Projects" value={projectCount ?? 0} />
        <StatCard label="New Feedback" value={newFeedbackCount ?? 0} accent />
        <StatCard label="Hours This Week" value={weekHours.toFixed(1)} href="/time" />
        <StatCard label="Errors" value={errorCount ?? 0} error={(errorCount ?? 0) > 0} />
      </div>

      {/* Active Session + Billable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-1">Active Session</p>
          {activeSession ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white font-semibold">
                {(activeSession.project as { name: string } | null)?.name ?? 'Unknown'}
              </span>
              <span className="text-gray-500 text-sm">· {activeSession.category_name}</span>
            </div>
          ) : (
            <p className="text-gray-500">No active session</p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-1">This Week&apos;s Billable</p>
          <p className={`text-2xl font-bold ${weekBillable > 0 ? 'text-green-400' : 'text-gray-500'}`}>
            ${weekBillable.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Feedback</h2>
        </div>

        {!recentFeedback || recentFeedback.length === 0 ? (
          <div className="px-6 py-12 text-center">
            {(clientCount ?? 0) === 0 ? (
              <>
                <p className="text-gray-400 mb-4">Get started by adding your first client.</p>
                <Link
                  href="/clients"
                  className="inline-block mt-4 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
                >
                  Add Your First Client
                </Link>
              </>
            ) : (projectCount ?? 0) === 0 ? (
              <>
                <p className="text-gray-400 mb-4">Now create a project and share the review link with your client.</p>
                <Link
                  href="/clients"
                  className="inline-block mt-4 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
                >
                  View Clients &amp; Add a Project
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-4">No feedback yet.</p>
                <p className="text-gray-500 text-sm">
                  Share your project review links with clients to start collecting feedback.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {recentFeedback.map((item) => (
              <Link
                key={item.id}
                href={`/projects/${item.project_id}/feedback/${item.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={item.feedback_type} />
                    <span className="text-white font-semibold truncate">{item.title}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 truncate">
                    {(item.project as { name: string; client: { name: string } })?.client?.name} &middot;{' '}
                    {(item.project as { name: string })?.name}
                    {item.screen_url && <> &middot; {item.screen_url}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <SeverityDot severity={item.severity} />
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, href, accent, error }: { label: string; value: number | string; href?: string; accent?: boolean; error?: boolean }) {
  const isPositive = typeof value === 'number' ? value > 0 : parseFloat(value) > 0
  const borderClass = error ? 'border-[#EF4444]/50' : accent && isPositive ? 'border-[#F59E0B]/50' : 'border-[#27272A]'
  const valueClass = error ? 'text-[#EF4444]' : accent && isPositive ? 'text-[#F59E0B]' : 'text-white'
  const content = (
    <div className={`bg-[#18181B] border rounded-xl p-6 ${borderClass}`}>
      <p className="text-sm text-[#71717A]">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueClass}`}>
        {value}
      </p>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    bug: 'bg-red-900/50 text-red-300',
    content: 'bg-purple-900/50 text-purple-300',
    ux: 'bg-amber-900/50 text-amber-300',
    feature_request: 'bg-green-900/50 text-green-300',
    general: 'bg-gray-800 text-gray-300',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] ?? colors.general}`}>
      {type.replace('_', ' ')}
    </span>
  )
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-500',
    normal: 'bg-blue-500',
    high: 'bg-amber-500',
    critical: 'bg-red-500',
  }

  return <span className={`w-2 h-2 rounded-full ${colors[severity] ?? colors.normal}`} />
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: 'bg-blue-900/50 text-blue-300',
    reviewed: 'bg-gray-800 text-gray-300',
    in_progress: 'bg-amber-900/50 text-amber-300',
    change_made: 'bg-purple-900/50 text-purple-300',
    approved: 'bg-green-900/50 text-green-300',
    needs_revision: 'bg-orange-900/50 text-orange-300',
    resolved: 'bg-green-900/50 text-green-300',
    deferred: 'bg-gray-800 text-gray-400',
    dismissed: 'bg-gray-800 text-gray-500',
    new: 'bg-blue-900/50 text-blue-300',
  }

  const labels: Record<string, string> = {
    change_made: 'change made',
    needs_revision: 'needs revision',
    in_progress: 'in progress',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? colors.submitted}`}>
      {labels[status] ?? status}
    </span>
  )
}
