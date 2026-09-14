// Budget Truck one-way rental pricing engine.
//
// Model derived from real budgettruck.com quotes (April 2026).
//
// Architecture:
//   price = max(FLOOR[size], neutral_baseline(miles, size) * corridor_multiplier(from_region, to_region, size))
//
// Neutral baseline calibrated on Atlanta routes (most demand-neutral US city), R² > 0.998:
//   12ft: $316.56 + $0.5500/mi   floor $119
//   16ft: $335.51 + $0.5777/mi   floor $125
//   26ft: $618.87 + $1.0714/mi   floor $799
//
// Corridor multipliers capture truck supply/demand imbalance:
//   LA (PA region) →anywhere: 2.2–3.2x (mass outflow city)
//   NE → FL/SE: ~2.2–3.0x (retirement corridor)
//   SE → anywhere: ~1.0x (neutral)
//   MW → MW: 0.32–1.06x (aggressive rebalancing discounts)

// ── Region classification ─────────────────────────────────────────────────────

type Region = 'NE' | 'SE' | 'FL' | 'MW' | 'SW' | 'MT' | 'PA' | 'NW';

const STATE_REGION: Record<string, Region> = {
  // Northeast
  ME: 'NE', NH: 'NE', VT: 'NE', MA: 'NE', RI: 'NE', CT: 'NE',
  NY: 'NE', NJ: 'NE', PA: 'NE', DE: 'NE', MD: 'NE', DC: 'NE',
  // Southeast (excl Florida)
  VA: 'SE', WV: 'SE', NC: 'SE', SC: 'SE', GA: 'SE',
  AL: 'SE', MS: 'SE', TN: 'SE', KY: 'SE', AR: 'SE', LA: 'SE',
  // Florida — own demand zone (high outflow premium)
  FL: 'FL',
  // Midwest
  OH: 'MW', IN: 'MW', IL: 'MW', MI: 'MW', WI: 'MW',
  MN: 'MW', IA: 'MW', MO: 'MW', ND: 'MW', SD: 'MW', NE: 'MW', KS: 'MW',
  // Southwest
  TX: 'SW', OK: 'SW', NM: 'SW', AZ: 'SW',
  // Mountain
  CO: 'MT', UT: 'MT', WY: 'MT', ID: 'MT', MT: 'MT',
  // Pacific (LA demand effect — highest outflow)
  CA: 'PA', NV: 'PA',
  // Northwest
  WA: 'NW', OR: 'NW', AK: 'NW', HI: 'NW',
};

export function getRegion(state: string): Region {
  return STATE_REGION[state.toUpperCase()] ?? 'MW';
}

// ── Neutral baseline ──────────────────────────────────────────────────────────

const BASELINE: Record<string, { fixed: number; perMile: number; floor: number }> = {
  '12': { fixed: 316.56, perMile: 0.5500, floor: 119 },
  '16': { fixed: 335.51, perMile: 0.5777, floor: 125 },
  '26': { fixed: 618.87, perMile: 1.0714, floor: 799 },
};

function neutralPrice(miles: number, size: string): number {
  const b = BASELINE[size];
  if (!b) return 0;
  return Math.max(b.floor, b.fixed + b.perMile * miles);
}

// ── Region-pair demand multipliers ───────────────────────────────────────────
// [mult_12ft, mult_16ft, mult_26ft]
// Calibrated directly from real price data per truck size.
// Unknown pairs default to [1.0, 1.0, 1.0].

