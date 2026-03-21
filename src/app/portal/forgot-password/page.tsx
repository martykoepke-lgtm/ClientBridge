'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/portal/reset-password`
      : '/portal/reset-password'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-gray-400 mt-2">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">
            <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-lg text-sm">
              Check your email for a password reset link.
            </div>
            <Link
              href="/portal/login"
              className="block w-full text-center py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
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
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
              <Link href="/portal/login" className="text-amber-400 hover:text-amber-300">
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
