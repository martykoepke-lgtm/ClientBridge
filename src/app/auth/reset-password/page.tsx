'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase automatically handles the token exchange from the URL hash
    // We just need to wait for the session to be established
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
      } else {
        // Listen for auth state change (token exchange happens async)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setReady(true)
          }
        })
        // Give it a moment, then check again
        setTimeout(async () => {
          const { data: { session: s } } = await supabase.auth.getSession()
          if (s) setReady(true)
        }, 2000)
        return () => subscription.unsubscribe()
      }
    }
    checkSession()
  }, [supabase.auth])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="38" height="38" rx="8" stroke="#FAFAFA" strokeWidth="2" fill="none"/>
              <text x="10" y="30" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#FAFAFA">cb</text>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Set New Password
          </h1>
          <p className="text-gray-400 mt-2">Choose a new password for your account</p>
        </div>

        {success ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">
            <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-lg text-sm">
              Password updated successfully! Redirecting to sign in...
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleReset}
            className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5"
          >
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {!ready && (
              <div className="bg-blue-900/30 border border-blue-800 text-blue-300 px-4 py-3 rounded-lg text-sm">
                Verifying your reset link...
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ready}
              className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 disabled:cursor-not-allowed text-[#09090B] font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
