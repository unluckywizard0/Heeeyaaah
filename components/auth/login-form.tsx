'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State = 'idle' | 'loading' | 'sent' | 'error'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    })

    if (error) {
      setState('error')
      setErrorMessage(error.message)
    } else {
      setState('sent')
    }
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border p-6 text-center"
        style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
      >
        <p className="font-semibold" style={{ color: 'var(--accent-gold)' }}>
          Check your email
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          We sent a magic link to <strong style={{ color: 'var(--foreground)' }}>{email}</strong>.
          Click it to sign in.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border p-6 space-y-5"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
      noValidate
    >
      <div className="space-y-2">
        {/* WCAG 1.3.1 + 3.3.2 — explicit <label> associated via htmlFor */}
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-describedby={state === 'error' ? 'email-error' : undefined}
          aria-invalid={state === 'error'}
          disabled={state === 'loading'}
        />
        {/* WCAG 3.3.1 — error in text, not colour alone */}
        {state === 'error' && (
          <p
            id="email-error"
            role="alert"
            className="text-sm flex items-center gap-1"
            style={{ color: '#e74c3c' }}
          >
            <span aria-hidden="true">⚠</span>
            {errorMessage || 'Something went wrong. Please try again.'}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={state === 'loading' || !email}
        aria-busy={state === 'loading'}
      >
        {state === 'loading' ? 'Sending…' : 'Send magic link'}
      </Button>

      <p className="text-xs text-center" style={{ color: 'var(--foreground-muted)' }}>
        No password needed — we&apos;ll email you a sign-in link.
      </p>
    </form>
  )
}
