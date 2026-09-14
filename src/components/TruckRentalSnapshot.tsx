import { useState, useEffect } from 'react';
import { ArrowRight, Fuel, Receipt } from 'lucide-react';
import RouteMap, { FuelRegion } from './RouteMap';
import {
  DEFAULT_DIESEL_PRICE,
  uhaulSizeByHomeSize,
  penskeSizeByHomeSize,
  budgetSizeByHomeSize,
  estimateRentalDays,
  estimateBudgetDays,
  truckMpg,
  truckAxleLabel,
  calcUhaulCosts,
  calcBudgetCosts,
  calcPenskeCosts,
  calcRentalBreakdown,
} from '../lib/truckRentalPricing';
import { calculatePenskePricing } from '../lib/pricingEngine';
import type { TruckSize } from '../lib/multipliers';

interface Props {
  homeSize: string;
  miles: number;
  fromState: string;
  toState: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  fromLabel: string;
  toLabel: string;
  avgDieselPrice?: number;
}

const companies = [
  { name: 'U-Haul',       logoUrl: '/U-haullogo.jpg',             siteUrl: 'https://www.uhaul.com/Truck-Rentals/' },
  { name: 'Penske',       logoUrl: '/Penske-Truck-logo.png',      siteUrl: 'https://www.pensketruckrental.com' },
  { name: 'Budget Truck', logoUrl: '/budget-truck-1024x613.webp', siteUrl: 'https://www.budgettruck.com' },
];

