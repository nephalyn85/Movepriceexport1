import { BASE_PRICES } from './zones';
import { getZone, getCorridorAdjustment } from './geoData';
import { getDurationMultiplier } from './multipliers';

export function calculatePrice(input: {
  origin_zip: string;
  destination_zip: string;
  days: number;
  truck_size: '12ft' | '16ft' | '22ft' | '26ft';
}) {
  const distance = getDistanceApprox(input.origin_zip, input.destination_zip);
  const zone = getZone(distance, input.destination_zip);
  const base = BASE_PRICES[input.truck_size];
  const zoneMultiplier = zone.multiplier;
  const durationMultiplier = getDurationMultiplier(input.days);
  const corridorAdjustment = getCorridorAdjustment(input.destination_zip);
  const price = base * zoneMultiplier * durationMultiplier * corridorAdjustment;
  return {
    estimated_price: Math.round(price),
    range: {
      low: Math.round(price * 0.9),
      high: Math.round(price * 1.1),
    },
    zone: zone.name,
    distance,
  };
}

function getDistanceApprox(origin: string, dest: string): number {
  return Math.abs(parseInt(origin) - parseInt(dest)) % 3000;
}
