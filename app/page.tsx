import { redirect } from 'next/navigation'

// Middleware handles the actual redirect logic (auth → /app, no-auth → /login)
// This is a fallback in case middleware misses the root path.
export default function RootPage() {
  redirect('/login')
}
