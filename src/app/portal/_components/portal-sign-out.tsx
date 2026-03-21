'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PortalSignOut() {
  const supabase = createClient()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
    >
      Sign out
    </button>
  )
}
