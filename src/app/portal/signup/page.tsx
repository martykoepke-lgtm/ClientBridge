'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SignupForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [invitationLoading, setInvitationLoading] = useState(true)
  const [invitationError, setInvitationError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const supabase = createClient()

  useEffect(() => {
    if (!token) {
      setInvitationError('No invitation token provided. Please use the link from your invitation email.')
      setInvitationLoading(false)
      return
    }
    loadInvitation()
  }, [token])

  async function loadInvitation() {
    // Check if already logged in as a client
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (client) {
        router.push('/portal')
        return
      }
    }

    const { data, error } = await supabase
      .from('client_invitations')
      .select('*, client:clients(name, company)')
      .eq('token', token!)
      .single()

    if (error || !data) {
      setInvitationError('This invitation link is invalid.')
      setInvitationLoading(false)
      return
    }

    if (data.status === 'accepted') {
      setInvitationError('This invitation has already been accepted.')
      setInvitationLoading(false)
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setInvitationError('This invitation has expired. Please ask for a new link.')
      setInvitationLoading(false)
      return
    }

    setInvitation(data)
    setInvitationLoading(false)
  }

  async function handleSignup(e: React.FormEvent) {
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

    // Create account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: { role: 'client' },
      },
    })

    if (signUpError) {
      // If user already exists, try signing in
      if (signUpError.message.includes('already registered')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        })
        if (signInError) {
          setError('An account with this email already exists. Try signing in instead.')
          setLoading(false)
          return
        }
      } else {
        setError(signUpError.message)
        setLoading(false)
        return
      }
    }

    // Sign in immediately (signUp with email confirmation disabled returns a session,
    // but let's ensure we have one)
    if (!signUpData?.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
    }

    // Link the auth user to the client record via API (uses service role)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const res = await fetch('/api/portal/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: user.id }),
      })

      if (!res.ok) {
        const { error: apiError } = await res.json()
        setError(apiError || 'Failed to activate portal access')
        setLoading(false)
        return
      }
    }

    router.push('/portal')
    router.refresh()
  }

  if (invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <p className="text-gray-400">Loading invitation...</p>
      </div>
    )
  }

  if (invitationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Invitation Issue</h1>
          <p className="text-gray-400 mb-6">{invitationError}</p>
          <Link href="/portal/login" className="text-amber-400 hover:text-amber-300 text-sm">
            Sign in to your portal
          </Link>
        </div>
      </div>
    )
  }

  const client = Array.isArray(invitation.client) ? invitation.client[0] : invitation.client

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Create Your Account
          </h1>
          <p className="text-gray-400 mt-2">
            Set up your portal access for {client?.company || client?.name || 'your project'}
          </p>
        </div>

        <form
          onSubmit={handleSignup}
          className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Email</p>
            <p className="text-sm text-white">{invitation.email}</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Create Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/40 disabled:cursor-not-allowed text-[#09090B] font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account & Enter Portal'}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/portal/login" className="text-amber-400 hover:text-amber-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function PortalSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
