# 3D Dice Roller (KAN-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, accessible 3D physics dice roller — a global floating dice button + quick-roll popover that animates dice in a full-screen overlay — that any future feature can trigger via a `useDiceRoller()` hook.

**Architecture:** A singleton `@3d-dice/dice-box` engine is created once and held in a Zustand store (kept out of React state for re-render safety, reset-able for tests). Pure dice logic (parsing, advantage/disadvantage keep-rules, local rolling) lives in `lib/dice/notation.ts` and is unit-tested with Vitest. UI (FAB, popover, overlay, result card) is built from the existing shadcn/Tailwind primitives and meets WCAG 2.2 AA. No DB persistence or realtime (those are KAN-16).

**Tech Stack:** Next.js 15 (App Router, TS), Zustand, `@3d-dice/dice-box` 1.1.4 (BabylonJS + AmmoJS), Tailwind v4, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-13-3d-dice-roller-design.md`

**Notes on deviations from spec (deliberate):**
- `<DiceTray>` is mounted as a normal `'use client'` component, **not** wrapped in `dynamic(ssr:false)`. The dice-box engine is imported lazily inside a client-only `useEffect` via `await import(...)`, so it never loads during SSR — and `next/dynamic` `ssr:false` is disallowed from Server Components in Next 15 anyway.
- `dice-fab.tsx` contains the quick-roll popover inline (the spec listed a separate `quick-roll-popover.tsx`). They are tightly coupled and trivially small; one file is cleaner.
- Init failure surfaces as an accessible inline state (disabled FAB + `role="alert"` message) rather than a toast library, to avoid adding a dependency.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/copy-dice-assets.mjs` | Copy dice-box assets into `public/assets/dice-box/` (no new dep). |
| `lib/dice/notation.ts` | Pure logic: parse/validate notation, local roll, advantage/disadvantage keep-rules, totals. |
| `lib/dice/notation.test.ts` | Vitest unit tests for the above. |
| `stores/dice-store.ts` | Zustand store: engine lifecycle, status, `roll`/`rollD20`/`clear`, reduced-motion flag, result mapping. |
| `stores/dice-store.test.ts` | Vitest store tests with a mocked engine. |
| `hooks/use-dice-roller.ts` | Thin public API hook over the store. |
| `components/dice/roll-result.tsx` | Overlay result card + `aria-live` announcement. |
| `components/dice/dice-tray.tsx` | Mounts overlay container, inits engine, wires reduced-motion + Escape/auto dismiss. |
| `components/dice/dice-fab.tsx` | Floating button + quick-roll popover (notation, quick dice, adv/disadv). |
| `components/ui/popover.tsx` | shadcn Popover (added via CLI). |
| `app/app/layout.tsx` | Mounts `<DiceTray/>` + `<DiceFab/>` once in the authed shell. |
| `types/dice-box.d.ts` | Ambient module types for `@3d-dice/dice-box` *(only if the package ships none)*. |
| `vitest.config.ts` | Vitest config (node env, `@/` alias). |

---

## Task 1: Project setup — deps, assets, test harness

**Files:**
- Create: `scripts/copy-dice-assets.mjs`, `vitest.config.ts`, (maybe) `types/dice-box.d.ts`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Install dependencies** (use the fresh-cache workaround — npm cache has root-owned files in this environment)

```bash
cd "heeeyaaah"
npm install --cache /tmp/npm-fresh-cache @3d-dice/dice-box@^1.1.4
npm install --cache /tmp/npm-fresh-cache -D vitest@^2
```

- [ ] **Step 2: Confirm the engine's exact API + asset location** (de-risk the version)

```bash
node -e "console.log(require('@3d-dice/dice-box/package.json').version, '| types:', require('@3d-dice/dice-box/package.json').types || 'none')"
ls node_modules/@3d-dice/dice-box/dist/assets | head
```
Expected: prints `1.1.4 | types: ...`, and the assets directory lists `ammo/`, `themes/`, etc. Note whether `types` is present — it decides Step 6.

