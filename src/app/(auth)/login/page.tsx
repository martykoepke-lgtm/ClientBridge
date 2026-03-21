'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset-password`
      : '/auth/reset-password'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  if (mode === 'forgot') {
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
              Reset Password
            </h1>
            <p className="text-gray-400 mt-2">Enter your email and we&apos;ll send a reset link</p>
          </div>

          {resetSent ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">
              <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-lg text-sm">
                Check your email for a password reset link. It may take a minute to arrive.
              </div>
              <button
                onClick={() => { setMode('login'); setResetSent(false); setError(null); }}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleResetPassword}
              className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5"
            >
              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 disabled:cursor-not-allowed text-[#09090B] font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-sm text-gray-400">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Back to Sign In
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    )
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
            ClientBridge
          </h1>
          <p className="text-gray-400 mt-2">Sign in to your dashboard</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 disabled:cursor-not-allowed text-[#09090B] font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
