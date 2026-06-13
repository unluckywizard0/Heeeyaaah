import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Magic-link / OAuth PKCE callback.
// Supabase emails a link back here with a `?code=...`; we exchange it for a
// session (which sets the auth cookies) and then forward the user on.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code, or the exchange failed — bounce back to login with a flag.
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
