import { estimateTolls } from './tollEstimate';
import { calculatePenskePricing, mapUhaulSizeToPenske } from './pricingEngine';
import { calculateBudgetPriceV2, estimateBudgetDaysV2 } from './budgetPricing';

export const UHAUL_ROUTING_FACTOR = 1.117;
export const DEFAULT_DIESEL_PRICE = 3.75;

export const uhaulSizeByHomeSize: Record<string, string> = {
  Studio: '10',
  '1BR': '15',
  '2BR': '20',
  '3BR': '26',
  '4BR': '26',
  studio: '10',
  '1br': '15',
  '2br': '20',
  '3br': '26',
};

export const penskeSizeByHomeSize: Record<string, string> = {
  Studio: '12',
  '1BR': '16',
  '2BR': '22',
  '3BR': '26',
  '4BR': '26',
  studio: '12',
  '1br': '16',
  '2br': '22',
  '3br': '26',
};

export const budgetSizeByHomeSize: Record<string, string> = {
  Studio: '12',
  '1BR': '16',
  '2BR': '26',
  '3BR': '26',
  '4BR': '26',
  studio: '12',
  '1br': '16',
  '2br': '26',
  '3br': '26',
};

export const truckSizes = [
  { value: '10', label: '10 ft', rooms: 'Studio', capacity: '450 cu ft', mpg: 12 },
  { value: '15', label: '15 ft', rooms: '1 BR', capacity: '764 cu ft', mpg: 10 },
  { value: '20', label: '20 ft', rooms: '2 BR', capacity: '1,015 cu ft', mpg: 9 },
  { value: '26', label: '26 ft', rooms: '3-4 BR', capacity: '1,611 cu ft', mpg: 8 },
];

export const truckMpg: Record<string, number> = { '10': 12, '12': 12, '15': 10, '16': 10, '20': 9, '22': 9, '26': 8 };

export const truckAxleLabel: Record<string, string> = {
  '10': '2-axle',
  '12': '2-axle',
  '15': '2-axle',
  '16': '2-axle',
  '20': '2-axle',
  '22': '2-axle',
  '26': '2-axle',
};

// U-Haul pricing table — mile markers are ACTUAL driving miles (routing factor applied internally by U-Haul's quote engine).
// Prices sourced from uhaul.com quotes (2024–2025).
// Route direction matters: prices vary significantly by origin demand. These represent typical mid-demand routes.
// High-demand outbound states (CA, NY, NJ, IL) carry 30–60% premiums handled separately via state multipliers.
export const pricingTable: { miles: number; days: number; prices: Record<string, number> }[] = [
  { miles: 57,   days: 1, prices: { '10': 166,  '15': 178,  '20': 218,  '26': 261  } },
  { miles: 111,  days: 2, prices: { '10': 228,  '15': 299,  '20': 374,  '26': 450  } },
  { miles: 228,  days: 2, prices: { '10': 306,  '15': 370,  '20': 462,  '26': 554  } },
  { miles: 415,  days: 3, prices: { '10': 612,  '15': 644,  '20': 805,  '26': 966  } },
  { miles: 577,  days: 4, prices: { '10': 866,  '15': 911,  '20': 1139, '26': 1367 } },
  { miles: 707,  days: 4, prices: { '10': 970,  '15': 1020, '20': 1330, '26': 1640 } },
  { miles: 806,  days: 5, prices: { '10': 1050, '15': 1105, '20': 1440, '26': 1770 } },
  { miles: 860,  days: 5, prices: { '10': 1080, '15': 1140, '20': 1480, '26': 1820 } },
  { miles: 1017, days: 5, prices: { '10': 1112, '15': 1170, '20': 1521, '26': 1872 } },
  { miles: 1200, days: 6, prices: { '10': 1280, '15': 1348, '20': 1752, '26': 2290 } },
  { miles: 1400, days: 6, prices: { '10': 1380, '15': 1453, '20': 1888, '26': 2468 } },
  { miles: 1646, days: 6, prices: { '10': 1516, '15': 1596, '20': 1916, '26': 2235 } },
  { miles: 1891, days: 7, prices: { '10': 1650, '15': 1740, '20': 2100, '26': 2450 } },
  { miles: 2100, days: 7, prices: { '10': 1516, '15': 1596, '20': 1916, '26': 2235 } },
  { miles: 2254, days: 7, prices: { '10': 1620, '15': 1706, '20': 2050, '26': 2390 } },
  { miles: 2624, days: 8, prices: { '10': 1850, '15': 1948, '20': 2340, '26': 2730 } },
  { miles: 2790, days: 9, prices: { '10': 2100, '15': 2210, '20': 2655, '26': 3100 } },
];

