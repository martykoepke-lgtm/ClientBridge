import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PortalSignOut from './_components/portal-sign-out'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get client info for display
  let clientName = ''
  if (user) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, company')
      .eq('auth_user_id', user.id)
      .single()
    clientName = client?.company || client?.name || ''
  }

  // If not authenticated, render children only (auth pages handle their own layout)
  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      <nav className="border-b border-[#1C1C22] bg-[#0C0C0E]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full px-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-14">
            <Link href="/portal" className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="38" height="38" rx="8" stroke="#FAFAFA" strokeWidth="2" fill="none"/>
                <text x="10" y="30" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#FAFAFA">cb</text>
              </svg>
              <span className="text-sm font-semibold text-white">Client Portal</span>
              {clientName && <span className="text-xs text-gray-500 ml-1">{clientName}</span>}
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">{user.email}</span>
              <PortalSignOut />
            </div>
          </div>
        </div>
      </nav>

      <main className="px-6 sm:px-8 lg:px-10 py-8">
        {children}
      </main>
    </div>
  )
}
