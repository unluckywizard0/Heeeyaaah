/**
 * KAN-11 — 5e.tools → Supabase rules_* importer.
 *
 * Usage:
 *   npm run import:5etools                 # clone/refresh data, seed all tables
 *   npm run import:5etools -- --dry-run    # parse + transform, no DB writes
 *   npm run import:5etools -- --only=spells,monsters
 *   npm run import:5etools -- --data-dir=/path/to/5etools-src/data --no-clone
 *   npm run import:5etools -- --self-test  # transform inline fixtures, assert, exit
 *
 * Env (see .env.example):
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY   ← server-only, bypasses RLS; never ship to client
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  transformSpell,
  transformMonster,
  transformItem,
  transformGeneric,
  transformCondition,
  type RawEntity,
} from '@/lib/import/transformers'

loadEnv({ path: '.env.local' })
loadEnv() // .env — does not override values already set

const REPO_URL = 'https://github.com/5etools-mirror-3/5etools-src.git'
const CACHE_DIR = path.resolve('.cache/5etools-src')
const BATCH_SIZE = 500

// ─── tiny JSON guards (script-local) ──────────────────────────────────────────
const asRecord = (v: unknown): RawEntity | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as RawEntity) : null
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const isNamed = (v: unknown): v is RawEntity =>
  !!asRecord(v) && typeof (v as RawEntity).name === 'string'

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/** Read a single `data/<file>.json` and return entities under `key`. */
function readArrayFile(dataDir: string, file: string, key: string): RawEntity[] {
  const p = path.join(dataDir, file)
  if (!fs.existsSync(p)) {
    console.warn(`  ! missing ${file} — skipping`)
    return []
  }
  return asArray(asRecord(readJson(p))?.[key]).filter(isNamed)
}

/** Read an index-driven 5e.tools folder (spells/, bestiary/, class/). */
function readIndexed(dataDir: string, subdir: string, key: string): RawEntity[] {
  const dir = path.join(dataDir, subdir)
  const indexPath = path.join(dir, 'index.json')
  if (!fs.existsSync(indexPath)) {
    console.warn(`  ! missing ${subdir}/index.json — skipping`)
    return []
  }
  const index = asRecord(readJson(indexPath)) ?? {}
  const out: RawEntity[] = []
  for (const file of Object.values(index)) {
    if (typeof file !== 'string') continue
    const p = path.join(dir, file)
    if (!fs.existsSync(p)) continue
    for (const e of asArray(asRecord(readJson(p))?.[key])) {
      if (isNamed(e)) out.push(e)
    }
  }
  return out
}

type Row = Record<string, unknown>

interface Job {
  name: string
  table: string
  conflict: string
  keyOf: (row: Row) => string
  load: (dataDir: string) => RawEntity[]
  transform: (raw: RawEntity) => Row
}

const bySlugSource = (row: Row) => `${row.slug}|${row.source}`

const JOBS: Job[] = [
  {
    name: 'spells',
    table: 'rules_spells',
    conflict: 'slug,source',
    keyOf: bySlugSource,
    load: (d) => readIndexed(d, 'spells', 'spell'),
    transform: transformSpell,
  },
  {
    name: 'monsters',
    table: 'rules_monsters',
    conflict: 'slug,source',
    keyOf: bySlugSource,
    load: (d) => readIndexed(d, 'bestiary', 'monster'),
    transform: transformMonster,
  },
  {
    name: 'items',
    table: 'rules_items',
    conflict: 'slug,source',
    keyOf: bySlugSource,
    load: (d) => [
      ...readArrayFile(d, 'items.json', 'item'),
      ...readArrayFile(d, 'items-base.json', 'baseitem'),
    ],
    transform: transformItem,
  },
  {
    name: 'classes',
    table: 'rules_classes',
    conflict: 'slug,source',
    keyOf: bySlugSource,
    load: (d) => readIndexed(d, 'class', 'class'),
    transform: transformGeneric,
  },
  {
    name: 'conditions',
    table: 'rules_conditions',
    conflict: 'slug',
    keyOf: (row) => String(row.slug),
    load: (d) => readArrayFile(d, 'conditionsdiseases.json', 'condition'),
    transform: transformCondition,
  },
  {
    name: 'feats',
    table: 'rules_feats',
    conflict: 'slug,source',
    keyOf: bySlugSource,
    load: (d) => readArrayFile(d, 'feats.json', 'feat'),
    transform: transformGeneric,
  },
  {
    name: 'races',
    table: 'rules_races',
    conflict: 'slug,source',
    keyOf: bySlugSource,
    load: (d) => readArrayFile(d, 'races.json', 'race'),
    transform: transformGeneric,
  },
]

// ─── arg parsing ──────────────────────────────────────────────────────────────
interface Args {
  dryRun: boolean
  selfTest: boolean
  noClone: boolean
  dataDir?: string
  only?: Set<string>
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, selfTest: false, noClone: false }
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--self-test') args.selfTest = true
    else if (a === '--no-clone') args.noClone = true
    else if (a.startsWith('--data-dir=')) args.dataDir = a.slice('--data-dir='.length)
    else if (a.startsWith('--only=')) args.only = new Set(a.slice('--only='.length).split(','))
  }
  return args
}

