import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ReactPDF from '@react-pdf/renderer'
import { InvoiceDocument } from './invoice-template'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch project with client info
  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Fetch time sessions within date range
  let query = supabase
    .from('time_sessions')
    .select('*')
    .eq('project_id', projectId)
    .not('duration_minutes', 'is', null)
    .order('start_time', { ascending: true })

  if (from) query = query.gte('start_time', new Date(from).toISOString())
  if (to) query = query.lte('start_time', new Date(to + 'T23:59:59').toISOString())

  const { data: sessions } = await query
  const sessionData = sessions ?? []

  // Group sessions by category
  const categoryMap: Record<string, { name: string; minutes: number; sessions: number }> = {}
  for (const s of sessionData) {
    const key = s.category_name
    if (!categoryMap[key]) categoryMap[key] = { name: key, minutes: 0, sessions: 0 }
    categoryMap[key].minutes += s.duration_minutes ?? 0
    categoryMap[key].sessions += 1
  }
  const categories = Object.values(categoryMap).sort((a, b) => b.minutes - a.minutes)

  const totalMinutes = sessionData.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
  const totalHours = totalMinutes / 60
  const client = Array.isArray(project.client) ? project.client[0] : project.client

  // Calculate billing
  let rate = project.hourly_rate ?? 0
  let totalAmount = 0
  if (project.billing_type === 'flat_rate' && project.quoted_amount) {
    totalAmount = project.quoted_amount
    rate = totalHours > 0 ? project.quoted_amount / totalHours : 0
  } else {
    totalAmount = totalHours * rate
  }

  const invoiceData = {
    invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    projectName: project.name,
    clientName: client?.name ?? 'Client',
    clientCompany: client?.company ?? '',
    clientEmail: client?.email ?? '',
    billingType: project.billing_type ?? 'hourly',
    rate,
    totalHours,
    totalAmount,
    categories,
    sessions: sessionData.map(s => ({
      date: new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      category: s.category_name,
      hours: (s.duration_minutes ?? 0) / 60,
      description: s.ai_summary ?? s.description ?? '',
    })),
    dateRange: from && to
      ? `${new Date(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'All time',
  }

  try {
    const pdfStream = await ReactPDF.renderToStream(InvoiceDocument(invoiceData))

    const chunks: Uint8Array[] = []
    for await (const chunk of pdfStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
