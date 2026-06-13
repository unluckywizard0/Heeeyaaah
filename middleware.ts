import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Build a redirect that preserves any auth cookies getUser() refreshed onto
  // supabaseResponse — a bare NextResponse.redirect would drop them and can
  // cause session-refresh loops.
  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => res.cookies.set(cookie))
    return res
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && pathname.startsWith('/app')) {
    return redirectTo('/login')
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/')) {
    return redirectTo('/app')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
