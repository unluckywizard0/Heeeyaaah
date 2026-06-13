// Inverse of FRACTIONAL_CR in lib/import/sources.ts — display a decimal CR
// the way players expect to see it (fractions below 1).
const CR_LABELS: Record<number, string> = {
  0: '0',
  0.125: '1/8',
  0.25: '1/4',
  0.5: '1/2',
}

export function formatCr(cr: number | null): string {
  if (cr == null) return '—'
  return CR_LABELS[cr] ?? String(cr)
}
