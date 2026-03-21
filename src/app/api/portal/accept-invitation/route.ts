import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { token, userId } = await req.json()

  if (!token || !userId) {
    return NextResponse.json({ error: 'token and userId required' }, { status: 400 })
  }

  // Use service role to bypass RLS for linking
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Validate invitation
  const { data: invitation, error: invError } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
  }

  if (invitation.status === 'accepted') {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })
  }

  // Link auth user to client record
  const { error: clientError } = await supabase
    .from('clients')
    .update({
      auth_user_id: userId,
      invite_accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.client_id)

  if (clientError) {
    console.error('Failed to link client:', clientError)
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }

  // Mark invitation as accepted
  await supabase
    .from('client_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  return NextResponse.json({ success: true })
}
