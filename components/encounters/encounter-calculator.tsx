'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  rateEncounter,
  addMonster,
  type PartyGroup,
  type MonsterGroup,
  type EncounterRating,
} from '@/lib/encounter/difficulty'
import { CR_VALUES, formatCrValue } from '@/lib/encounter/xp-tables'
import type { EncounterTemplate } from '@/lib/types/dnd'
import { TemplateManager } from './template-manager'
import { MonsterSearch } from './monster-search'

const RATING_LABEL: Record<EncounterRating, string> = {
  none: 'No monsters',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  deadly: 'Beyond High',
}

// Difficulty colours: green → gold → orange → red as the encounter gets harder.
const RATING_COLOR: Record<EncounterRating, string> = {
  none: 'var(--foreground-muted)',
  low: '#4ade80',
  moderate: 'var(--accent-gold)',
  high: '#fb923c',
  deadly: '#f87171',
}

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

export function EncounterCalculator({
  campaignId,
  templates = [],
}: {
  /** Set only when the viewer DMs the selected campaign; enables save/load. */
  campaignId?: string
  templates?: EncounterTemplate[]
} = {}) {
  const [party, setParty] = useState<PartyGroup[]>([{ level: 1, count: 4 }])
  const [monsters, setMonsters] = useState<MonsterGroup[]>([{ cr: 1, count: 1 }])
  const [showSearch, setShowSearch] = useState(false)

  const assessment = useMemo(() => rateEncounter(party, monsters), [party, monsters])
  const barPct = Math.min(100, Math.round(assessment.fractionOfHigh * 100))

  return (
    <div className="space-y-6">
      {campaignId && (
        <TemplateManager
          campaignId={campaignId}
          templates={templates}
          party={party}
          monsters={monsters}
          onLoad={(p, m) => {
            setParty(p)
            setMonsters(m)
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_minmax(0,18rem)]">
      {/* ── Party ─────────────────────────────────────────────────────────── */}
      <Section title="Party" onAdd={() => setParty((p) => [...p, { level: 1, count: 1 }])}>
        {party.map((group, i) => (
          <Row key={i} onRemove={party.length > 1 ? () => setParty((p) => p.filter((_, j) => j !== i)) : undefined}>
            <NumberField
              label="Characters"
              value={group.count}
              min={1}
              onChange={(v) => setParty((p) => p.map((g, j) => (j === i ? { ...g, count: v } : g)))}
            />
            <SelectField
              label="Level"
              value={String(group.level)}
              onChange={(v) => setParty((p) => p.map((g, j) => (j === i ? { ...g, level: Number(v) } : g)))}
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </SelectField>
          </Row>
        ))}
      </Section>

      {/* ── Monsters ──────────────────────────────────────────────────────── */}
      <Section title="Monsters" onAdd={() => setMonsters((m) => [...m, { cr: 1, count: 1 }])}>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            aria-expanded={showSearch}
          >
            {showSearch ? 'Close bestiary' : 'Search bestiary'}
          </Button>
        </div>

        {showSearch && (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
          >
            <MonsterSearch onAdd={(monster) => setMonsters((m) => addMonster(m, monster))} />
          </div>
        )}

        {monsters.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            No monsters yet — add one to size the fight.
          </p>
        )}
        {monsters.map((group, i) => (
          <Row
            key={i}
            label={group.name}
            onRemove={() => setMonsters((m) => m.filter((_, j) => j !== i))}
          >
            <NumberField
              label="Count"
              value={group.count}
              min={1}
              onChange={(v) => setMonsters((m) => m.map((g, j) => (j === i ? { ...g, count: v } : g)))}
            />
            <SelectField
              label="CR"
              value={String(group.cr)}
              onChange={(v) => setMonsters((m) => m.map((g, j) => (j === i ? { ...g, cr: Number(v) } : g)))}
            >
              {CR_VALUES.map((cr) => (
                <option key={cr} value={cr}>
                  {formatCrValue(cr)}
                </option>
              ))}
            </SelectField>
          </Row>
        ))}
      </Section>

      {/* ── Result ────────────────────────────────────────────────────────── */}
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          Difficulty
        </h2>
        <p className="mt-2 text-2xl font-bold" style={{ color: RATING_COLOR[assessment.rating] }}>
          {RATING_LABEL[assessment.rating]}
        </p>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--background-elevated)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${barPct}%`, background: RATING_COLOR[assessment.rating] }}
            role="progressbar"
            aria-valuenow={barPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Encounter XP as a percentage of the High budget"
          />
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <Stat label="Monster XP" value={assessment.totalXp.toLocaleString()} strong />
          <Stat label="Low budget" value={assessment.budget.low.toLocaleString()} />
          <Stat label="Moderate budget" value={assessment.budget.moderate.toLocaleString()} />
          <Stat label="High budget" value={assessment.budget.high.toLocaleString()} />
        </dl>

        <p className="mt-4 text-xs" style={{ color: 'var(--foreground-muted)' }}>
          2024 rules: monster XP is summed with no multiplier and compared to the party&apos;s budget.
        </p>
      </div>
      </div>
    </div>
  )
}

function Section({
  title,
  onAdd,
  children,
}: {
  title: string
  onAdd: () => void
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          {title}
        </h2>
        <Button variant="outline" size="sm" onClick={onAdd} type="button">
          + Add
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Row({
  children,
  onRemove,
  label,
}: {
  children: React.ReactNode
  onRemove?: () => void
  label?: string
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
    >
      {label && (
        <p className="mb-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {label}
        </p>
      )}
      <div className="flex items-end gap-3">
        {children}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onRemove}
          disabled={!onRemove}
          aria-label="Remove"
        >
          ✕
        </Button>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: number
  min: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
      {label}
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        {children}
      </select>
    </label>
  )
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt style={{ color: 'var(--foreground-muted)' }}>{label}</dt>
      <dd style={{ color: 'var(--foreground)', fontWeight: strong ? 600 : 400 }}>{value}</dd>
    </div>
  )
}
