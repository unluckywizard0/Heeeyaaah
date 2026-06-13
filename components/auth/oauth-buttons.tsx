'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const PROVIDERS = [
  { id: 'discord', label: 'Discord' },
  { id: 'google', label: 'Google' },
] as const

type ProviderId = (typeof PROVIDERS)[number]['id']

export function OAuthButtons() {
  const [pending, setPending] = useState<ProviderId | null>(null)
  const [error, setError] = useState('')

  async function signIn(provider: ProviderId) {
    setPending(provider)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    // On success the browser is redirected to the provider; we only land here on error.
    if (error) {
      setPending(null)
      setError(error.message)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant="outline"
            onClick={() => signIn(p.id)}
            disabled={pending !== null}
            aria-busy={pending === p.id}
          >
            {pending === p.id ? 'Redirecting…' : p.label}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm" style={{ color: '#e74c3c' }}>
          {error}
        </p>
      )}
    </div>
  )
}
