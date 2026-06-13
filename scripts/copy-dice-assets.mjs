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