- [ ] **Step 3: Create the asset-copy script**

Create `scripts/copy-dice-assets.mjs`:
```js
import { cp, access } from 'node:fs/promises'
import path from 'node:path'

const src = path.resolve('node_modules/@3d-dice/dice-box/dist/assets')
const dest = path.resolve('public/assets/dice-box')

try {
  await access(src)
} catch {
  console.warn(`[dice-assets] source not found at ${src}; skipping (deps not installed yet?)`)
  process.exit(0)
}

await cp(src, dest, { recursive: true })
console.log(`[dice-assets] copied dice-box assets -> ${dest}`)
```

- [ ] **Step 4: Wire package.json scripts**

In `package.json` `"scripts"`, add `postinstall` and `prebuild`, and `test`/`test:watch`. Result:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "postinstall": "node scripts/copy-dice-assets.mjs",
  "prebuild": "node scripts/copy-dice-assets.mjs"
}
```

- [ ] **Step 5: Ignore the generated assets**

Append to `.gitignore`:
```
# dice-box assets are copied from node_modules on install/build
/public/assets/dice-box
```

- [ ] **Step 6: Add ambient types ONLY if the package ships none** (from Step 2)

If `types: none`, create `types/dice-box.d.ts`:
```ts
declare module '@3d-dice/dice-box' {
  export interface DiceBoxDie {
    groupId: number
    rollId: number
    sides: number
    value: number
    theme?: string
  }
  export interface DiceBoxGroup {
    groupId: number
    rollId: number
    sides: number
    qty: number
    modifier: number
    value: number
    rolls: DiceBoxDie[]
  }
  export interface DiceBoxConfig {
    container?: string
    assetPath: string
    scale?: number
    theme?: string
    themeColor?: string
    enableShadows?: boolean
    offscreen?: boolean
    throwForce?: number
    onRollComplete?: (results: DiceBoxGroup[]) => void
  }
  export default class DiceBox {
    constructor(config: DiceBoxConfig)
    init(): Promise<void>
    roll(
      notation: string | object | Array<string | object>,
      options?: object,
    ): Promise<DiceBoxGroup[]>
    add(notation: string | object): Promise<DiceBoxGroup[]>
    clear(): void
    updateConfig(config: Partial<DiceBoxConfig>): void
    onRollComplete?: (results: DiceBoxGroup[]) => void
  }
}
```
(If the package DOES ship types, skip this file and rely on them; the property names above mirror what the store uses.)

- [ ] **Step 7: Create Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
})
```

- [ ] **Step 8: Verify assets copied + build still green**

```bash
node scripts/copy-dice-assets.mjs && ls public/assets/dice-box
npx tsc --noEmit
```
Expected: assets listed; tsc clean.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/copy-dice-assets.mjs vitest.config.ts types/dice-box.d.ts 2>/dev/null
git commit -m "chore(KAN-14): install dice-box + vitest, asset-copy script, test config"
```

---

## Task 2: Notation parsing & validation (pure logic, TDD)

**Files:**
- Create: `lib/dice/notation.ts`
- Test: `lib/dice/notation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/dice/notation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseNotation, validateNotation } from './notation'

describe('parseNotation', () => {
  it('parses a single die', () => {
    expect(parseNotation('d20')).toEqual({ terms: [{ qty: 1, sides: 20 }], modifier: 0 })
  })
  it('parses quantity + modifier', () => {
    expect(parseNotation('2d20+5')).toEqual({ terms: [{ qty: 2, sides: 20 }], modifier: 5 })
  })
  it('parses multiple dice terms and a negative modifier', () => {
    expect(parseNotation('1d8+1d6-1')).toEqual({
      terms: [{ qty: 1, sides: 8 }, { qty: 1, sides: 6 }],
      modifier: -1,
    })
  })
  it('ignores whitespace', () => {
    expect(parseNotation(' 4d6 + 2 ')).toEqual({ terms: [{ qty: 4, sides: 6 }], modifier: 2 })
  })
  it('throws on empty input', () => {
    expect(() => parseNotation('')).toThrow()
  })
  it('throws on garbage', () => {
    expect(() => parseNotation('hello')).toThrow()
  })
  it('throws when subtracting dice', () => {
    expect(() => parseNotation('2d20-1d4')).toThrow()
  })
})

