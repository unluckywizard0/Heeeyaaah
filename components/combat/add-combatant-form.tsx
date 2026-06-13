'use client'

import { useActionState } from 'react'
import { addCombatantAction, type ActionState } from '@/lib/actions/combat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionState = {}

export function AddCombatantForm({ encounterId }: { encounterId: string }) {
  const [state, formAction, pending] = useActionState(addCombatantAction, initialState)

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="encounter_id" value={encounterId} />
      <div className="space-y-2">
        <Label htmlFor="combatant-name">Name</Label>
        <Input id="combatant-name" name="name" required placeholder="Goblin" disabled={pending} className="w-40" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="combatant-dex">DEX mod</Label>
        <Input id="combatant-dex" name="dex_mod" type="number" defaultValue={0} disabled={pending} className="w-20" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="combatant-hp">Max HP</Label>
        <Input id="combatant-hp" name="hp_max" type="number" min={1} defaultValue={10} disabled={pending} className="w-20" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="combatant-ac">AC</Label>
        <Input id="combatant-ac" name="ac" type="number" min={0} defaultValue={10} disabled={pending} className="w-20" />
      </div>
      <label className="flex items-center gap-2 pb-1.5 text-sm" style={{ color: 'var(--foreground)' }}>
        <input type="checkbox" name="is_player" disabled={pending} />
        Player
      </label>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Adding…' : '+ Add combatant'}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm flex items-center gap-1" style={{ color: '#e74c3c' }}>
          <span aria-hidden="true">⚠</span>
          {state.error}
        </p>
      )}
    </form>
  )
}
