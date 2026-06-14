'use client'

import { useState, useTransition } from 'react'
import type { CombatCreature } from '@/lib/types/dnd'
import { CONDITIONS } from '@/lib/types/dnd'
import {
  damageCreatureAction,
  healCreatureAction,
  setTempHpAction,
  toggleConditionAction,
  toggleConcentrationAction,
  recordDeathSaveAction,
  resetDeathSavesAction,
} from '@/lib/actions/combat-vitals'
import { deathSaveOutcome } from '@/lib/combat/vitals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function CombatantVitals({ creature }: { creature: CombatCreature }) {
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const n = Math.max(0, Math.floor(Number(amount) || 0))

  function doDamage() {
    if (n <= 0) return
    startTransition(async () => {
      const result = await damageCreatureAction(creature.id, n)
      setWarning(
        result.concentrationCheck
          ? `${result.concentrationCheck.name} must make a DC ${result.concentrationCheck.dc} Constitution save to keep concentration.`
          : null,
      )
      setAmount('')
    })
  }

  function doHeal() {
    if (n <= 0) return
    startTransition(async () => {
      await healCreatureAction(creature.id, n)
      setWarning(null)
      setAmount('')
    })
  }

  function doTemp() {
    startTransition(async () => {
      await setTempHpAction(creature.id, n)
      setAmount('')
    })
  }

  const death = deathSaveOutcome({
    successes: creature.death_save_successes,
    failures: creature.death_save_failures,
  })

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            Vitals
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-3">
        {/* HP ----------------------------------------------------------------- */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {creature.name}
            </span>
            <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              {creature.hp_current}/{creature.hp_max}
              {creature.temp_hp > 0 && (
                <span style={{ color: 'var(--accent-gold)' }}> +{creature.temp_hp} temp</span>
              )}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-24"
              aria-label="HP change amount"
            />
            <Button size="sm" variant="destructive" onClick={doDamage} type="button">
              Damage
            </Button>
            <Button size="sm" variant="outline" onClick={doHeal} type="button">
              Heal
            </Button>
            <Button size="sm" variant="ghost" onClick={doTemp} type="button">
              Temp
            </Button>
          </div>
        </div>

        {warning && (
          <p
            role="alert"
            className="rounded-md p-2 text-xs"
            style={{ background: 'var(--background-elevated)', color: 'var(--accent-gold)' }}
          >
            ⚠ {warning}
          </p>
        )}

        {/* Concentration ------------------------------------------------------ */}
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
          <input
            type="checkbox"
            checked={creature.concentration}
            onChange={() =>
              startTransition(() => toggleConcentrationAction(creature.id, creature.concentration))
            }
          />
          Concentrating
        </label>

        {/* Conditions --------------------------------------------------------- */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
              Conditions
            </span>
            <Input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Rounds"
              className="w-20"
              aria-label="Condition duration in rounds (optional)"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONDITIONS.map((cond) => {
              const active = creature.conditions.includes(cond)
              const timer = creature.condition_timers?.[cond]
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() =>
                    startTransition(() =>
                      toggleConditionAction(
                        creature.id,
                        cond,
                        active ? undefined : Math.max(0, Math.floor(Number(duration) || 0)),
                      ),
                    )
                  }
                  className="rounded px-1.5 py-0.5 text-xs transition-colors"
                  style={{
                    background: active ? 'var(--accent-gold)' : 'var(--background-elevated)',
                    color: active ? 'var(--background)' : 'var(--foreground-muted)',
                  }}
                  aria-pressed={active}
                >
                  {cond}
                  {active && timer ? ` (${timer})` : ''}
                </button>
              )
            })}
          </div>
        </div>

        {/* Death saves -------------------------------------------------------- */}
        {creature.is_player && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
                Death saves
              </span>
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    death === 'dead' ? '#f87171' : death === 'stable' ? '#4ade80' : 'var(--foreground-muted)',
                }}
              >
                {death === 'dead' ? 'Dead' : death === 'stable' ? 'Stable' : 'Dying'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Pips label="Successes" filled={creature.death_save_successes} color="#4ade80" />
              <Pips label="Failures" filled={creature.death_save_failures} color="#f87171" />
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => startTransition(() => recordDeathSaveAction(creature.id, 'success'))}
              >
                + Success
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => startTransition(() => recordDeathSaveAction(creature.id, 'failure'))}
              >
                + Failure
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => startTransition(() => resetDeathSavesAction(creature.id))}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Pips({ label, filled, color }: { label: string; filled: number; color: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${label}: ${filled} of 3`}>
      <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
        {label}
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: i < filled ? color : 'var(--background-elevated)', border: '1px solid var(--border)' }}
        />
      ))}
    </div>
  )
}
