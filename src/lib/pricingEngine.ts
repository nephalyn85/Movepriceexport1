import { getZoneInfo, ZoneInfo } from './zones';
import {
  pensketruckSizes,
  TruckSize,
  TruckSizeConfig,
  getSeason,
  seasonMultipliers,
  getDistanceBandMultiplier,
  InsuranceTier,
  insuranceOptions,
  EquipmentKey,
  equipmentRates,
  calcTieredMileage,
} from './multipliers';
import { estimatePenskeDailyRental, getPenskeStateRates } from './penskeStatePricing';

export interface PenskePricingInput {
  miles: number;
  truckSize: TruckSize;
  fromState: string;
  toState: string;
  moveMonth?: number;
  insuranceTier?: InsuranceTier;
  equipment?: EquipmentKey[];
  isLocalMove?: boolean;
  dieselPricePerGallon?: number;
}

export interface PenskePricingStep {
  step: number;
  label: string;
  value: number;
  detail: string;
}

export interface PenskePricingResult {
  steps: PenskePricingStep[];
  rentalBase: number;
  fuelEstimate: [number, number];
  insuranceCost: number;
  equipmentCost: number;
  zoneAdjustment: number;
  seasonAdjustment: number;
  totalEstimate: [number, number];
  rentalDays: number;
  truckConfig: TruckSizeConfig;
  zoneInfo: ZoneInfo;
  season: ReturnType<typeof getSeason>;
  distanceBandLabel: string;
  breakdown: {
    dayRate: number;
    mileageCharge: number;
    days: number;
    seasonMultiplier: number;
    zoneMultiplier: number;
    distanceBandMultiplier: number;
    sizeMultiplier: number;
  };
}

const DEFAULT_DIESEL = 3.75;

// Penske pricing table — mile markers are ACTUAL driving miles.
// Prices sourced from pensketruckrental.com quotes (2024–2025).
const penskePricingTable: { miles: number; days: number; prices: Record<TruckSize, number> }[] = [
  { miles: 57,   days: 1,  prices: { '12': 185,  '16': 220,  '22': 355,  '26': 355  } },
  { miles: 111,  days: 2,  prices: { '12': 260,  '16': 340,  '22': 598,  '26': 598  } },
  { miles: 228,  days: 2,  prices: { '12': 350,  '16': 422,  '22': 737,  '26': 737  } },
  { miles: 415,  days: 3,  prices: { '12': 700,  '16': 735,  '22': 1279, '26': 1279 } },
  { miles: 577,  days: 4,  prices: { '12': 990,  '16': 1041, '22': 1810, '26': 1810 } },
  { miles: 707,  days: 4,  prices: { '12': 1108, '16': 1165, '22': 2114, '26': 2114 } },
  { miles: 806,  days: 5,  prices: { '12': 1200, '16': 1262, '22': 2288, '26': 2288 } },
  { miles: 860,  days: 5,  prices: { '12': 1234, '16': 1302, '22': 2350, '26': 2350 } },
  { miles: 1017, days: 5,  prices: { '12': 1270, '16': 1337, '22': 2416, '26': 2416 } },
  { miles: 1077, days: 6,  prices: { '12': 1820, '16': 2050, '22': 3200, '26': 3200 } },
  { miles: 1570, days: 8,  prices: { '12': 2450, '16': 2820, '22': 4200, '26': 4200 } },
  { miles: 1646, days: 8,  prices: { '12': 2530, '16': 2910, '22': 4320, '26': 4320 } },
  { miles: 1891, days: 9,  prices: { '12': 2820, '16': 3240, '22': 4810, '26': 4810 } },
  { miles: 1924, days: 9,  prices: { '12': 2860, '16': 3280, '22': 4860, '26': 4860 } },
  { miles: 2254, days: 10, prices: { '12': 3080, '16': 3540, '22': 5250, '26': 5250 } },
  { miles: 2459, days: 10, prices: { '12': 3589, '16': 4125, '22': 6091, '26': 6091 } },
  { miles: 2730, days: 11, prices: { '12': 3303, '16': 3798, '22': 5615, '26': 5615 } },
  { miles: 2790, days: 12, prices: { '12': 3850, '16': 4900, '22': 6800, '26': 6800 } },
];

function lookupPenskePrice(miles: number, size: TruckSize): { price: number; days: number } {
  const table = penskePricingTable;
  const adjusted = Math.min(Math.round(miles), table[table.length - 1].miles);

  for (let i = 0; i < table.length; i++) {
    const row = table[i];
    if (adjusted <= row.miles) {
      if (i === 0) return { price: row.prices[size], days: row.days };
      const prev = table[i - 1];
      const t = (adjusted - prev.miles) / (row.miles - prev.miles);
      return {
        price: Math.round(prev.prices[size] + t * (row.prices[size] - prev.prices[size])),
        days: row.days,
      };
    }
  }

  const last = table[table.length - 1];
  return { price: last.prices[size], days: last.days };
}

