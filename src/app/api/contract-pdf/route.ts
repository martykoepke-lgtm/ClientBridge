import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ReactPDF from '@react-pdf/renderer'
import { ContractPdfDocument } from './contract-pdf-template'
import type { ContractPdfData } from './contract-pdf-template'

export async function GET(req: NextRequest) {
  const contractId = new URL(req.url).searchParams.get('contractId')

  if (!contractId) {
    return NextResponse.json({ error: 'contractId is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch contract with project and client
  const { data: contract } = await supabase
    .from('contracts')
    .select('*, project:projects(*, client:clients(*))')
    .eq('id', contractId)
    .single()

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  const project = Array.isArray(contract.project) ? contract.project[0] : contract.project
  const client = Array.isArray(project.client) ? project.client[0] : project.client

  // Fetch company profile
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .eq('developer_id', contract.developer_id)
    .single()

  const company = companyProfile ?? {
    company_name: 'Practical Informatics LLC',
    contact_name: 'Marty Koepke',
    email: 'marty.koepke@practicalinformatics.com',
    state: 'Commonwealth of Virginia',
  }

  // Fetch milestones
  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('contract_id', contractId)
    .order('sort_order')

  // Fetch scope items
  const { data: scopeItems } = await supabase
    .from('scope_items')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')

  // Fetch revenue share phases
  const { data: phases } = await supabase
    .from('revenue_share_phases')
    .select('*')
    .eq('contract_id', contractId)
    .order('sort_order')

  const milestoneData = (milestones ?? []).map((m: { title: string; amount: number; description: string }) => ({
    title: m.title,
    amount: m.amount || 0,
    trigger: m.title || m.description || '',
  }))

  const paymentParts = []
  if (contract.payment_method) paymentParts.push(`Payment via ${contract.payment_method.toUpperCase()}`)
  if (contract.net_terms) paymentParts.push(`Net ${contract.net_terms} days`)
  if (contract.late_fee_percent) paymentParts.push(`Late fee: ${contract.late_fee_percent}% per month`)

  // Build formatted addresses
  const clientAddress = [client?.street, [client?.city, client?.state, client?.zip].filter(Boolean).join(', ')].filter(Boolean).join(', ')
  const contractorAddress = [company.street, [company.city, company.state, company.zip].filter(Boolean).join(', ')].filter(Boolean).join(', ')

  const pdfData: ContractPdfData = {
    company: {
      name: client?.company || client?.name || 'Client',
      contactName: client?.name || '',
      email: client?.email || '',
      address: clientAddress || undefined,
      state: client?.state || undefined,
    },
    contractor: {
      name: `${company.contact_name || 'Contractor'} / ${company.company_name}`,
      email: company.email || '',
      state: company.state || 'State of California',
      address: contractorAddress || undefined,
    },
    project: project.name,
    agreementDate: contract.agreement_date,
    sections: (contract.sections ?? []).map((sec: { number: number; title: string; content: string; subsections: { id: string; title: string; content: string }[] }) => ({
      number: sec.number,
      title: sec.title,
      content: sec.content,
      subsections: sec.subsections ?? [],
    })),
    milestones: milestoneData,
    milestoneTotal: milestoneData.reduce((sum: number, m: { amount: number }) => sum + m.amount, 0),
    scopeInItems: (scopeItems ?? []).filter((s: { in_scope: boolean }) => s.in_scope).map((s: { label: string }) => s.label),
    scopeOutItems: (scopeItems ?? []).filter((s: { in_scope: boolean }) => !s.in_scope).map((s: { label: string }) => s.label),
    changeOrderPolicy: contract.change_order_policy,
    revenuePhases: (phases ?? []).map((p: { name: string; percentage: number; is_ongoing: boolean; duration_months: number | null }) => ({
      name: p.name,
      percentage: p.percentage,
      duration: p.is_ongoing ? 'Ongoing' : `${p.duration_months ?? 12} months`,
    })),
    revenueCap: contract.revenue_share_cap,
    paymentTerms: paymentParts.join(' · ') || 'To be determined',
  }

  try {
    const pdfStream = await ReactPDF.renderToStream(ContractPdfDocument(pdfData))

    const chunks: Uint8Array[] = []
    for await (const chunk of pdfStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    const filename = `contract-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('Contract PDF generation error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
