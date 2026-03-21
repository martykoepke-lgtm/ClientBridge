import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If a specific redirect was requested, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Otherwise, route based on role
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.role === 'client') {
        return NextResponse.redirect(`${origin}/portal`)
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
