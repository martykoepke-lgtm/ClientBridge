import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that never require authentication
const PUBLIC_ROUTES = [
  '/review',
  '/scope',
  '/api/proxy',
  '/auth/callback',
  '/auth/reset-password',
  '/api/auth',
  '/api/invite-client',
  '/api/portal/accept-invitation',
  '/api/contract-sign',
  '/api/scope',
]

// Portal auth pages (public, no auth needed)
const PORTAL_AUTH_ROUTES = [
  '/portal/login',
  '/portal/signup',
  '/portal/forgot-password',
  '/portal/reset-password',
  '/portal/accept',
]

// Developer-only routes — clients should never reach these
const DEVELOPER_ROUTES = [
  '/dashboard',
  '/clients',
  '/projects',
  '/settings',
  '/reports',
  '/time',
  '/invoices',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1. Allow fully public routes (review links, API proxy, auth callbacks)
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // 2. Allow portal auth pages (login, signup, forgot/reset password)
  if (PORTAL_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    // If already authenticated as a client, redirect to portal
    if (user && user.user_metadata?.role === 'client') {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 3. Allow landing page and developer auth pages without auth
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth')
  ) {
    // If authenticated client tries to access developer login, redirect to portal
    if (user && user.user_metadata?.role === 'client' && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 4. From here on, authentication is required
  if (!user) {
    const url = request.nextUrl.clone()
    // If trying to access portal, redirect to portal login
    if (pathname.startsWith('/portal')) {
      url.pathname = '/portal/login'
    } else {
      url.pathname = '/login'
    }
    return NextResponse.redirect(url)
  }

  // 5. Role-based routing for authenticated users
  const isClient = user.user_metadata?.role === 'client'

  // Client trying to access developer routes → redirect to portal
  if (isClient && DEVELOPER_ROUTES.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/portal'
    return NextResponse.redirect(url)
  }

  // Developer trying to access portal → allow it (developers may want to test/preview)
  // No redirect needed

  return supabaseResponse
}