export function calculatePenskePricing(input: PenskePricingInput): PenskePricingResult {
  const {
    miles,
    truckSize,
    fromState,
    toState,
    moveMonth = new Date().getMonth() + 1,
    insuranceTier = 'none',
    equipment = [],
    isLocalMove = false,
    dieselPricePerGallon = DEFAULT_DIESEL,
  } = input;

  const truck = pensketruckSizes[truckSize];
  const zoneInfo = getZoneInfo(fromState, toState, miles);
  const season = getSeason(moveMonth);
  const seasonMult = seasonMultipliers[season];
  const distanceBand = getDistanceBandMultiplier(miles);

  const effectiveMiles = isLocalMove ? miles * 2 : miles;

  let rentalBase: number;
  let rentalDays: number;
  let dayRateBase: number;
  let mileageCharge: number;
  let zoneAdjustment: number;
  let seasonAdjustment: number;

  if (isLocalMove) {
    rentalDays = 1;
    const daily = estimatePenskeDailyRental(miles, truckSize, rentalDays, fromState, true);
    dayRateBase = daily.rates.base[truckSize] * rentalDays;
    mileageCharge = daily.mileage;
    const distanceAdjusted = daily.total * distanceBand.multiplier;
    const zoneAdjustedAmount = distanceAdjusted * zoneInfo.baseRateMultiplier;
    zoneAdjustment = zoneAdjustedAmount - distanceAdjusted;
    const seasonAdjustedAmount = zoneAdjustedAmount * seasonMult;
    seasonAdjustment = seasonAdjustedAmount - zoneAdjustedAmount;
    rentalBase = Math.round(seasonAdjustedAmount);
  } else {
    const lookup = lookupPenskePrice(miles, truckSize);
    rentalDays = lookup.days;
    const daily = estimatePenskeDailyRental(miles, truckSize, rentalDays, fromState, false);
    dayRateBase = daily.rates.base[truckSize] * rentalDays;
    mileageCharge = daily.mileage;
    const zoneAdjustedAmount = daily.total * zoneInfo.baseRateMultiplier;
    zoneAdjustment = zoneAdjustedAmount - daily.total;
    const seasonAdjustedAmount = zoneAdjustedAmount * seasonMult;
    seasonAdjustment = seasonAdjustedAmount - zoneAdjustedAmount;
    rentalBase = Math.round(seasonAdjustedAmount);
  }

  // Step 6: Insurance
  const insurance = insuranceOptions[insuranceTier];
  const insuranceCost = Math.round(insurance.dailyRate * rentalDays);

  // Step 7: Equipment add-ons
  const equipmentCost = equipment.reduce((sum, key) => sum + equipmentRates[key].rate, 0);

  // Fuel estimate
  const fuelGallons = effectiveMiles / truck.mpg;
  const fuelMin = Math.round(fuelGallons * dieselPricePerGallon * 0.92);
  const fuelMax = Math.round(fuelGallons * dieselPricePerGallon * 1.12);

  const totalMin = rentalBase + fuelMin + insuranceCost + equipmentCost;
  const totalMax = rentalBase + fuelMax + insuranceCost + equipmentCost;

  const stateRates = getPenskeStateRates(fromState);
  const stateDayRate = stateRates.base[truckSize];
  const statePerMile = stateRates.perMile[truckSize];
  const steps: PenskePricingStep[] = [
    {
      step: 1,
      label: 'Base Day Rate',
      value: Math.round(stateDayRate * rentalDays),
      detail: `$${stateDayRate.toFixed(2)}/day × ${rentalDays} day${rentalDays > 1 ? 's' : ''} (${fromState || 'US avg'} rate)`,
    },
    {
      step: 2,
      label: 'Truck Size Premium',
      value: 0,
      detail: `${truck.label} — included in state daily rate`,
    },
    {
      step: 3,
      label: 'Mileage Charge',
      value: Math.round(mileageCharge),
      detail: `${effectiveMiles.toLocaleString()} mi × $${statePerMile.toFixed(2)}/mi`,
    },
    {
      step: 4,
      label: 'Distance Band Adjustment',
      value: isLocalMove ? Math.round((dayRateBase + mileageCharge) * (distanceBand.multiplier - 1)) : 0,
      detail: `${distanceBand.label} rate factor (×${distanceBand.multiplier.toFixed(2)})`,
    },
    {
      step: 5,
      label: 'Zone / Corridor Premium',
      value: Math.round(zoneAdjustment),
      detail: zoneInfo.description,
    },
    {
      step: 6,
      label: 'Seasonal Rate Adjustment',
      value: Math.round(seasonAdjustment),
      detail: `${season.charAt(0).toUpperCase() + season.slice(1)} season (×${seasonMult.toFixed(2)})`,
    },
    {
      step: 7,
      label: 'Insurance & Equipment',
      value: insuranceCost + equipmentCost,
      detail: `${insurance.label}${equipment.length > 0 ? ` + ${equipment.length} add-on(s)` : ''}`,
    },
  ];

  return {
    steps,
    rentalBase,
    fuelEstimate: [fuelMin, fuelMax],
    insuranceCost,
    equipmentCost,
    zoneAdjustment: Math.round(zoneAdjustment),
    seasonAdjustment: Math.round(seasonAdjustment),
    totalEstimate: [totalMin, totalMax],
    rentalDays,
    truckConfig: truck,
    zoneInfo,
    season,
    distanceBandLabel: distanceBand.label,
    breakdown: {
      dayRate: truck.baseDayRate,
      mileageCharge: Math.round(mileageCharge),
      days: rentalDays,
      seasonMultiplier: seasonMult,
      zoneMultiplier: zoneInfo.baseRateMultiplier,
      distanceBandMultiplier: distanceBand.multiplier,
      sizeMultiplier: truck.sizeMultiplier,
    },
  };
}

export function mapUhaulSizeToPenske(uhaulSize: string): TruckSize {
  const map: Record<string, TruckSize> = {
    '10': '12',
    '15': '16',
    '20': '22',
    '26': '26',
  };
  return map[uhaulSize] ?? '16';
}
