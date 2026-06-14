// DMG "Monster Statistics by Challenge Rating" defaults (KAN-27).
//
// When an encounter is launched into the combat tracker, monster groups are
// described only by CR + count (no stat block — full bestiary integration is
// KAN-24/47). These are placeholder AC/HP values the DM can edit once combat
// starts, taken as the midpoint of each CR's published HP range and its
// listed AC, covering every CR the calculator offers (CR_VALUES).

export interface CrDefaults {
  ac: number
  hp: number
}

const CR_DEFAULTS: Record<number, CrDefaults> = {
  0: { ac: 13, hp: 4 },
  0.125: { ac: 13, hp: 21 },
  0.25: { ac: 13, hp: 43 },
  0.5: { ac: 13, hp: 60 },
  1: { ac: 13, hp: 78 },
  2: { ac: 13, hp: 93 },
  3: { ac: 13, hp: 108 },
  4: { ac: 14, hp: 123 },
  5: { ac: 15, hp: 138 },
  6: { ac: 15, hp: 153 },
  7: { ac: 15, hp: 168 },
  8: { ac: 16, hp: 183 },
  9: { ac: 16, hp: 198 },
  10: { ac: 17, hp: 213 },
  11: { ac: 17, hp: 228 },
  12: { ac: 17, hp: 243 },
  13: { ac: 18, hp: 258 },
  14: { ac: 18, hp: 273 },
  15: { ac: 18, hp: 288 },
  16: { ac: 18, hp: 303 },
  17: { ac: 19, hp: 318 },
  18: { ac: 19, hp: 333 },
  19: { ac: 19, hp: 348 },
  20: { ac: 19, hp: 378 },
  21: { ac: 19, hp: 423 },
  22: { ac: 19, hp: 468 },
  23: { ac: 19, hp: 513 },
  24: { ac: 19, hp: 558 },
  25: { ac: 19, hp: 603 },
  26: { ac: 19, hp: 648 },
  27: { ac: 19, hp: 693 },
  28: { ac: 19, hp: 738 },
  29: { ac: 19, hp: 783 },
  30: { ac: 19, hp: 828 },
}

const KNOWN_CRS = Object.keys(CR_DEFAULTS).map(Number).sort((a, b) => a - b)

/** AC/HP defaults for a given CR, falling back to the nearest known CR below it. */
export function crDefaults(cr: number): CrDefaults {
  if (CR_DEFAULTS[cr]) return CR_DEFAULTS[cr]
  let nearest = KNOWN_CRS[0]
  for (const known of KNOWN_CRS) {
    if (known > cr) break
    nearest = known
  }
  return CR_DEFAULTS[nearest]
}
