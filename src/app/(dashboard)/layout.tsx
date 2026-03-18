import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { TimerBar } from '@/components/dashboard/timer-bar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#09090B] pb-12">
      <DashboardNav user={user} />
      <main className="w-full px-6 sm:px-8 lg:px-10 py-8">
        {children}
      </main>
      <TimerBar />
    </div>
  )
}
