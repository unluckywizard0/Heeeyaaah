import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppNav } from '@/components/layout/nav'
import { DiceTray } from '@/components/dice/dice-tray'
import { DiceFab } from '@/components/dice/dice-fab'
import { signOut } from '@/lib/actions/auth'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <aside
        className="w-56 shrink-0 border-r flex flex-col"
        style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
      >
        <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--accent-gold)' }}>
            Nerdos D&amp;D
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AppNav />
        </div>
        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          <p
            className="truncate px-1 pb-2 text-xs"
            style={{ color: 'var(--foreground-muted)' }}
            title={user.email ?? undefined}
          >
            {user.email}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-[var(--background-elevated)]"
              style={{ color: 'var(--foreground)' }}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main
        id="main-content"
        className="flex-1 overflow-auto p-6"
        style={{ background: 'var(--background)' }}
      >
        {children}
      </main>

      <DiceTray />
      <DiceFab />
    </div>
  )
}
