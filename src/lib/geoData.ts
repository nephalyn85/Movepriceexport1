export type USRegion = 'northeast' | 'southeast' | 'midwest' | 'south' | 'mountain' | 'pacific' | 'northwest';

export interface StateGeoInfo {
  region: USRegion;
  zone: number;
}

export const stateGeoData: Record<string, StateGeoInfo> = {
  ME: { region: 'northeast', zone: 1 },
  NH: { region: 'northeast', zone: 1 },
  VT: { region: 'northeast', zone: 1 },
  MA: { region: 'northeast', zone: 1 },
  RI: { region: 'northeast', zone: 1 },
  CT: { region: 'northeast', zone: 1 },
  NY: { region: 'northeast', zone: 1 },
  NJ: { region: 'northeast', zone: 1 },
  PA: { region: 'northeast', zone: 1 },
  DE: { region: 'northeast', zone: 1 },
  MD: { region: 'northeast', zone: 1 },
  DC: { region: 'northeast', zone: 1 },
  VA: { region: 'southeast', zone: 2 },
  WV: { region: 'southeast', zone: 2 },
  NC: { region: 'southeast', zone: 2 },
  SC: { region: 'southeast', zone: 2 },
  GA: { region: 'southeast', zone: 2 },
  FL: { region: 'southeast', zone: 2 },
  AL: { region: 'southeast', zone: 2 },
  MS: { region: 'southeast', zone: 2 },
  TN: { region: 'southeast', zone: 2 },
  KY: { region: 'southeast', zone: 2 },
  OH: { region: 'midwest', zone: 3 },
  IN: { region: 'midwest', zone: 3 },
  IL: { region: 'midwest', zone: 3 },
  MI: { region: 'midwest', zone: 3 },
  WI: { region: 'midwest', zone: 3 },
  MN: { region: 'midwest', zone: 3 },
  IA: { region: 'midwest', zone: 3 },
  MO: { region: 'midwest', zone: 3 },
  ND: { region: 'midwest', zone: 3 },
  SD: { region: 'midwest', zone: 3 },
  NE: { region: 'midwest', zone: 3 },
  KS: { region: 'midwest', zone: 3 },
  TX: { region: 'south', zone: 4 },
  OK: { region: 'south', zone: 4 },
  AR: { region: 'south', zone: 4 },
  LA: { region: 'south', zone: 4 },
  CO: { region: 'mountain', zone: 5 },
  UT: { region: 'mountain', zone: 5 },
  NV: { region: 'mountain', zone: 5 },
  AZ: { region: 'mountain', zone: 5 },
  NM: { region: 'mountain', zone: 5 },
  ID: { region: 'mountain', zone: 5 },
  MT: { region: 'mountain', zone: 5 },
  WY: { region: 'mountain', zone: 5 },
  CA: { region: 'pacific', zone: 6 },
  HI: { region: 'pacific', zone: 6 },
  WA: { region: 'northwest', zone: 7 },
  OR: { region: 'northwest', zone: 7 },
  AK: { region: 'northwest', zone: 7 },
};

export function getStateGeo(state: string): StateGeoInfo {
  return stateGeoData[state.toUpperCase()] ?? { region: 'midwest', zone: 3 };
}

export interface ZoneResult {
  name: string;
  multiplier: number;
}

export function getZone(miles: number, destinationZip: string): ZoneResult {
  const prefix = parseInt(destinationZip.slice(0, 3), 10);
  let region: USRegion = 'midwest';
  for (const [abbr, info] of Object.entries(stateGeoData)) {
    void abbr;
    const zone = info.zone;
    if (
      (zone === 1 && prefix >= 0   && prefix <= 299) ||
      (zone === 2 && prefix >= 300 && prefix <= 399) ||
      (zone === 3 && prefix >= 400 && prefix <= 699) ||
      (zone === 4 && prefix >= 700 && prefix <= 799) ||
      (zone === 5 && prefix >= 800 && prefix <= 884) ||
      (zone === 6 && prefix >= 885 && prefix <= 961) ||
      (zone === 7 && prefix >= 962 && prefix <= 999)
    ) {
      region = info.region;
      break;
    }
  }

  const distanceBands: { maxMiles: number; name: string; multiplier: number }[] = [
    { maxMiles: 50,       name: 'Local',         multiplier: 0.80 },
    { maxMiles: 250,      name: 'Short Haul',    multiplier: 0.95 },
    { maxMiles: 600,      name: 'Regional',      multiplier: 1.00 },
    { maxMiles: 1200,     name: 'Long Haul',     multiplier: 1.10 },
    { maxMiles: 2000,     name: 'Interstate',    multiplier: 1.18 },
    { maxMiles: Infinity, name: 'Cross Country', multiplier: 1.28 },
  ];

  const band = distanceBands.find(b => miles <= b.maxMiles) ?? distanceBands[distanceBands.length - 1];

  const regionBonus: Record<USRegion, number> = {
    northeast: 0.08,
    southeast: 0.02,
    midwest:   0.00,
    south:     0.00,
    mountain:  0.02,
    pacific:   0.08,
    northwest: 0.04,
  };

  return {
    name: band.name,
    multiplier: band.multiplier + (regionBonus[region] ?? 0),
  };
}

export function getCorridorAdjustment(destinationZip: string): number {
  const prefix = parseInt(destinationZip.slice(0, 3), 10);
  if (prefix >= 100 && prefix <= 199) return 1.12;
  if (prefix >= 900 && prefix <= 961) return 1.10;
  if (prefix >= 300 && prefix <= 349) return 1.04;
  if (prefix >= 750 && prefix <= 799) return 1.02;
  return 1.00;
}

export function getZonePair(fromState: string, toState: string): { fromZone: number; toZone: number; crossZone: boolean } {
  const from = getStateGeo(fromState);
  const to = getStateGeo(toState);
  return {
    fromZone: from.zone,
    toZone: to.zone,
    crossZone: from.zone !== to.zone,
  };
}