export default function TruckRentalSnapshot({
  homeSize,
  miles,
  fromState,
  toState,
  fromLat,
  fromLng,
  toLat,
  toLng,
  fromLabel,
  toLabel,
  avgDieselPrice = DEFAULT_DIESEL_PRICE,
}: Props) {
  const [fuelRegions, setFuelRegions] = useState<FuelRegion[]>([]);

  useEffect(() => {
    if (!fromLat || !fromLng || !toLat || !toLng) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    fetch(`${supabaseUrl}/functions/v1/get-diesel-prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
        Apikey: supabaseKey,
      },
      body: JSON.stringify({ fromLat, fromLng, toLat, toLng }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.regions) setFuelRegions(d.regions.filter((r: FuelRegion) => r.price != null));
      })
      .catch(() => {});
  }, [fromLat, fromLng, toLat, toLng]);

  const isLocal = miles < 50;
  const diesel = avgDieselPrice;

  const uhaulSize  = uhaulSizeByHomeSize[homeSize]  ?? '15';
  const penskeSize = penskeSizeByHomeSize[homeSize] ?? '16';
  const budgetSize = budgetSizeByHomeSize[homeSize] ?? '16';

  const uhaulCosts  = calcUhaulCosts(miles, uhaulSize, fromState, toState, isLocal, diesel);
  const penskePricing = calculatePenskePricing({
    miles,
    truckSize: penskeSize as TruckSize,
    fromState,
    toState,
    isLocalMove: isLocal,
    dieselPricePerGallon: diesel,
  });
  const penskeCosts = calcPenskeCosts(miles, penskeSize, fromState, toState, isLocal, diesel);
  const budgetCosts = calcBudgetCosts(miles, budgetSize, fromState, toState, isLocal, diesel);

  const uhaulDays  = estimateRentalDays(miles);
  const penskeDays = penskePricing.rentalDays;
  const budgetDays = isLocal ? 1 : estimateBudgetDays(miles);

  const uhaulBd  = calcRentalBreakdown(uhaulCosts.rental,  miles, uhaulSize,  isLocal);
  const penskeBd = calcRentalBreakdown(penskeCosts.rental, miles, penskeSize, isLocal);
  const budgetBd = calcRentalBreakdown(budgetCosts.rental, miles, budgetSize, isLocal);

  const cardData = [
    { company: companies[0], rental: uhaulCosts.rental,  days: uhaulDays,  truckSize: `${uhaulSize} ft`,  bd: uhaulBd,  costs: uhaulCosts  },
    { company: companies[1], rental: penskeCosts.rental, days: penskeDays, truckSize: `${penskeSize} ft`, bd: penskeBd, costs: penskeCosts },
    { company: companies[2], rental: budgetCosts.rental, days: budgetDays, truckSize: `${budgetSize} ft`, bd: budgetBd, costs: budgetCosts },
  ];

  // Use U-Haul as the reference for the summary card
  const refCosts = uhaulCosts;
  const refSize  = uhaulSize;
  const mpg      = truckMpg[refSize] ?? 10;
  const axle     = truckAxleLabel[refSize] ?? '2-axle';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3">
          DIY Truck Rental Option
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Route map */}
      <RouteMap
        fromLat={fromLat}
        fromLng={fromLng}
        toLat={toLat}
        toLng={toLng}
        fromLabel={fromLabel}
        toLabel={toLabel}
        fuelRegions={fuelRegions}
        disabled={false}
      />

      {fuelRegions.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Fuel className="w-3.5 h-3.5 flex-shrink-0 text-teal-600" />
          <span>Diesel prices from EIA weekly retail data along your route</span>
          <span className="ml-1 text-emerald-600 font-medium">(live)</span>
        </div>
      )}

      {/* Fuel & Tolls summary card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-800">
          <Receipt className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Estimated Total Cost (DIY) — {uhaulSize} ft truck
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
          <div className="px-4 py-4 text-center">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Truck Rental</div>
            <div className="text-lg font-bold text-slate-900">${refCosts.rental.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isLocal ? 'local rate' : `${uhaulDays} ${uhaulDays === 1 ? 'day' : 'days'}`}
            </div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Est. Fuel</div>
            <div className="text-lg font-bold text-slate-900">
              ${refCosts.fuel[0].toLocaleString()}&ndash;${refCosts.fuel[1].toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              ~{mpg} MPG · ${diesel.toFixed(3)}/gal
              {avgDieselPrice !== DEFAULT_DIESEL_PRICE && (
                <span className="text-emerald-600 font-medium ml-0.5">(live)</span>
              )}
            </div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Est. Tolls</div>
            <div className="text-lg font-bold text-slate-900">
              {refCosts.tolls[1] === 0
                ? <span className="text-slate-400 text-base">None</span>
                : `$${refCosts.tolls[0]}–$${refCosts.tolls[1]}`}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{axle} · route corridor</div>
          </div>
        </div>

        <div className="px-4 py-3 bg-teal-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Total Estimated Cost</span>
          <span className="text-xl font-bold text-teal-700">
            ${refCosts.total[0].toLocaleString()}&nbsp;&ndash;&nbsp;${refCosts.total[1].toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3 carrier cards */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Rental by Company
        </p>
        <div className="grid grid-cols-3 gap-3">
          {cardData.map(({ company, rental, days, truckSize, bd }) => (
            <a
              key={company.name}
              href={company.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 border border-slate-200 rounded-2xl p-3 bg-white hover:shadow-md hover:border-teal-400 transition-all group"
            >
              <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {days} {days === 1 ? 'day' : 'days'}
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border text-teal-700 bg-teal-50 border-teal-100">
                  {truckSize}
                </span>
              </div>

              <div className="w-16 h-8 flex items-center justify-center">
                <img
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = 'none';
                    if (el.parentElement)
                      el.parentElement.innerHTML = `<span class="font-bold text-[10px] text-slate-700">${company.name}</span>`;
                  }}
                />
              </div>

              <div className="w-full">
                <div className="text-center">
                  <div className="text-base font-bold text-slate-900">${rental.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400">rental est.</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Base</span>
                    <span className="font-medium text-slate-700">${bd.base.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Mileage</span>
                    <span className="font-medium text-slate-700">${bd.mileage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 mt-0.5 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Total</span>
                    <span className="font-bold text-teal-700">${rental.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-medium flex items-center gap-0.5 text-teal-600 group-hover:text-teal-700">
                Get Quote <ArrowRight className="w-2.5 h-2.5" />
              </div>
            </a>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-center">
        Truck rental estimates based on real pricing patterns. Click any card to get an exact quote.
      </p>
    </div>
  );
}
