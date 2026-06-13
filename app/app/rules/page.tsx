import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Rules Reference',
}

const browsers = [
  { href: '/app/rules/spells', label: 'Spells', description: 'Search and filter the spell list.' },
  { href: '/app/rules/monsters', label: 'Monsters', description: 'Search and filter the bestiary.' },
  { href: '/app/rules/items', label: 'Items', description: 'Search and filter magic and mundane items.' },
  { href: '/app/rules/conditions', label: 'Conditions', description: 'Look up condition rules text.' },
  { href: '/app/rules/feats', label: 'Feats', description: 'Search and filter feats.' },
]

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Rules Reference
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Browse 5e.tools reference content.
        </p>
      </header>

      <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {browsers.map(({ href, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-lg border p-4 transition-colors hover:bg-[var(--background-elevated)]"
              style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
            >
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                {label}
              </span>
              <p className="mt-1 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                {description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
