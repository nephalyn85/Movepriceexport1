const tollLevel: Record<string, number> = {
  NY: 4, NJ: 4, PA: 4, IL: 4, FL: 3, MA: 3, MD: 3, VA: 3, NC: 2,
  TX: 3, OH: 3, IN: 3, KS: 2, OK: 2, CO: 2, WV: 2, DE: 3, RI: 2,
  NH: 2, ME: 2, CT: 3, GA: 2, SC: 2, MN: 2, MO: 1, IA: 1, NE: 2,
  WI: 1, MI: 2, TN: 1, AL: 1, MS: 1, LA: 1, AR: 1, KY: 2,
  ND: 0, SD: 0, MT: 0, WY: 0, ID: 0, NM: 0, AZ: 0, NV: 0,
  UT: 0, OR: 0, WA: 0, CA: 1, AK: 0, HI: 0,
  DC: 3, VT: 0,
};

function getLevel(state: string): number {
  return tollLevel[state.toUpperCase()] ?? 1;
}

export interface TollRange {
  low: number;
  high: number;
  isLocal: boolean;
}

const TRUCK_AXLE_MULTIPLIER: Record<string, number> = {
  '10': 1.0,
  '15': 1.0,
  '20': 1.0,
  '26': 1.0,
};

export function estimateTolls(
  fromState: string,
  toState: string,
  distanceMiles: number,
  truckSize?: string
): TollRange {
  if (distanceMiles <= 50) {
    return { low: 0, high: 0, isLocal: true };
  }

  const fromLevel = getLevel(fromState);
  const toLevel = getLevel(toState);
  const corridorScore = Math.max(fromLevel, toLevel) + Math.round((fromLevel + toLevel) / 4);

  const baseLow = corridorScore * 8;
  const baseHigh = corridorScore * 22;

  const distanceFactor = distanceMiles <= 300 ? 1.0
    : distanceMiles <= 700 ? 1.4
    : distanceMiles <= 1500 ? 1.8
    : 2.2;

  const axleMultiplier = truckSize ? (TRUCK_AXLE_MULTIPLIER[truckSize] ?? 1.0) : 1.0;

  const low = Math.round(baseLow * distanceFactor * axleMultiplier / 5) * 5;
  const high = Math.round(baseHigh * distanceFactor * axleMultiplier / 5) * 5;

  return { low: Math.max(0, low), high: Math.max(0, high), isLocal: false };
}
