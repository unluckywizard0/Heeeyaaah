import type { Metadata } from 'next'
import { ItemBrowser } from '@/components/rules/item-browser'

export const metadata: Metadata = {
  title: 'Items',
}

export default function ItemsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Items
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Filter by edition, rarity, and type. Click an item for the full description.
        </p>
      </header>

      <ItemBrowser />
    </div>
  )
}
