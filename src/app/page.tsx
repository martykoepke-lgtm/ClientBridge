import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* cb monogram */}
        <div className="flex justify-center mb-6">
          <svg width="56" height="56" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="38" height="38" rx="8" stroke="#FAFAFA" strokeWidth="2" fill="none"/>
            <text x="10" y="30" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#FAFAFA">cb</text>
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          ClientBridge
        </h1>
        <p className="text-lg text-[#71717A] mt-2">
          by Practical Informatics
        </p>
        <p className="text-[#A1A1AA] mt-4 mb-8">
          Your clients review the live app, submit feedback tied to exactly what they see, and track progress — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] font-semibold rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-6 py-2.5 bg-[#18181B] hover:bg-[#27272A] text-white font-medium rounded-lg border border-[#27272A] transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}
