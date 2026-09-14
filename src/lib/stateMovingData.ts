import { createClient } from '@supabase/supabase-js';
import { calculateBudgetPriceV2 } from './budgetPricing';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StateRoute {
  toState: string;
  toCity: string;
  miles: number;
  moversLow: number;
  moversHigh: number;
  truckSize: string;
  truckFromState: string;
  truckToState: string;
}

export interface StateData {
  abbr: string;
  name: string;
  slug: string;
  capital: string;
  largestCity: string;
  region: string;
  heroImage?: string;
  // Cost ranges
  avgMoversLocal: [number, number];
  avgMoversLongDistance: [number, number];
  truckRentalAvg: number;
  // Demand / migration
  demandLevel: 'very_high' | 'high' | 'medium' | 'low';
  inboundRank: number;
  netMigrationPct: number;
  // ACS mobility breakdown
  pctSameCounty: number;
  pctDiffCountySameState: number;
  pctDiffState: number;
  topDestStates: string[];
  // AHS / derived
  medianHomeSqFt: number;
  median2brSqFt: number;
  derivedAvgMoveMiles: number;
  derivedCubicFeet: number;
  derived2brCubicFeet: number;
  avgIntrastateMiles: number;
  avgInterstateMiles: number;
  // Content
  popularRoutes: StateRoute[];
  topCities: { name: string; avgMovers: number; avgTruck: number }[];
  movingTips: string[];
  bestMonths: string[];
  worstMonths: string[];
}

export function getTruckPrice(miles: number, fromState: string, toState: string, size = '26'): number {
  return calculateBudgetPriceV2(miles, size, fromState, toState);
}

// ─── Module-level cache ───────────────────────────────────────────────────────
let _cache: StateData[] | null = null;
let _promise: Promise<StateData[]> | null = null;

function mapRow(r: Record<string, unknown>): StateData {
  return {
    abbr: r.abbr as string,
    name: r.name as string,
    slug: r.slug as string,
    capital: r.capital as string,
    largestCity: r.largest_city as string,
    region: r.region as string,
    heroImage: (r.hero_image as string) || undefined,
    avgMoversLocal: [r.avg_movers_local_low as number, r.avg_movers_local_high as number],
    avgMoversLongDistance: [r.avg_movers_ld_low as number, r.avg_movers_ld_high as number],
    truckRentalAvg: r.truck_rental_avg as number,
    demandLevel: r.demand_level as StateData['demandLevel'],
    inboundRank: r.inbound_rank as number,
    netMigrationPct: r.net_migration_pct as number,
    pctSameCounty: r.pct_same_county as number,
    pctDiffCountySameState: r.pct_diff_county_same_state as number,
    pctDiffState: r.pct_diff_state as number,
    topDestStates: (r.top_dest_states as string[]) ?? [],
    medianHomeSqFt: r.median_home_sqft as number,
    median2brSqFt: r.median_2br_sqft as number,
    derivedAvgMoveMiles: r.derived_avg_move_miles as number,
    derivedCubicFeet: r.derived_cubic_feet as number,
    derived2brCubicFeet: r.derived_2br_cubic_feet as number,
    avgIntrastateMiles: r.avg_intrastate_miles as number,
    avgInterstateMiles: r.avg_interstate_miles as number,
    popularRoutes: (r.popular_routes as StateRoute[]) ?? [],
    topCities: (r.top_cities as StateData['topCities']) ?? [],
    movingTips: (r.moving_tips as string[]) ?? [],
    bestMonths: (r.best_months as string[]) ?? [],
    worstMonths: (r.worst_months as string[]) ?? [],
  };
}

export function loadStateData(): Promise<StateData[]> {
  if (_cache && _cache.length > 0) return Promise.resolve(_cache);
  if (_promise) return _promise;

  const fetchPromise = supabase
    .from('state_census_data')
    .select('*')
    .order('name')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(({ data, error }: { data: any; error: any }) => {
      if (error) {
        console.error('[stateMovingData] Supabase error:', error);
        _promise = null;
        _cache = null;
        throw error;
      }
      _cache = (data ?? []).map(mapRow);
      _promise = null;
      return _cache!;
    });

  _promise = fetchPromise.catch((err: unknown) => {
    console.error('[stateMovingData] Fetch failed:', err);
    _cache = null;
    _promise = null;
    return [] as StateData[];
  });

  return _promise;
}

export function getStateData(): StateData[] { return _cache ?? []; }
export function getStateBySlug(slug: string): StateData | undefined { return (_cache ?? []).find(s => s.slug === slug); }
export function getStateByAbbr(abbr: string): StateData | undefined { return (_cache ?? []).find(s => s.abbr === abbr); }

// Legacy proxy exports — filled after loadStateData() resolves
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STATE_DATA: StateData[] = new Proxy([] as StateData[], {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(_t, prop: any) {
    const live = _cache ?? [];
    if (prop === 'length') return live.length;
    if (typeof prop === 'string' && !isNaN(Number(prop))) return live[Number(prop)];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof prop === 'string' && prop in Array.prototype) return (live as any)[prop].bind(live);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (live as any)[prop];
  },
}) as StateData[];

export const STATE_MAP: Record<string, StateData> = new Proxy({} as Record<string, StateData>, {
  get(_, prop) { return (_cache ?? []).find(s => s.abbr === prop); },
});

export const STATE_BY_SLUG: Record<string, StateData> = new Proxy({} as Record<string, StateData>, {
  get(_, prop) { return (_cache ?? []).find(s => s.slug === prop); },
});

export function getDemandColor(d: StateData['demandLevel']): string {
  return d === 'very_high' ? '#dc2626' : d === 'high' ? '#f97316' : d === 'medium' ? '#eab308' : '#22c55e';
}

export function getDemandLabel(d: StateData['demandLevel']): string {
  return d === 'very_high' ? 'Very High Demand'
       : d === 'high'      ? 'High Demand'
       : d === 'medium'    ? 'Average Demand'
       : 'Low Demand';
}