/** Clone (sparse, data/ only) or refresh the 5e.tools source repo; return data dir. */
function ensureDataDir(args: Args): string {
  if (args.dataDir) return args.dataDir
  const dataDir = path.join(CACHE_DIR, 'data')
  if (fs.existsSync(dataDir)) {
    if (!args.noClone) {
      console.log('↻ refreshing 5e.tools source…')
      execFileSync('git', ['-C', CACHE_DIR, 'pull', '--ff-only'], { stdio: 'inherit' })
    }
    return dataDir
  }
  if (args.noClone) {
    throw new Error(`No data at ${dataDir} and --no-clone set. Pass --data-dir or drop --no-clone.`)
  }
  console.log('⇣ sparse-cloning 5e.tools source (data/ only)…')
  fs.mkdirSync(path.dirname(CACHE_DIR), { recursive: true })
  execFileSync(
    'git',
    ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO_URL, CACHE_DIR],
    { stdio: 'inherit' },
  )
  execFileSync('git', ['-C', CACHE_DIR, 'sparse-checkout', 'set', 'data'], { stdio: 'inherit' })
  return dataDir
}

function dedupe(job: Job, rows: Row[]): Row[] {
  const map = new Map<string, Row>()
  for (const row of rows) map.set(job.keyOf(row), row) // last wins
  return [...map.values()]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.selfTest) return selfTest()

  const jobs = args.only ? JOBS.filter((j) => args.only!.has(j.name)) : JOBS
  if (jobs.length === 0) {
    throw new Error(`--only matched no jobs. Valid: ${JOBS.map((j) => j.name).join(', ')}`)
  }

  const dataDir = ensureDataDir(args)
  console.log(`▶ data dir: ${dataDir}`)
  console.log(args.dryRun ? '▶ DRY RUN — no database writes\n' : '')

  const supabase = args.dryRun ? null : makeServiceClient()
  const summary: Array<{ job: string; parsed: number; unique: number; written: number }> = []

  for (const job of jobs) {
    process.stdout.write(`• ${job.name}: loading… `)
    const raw = job.load(dataDir)
    const rows = dedupe(job, raw.map(job.transform))
    process.stdout.write(`${raw.length} parsed → ${rows.length} unique\n`)

    let written = 0
    if (supabase) {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE)
        const { error } = await supabase.from(job.table).upsert(chunk, { onConflict: job.conflict })
        if (error) throw new Error(`${job.table} upsert failed: ${error.message}`)
        written += chunk.length
        process.stdout.write(`  ↑ ${written}/${rows.length}\r`)
      }
      if (rows.length) process.stdout.write('\n')
    }
    summary.push({ job: job.name, parsed: raw.length, unique: rows.length, written })
  }

  console.log('\n── summary ───────────────────────────────')
  for (const s of summary) {
    console.log(
      `  ${s.job.padEnd(12)} parsed ${String(s.parsed).padStart(6)}  ` +
        `unique ${String(s.unique).padStart(6)}  ` +
        (args.dryRun ? '(dry run)' : `written ${String(s.written).padStart(6)}`),
    )
  }
  console.log('✓ done')
}

function makeServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local ' +
        '(or pass --dry-run to skip database writes).',
    )
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ─── self-test: exercise the transforms on inline fixtures (no DB, no network) ─
function selfTest() {
  const checks: Array<[string, boolean]> = []
  const expect = (label: string, cond: boolean) => checks.push([label, cond])

  const spell = transformSpell({
    name: 'Fire Bolt',
    source: 'XPHB',
    level: 0,
    school: 'V',
    classes: { fromClassList: [{ name: 'Wizard' }, { name: 'Sorcerer' }] },
    entries: ['You hurl a mote of fire. {@damage 1d10} fire damage, see {@spell fireball}.'],
  })
  expect('spell slug', spell.slug === 'fire-bolt')
  expect('spell 2024 edition from XPHB', spell.edition === '2024')
  expect('spell school expanded', spell.school === 'Evocation')
  expect('spell classes extracted', spell.classes.join(',') === 'Wizard,Sorcerer')
  expect(
    'spell tags normalized',
    JSON.stringify(spell.data).includes('[spell]fireball[/spell]') &&
      JSON.stringify(spell.data).includes('1d10 fire damage'),
  )

  const monster = transformMonster({
    name: 'Goblin',
    source: 'MM',
    cr: '1/4',
    type: { type: 'humanoid', tags: ['goblinoid'] },
  })
  expect('monster cr fraction', monster.cr === 0.25)
  expect('monster type from object', monster.type === 'humanoid')
  expect('monster 2014 default', monster.edition === '2014')

  const item = transformItem({
    name: 'Longsword',
    source: 'XPHB',
    type: 'M|XPHB',
    rarity: 'none',
    edition: 'one',
  })
  expect('item type stripped', item.item_type === 'M')
  expect('item explicit edition flag wins', item.edition === '2024')

  const condition = transformCondition({ name: 'Prone' })
  expect('condition slug', condition.slug === 'prone')

  const failed = checks.filter(([, ok]) => !ok)
  for (const [label, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  if (failed.length) {
    console.error(`\n✗ self-test: ${failed.length} failed`)
    process.exit(1)
  }
  console.log(`\n✓ self-test: ${checks.length} checks passed`)
}

main().catch((err) => {
  console.error('\n✗ import failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
