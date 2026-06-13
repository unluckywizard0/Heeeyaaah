import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppNav } from '@/components/layout/nav'

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
        <AppNav />
      </aside>

      <main
        id="main-content"
        className="flex-1 overflow-auto p-6"
        style={{ background: 'var(--background)' }}
      >
        {children}
      </main>
    </div>
  )
}
