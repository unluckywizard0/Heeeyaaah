'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/characters', label: 'Characters' },
  { href: '/app/combat', label: 'Combat' },
  { href: '/app/encounters', label: 'Encounters' },
  { href: '/app/notes', label: 'Notes' },
  { href: '/app/rules', label: 'Rules' },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation">
      <ul role="list" className="space-y-1 px-3 py-4">
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || (href !== '/app' && pathname.startsWith(href))
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: isActive ? 'var(--background-elevated)' : 'transparent',
                  color: isActive ? 'var(--accent-gold)' : 'var(--foreground)',
                }}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
