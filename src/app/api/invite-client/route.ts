import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { clientId, email, projectId } = await req.json()

  if (!clientId || !email) {
    return NextResponse.json({ error: 'clientId and email required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get client info for the email
  const { data: client } = await supabase
    .from('clients')
    .select('*, projects:projects(id, name)')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Get developer's company profile
  const { data: company } = await supabase
    .from('company_profile')
    .select('*')
    .eq('developer_id', client.developer_id)
    .single()

  const companyName = company?.company_name || 'Your developer'

  // Create invitation record
  const { data: invitation, error: invError } = await supabase
    .from('client_invitations')
    .insert({
      client_id: clientId,
      project_id: projectId || null,
      developer_id: client.developer_id,
      email,
    })
    .select('*')
    .single()

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  // Update client invited_at
  await supabase.from('clients').update({ invited_at: new Date().toISOString() }).eq('id', clientId)

  // Send email via Resend (if API key is configured)
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/accept/${invitation.token}`

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: `${companyName} has invited you to the project portal`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 8px;">You've been invited</h2>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              <strong>${companyName}</strong> has invited you to their project portal where you can review your project, sign contracts, and track progress.
            </p>
            <a href="${portalUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #F59E0B; color: #09090B; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Accept Invitation
            </a>
            <p style="color: #999; font-size: 12px;">
              This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.
            </p>
          </div>
        `,
      })
    } catch (err) {
      console.error('Email send error:', err)
      // Don't fail the request — invitation is still created
    }
  }

  return NextResponse.json({
    invitation,
    portalUrl, // Return URL so developer can copy it if email fails
  })
}
