import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
        Dashboard
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
        Your campaigns and characters will appear here.
      </p>
    </div>
  )
}
