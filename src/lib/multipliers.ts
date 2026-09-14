export type TruckSize = '12' | '16' | '22' | '26';

export interface TruckSizeConfig {
  label: string;
  capacity: string;
  rooms: string;
  mpg: number;
  baseDayRate: number;
  basePerMileRate: number;
  sizeMultiplier: number;
}

export const pensketruckSizes: Record<TruckSize, TruckSizeConfig> = {
  '12': {
    label: '12 ft',
    capacity: '500 cu ft',
    rooms: 'Studio',
    mpg: 13,
    baseDayRate: 69.99,
    basePerMileRate: 0.89,
    sizeMultiplier: 1.00,
  },
  '16': {
    label: '16 ft',
    capacity: '800 cu ft',
    rooms: '1 BR',
    mpg: 10,
    baseDayRate: 89.99,
    basePerMileRate: 0.99,
    sizeMultiplier: 1.28,
  },
  '22': {
    label: '22 ft',
    capacity: '1,200 cu ft',
    rooms: '2 BR',
    mpg: 8,
    baseDayRate: 129.99,
    basePerMileRate: 1.09,
    sizeMultiplier: 1.35,
  },
  '26': {
    label: '26 ft',
    capacity: '1,600 cu ft',
    rooms: '3-4 BR',
    mpg: 7,
    baseDayRate: 139.99,
    basePerMileRate: 1.19,
    sizeMultiplier: 1.99,
  },
};

export type Season = 'peak' | 'shoulder' | 'offpeak';

export function getSeason(month: number): Season {
  if (month >= 5 && month <= 8) return 'peak';
  if (month === 4 || month === 9 || month === 10) return 'shoulder';
  return 'offpeak';
}

export const seasonMultipliers: Record<Season, number> = {
  peak: 1.22,
  shoulder: 1.08,
  offpeak: 0.92,
};

export const distanceBandMultipliers: { maxMiles: number; multiplier: number; label: string }[] = [
  { maxMiles: 50,   multiplier: 0.88, label: 'Local'          },
  { maxMiles: 150,  multiplier: 0.94, label: 'Short Regional' },
  { maxMiles: 350,  multiplier: 1.00, label: 'Regional'       },
  { maxMiles: 700,  multiplier: 1.06, label: 'Long Regional'  },
  { maxMiles: 1300, multiplier: 1.12, label: 'Interstate'     },
  { maxMiles: 2000, multiplier: 1.18, label: 'Long Distance'  },
  { maxMiles: Infinity, multiplier: 1.18, label: 'Cross Country' },
];

export function getDistanceBandMultiplier(miles: number): { multiplier: number; label: string } {
  for (const band of distanceBandMultipliers) {
    if (miles <= band.maxMiles) {
      return { multiplier: band.multiplier, label: band.label };
    }
  }
  return { multiplier: 1.24, label: 'Cross Country' };
}

export const insuranceOptions = {
  none:     { label: 'No Coverage',        dailyRate: 0,     description: 'You assume all liability' },
  basic:    { label: 'Basic Coverage',     dailyRate: 14.00, description: '$0 deductible, basic damage' },
  standard: { label: 'Standard Coverage',  dailyRate: 24.00, description: 'Damage + roadside assistance' },
  premium:  { label: 'Premium Coverage',   dailyRate: 34.00, description: 'Full coverage + cargo protection' },
} as const;

export type InsuranceTier = keyof typeof insuranceOptions;

export const equipmentRates = {
  dolly:        { label: 'Appliance Dolly',    rate: 10.00 },
  furniturePad: { label: 'Furniture Pads (6)', rate: 12.00 },
  towbar:       { label: 'Tow Bar',            rate: 79.00 },
  autoTransport:{ label: 'Auto Transport',     rate: 99.00 },
} as const;

export type EquipmentKey = keyof typeof equipmentRates;

export function getDurationMultiplier(days: number): number {
  if (days === 1) return 1.0;
  if (days === 2) return 1.15;
  if (days <= 4)  return 1.3;
  if (days <= 6)  return 1.45;
  if (days <= 9)  return 1.6;
  return 1.8;
}

export interface TieredMileageRate {
  upTo: number;
  ratePerMile: number;
}

export const tieredMileageRates: Record<TruckSize, TieredMileageRate[]> = {
  '12': [
    { upTo: 400,      ratePerMile: 1.20 },
    { upTo: 1000,     ratePerMile: 1.15 },
    { upTo: Infinity, ratePerMile: 0.70 },
  ],
  '16': [
    { upTo: 400,      ratePerMile: 1.15 },
    { upTo: 1000,     ratePerMile: 1.12 },
    { upTo: Infinity, ratePerMile: 0.78 },
  ],
  '22': [
    { upTo: 400,      ratePerMile: 1.55 },
    { upTo: 1000,     ratePerMile: 1.25 },
    { upTo: Infinity, ratePerMile: 0.88 },
  ],
  '26': [
    { upTo: 400,      ratePerMile: 0.85 },
    { upTo: 1000,     ratePerMile: 0.82 },
    { upTo: Infinity, ratePerMile: 0.52 },
  ],
};

export function calcTieredMileage(miles: number, size: TruckSize): number {
  const tiers = tieredMileageRates[size];
  let remaining = miles;
  let total = 0;
  let prevCap = 0;
  for (const tier of tiers) {
    const bandSize = tier.upTo === Infinity ? remaining : Math.min(remaining, tier.upTo - prevCap);
    total += bandSize * tier.ratePerMile;
    remaining -= bandSize;
    prevCap = tier.upTo;
    if (remaining <= 0) break;
  }
  return total;
}

export function penskeRentalDays(miles: number): number {
  if (miles <= 100)  return 1;
  if (miles <= 300)  return 2;
  if (miles <= 500)  return 3;
  if (miles <= 700)  return 4;
  if (miles <= 1200) return 6;
  if (miles <= 1850) return 8;
  if (miles <= 2200) return 9;
  if (miles <= 2800) return 10;
  if (miles <= 3100) return 11;
  if (miles <= 3500) return 12;
  return 13;
}
