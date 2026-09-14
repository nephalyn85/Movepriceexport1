import { getZonePair, USRegion } from './geoData';

export type PenskeTruckSize = '12ft' | '16ft' | '22ft' | '26ft';

export const BASE_PRICES: Record<PenskeTruckSize, number> = {
  '12ft': 399,
  '16ft': 459,
  '22ft': 699,
  '26ft': 699,
};

export type ZoneCorridor =
  | 'local'
  | 'northeast_corridor'
  | 'southeast_corridor'
  | 'midwest_corridor'
  | 'south_corridor'
  | 'cross_country_east_west'
  | 'cross_country_west_east'
  | 'mountain_corridor'
  | 'pacific_corridor'
  | 'general';

export interface ZoneInfo {
  corridor: ZoneCorridor;
  demandIndex: number;
  baseRateMultiplier: number;
  description: string;
}

const corridorMap: Record<string, ZoneInfo> = {
  '1-1': { corridor: 'northeast_corridor',        demandIndex: 1.15, baseRateMultiplier: 1.18, description: 'Northeast high-density corridor' },
  '2-2': { corridor: 'southeast_corridor',         demandIndex: 1.05, baseRateMultiplier: 1.05, description: 'Southeast regional corridor' },
  '3-3': { corridor: 'midwest_corridor',           demandIndex: 0.95, baseRateMultiplier: 0.97, description: 'Midwest regional corridor' },
  '4-4': { corridor: 'south_corridor',             demandIndex: 1.00, baseRateMultiplier: 1.00, description: 'South regional corridor' },
  '5-5': { corridor: 'mountain_corridor',          demandIndex: 1.02, baseRateMultiplier: 1.04, description: 'Mountain states corridor' },
  '6-6': { corridor: 'pacific_corridor',           demandIndex: 1.10, baseRateMultiplier: 1.12, description: 'Pacific coast corridor' },
  '7-7': { corridor: 'pacific_corridor',           demandIndex: 1.08, baseRateMultiplier: 1.10, description: 'Northwest corridor' },
  '1-2': { corridor: 'general',                    demandIndex: 1.08, baseRateMultiplier: 1.08, description: 'Northeast to Southeast' },
  '2-1': { corridor: 'general',                    demandIndex: 1.06, baseRateMultiplier: 1.06, description: 'Southeast to Northeast' },
  '1-3': { corridor: 'general',                    demandIndex: 1.08, baseRateMultiplier: 1.08, description: 'Northeast to Midwest' },
  '3-1': { corridor: 'general',                    demandIndex: 1.03, baseRateMultiplier: 1.03, description: 'Midwest to Northeast' },
  '3-6': { corridor: 'cross_country_east_west',    demandIndex: 1.12, baseRateMultiplier: 1.14, description: 'Midwest to Pacific (popular route)' },
  '6-3': { corridor: 'cross_country_west_east',    demandIndex: 1.08, baseRateMultiplier: 1.10, description: 'Pacific to Midwest' },
  '1-6': { corridor: 'cross_country_east_west',    demandIndex: 1.08, baseRateMultiplier: 1.10, description: 'Northeast to Pacific (premium route)' },
  '6-1': { corridor: 'cross_country_west_east',    demandIndex: 1.10, baseRateMultiplier: 1.12, description: 'Pacific to Northeast' },
  '2-6': { corridor: 'cross_country_east_west',    demandIndex: 1.12, baseRateMultiplier: 1.15, description: 'Southeast to Pacific' },
  '6-2': { corridor: 'cross_country_west_east',    demandIndex: 1.08, baseRateMultiplier: 1.10, description: 'Pacific to Southeast' },
  '4-6': { corridor: 'cross_country_east_west',    demandIndex: 1.10, baseRateMultiplier: 1.12, description: 'South to Pacific' },
  '6-4': { corridor: 'cross_country_west_east',    demandIndex: 1.06, baseRateMultiplier: 1.08, description: 'Pacific to South' },
  '1-7': { corridor: 'cross_country_east_west',    demandIndex: 1.14, baseRateMultiplier: 1.16, description: 'Northeast to Northwest' },
  '7-1': { corridor: 'cross_country_west_east',    demandIndex: 1.10, baseRateMultiplier: 1.12, description: 'Northwest to Northeast' },
};

const DEFAULT_ZONE_INFO: ZoneInfo = {
  corridor: 'general',
  demandIndex: 1.0,
  baseRateMultiplier: 1.0,
  description: 'General corridor',
};

export function getZoneInfo(fromState: string, toState: string, miles: number): ZoneInfo {
  if (miles < 50) {
    return { corridor: 'local', demandIndex: 0.90, baseRateMultiplier: 0.88, description: 'Local move' };
  }
  const { fromZone, toZone } = getZonePair(fromState, toState);
  const key = `${fromZone}-${toZone}`;
  return corridorMap[key] ?? DEFAULT_ZONE_INFO;
}

export function getZone(distance: number, zip: string) {
  if (distance < 50) return { name: "NYC_METRO", multiplier: 1.0 };
  if (distance < 150) return { name: "NORTHEAST_CORE", multiplier: 1.2 };
  if (distance < 400) return { name: "REGIONAL", multiplier: 1.8 };
  if (distance < 900) return { name: "MID_NATIONAL", multiplier: 2.6 };
  return { name: "LONG_HAUL", multiplier: 3.8 };
}

export function getCorridorAdjustment(zip: string) {
  if (["12207", "14604"].includes(zip)) return 1.25;
  if (["44114", "60601"].includes(zip)) return 1.0;
  if (zip.startsWith("28") || zip.startsWith("30")) return 1.1;
  return 1.0;
}

export function getRegionDemandLabel(region: USRegion): string {
  const labels: Record<USRegion, string> = {
    northeast: 'High Demand',
    southeast: 'Moderate Demand',
    midwest: 'Standard',
    south: 'Standard',
    mountain: 'Moderate',
    pacific: 'High Demand',
    northwest: 'Moderate Demand',
  };
  return labels[region];
}
