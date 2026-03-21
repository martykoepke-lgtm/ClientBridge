import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { contractId, signatureName, agreed } = await req.json()

  if (!contractId || !signatureName || !agreed) {
    return NextResponse.json({ error: 'contractId, signatureName, and agreed are required' }, { status: 400 })
  }

  // Get the authenticated user
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use service role to update the contract
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Verify the contract belongs to this client's project
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*, project:projects(client_id)')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // Verify the user is the client for this project
  const project = Array.isArray(contract.project) ? contract.project[0] : contract.project
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', project.client_id)
    .eq('auth_user_id', user.id)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'You do not have permission to sign this contract' }, { status: 403 })
  }

  // Only allow signing if status is 'sent'
  if (contract.status !== 'sent') {
    return NextResponse.json({ error: `Contract status is '${contract.status}', not 'sent'` }, { status: 400 })
  }

  // Capture IP address
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'

  // Update contract with signature
  const { data: updated, error: updateError } = await supabase
    .from('contracts')
    .update({
      status: 'client_signed',
      client_signature_name: signatureName.trim(),
      client_signature_date: new Date().toISOString(),
      client_signature_ip: ip,
    })
    .eq('id', contractId)
    .select('*')
    .single()

  if (updateError) {
    console.error('Failed to sign contract:', updateError)
    return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 })
  }

  return NextResponse.json({ contract: updated })
}