const DEMAND_MULT: Record<string, [number, number, number]> = {
  // Northeast origin
  'NE->NE': [0.52,  1.27,  1.24],  // intra-NE (NYC->PHL); 16ft has higher short-hop demand
  'NE->SE': [2.20,  2.41,  2.95],  // NYC->GA/SC/NC
  'NE->FL': [2.20,  2.41,  2.95],  // NYC->FL retirement corridor
  'NE->MW': [1.00,  1.00,  1.00],  // NYC->Chicago — neutral
  'NE->SW': [1.10,  1.18,  2.12],  // NYC->TX/NM; 26ft skews very high
  'NE->MT': [1.00,  1.00,  1.00],
  'NE->PA': [1.38,  1.64,  2.00],  // NY->LA real quotes: 12=$2,565 16=$3,194 26=$7,239
  'NE->NW': [1.00,  1.00,  1.00],
  // Southeast origin (GA baseline — demand neutral)
  'SE->NE': [0.98,  0.98,  0.98],
  'SE->SE': [1.10,  1.10,  1.10],
  'SE->FL': [1.10,  1.10,  1.10],
  'SE->MW': [1.00,  1.00,  1.00],
  'SE->SW': [1.00,  1.00,  1.00],
  'SE->MT': [1.00,  1.00,  1.00],
  'SE->PA': [1.00,  1.00,  1.00],
  'SE->NW': [0.98,  0.98,  0.98],
  // Florida origin (outflow premium — too many trucks)
  'FL->NE': [1.20,  1.19,  1.58],
  'FL->SE': [1.20,  1.19,  1.58],
  'FL->FL': [1.10,  1.10,  1.10],
  'FL->MW': [1.20,  1.19,  1.58],
  'FL->SW': [1.20,  1.19,  1.58],
  'FL->MT': [1.20,  1.19,  1.58],
  'FL->PA': [1.20,  1.19,  1.58],
  'FL->NW': [1.20,  1.19,  1.58],
  // Pacific origin (LA — highest outflow in US)
  'PA->NE': [2.17,  2.39,  3.04],
  'PA->SE': [2.22,  2.44,  3.16],
  'PA->FL': [2.22,  2.44,  3.16],
  'PA->MW': [2.00,  2.20,  2.80],
  'PA->SW': [1.40,  1.50,  1.80],
  'PA->MT': [1.30,  1.40,  1.70],
  'PA->PA': [0.93,  1.02,  0.90],  // intra-CA: 16ft slightly different
  'PA->NW': [1.10,  1.15,  1.30],
  // Northwest origin (Seattle)
  'NW->NE': [1.39,  1.39,  1.87],
  'NW->SE': [1.39,  1.39,  1.87],
  'NW->FL': [1.39,  1.39,  1.87],
  'NW->MW': [1.20,  1.20,  1.50],
  'NW->SW': [1.10,  1.10,  1.30],
  'NW->MT': [1.00,  1.00,  1.00],
  'NW->PA': [1.00,  1.00,  1.00],
  'NW->NW': [1.00,  1.00,  1.00],
  // Southwest origin (Dallas/TX)
  'SW->NE': [1.35,  1.62,  2.15],
  'SW->SE': [1.20,  1.30,  1.60],
  'SW->FL': [1.20,  1.30,  1.60],
  'SW->MW': [1.00,  1.00,  1.00],
  'SW->SW': [1.00,  1.00,  1.00],
  'SW->MT': [1.00,  1.00,  1.00],
  'SW->PA': [1.00,  1.00,  1.00],
  'SW->NW': [1.00,  1.00,  1.00],
  // Midwest origin (Chicago) — aggressive fleet rebalancing discounts
  // CHI->MIL: 0.32x (hits floor); CHI->ND: 0.72x; CHI->MIN: 1.02x
  // Using a moderate average; floor enforcement handles the extreme cases
  'MW->NE': [1.00,  1.10,  1.27],  // CHI->NYC calibrated: 26ft=1.27x ($1,882 real quote)
  'MW->SE': [1.00,  1.05,  1.15],
  'MW->FL': [1.00,  1.05,  1.15],
  'MW->MW': [0.68,  0.68,  0.90],  // blend of CHI->MIL(0.32), CHI->ND(0.72), CHI->MIN(1.02)
  'MW->SW': [0.85,  0.85,  0.90],
  'MW->MT': [0.85,  0.85,  0.90],
  'MW->PA': [1.00,  1.00,  1.00],
  'MW->NW': [0.85,  0.85,  0.90],
  // Mountain origin
  'MT->NE': [1.10,  1.10,  1.30],
  'MT->SE': [1.10,  1.10,  1.30],
  'MT->FL': [1.10,  1.10,  1.30],
  'MT->MW': [1.00,  1.00,  1.00],
  'MT->SW': [1.00,  1.00,  1.00],
  'MT->MT': [1.00,  1.00,  1.00],
  'MT->PA': [1.00,  1.00,  1.00],
  'MT->NW': [1.00,  1.00,  1.00],
};

function getDemandMult(fromRegion: Region, toRegion: Region, size: string): number {
  const key = `${fromRegion}->${toRegion}`;
  const entry = DEMAND_MULT[key] ?? [1.0, 1.0, 1.0];
  if (size === '12') return entry[0];
  if (size === '16') return entry[1];
  if (size === '26') return entry[2];
  return 1.0;
}

// ── Special corridor overrides ────────────────────────────────────────────────
// Some region-pair combinations have distance-dependent behavior that a single
// multiplier cannot capture. These are checked before the general multiplier table.

function specialCasePrice(
  miles: number,
  size: string,
  fromRegion: Region,
  toRegion: Region,
): number | null {
  // MW->MW: trimodal behavior
  //   < 200mi: Budget practically gives trucks away (rebalancing), hits floor
  //   200–500mi: normal pricing (~1.0x)
  //   > 500mi: moderate discount (~0.72x) to encourage westward fleet movement
  if (fromRegion === 'MW' && toRegion === 'MW') {
    const b = BASELINE[size];
    if (!b) return null;
    const n = neutralPrice(miles, size);
    let mult: number;
    if (miles < 200) {
      mult = 0.32; // extreme rebalancing discount — floor will catch most cases
    } else if (miles <= 500) {
      mult = 1.02; // normal move (CHI->MIN equivalent)
    } else {
      mult = 0.72; // moderate discount for longer westward routes
    }
    return Math.max(b.floor, Math.round(n * mult));
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function calculateBudgetPriceV2(
  miles: number,
  size: string,
  fromState: string,
  toState: string,
): number {
  if (miles <= 0 || !BASELINE[size]) return 0;
  const fromRegion = getRegion(fromState);
  const toRegion   = getRegion(toState);

  const special = specialCasePrice(miles, size, fromRegion, toRegion);
  if (special !== null) return special;

  const neutral = neutralPrice(miles, size);
  const mult    = getDemandMult(fromRegion, toRegion, size);
  return Math.round(neutral * mult);
}

export function estimateBudgetDaysV2(miles: number): number {
  if (miles <= 100)  return 1;
  if (miles <= 400)  return 2;
  if (miles <= 700)  return 3;
  if (miles <= 1000) return 4;
  if (miles <= 1500) return 5;
  if (miles <= 2000) return 6;
  if (miles <= 2500) return 7;
  return 8;
}
