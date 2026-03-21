'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/clients', label: 'Clients' },
    { href: '/time', label: 'Time' },
    { href: '/reports', label: 'Reports' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="border-b border-[#1C1C22] bg-[#0C0C0E]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <svg width="28" height="28" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="38" height="38" rx="8" stroke="#FAFAFA" strokeWidth="2" fill="none"/>
                <text x="10" y="30" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#FAFAFA">cb</text>
              </svg>
              <span className="text-base font-extrabold text-white tracking-tight">ClientBridge</span>
            </Link>
            <div className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
                      ? 'bg-[#18181B] text-white'
                      : 'text-[#71717A] hover:text-white hover:bg-[#18181B]/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-[#52525B]">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-[#71717A] hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
