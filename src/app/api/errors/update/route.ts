import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Error status management endpoint
// Handles: resolve, dismiss, clear resolved, bulk operations

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, errorIds } = await req.json()

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  switch (action) {
    case 'resolve': {
      if (!errorIds?.length) return NextResponse.json({ error: 'errorIds required' }, { status: 400 })
      const { error } = await supabase
        .from('error_log')
        .update({ status: 'resolved' })
        .in('id', errorIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ updated: errorIds.length })
    }

    case 'dismiss': {
      if (!errorIds?.length) return NextResponse.json({ error: 'errorIds required' }, { status: 400 })
      const { error } = await supabase
        .from('error_log')
        .update({ status: 'ignored', resolution_notes: 'Manually dismissed by developer.' })
        .in('id', errorIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ updated: errorIds.length })
    }

    case 'clear_resolved': {
      // Delete all resolved/verified/ignored errors for this developer's projects.
      // Uses service role client to bypass RLS (no DELETE policy exists on error_log).
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
      }

      // First get the developer's project IDs using their auth
      const { data: projects } = await supabase.from('projects').select('id')
      if (!projects?.length) return NextResponse.json({ cleared: 0 })

      const projectIds = projects.map(p => p.id)

      // Use service role to delete (bypasses RLS)
      const serviceClient = createServiceClient(supabaseUrl, serviceKey)
      const { count, error } = await serviceClient
        .from('error_log')
        .delete({ count: 'exact' })
        .in('project_id', projectIds)
        .in('status', ['resolved', 'verified', 'ignored'])

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ cleared: count ?? 0 })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
