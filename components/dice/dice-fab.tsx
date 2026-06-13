'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDiceRoller } from '@/hooks/use-dice-roller'
import { validateNotation } from '@/lib/dice/notation'

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100]

export function DiceFab() {
  const { rollNormal, rollAdvantage, rollDisadvantage, status, error } = useDiceRoller()
  const [open, setOpen] = useState(false)
  const [notation, setNotation] = useState('')
  const [fieldError, setFieldError] = useState('')

  const disabled = status === 'error' || status === 'initializing'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = validateNotation(notation)
    if (!v.valid) {
      setFieldError(v.error ?? 'Invalid dice notation')
      return
    }
    setFieldError('')
    void rollNormal(notation)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      {/* Base UI Trigger renders a native <button> and forwards these props. */}
      <PopoverTrigger
        type="button"
        aria-label="Roll dice"
        disabled={disabled}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: 'var(--accent-gold)', color: 'var(--background)' }}
      >
        <span aria-hidden="true">🎲</span>
      </PopoverTrigger>

      <PopoverContent align="end" side="top" className="w-72 gap-4">
        {status === 'error' && (
          <p role="alert" className="text-sm" style={{ color: '#e74c3c' }}>
            {error ?? 'Dice engine unavailable.'}
          </p>
        )}

        <form onSubmit={submit} className="space-y-2">
          <Label htmlFor="dice-notation">Dice notation</Label>
          <div className="flex gap-2">
            <Input
              id="dice-notation"
              value={notation}
              onChange={(e) => setNotation(e.target.value)}
              placeholder="2d20+5"
              aria-describedby={fieldError ? 'dice-notation-error' : undefined}
              aria-invalid={!!fieldError}
              autoComplete="off"
            />
            <Button type="submit">Roll</Button>
          </div>
          {fieldError && (
            <p id="dice-notation-error" role="alert" className="text-sm" style={{ color: '#e74c3c' }}>
              {fieldError}
            </p>
          )}
        </form>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
            Quick dice
          </p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_DICE.map((sides) => (
              <Button
                key={sides}
                type="button"
                variant="outline"
                aria-label={`Roll one d${sides}`}
                onClick={() => {
                  void rollNormal(`1d${sides}`)
                  setOpen(false)
                }}
              >
                d{sides}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
            d20 roll
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void rollAdvantage(0)
                setOpen(false)
              }}
            >
              Advantage
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void rollDisadvantage(0)
                setOpen(false)
              }}
            >
              Disadvantage
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
