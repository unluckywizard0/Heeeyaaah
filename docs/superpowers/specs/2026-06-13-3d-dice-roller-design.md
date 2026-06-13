# KAN-14 — 3D Dice Roller (Foundation) — Design Spec

**Date:** 2026-06-13
**Epic:** KAN-4 (Phase 1: Foundation)
**Status:** Approved design, pre-implementation

---

## Context

The platform needs physics-based 3D dice that any feature (character sheet, combat
tracker, encounter builder) can trigger and that render as an on-screen overlay — a core
differentiator vs. D&D Beyond. This ticket builds the **standalone roller foundation
only**: a reusable roll engine + global dice tray UI. It explicitly does **not** include
persisting rolls to the `roll_history` table or real-time roll sharing — those remain in
KAN-16. Future features consume this foundation through a single hook.

**Library correction:** `@3d-dice/dice-box` is built on **BabylonJS + AmmoJS** (web
workers + OffscreenCanvas), not "Three.js + Cannon-es" as earlier docs stated. The
`progress.md` tech-stack note will be corrected during implementation.

## Goals

- A singleton `DiceBox` engine, initialized once per session, reused for every roll.
- A reusable `useDiceRoller()` hook: `roll(notation)`, `rollAdvantage()`, `rollDisadvantage()`, plus `status` and `lastResult`.
- A persistent bottom-right floating dice button (FAB) → quick-roll popover (notation input + quick-dice buttons d4–d100 + Advantage/Disadvantage toggle).
- 3D dice animate in a full-viewport transparent overlay, then auto-dismiss / click-to-dismiss.
- Standard notation (`XdY±Z`) plus first-class Advantage/Disadvantage.
- WCAG 2.2 AA throughout.

## Non-Goals (explicit)

- No DB persistence to `roll_history` (KAN-16).
- No real-time / multiplayer roll broadcast (KAN-16).
- No advanced parser (keep/drop, exploding, rerolls) — deferred; would add `@3d-dice/dice-parser-interface` later.
- No per-user dice-theme customization UI (single brand theme now; easily extended later).

## Chosen Approach

**Singleton `DiceBox` in a Zustand store + one persistent `<DiceTray>` mounted in the
authed app shell, with custom themed + accessible UI built from shadcn/Tailwind.**

Rejected alternatives:
- *Component-local DiceBox per open* — re-inits WASM/assets each roll → visible lag; awkward to call from other features.
- *`@3d-dice/dice-ui` companion UI* — `dat.gui`-based, off-theme, accessibility unknown; conflicts with the WCAG mandate. (We still use `@3d-dice/dice-box` core.)

## Architecture & File Layout

```
public/assets/dice-box/                  ← dice-box assets, copied on install (see Asset Handling)
scripts/copy-dice-assets.mjs             ← Node fs.cp copy script (no new dep)
lib/dice/notation.ts                     ← buildNotation() + adv/disadv keep-logic (pure, unit-tested)
stores/dice-store.ts                     ← Zustand: instance, status, lastResult, init()/roll()/clear()
hooks/use-dice-roller.ts                 ← public API hook
components/dice/dice-tray.tsx            ← 'use client', dynamic ssr:false; owns overlay container + DiceBox init
components/dice/dice-fab.tsx             ← floating button; opens popover
components/dice/quick-roll-popover.tsx   ← notation input + quick-dice buttons + Adv/Disadv toggle
components/dice/roll-result.tsx          ← visible result card + aria-live announcement
app/app/layout.tsx                       ← mounts <DiceTray/> + <DiceFab/> once (authed shell only)
```

## Components & Data Flow

1. `DiceFab` (or any future caller) invokes `useDiceRoller().roll("2d20+5")`.
2. Store calls `diceBox.roll(notation)`; dice tumble in the fixed full-viewport overlay.
3. `onRollComplete(results)` fires → store computes total (and kept die for adv/disadv via `lib/dice/notation.ts`) → updates `lastResult`.
4. `RollResult` shows the value **and** announces it in an `aria-live="polite"` region.
5. Clicking the overlay or a short auto-timeout calls `clear()`.

## Advantage / Disadvantage

Roll `2d20`; `notation.ts` keeps highest (advantage) or lowest (disadvantage) and surfaces
both individual dice plus the kept result. Pure function — fully unit-testable without the
3D engine.

## Accessibility (WCAG 2.2 AA)

- 3D canvas is purely visual → **every result is also rendered as text in an `aria-live="polite"` region** so screen-reader users receive the outcome.
- FAB: accessible name (`aria-label="Roll dice"`), target ≥44×44px.
- Popover: focus-trapped dialog, Escape closes, focus returns to the FAB on close.
- Notation input has a real `<label>`; quick-dice buttons each have an accessible name.
- **`prefers-reduced-motion`: skip the physics tumble and show the result instantly.**
- Overlay never traps keyboard focus; `pointer-events` managed so it doesn't block the UI except while showing a dismissable result.
- Color is never the sole signal (totals/criticals shown with text, not color alone).

## Asset Handling & Client-Only Constraints

- `scripts/copy-dice-assets.mjs` copies `node_modules/@3d-dice/dice-box/dist/assets` → `public/assets/dice-box/` using Node `fs.cp` (no extra dependency).
- Wired to **both** `postinstall` and `prebuild` so assets survive reinstalls and Vercel builds.
- `DiceBox` config: `assetPath: "/assets/dice-box/"`, `themeColor` set to brand gold (`#c9a84c`), shadows on.
- `<DiceTray>` is `dynamic(() => …, { ssr: false })` and inits inside `useEffect` — browser-only (OffscreenCanvas/workers); must not run during SSR.
- Container element must exist in the DOM before `diceBox.init()`.

## Error Handling

- Store `status: 'idle' | 'initializing' | 'ready' | 'rolling' | 'error'`.
- Init failure → non-blocking toast + FAB disabled with explanatory tooltip; no crash.
- Invalid notation → inline validation message in the popover before calling `roll()`.

## Testing

- **Unit (Vitest):** `lib/dice/notation.ts` — standard parsing, modifiers, advantage/disadvantage keep-logic, invalid-input handling. This is the pure, high-value logic.
- **Manual (`npm run dev`):** roll each die type (d4–d100, d20), advantage + disadvantage, `prefers-reduced-motion` path, keyboard-only operation, screen-reader announcement of results, init-failure fallback.
- Headless WebGL/WASM of the 3D engine itself is out of scope to automate for this foundation slice.

## Verification Checklist (Definition of Done)

- [ ] `@3d-dice/dice-box` installed; assets copied to `public/assets/dice-box/` via install hook.
- [ ] FAB visible on all `/app/*` screens; popover rolls standard notation + adv/disadv.
- [ ] 3D dice render and auto/click-dismiss; reduced-motion path shows instant result.
- [ ] Result announced in `aria-live` region; keyboard + SR pass; FAB/target sizes ≥44px.
- [ ] `lib/dice/notation.ts` unit tests pass.
- [ ] `npx tsc --noEmit` clean; `npm run build` succeeds (asset copy runs in `prebuild`).
- [ ] `wcag-compliance` post-build verification pass recorded.
- [ ] `progress.md` tech-stack note corrected (BabylonJS + AmmoJS).