describe('validateNotation', () => {
  it('accepts valid notation', () => {
    expect(validateNotation('2d20+5')).toEqual({ valid: true })
  })
  it('rejects invalid notation with a message', () => {
    const r = validateNotation('xyz')
    expect(r.valid).toBe(false)
    expect(typeof r.error).toBe('string')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/dice/notation.test.ts`
Expected: FAIL — "Failed to resolve import './notation'" / function not defined.

- [ ] **Step 3: Implement parse + validate**

Create `lib/dice/notation.ts`:
```ts
export type RollMode = 'normal' | 'advantage' | 'disadvantage'

export interface ParsedTerm {
  qty: number
  sides: number
}
export interface ParsedNotation {
  terms: ParsedTerm[]
  modifier: number
}

const TERM = /^([0-9]*)d([0-9]+)$/i

/** Parse standard dice notation ("2d20+5", "d20", "1d8+1d6-1") into dice terms + a flat modifier. */
export function parseNotation(input: string): ParsedNotation {
  const cleaned = input.replace(/\s+/g, '')
  if (!cleaned) throw new Error('Enter dice notation, e.g. 2d20+5')

  const tokens = cleaned.match(/[+-]?[^+-]+/g)
  if (!tokens) throw new Error('Invalid dice notation')

  const terms: ParsedTerm[] = []
  let modifier = 0

  for (const tok of tokens) {
    const sign = tok.startsWith('-') ? -1 : 1
    const body = tok.replace(/^[+-]/, '')

    if (/^[0-9]+$/.test(body)) {
      modifier += sign * parseInt(body, 10)
      continue
    }

    const m = TERM.exec(body)
    if (!m) throw new Error(`Invalid term: "${tok}"`)
    if (sign < 0) throw new Error('Cannot subtract dice; use a numeric modifier')

    const qty = m[1] === '' ? 1 : parseInt(m[1], 10)
    const sides = parseInt(m[2], 10)
    if (qty < 1 || qty > 100) throw new Error('Dice quantity must be 1–100')
    if (sides < 2 || sides > 1000) throw new Error('Dice sides must be 2–1000')

    terms.push({ qty, sides })
  }

  if (terms.length === 0) throw new Error('No dice in notation')
  return { terms, modifier }
}

/** Non-throwing validation for UI. */
export function validateNotation(input: string): { valid: boolean; error?: string } {
  try {
    parseNotation(input)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid notation' }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/dice/notation.test.ts`
Expected: PASS (all 9).

- [ ] **Step 5: Commit**

```bash
git add lib/dice/notation.ts lib/dice/notation.test.ts
git commit -m "feat(KAN-14): dice notation parser + validator"
```

---

## Task 3: Local rolling, totals, advantage/disadvantage (pure logic, TDD)

**Files:**
- Modify: `lib/dice/notation.ts`
- Test: `lib/dice/notation.test.ts`

- [ ] **Step 1: Add failing tests** (append to `lib/dice/notation.test.ts`)

```ts
import { rollLocally, resolveD20Keep, totalFromDiceBoxGroups } from './notation'

describe('rollLocally', () => {
  it('uses the injected RNG deterministically', () => {
    // rng returns 0 -> lowest face (1); 0.999 -> highest face
    const r = rollLocally('2d6+3', () => 0)
    expect(r.dice).toEqual([{ sides: 6, value: 1 }, { sides: 6, value: 1 }])
    expect(r.modifier).toBe(3)
    expect(r.total).toBe(5) // 1 + 1 + 3
  })
  it('produces values within range with default RNG', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollLocally('1d20')
      expect(r.total).toBeGreaterThanOrEqual(1)
      expect(r.total).toBeLessThanOrEqual(20)
    }
  })
})

describe('totalFromDiceBoxGroups', () => {
  it('sums group values', () => {
    expect(totalFromDiceBoxGroups([{ value: 10 }, { value: 4 }])).toBe(14)
  })
})

describe('resolveD20Keep', () => {
  it('keeps the higher die on advantage and adds the modifier', () => {
    expect(resolveD20Keep([7, 15], 'advantage', 5)).toEqual({ kept: 15, dropped: 7, keptIndex: 1, total: 20 })
  })
  it('keeps the lower die on disadvantage', () => {
    expect(resolveD20Keep([7, 15], 'disadvantage', 0)).toEqual({ kept: 7, dropped: 15, keptIndex: 0, total: 7 })
  })
  it('keeps index 0 on a tie', () => {
    expect(resolveD20Keep([12, 12], 'advantage', 0).keptIndex).toBe(0)
  })
  it('throws unless exactly two values', () => {
    expect(() => resolveD20Keep([1, 2, 3], 'advantage', 0)).toThrow()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/dice/notation.test.ts`
Expected: FAIL — `rollLocally`/`resolveD20Keep`/`totalFromDiceBoxGroups` not exported.

- [ ] **Step 3: Implement** (append to `lib/dice/notation.ts`)

```ts
/** Roll notation locally (no 3D engine) — used for the reduced-motion path and tests. */
export function rollLocally(
  input: string,
  rng: () => number = Math.random,
): { dice: { sides: number; value: number }[]; modifier: number; total: number } {
  const { terms, modifier } = parseNotation(input)
  const dice: { sides: number; value: number }[] = []
  for (const t of terms) {
    for (let i = 0; i < t.qty; i++) {
      dice.push({ sides: t.sides, value: 1 + Math.floor(rng() * t.sides) })
    }
  }
  const total = dice.reduce((sum, d) => sum + d.value, 0) + modifier
  return { dice, modifier, total }
}

/** Sum the per-group `value` returned by dice-box (each already includes its modifier). */
export function totalFromDiceBoxGroups(groups: { value: number }[]): number {
  return groups.reduce((sum, g) => sum + g.value, 0)
}

/** Apply advantage/disadvantage to two d20 values, then add the modifier. */
export function resolveD20Keep(
  values: number[],
  mode: 'advantage' | 'disadvantage',
  modifier: number,
): { kept: number; dropped: number; keptIndex: number; total: number } {
  if (values.length !== 2) throw new Error('resolveD20Keep expects exactly two values')
  const keptIndex =
    mode === 'advantage'
      ? values[0] >= values[1] ? 0 : 1
      : values[0] <= values[1] ? 0 : 1
  const kept = values[keptIndex]
  const dropped = values[keptIndex === 0 ? 1 : 0]
  return { kept, dropped, keptIndex, total: kept + modifier }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/dice/notation.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dice/notation.ts lib/dice/notation.test.ts
git commit -m "feat(KAN-14): local roller, totals, advantage/disadvantage keep-logic"
```

---

## Task 4: Dice store (Zustand, TDD with mocked engine)

**Files:**
- Create: `stores/dice-store.ts`
- Test: `stores/dice-store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `stores/dice-store.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the 3D engine so the store never touches Babylon/Ammo/workers.
vi.mock('@3d-dice/dice-box', () => ({
  default: class {
    constructor() {}
    async init() {}
    async roll(notation: string) {
      if (notation === '2d20') {
        return [{ groupId: 0, rollId: 0, sides: 20, qty: 2, modifier: 0, value: 22,
          rolls: [
            { groupId: 0, rollId: 0, sides: 20, value: 7 },
            { groupId: 0, rollId: 1, sides: 20, value: 15 },
          ] }]
      }
      return [{ groupId: 0, rollId: 0, sides: 6, qty: 1, modifier: 0, value: 4,
        rolls: [{ groupId: 0, rollId: 0, sides: 6, value: 4 }] }]
    }
    clear() {}
  },
}))

import { useDiceStore } from '@/stores/dice-store'

beforeEach(() => {
  useDiceStore.setState({
    status: 'idle', reducedMotion: false, lastResult: null, error: null,
    box: null, initPromise: null,
  })
})

describe('dice-store', () => {
  it('initializes the engine to ready', async () => {
    await useDiceStore.getState().init('#x')
    expect(useDiceStore.getState().status).toBe('ready')
    expect(useDiceStore.getState().box).not.toBeNull()
  })

  it('maps a normal roll to a result view', async () => {
    await useDiceStore.getState().init('#x')
    await useDiceStore.getState().roll('1d6')
    const r = useDiceStore.getState().lastResult!
    expect(r.total).toBe(4)
    expect(r.mode).toBe('normal')
    expect(r.dice).toEqual([{ sides: 6, value: 4 }])
  })

  it('resolves advantage from the two d20 dice', async () => {
    await useDiceStore.getState().init('#x')
    await useDiceStore.getState().rollD20('advantage', 5)
    const r = useDiceStore.getState().lastResult!
    expect(r.total).toBe(20) // max(7,15) + 5
    expect(r.mode).toBe('advantage')
    expect(r.dice).toEqual([
      { sides: 20, value: 7, kept: false },
      { sides: 20, value: 15, kept: true },
    ])
  })

  it('uses the local roller when reduced motion is on (engine not called)', async () => {
    await useDiceStore.getState().init('#x')
    const spy = vi.spyOn(useDiceStore.getState().box!, 'roll')
    useDiceStore.setState({ reducedMotion: true })
    await useDiceStore.getState().roll('2d6')
    const r = useDiceStore.getState().lastResult!
    expect(spy).not.toHaveBeenCalled()
    expect(r.dice).toHaveLength(2)
    expect(r.total).toBeGreaterThanOrEqual(2)
    expect(r.total).toBeLessThanOrEqual(12)
  })

  it('clear() removes the last result', async () => {
    await useDiceStore.getState().init('#x')
    await useDiceStore.getState().roll('1d6')
    useDiceStore.getState().clear()
    expect(useDiceStore.getState().lastResult).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run stores/dice-store.test.ts`
Expected: FAIL — cannot resolve `@/stores/dice-store`.

- [ ] **Step 3: Implement the store**

Create `stores/dice-store.ts`:
```ts
import { create } from 'zustand'
import {
  resolveD20Keep,
  rollLocally,
  totalFromDiceBoxGroups,
  type RollMode,
} from '@/lib/dice/notation'

export type DiceStatus = 'idle' | 'initializing' | 'ready' | 'rolling' | 'error'

export interface RollResultView {
  label: string
  total: number
  dice: { sides: number; value: number; kept?: boolean }[]
  mode: RollMode
}

interface DiceState {
  status: DiceStatus
  reducedMotion: boolean
  lastResult: RollResultView | null
  error: string | null
  // Engine + init guard live in state (not module scope) so tests can reset them.
  box: import('@3d-dice/dice-box').default | null
  initPromise: Promise<void> | null
  init: (containerSelector: string) => Promise<void>
  setReducedMotion: (v: boolean) => void
  roll: (notation: string) => Promise<void>
  rollD20: (mode: RollMode, modifier: number) => Promise<void>
  clear: () => void
}

export const useDiceStore = create<DiceState>((set, get) => ({
  status: 'idle',
  reducedMotion: false,
  lastResult: null,
  error: null,
  box: null,
  initPromise: null,

  setReducedMotion: (v) => set({ reducedMotion: v }),

  init: async (containerSelector) => {
    const existing = get().initPromise
    if (existing) return existing
    set({ status: 'initializing', error: null })
    const p = (async () => {
      try {
        const { default: DiceBox } = await import('@3d-dice/dice-box')
        const instance = new DiceBox({
          container: containerSelector,
          assetPath: '/assets/dice-box/',
          theme: 'default',
          themeColor: '#c9a84c',
          scale: 6,
        })
        await instance.init()
        set({ box: instance, status: 'ready' })
      } catch (e) {
        set({
          box: null,
          status: 'error',
          error: e instanceof Error ? e.message : 'Dice engine failed to load',
        })
      }
    })()
    set({ initPromise: p })
    return p
  },

  roll: async (notation) => {
    const { reducedMotion, box } = get()
    set({ status: 'rolling', lastResult: null })
    try {
      if (reducedMotion || !box) {
        const r = rollLocally(notation)
        set({
          status: 'ready',
          lastResult: { label: notation, total: r.total, mode: 'normal', dice: r.dice },
        })
        return
      }
      const groups = await box.roll(notation)
      const total = totalFromDiceBoxGroups(groups)
      const dice = groups.flatMap((g) => g.rolls.map((d) => ({ sides: d.sides, value: d.value })))
      set({ status: 'ready', lastResult: { label: notation, total, mode: 'normal', dice } })
    } catch {
      set({ status: 'ready', error: 'Roll failed' })
    }
  },

  rollD20: async (mode, modifier) => {
    const { reducedMotion, box } = get()
    const label = `d20 (${mode === 'advantage' ? 'Advantage' : 'Disadvantage'})${modifier ? `+${modifier}` : ''}`
    set({ status: 'rolling', lastResult: null })
    try {
      let values: number[]
      if (reducedMotion || !box) {
        values = rollLocally('2d20').dice.map((d) => d.value)
      } else {
        const groups = await box.roll('2d20')
        values = groups[0].rolls.map((d) => d.value)
      }
      const { keptIndex, total } = resolveD20Keep(values, mode, modifier)
      const dice = values.map((v, i) => ({ sides: 20, value: v, kept: i === keptIndex }))
      set({ status: 'ready', lastResult: { label, total, mode, dice } })
    } catch {
      set({ status: 'ready', error: 'Roll failed' })
    }
  },

  clear: () => set({ lastResult: null }),
}))
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run stores/dice-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Full test + type check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add stores/dice-store.ts stores/dice-store.test.ts
git commit -m "feat(KAN-14): dice store with engine lifecycle + result mapping"
```

---

## Task 5: useDiceRoller hook

**Files:**
- Create: `hooks/use-dice-roller.ts`

(Thin selector wrapper over the tested store — covered indirectly; no separate test, to avoid adding jsdom/testing-library for a pass-through.)

- [ ] **Step 1: Implement the hook**

Create `hooks/use-dice-roller.ts`:
```ts
'use client'

import { useDiceStore } from '@/stores/dice-store'

/** Public dice API for any feature: roll standard notation or a d20 with advantage/disadvantage. */
export function useDiceRoller() {
  const status = useDiceStore((s) => s.status)
  const lastResult = useDiceStore((s) => s.lastResult)
  const error = useDiceStore((s) => s.error)
  const roll = useDiceStore((s) => s.roll)
  const rollD20 = useDiceStore((s) => s.rollD20)
  const clear = useDiceStore((s) => s.clear)

  return {
    status,
    lastResult,
    error,
    rollNormal: (notation: string) => roll(notation),
    rollAdvantage: (modifier = 0) => rollD20('advantage', modifier),
    rollDisadvantage: (modifier = 0) => rollD20('disadvantage', modifier),
    clear,
  }
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add hooks/use-dice-roller.ts
git commit -m "feat(KAN-14): useDiceRoller hook"
```

---

## Task 6: RollResult overlay card (accessible result display)

**Files:**
- Create: `components/dice/roll-result.tsx`

- [ ] **Step 1: Implement the component**

Create `components/dice/roll-result.tsx`:
```tsx
'use client'

import type { RollResultView } from '@/stores/dice-store'

export function RollResult({
  result,
  onDismiss,
}: {
  result: RollResultView | null
  onDismiss: () => void
}) {
  if (!result) return null

  return (
    // Click-anywhere-to-dismiss layer; pointer-events enabled only while a result shows.
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center pb-28"
      onClick={onDismiss}
    >
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border px-6 py-4 text-center shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--background-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>
          {result.label}
        </p>
        <p className="mt-1 text-4xl font-bold" style={{ color: 'var(--accent-gold)' }}>
          {result.total}
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground)' }}>
          {result.dice.map((d, i) => (
            <span key={i} className={d.kept === false ? 'line-through' : undefined}>
              {d.value}
              {d.kept === false && <span className="sr-only"> (dropped)</span>}
              {i < result.dice.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 text-xs underline"
          style={{ color: 'var(--foreground-muted)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
```
**A11y notes:** result announced via `role="status" aria-live="polite"`; dropped dice use `line-through` + `sr-only "(dropped)"` (never color/opacity alone); keyboard users dismiss with the real `<button>` (Escape also wired in the tray).

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add components/dice/roll-result.tsx
git commit -m "feat(KAN-14): accessible roll-result overlay card"
```

---

## Task 7: DiceTray (overlay container + engine init + dismiss wiring)

**Files:**
- Create: `components/dice/dice-tray.tsx`

- [ ] **Step 1: Implement the component**

Create `components/dice/dice-tray.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import { useDiceStore } from '@/stores/dice-store'
import { RollResult } from '@/components/dice/roll-result'

export function DiceTray() {
  const init = useDiceStore((s) => s.init)
  const setReducedMotion = useDiceStore((s) => s.setReducedMotion)
  const lastResult = useDiceStore((s) => s.lastResult)
  const clear = useDiceStore((s) => s.clear)

  // Init the engine once and track the reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    void init('#dice-overlay-canvas')
    return () => mq.removeEventListener('change', onChange)
  }, [init, setReducedMotion])

  // Dismiss on Escape or after a short timeout.
  useEffect(() => {
    if (!lastResult) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', onKey)
    const timer = setTimeout(clear, 6000)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [lastResult, clear])

  return (
    <>
      {/* dice-box mounts its canvas here; decorative + non-blocking. */}
      <div
        id="dice-overlay-canvas"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
      />
      <RollResult result={lastResult} onDismiss={clear} />
    </>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add components/dice/dice-tray.tsx
git commit -m "feat(KAN-14): dice tray overlay + engine init + dismiss wiring"
```

---

## Task 8: DiceFab + quick-roll popover

**Files:**
- Create: `components/ui/popover.tsx` (via shadcn CLI), `components/dice/dice-fab.tsx`

- [ ] **Step 1: Add the shadcn Popover primitive** (fresh-cache workaround for the EACCES gotcha)

```bash
cd "heeeyaaah"
npm_config_cache=/tmp/npm-fresh-cache npx shadcn@latest add popover
```
Expected: creates `components/ui/popover.tsx` and installs `@radix-ui/react-popover`. (Radix handles focus return to the trigger + Escape automatically.)

- [ ] **Step 2: Implement the FAB + popover**

Create `components/dice/dice-fab.tsx`:
```tsx
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
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Roll dice"
          disabled={disabled}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent-gold)', color: 'var(--background)' }}
        >
          <span aria-hidden="true">🎲</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="top"
        className="w-72 space-y-4"
        style={{ background: 'var(--background-surface)', borderColor: 'var(--border)' }}
      >
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
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add components/ui/popover.tsx components/dice/dice-fab.tsx package.json package-lock.json
git commit -m "feat(KAN-14): floating dice button + quick-roll popover"
```

---

## Task 9: Mount in app shell, verify end-to-end, finalize

**Files:**
- Modify: `app/app/layout.tsx`, `progress.md` (repo-external doc)

- [ ] **Step 1: Mount the tray + FAB in the authed shell**

In `app/app/layout.tsx`, add the imports and render both components once, as siblings of the shell so they overlay every `/app/*` screen. Add near the top:
```tsx
import { DiceTray } from '@/components/dice/dice-tray'
import { DiceFab } from '@/components/dice/dice-fab'
```
Then change the outer wrapper's closing so the two components render inside it, after `</main>`:
```tsx
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
```

- [ ] **Step 2: Type check + build**

```bash
npx tsc --noEmit
npm run build
```
Expected: tsc clean; build succeeds (prebuild copies assets). Confirm `/app` still builds.

- [ ] **Step 3: Manual verification** (the 3D engine isn't headless-testable)

```bash
npm run dev
```
Then in the browser (logged in, on `/app`):
- FAB visible bottom-right; `Tab` reaches it; `Enter`/`Space` opens the popover; focus moves into it; `Escape` closes and returns focus to the FAB.
- Type `2d20+5`, Roll → 3D dice tumble in the overlay; result card shows total + both dice; `aria-live` announces it (VoiceOver: Cmd+F5).
- Quick dice d4–d100 each roll a single die.
- Advantage / Disadvantage roll two d20; the kept die is highlighted, the dropped one struck through with "(dropped)" for SR.
- Click the overlay or press Escape to dismiss; it also auto-dismisses ~6s.
- Toggle OS "Reduce Motion" → rolls show the result instantly with no tumble.
- Temporarily break `assetPath` (e.g. rename `public/assets/dice-box`) → FAB shows disabled/error state, no crash; restore it after.

- [ ] **Step 4: WCAG post-build verification pass**

Invoke the `wcag-compliance` skill and run its verification checklist against the new components (`dice-fab`, `roll-result`, `dice-tray`). Confirm: FAB accessible name + visible focus + target ≥44px; popover focus management (Radix); input label + error association; result text alternative to the visual dice; reduced-motion honored; no color-only signaling. Record the result.

- [ ] **Step 5: Correct the tech-stack note in progress.md**

In `progress.md` (project root, outside the repo), update the 3D Dice row from "Three.js + Cannon-es physics" to "BabylonJS + AmmoJS (web workers + OffscreenCanvas)". Also update the KAN-14 status to reflect completion.

- [ ] **Step 6: Final full check + commit**

```bash
cd "heeeyaaah"
npm test && npx tsc --noEmit && npm run build
git add app/app/layout.tsx
git commit -m "feat(KAN-14): mount dice tray + FAB in app shell"
```

- [ ] **Step 7: Push the branch**

```bash
git push -u origin feat/kan-14-dice-roller
```

---

## Self-Review

**Spec coverage:**
- Singleton engine + `useDiceRoller` → Tasks 4, 5. ✓
- FAB + quick-roll popover (notation, quick dice, adv/disadv) → Task 8. ✓
- Full-screen overlay + auto/click/Escape dismiss → Tasks 6, 7. ✓
- Standard notation + advantage/disadvantage → Tasks 2, 3 (logic), 4 (store), 8 (UI). ✓
- WCAG 2.2 AA (aria-live result, focus-trapped popover, reduced-motion, target size, no color-only) → Tasks 6, 7, 8, 9 Step 4. ✓
- Asset handling (copy script, postinstall/prebuild, client-only import) → Task 1, store dynamic import. ✓
- Error handling (status states, init failure, invalid notation) → Tasks 4, 8. ✓
- Testing (Vitest pure logic + store) → Tasks 2, 3, 4; manual → Task 9. ✓
- Non-goals (no DB/realtime/advanced parser/theme UI) → respected; not built. ✓
- progress.md engine correction → Task 9 Step 5. ✓

**Placeholder scan:** none — all steps contain real code/commands.

**Type consistency:** `RollResultView`, `RollMode`, `DiceStatus`, `resolveD20Keep` (returns `keptIndex`), `rollLocally`, `totalFromDiceBoxGroups`, and the hook method names (`rollNormal`/`rollAdvantage`/`rollDisadvantage`/`clear`) are used identically across store, hook, and components. ✓