// Budget pricing table — mile markers are ACTUAL driving miles.
// Prices sourced from budgettruck.com quotes (2024–2025).
export const budgetPricingTable: { miles: number; days: number; prices: Record<string, number> }[] = [
  { miles: 57,   days: 1, prices: { '12': 181,  '16': 194,  '26': 285  } },
  { miles: 111,  days: 2, prices: { '12': 249,  '16': 327,  '26': 490  } },
  { miles: 228,  days: 2, prices: { '12': 334,  '16': 404,  '26': 650  } },
  { miles: 415,  days: 3, prices: { '12': 668,  '16': 703,  '26': 1100 } },
  { miles: 577,  days: 4, prices: { '12': 945,  '16': 994,  '26': 1650 } },
  { miles: 787,  days: 5, prices: { '12': 1450, '16': 1598, '26': 2478 } },
  { miles: 1017, days: 5, prices: { '12': 1710, '16': 1900, '26': 2950 } },
  { miles: 1077, days: 6, prices: { '12': 1910, '16': 2011, '26': 3417 } },
  { miles: 1646, days: 7, prices: { '12': 2263, '16': 2382, '26': 4200 } },
  { miles: 1891, days: 7, prices: { '12': 2482, '16': 2613, '26': 4600 } },
  { miles: 2254, days: 8, prices: { '12': 2779, '16': 2925, '26': 5200 } },
  { miles: 2624, days: 9, prices: { '12': 3200, '16': 3600, '26': 5800 } },
  { miles: 2790, days: 9, prices: { '12': 4200, '16': 5100, '26': 7239 } },
];

export const localPricing: Record<string, { base: number; perMile: number }> = {
  '10': { base: 19.95, perMile: 1.79 },
  '15': { base: 29.95, perMile: 1.79 },
  '20': { base: 39.95, perMile: 1.79 },
  '26': { base: 49.95, perMile: 1.99 },
  '12': { base: 19.95, perMile: 1.79 },
  '16': { base: 29.95, perMile: 1.79 },
  '22': { base: 39.95, perMile: 1.89 },
};

export function calcRentalBreakdown(
  rental: number,
  miles: number,
  size: string,
  isLocal: boolean,
): { base: number; mileage: number; perMile: number; chargeableMiles: number } {
  if (isLocal) {
    const p = localPricing[size];
    const base = p?.base ?? 0;
    const perMile = p?.perMile ?? 0;
    const chargeableMiles = miles > 0 ? miles : 15;
    const mileage = Math.max(0, rental - base);
    return { base: Math.round(base), mileage: Math.round(mileage), perMile, chargeableMiles };
  }
  const perMile = miles > 0 ? rental / miles : 0;
  return { base: 0, mileage: Math.round(rental), perMile, chargeableMiles: miles };
}

export function calculateLocalTruckPrice(miles: number, size: string): number {
  const p = localPricing[size];
  if (!p) return 0;
  const oneWayMiles = miles > 0 ? miles : 15;
  return Math.round(p.base + p.perMile * oneWayMiles);
}

export function estimateRentalDays(miles: number): number {
  const clampedMiles = Math.round(miles);
  for (const row of pricingTable) {
    if (clampedMiles <= row.miles) return row.days;
  }
  return pricingTable[pricingTable.length - 1].days;
}

export function calculateTruckPrice(miles: number, size: string): number {
  if (miles <= 0) return 0;
  const clampedMiles = Math.min(Math.round(miles), pricingTable[pricingTable.length - 1].miles);
  for (let i = 0; i < pricingTable.length; i++) {
    const row = pricingTable[i];
    if (clampedMiles <= row.miles) {
      if (i === 0) return row.prices[size] ?? 0;
      const prev = pricingTable[i - 1];
      const t = (clampedMiles - prev.miles) / (row.miles - prev.miles);
      return Math.round(prev.prices[size] + t * (row.prices[size] - prev.prices[size]));
    }
  }
  return pricingTable[pricingTable.length - 1].prices[size] ?? 0;
}

