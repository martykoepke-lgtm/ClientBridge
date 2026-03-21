'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    loadInvitation()
  }, [token])

  async function loadInvitation() {
    // Check if already logged in as this client
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Check if already linked to a client
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (client) {
        // Already accepted — go to portal
        router.push('/portal')
        return
      }
    }

    // Load invitation
    const { data, error } = await supabase
      .from('client_invitations')
      .select('*, client:clients(name, company)')
      .eq('token', token)
      .single()

    if (error || !data) {
      setError('This invitation link is invalid or has expired.')
      setLoading(false)
      return
    }

    if (data.status === 'accepted') {
      setError('This invitation has already been accepted. Please sign in to access your portal.')
      setLoading(false)
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setError('This invitation has expired. Please ask your developer for a new link.')
      setLoading(false)
      return
    }

    setInvitation(data)
    setLoading(false)
  }

  async function handleAccept() {
    if (!invitation) return
    setAccepting(true)
    setError(null)

    // Send magic link to client's email
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: invitation.email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/accept/${token}?complete=true`,
      },
    })

    if (authError) {
      setError(authError.message)
      setAccepting(false)
      return
    }

    setEmailSent(true)
    setAccepting(false)
  }

  // Handle return from magic link (complete=true in URL)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('complete') === 'true') {
      completeAcceptance()
    }
  }, [])

  async function completeAcceptance() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !invitation) {
      // Try loading invitation if we don't have it yet
      const { data } = await supabase
        .from('client_invitations')
        .select('*')
        .eq('token', token)
        .single()

      if (!data || !user) return

      // Link auth user to client record
      await supabase.from('clients').update({
        auth_user_id: user.id,
        invite_accepted_at: new Date().toISOString(),
      }).eq('id', data.client_id)

      // Mark invitation as accepted
      await supabase.from('client_invitations').update({
        status: 'accepted',
      }).eq('id', data.id)

      router.push('/portal')
      return
    }

    // Link auth user to client record
    await supabase.from('clients').update({
      auth_user_id: user.id,
      invite_accepted_at: new Date().toISOString(),
    }).eq('id', invitation.client_id)

    // Mark invitation as accepted
    await supabase.from('client_invitations').update({
      status: 'accepted',
    }).eq('id', invitation.id)

    router.push('/portal')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <p className="text-gray-400">Loading invitation...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <svg width="48" height="48" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="38" height="38" rx="8" stroke="#FAFAFA" strokeWidth="2" fill="none"/>
              <text x="10" y="30" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#FAFAFA">cb</text>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invitation Issue</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <a href="/portal" className="text-blue-400 hover:text-blue-300 text-sm">Go to Portal Login</a>
        </div>
      </div>
    )
  }

  const client = Array.isArray(invitation.client) ? invitation.client[0] : invitation.client

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="38" height="38" rx="8" stroke="#FAFAFA" strokeWidth="2" fill="none"/>
              <text x="10" y="30" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26" fill="#FAFAFA">cb</text>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to ClientBridge</h1>
          <p className="text-gray-400 mt-2">You've been invited to the project portal</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          {emailSent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
              <p className="text-gray-400 text-sm mb-4">
                We sent a sign-in link to <strong className="text-white">{invitation.email}</strong>. Click the link in the email to access your portal.
              </p>
              <p className="text-gray-500 text-xs">Didn't receive it? Check your spam folder or try again.</p>
              <button
                onClick={() => { setEmailSent(false); handleAccept() }}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300"
              >
                Resend link
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm text-gray-400">Invited as</p>
                <p className="text-lg font-semibold text-white">{client?.name || 'Client'}</p>
                {client?.company && <p className="text-sm text-gray-500">{client.company}</p>}
              </div>

              <div className="mb-6 p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-white">{invitation.email}</p>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Click below to receive a sign-in link at your email address. No password needed.
              </p>

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-700 text-[#09090B] font-semibold rounded-lg transition-colors"
              >
                {accepting ? 'Sending...' : 'Accept & Sign In'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
