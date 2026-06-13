import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { OAuthButtons } from '@/components/auth/oauth-buttons'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--accent-gold)' }}>
          Nerdos D&amp;D
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Sign in to your campaign
        </p>
      </div>

      <LoginForm />

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          or
        </span>
        <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>

      <OAuthButtons />
    </div>
  )
}