// calculateBudgetPrice kept for call sites that don't yet pass state info.
// Internally delegates to the new region-aware engine using placeholder neutral states.
export function calculateBudgetPrice(miles: number, size: string, fromState = 'GA', toState = 'GA'): number {
  return calculateBudgetPriceV2(miles, size, fromState, toState);
}

export function estimateBudgetDays(miles: number): number {
  return estimateBudgetDaysV2(miles);
}

export interface TruckCosts {
  rental: number;
  fuel: [number, number];
  tolls: [number, number];
  total: [number, number];
  local: boolean;
}

export function calcUhaulCosts(
  miles: number,
  uhaulSize: string,
  fromState: string,
  toState: string,
  isLocal: boolean,
  dieselPrice = DEFAULT_DIESEL_PRICE,
): TruckCosts {
  const rental = isLocal
    ? calculateLocalTruckPrice(miles, uhaulSize)
    : calculateTruckPrice(miles, uhaulSize);
  const mpg = truckMpg[uhaulSize] ?? 10;
  const fuelCost = (miles / mpg) * dieselPrice;
  const fuelMin = Math.round(fuelCost * 0.9);
  const fuelMax = Math.round(fuelCost * 1.15);
  const tollRange = isLocal ? { low: 0, high: 0 } : estimateTolls(fromState, toState, miles, uhaulSize);
  return {
    rental,
    fuel: [fuelMin, fuelMax],
    tolls: [tollRange.low, tollRange.high],
    total: [rental + fuelMin + tollRange.low, rental + fuelMax + tollRange.high],
    local: isLocal,
  };
}

export function calcBudgetCosts(
  miles: number,
  budgetSize: string,
  fromState: string,
  toState: string,
  isLocal: boolean,
  dieselPrice = DEFAULT_DIESEL_PRICE,
): TruckCosts {
  const rental = isLocal
    ? calculateLocalTruckPrice(miles, budgetSize)
    : calculateBudgetPriceV2(miles, budgetSize, fromState, toState);
  const effectiveMiles = miles;
  const mpg = truckMpg[budgetSize] ?? 10;
  const fuelCost = (effectiveMiles / mpg) * dieselPrice;
  const fuelMin = Math.round(fuelCost * 0.9);
  const fuelMax = Math.round(fuelCost * 1.15);
  const tollRange = isLocal ? { low: 0, high: 0 } : estimateTolls(fromState, toState, miles, budgetSize);
  return {
    rental,
    fuel: [fuelMin, fuelMax],
    tolls: [tollRange.low, tollRange.high],
    total: [rental + fuelMin + tollRange.low, rental + fuelMax + tollRange.high],
    local: isLocal,
  };
}

export function calcPenskeCosts(
  miles: number,
  penskeSize: string,
  fromState: string,
  toState: string,
  isLocal: boolean,
  dieselPrice = DEFAULT_DIESEL_PRICE,
): TruckCosts {
  const penskeResult = calculatePenskePricing({
    miles,
    truckSize: penskeSize as Parameters<typeof calculatePenskePricing>[0]['truckSize'],
    fromState,
    toState,
    isLocalMove: isLocal,
    dieselPricePerGallon: dieselPrice,
  });
  return {
    rental: penskeResult.rentalBase,
    fuel: penskeResult.fuelEstimate,
    tolls: [0, 0],
    total: penskeResult.totalEstimate,
    local: isLocal,
  };
}

export function calcDIYTotalFromHomeSize(
  miles: number,
  homeSize: string,
  fromState: string,
  toState: string,
  dieselPrice = DEFAULT_DIESEL_PRICE,
): [number, number] {
  const uhaulSize = uhaulSizeByHomeSize[homeSize] ?? '20';
  const isLocal = miles < 50;
  const costs = calcUhaulCosts(miles, uhaulSize, fromState, toState, isLocal, dieselPrice);
  return costs.total;
}

export { calculatePenskePricing, mapUhaulSizeToPenske };
