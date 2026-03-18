import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: errors, count } = await supabase
    .from('error_log')
    .select('*, project:projects(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ errors: errors ?? [], count: count ?? 0 })
}
