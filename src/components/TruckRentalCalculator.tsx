import { useState } from 'react';
import { MapPin, ArrowRight, Calculator, Route, Fuel, Info } from 'lucide-react';
import RouteMap, { FuelRegion } from './RouteMap';
import {
  DEFAULT_DIESEL_PRICE,
  uhaulSizeByHomeSize,
  penskeSizeByHomeSize,
  budgetSizeByHomeSize,
  truckSizes,
  truckAxleLabel,
  localPricing,
  estimateRentalDays,
  calculateLocalTruckPrice,
  calculateBudgetPrice,
  estimateBudgetDays,
  calcUhaulCosts,
  calcBudgetCosts,
  calcPenskeCosts,
  calcRentalBreakdown,
} from '../lib/truckRentalPricing';
import { calculatePenskePricing } from '../lib/pricingEngine';

interface DistanceResult {
  distance: number;
  from: { zip: string; city: string; state: string; lat: number; lng: number };
  to: { zip: string; city: string; state: string; lat: number; lng: number };
}

const placeholderCompanies = [
  { id: '1', name: 'U-Haul', logoUrl: '/U-haullogo.jpg', siteUrl: 'https://www.uhaul.com/Truck-Rentals/' },
  { id: '2', name: 'Penske', logoUrl: '/Penske-Truck-logo.png', siteUrl: 'https://www.pensketruckrental.com' },
  { id: '3', name: 'Budget Truck', logoUrl: '/budget-truck-1024x613.webp', siteUrl: 'https://www.budgettruck.com' },
];

const homeSizeCategories = [
  { value: 'studio', label: 'Studio', desc: 'Small apartment' },
  { value: '1br', label: '1 BR', desc: 'Apartment or small home' },
  { value: '2br', label: '2 BR', desc: 'Medium home' },
  { value: '3br', label: '3–4 BR', desc: 'Large home' },
];

export default function TruckRentalCalculator() {
  const searchParams = new URLSearchParams(window.location.search);
  const [fromZip, setFromZip] = useState(searchParams.get('from') ?? '');
  const [toZip, setToZip] = useState(searchParams.get('to') ?? '');
  const [homeSize, setHomeSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DistanceResult | null>(null);
  const [fuelRegions, setFuelRegions] = useState<FuelRegion[]>([]);
  const [avgDieselPrice, setAvgDieselPrice] = useState<number | null>(null);
  const [returnToSame, setReturnToSame] = useState(false);

  const uhaulTruckSize = homeSize ? uhaulSizeByHomeSize[homeSize] : '';
  const penskeTruckSizeKey = homeSize ? penskeSizeByHomeSize[homeSize] : '';
  const budgetTruckSize = homeSize ? budgetSizeByHomeSize[homeSize] : '';
  const selectedTruck = truckSizes.find((t) => t.value === uhaulTruckSize);

  const sameZip = fromZip.length === 5 && fromZip === toZip;
  const autoLocal =
    result !== null &&
    result.distance < 50 &&
    result.from.state === result.to.state;
  const isLocalMode = returnToSame || sameZip || autoLocal;

  const costs =
    result && selectedTruck
      ? calcUhaulCosts(result.distance, uhaulTruckSize, result.from.state, result.to.state, isLocalMode, avgDieselPrice ?? DEFAULT_DIESEL_PRICE)
      : null;

  const handleCalculate = async () => {
    if (fromZip.length !== 5 || toZip.length !== 5 || !homeSize) return;
    setLoading(true);
    setError('');
    setResult(null);
    setFuelRegions([]);
    setAvgDieselPrice(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const distanceResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-distance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          Apikey: supabaseKey,
        },
        body: JSON.stringify({ fromZip, toZip }),
      });

      const distanceData = await distanceResponse.json();

      if (!distanceResponse.ok || distanceData.error) {
        setError(distanceData.error || 'Failed to calculate distance. Please check your ZIP codes.');
        return;
      }

      setResult(distanceData);

      fetch(`${supabaseUrl}/functions/v1/get-diesel-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          Apikey: supabaseKey,
        },
        body: JSON.stringify({
          fromLat: distanceData.from.lat,
          fromLng: distanceData.from.lng,
          toLat: distanceData.to.lat,
          toLng: distanceData.to.lng,
        }),
      })
        .then((r) => r.json())
        .then((fuelData) => {
          if (fuelData.regions) setFuelRegions(fuelData.regions.filter((r: FuelRegion) => r.price != null));
          if (fuelData.avgDieselPrice) setAvgDieselPrice(fuelData.avgDieselPrice);
        })
        .catch(() => {});
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-teal-600" />
          Truck Rental Calculator
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From ZIP Code</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
              <input
                type="text"
                placeholder="Enter ZIP"
                value={fromZip}
                onChange={(e) => { setFromZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setResult(null); }}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To ZIP Code</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
              <input
                type="text"
                placeholder="Enter ZIP"
                value={toZip}
                onChange={(e) => { setToZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setResult(null); }}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mb-5">
          <label className="flex items-center gap-2.5 cursor-pointer w-fit group">
            <div className="relative">
              <input
                type="checkbox"
                checked={returnToSame}
                onChange={(e) => { setReturnToSame(e.target.checked); setResult(null); }}
                className="sr-only peer"
              />
              <div className="w-4 h-4 border-2 border-slate-300 rounded peer-checked:border-teal-500 peer-checked:bg-teal-500 transition-all flex items-center justify-center group-hover:border-teal-400">
                {returnToSame && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors select-none">
              Return truck to same location
            </span>
          </label>
          {isLocalMode && (
            <p className="mt-1.5 ml-6 text-xs text-teal-700">
              {sameZip && !returnToSame
                ? 'Same ZIP detected — '
                : autoLocal && !returnToSame
                ? 'Short same-state move detected — '
                : ''}
              Local pricing applies: flat base rate + per-mile charge on round-trip mileage
            </p>
          )}
        </div>

        {result && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Rental Days</label>
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl w-fit">
              <span className="text-xl font-semibold text-slate-900">{estimateRentalDays(result.distance)}</span>
              <span className="text-sm text-slate-600">{estimateRentalDays(result.distance) === 1 ? 'day' : 'days'} (auto-estimated)</span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Home / Load Size</label>
          <p className="text-xs text-slate-400 mb-3">Each company uses different truck sizes — we'll show you the right one per company.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {homeSizeCategories.map((cat) => {
              const uh = uhaulSizeByHomeSize[cat.value];
              const pe = penskeSizeByHomeSize[cat.value];
              const bu = budgetSizeByHomeSize[cat.value];
              return (
                <button
                  key={cat.value}
                  onClick={() => setHomeSize(cat.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${homeSize === cat.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="font-semibold text-slate-800 text-sm">{cat.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5 mb-2">{cat.desc}</div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-500">U-Haul: <span className="font-semibold text-slate-700">{uh} ft</span></div>
                    <div className="text-[10px] text-slate-500">Penske: <span className="font-semibold text-slate-700">{pe} ft</span></div>
                    <div className="text-[10px] text-slate-500">Budget: <span className="font-semibold text-slate-700">{bu} ft</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <button
          onClick={handleCalculate}
          disabled={fromZip.length !== 5 || toZip.length !== 5 || !homeSize || loading}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Calculating...
            </>
          ) : (
            <>
              Calculate Total Cost
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        {result && costs && selectedTruck && (
          <div className="flex items-center gap-2 flex-wrap">
            <Route className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <span className="font-semibold text-slate-800">
              {result.from.city}, {result.from.state} &rarr; {result.to.city}, {result.to.state}
            </span>
            <span className="ml-auto px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold">
              {isLocalMode && !sameZip
                ? `${(result.distance * 2).toLocaleString()} mi round-trip`
                : `${result.distance.toLocaleString()} miles`}
            </span>
          </div>
        )}

        <RouteMap
          fromLat={result?.from.lat}
          fromLng={result?.from.lng}
          toLat={result?.to.lat}
          toLng={result?.to.lng}
          fromLabel={result ? `${result.from.city}, ${result.from.state} (${result.from.zip})` : ''}
          toLabel={result ? `${result.to.city}, ${result.to.state} (${result.to.zip})` : ''}
          fuelRegions={fuelRegions}
          disabled={!result}
          disabledMessage={
            fromZip.length !== 5 || toZip.length !== 5
              ? 'Enter both ZIP codes and select a home size, then click Calculate'
              : !homeSize
              ? 'Select a home size, then click Calculate'
              : 'Click "Calculate Total Cost" to see your route'
          }
        />

        {!result && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Estimated Rental by Company</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {placeholderCompanies.map((company) => {
                const uhSize = homeSize ? `${uhaulSizeByHomeSize[homeSize]} ft` : '— ft';
                const peSize = homeSize ? `${penskeSizeByHomeSize[homeSize]} ft` : '— ft';
                const buSize = homeSize ? `${budgetSizeByHomeSize[homeSize]} ft` : '— ft';
                const sizeMap: Record<string, string> = { 'U-Haul': uhSize, 'Penske': peSize, 'Budget Truck': buSize };
                return (
                  <a
                    key={company.id}
                    href={company.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-3 border border-slate-200 rounded-2xl p-4 bg-white hover:shadow-md hover:border-teal-300 transition-all group"
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">— days</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-slate-400 bg-slate-50 border-slate-200">
                        {sizeMap[company.name]} truck
                      </span>
                    </div>
                    <div className="w-20 h-10 flex items-center justify-center">
                      <img
                        src={company.logoUrl}
                        alt={`${company.name} logo`}
                        className="max-w-full max-h-full object-contain opacity-60"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = 'none';
                          if (el.parentElement) el.parentElement.innerHTML = `<span class="font-bold text-xs text-slate-400">${company.name}</span>`;
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-300">$0</div>
                      <div className="text-xs text-slate-400 mt-0.5">enter route to estimate</div>
                    </div>
                    <div className="text-xs font-medium flex items-center gap-1 text-teal-500 group-hover:text-teal-600">
                      Get Quote <ArrowRight className="w-3 h-3" />
                    </div>
                  </a>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">Enter your ZIP codes and home size above, then click Calculate to see estimates.</p>
          </div>
        )}

        {result && costs && selectedTruck && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Estimated Costs</h3>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Truck Rental</div>
                  <div className="text-2xl font-bold text-slate-900">${costs.rental.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {isLocalMode
                      ? (() => {
                          const p = localPricing[uhaulTruckSize];
                          return p ? `$${p.base.toFixed(2)} base + $${p.perMile.toFixed(2)}/mi` : '';
                        })()
                      : `${estimateRentalDays(result.distance)} ${estimateRentalDays(result.distance) === 1 ? 'day' : 'days'} incl.`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">Est. Fuel</div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${costs.fuel[0].toLocaleString()} &ndash; ${costs.fuel[1].toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ~{selectedTruck.mpg} MPG @ ${(avgDieselPrice ?? DEFAULT_DIESEL_PRICE).toFixed(3)}/gal
                    {avgDieselPrice && <span className="ml-1 text-emerald-600 font-medium">(live EIA)</span>}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">Est. Tolls</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {costs.tolls[1] === 0 ? 'None' : `$${costs.tolls[0]} – $${costs.tolls[1]}`}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {truckAxleLabel[uhaulTruckSize] ?? '2-axle'} &bull; based on route corridor
                  </div>
                </div>
              </div>
              <div className="border-t border-teal-200 pt-4 text-center">
                <div className="text-sm text-slate-600 mb-1">Total Estimated Cost</div>
                <div className="text-3xl font-bold text-teal-700">
                  ${costs.total[0].toLocaleString()} &ndash; ${costs.total[1].toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
              <Fuel className="w-4 h-4 flex-shrink-0" />
              <span>
                {avgDieselPrice
                  ? 'Diesel price from EIA weekly retail data. Mileage estimates are approximations.'
                  : 'Fuel prices and mileage estimates are approximations. Actual costs may vary.'}
              </span>
            </div>

            <div className="mt-6 mb-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Estimated Rental by Company</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(() => {
                  const diesel = avgDieselPrice ?? DEFAULT_DIESEL_PRICE;
                  const penskeCostBreakdown = calcPenskeCosts(result.distance, penskeTruckSizeKey, result.from.state, result.to.state, isLocalMode, diesel);
                  const penskeResult = calculatePenskePricing({
                    miles: result.distance,
                    truckSize: penskeTruckSizeKey as import('../lib/multipliers').TruckSize,
                    fromState: result.from.state,
                    toState: result.to.state,
                    moveMonth: new Date().getMonth() + 1,
                    dieselPricePerGallon: diesel,
                    isLocalMove: isLocalMode,
                  });
                  const budgetCostBreakdown = calcBudgetCosts(result.distance, budgetTruckSize, result.from.state, result.to.state, isLocalMode, diesel);
                  const budgetDays = isLocalMode ? 1 : estimateBudgetDays(result.distance);
                  const uhaulBd = calcRentalBreakdown(costs.rental, result.distance, uhaulTruckSize, isLocalMode);
                  const penskeBd = calcRentalBreakdown(penskeResult.rentalBase, result.distance, penskeTruckSizeKey, isLocalMode);
                  const budgetBd = calcRentalBreakdown(budgetCostBreakdown.rental, result.distance, budgetTruckSize, isLocalMode);
                  const companyData: Record<string, { rental: number; days: number; truckSize: string; base: number; mileage: number; perMile: number; chargeableMiles: number; total: [number, number] }> = {
                    'U-Haul': { rental: costs.rental, days: estimateRentalDays(result.distance), truckSize: `${uhaulTruckSize} ft`, base: uhaulBd.base, mileage: uhaulBd.mileage, perMile: uhaulBd.perMile, chargeableMiles: uhaulBd.chargeableMiles, total: costs.total },
                    'Penske': { rental: penskeResult.rentalBase, days: penskeResult.rentalDays, truckSize: `${penskeTruckSizeKey} ft`, base: penskeBd.base, mileage: penskeBd.mileage, perMile: penskeBd.perMile, chargeableMiles: penskeBd.chargeableMiles, total: penskeCostBreakdown.total },
                    'Budget Truck': { rental: budgetCostBreakdown.rental, days: budgetDays, truckSize: `${budgetTruckSize} ft`, base: budgetBd.base, mileage: budgetBd.mileage, perMile: budgetBd.perMile, chargeableMiles: budgetBd.chargeableMiles, total: budgetCostBreakdown.total },
                  };
                  return placeholderCompanies.map((company) => {
                    const data = companyData[company.name] ?? { rental: costs.rental, days: estimateRentalDays(result.distance), truckSize: `${uhaulTruckSize} ft` };
                    return (
                      <a
                        key={company.id}
                        href={company.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-3 border border-slate-200 rounded-2xl p-4 transition-all group bg-white hover:shadow-md hover:border-teal-400"
                      >
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {data.days} {data.days === 1 ? 'day' : 'days'}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-teal-700 bg-teal-50 border-teal-100">
                            {data.truckSize} truck
                          </span>
                        </div>
                        <div className="w-20 h-10 flex items-center justify-center">
                          <img
                            src={company.logoUrl}
                            alt={`${company.name} logo`}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              if (el.parentElement) el.parentElement.innerHTML = `<span class="font-bold text-xs text-slate-700">${company.name}</span>`;
                            }}
                          />
                        </div>
                        <div className="w-full">
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-900">${data.rental.toLocaleString()}</div>
                            <div className="text-xs text-slate-400 mt-0.5">rental est.</div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px]">
                            <div className="flex justify-between text-slate-500">
                              <span>Base</span>
                              <span className="font-medium text-slate-700">${data.base.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Mileage{data.chargeableMiles > 0 ? ` (${data.chargeableMiles.toLocaleString()} mi)` : ''}</span>
                              <span className="font-medium text-slate-700">${data.mileage.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-slate-100">
                              <span className="font-semibold text-slate-700">Total</span>
                              <span className="font-bold text-teal-700">${data.rental.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-medium flex items-center gap-1 text-teal-600 group-hover:text-teal-700">
                          Get Quote <ArrowRight className="w-3 h-3" />
                        </div>
                      </a>
                    );
                  });
                })()}
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">Estimates based on real pricing patterns. Click to get an exact quote from each company.</p>
            </div>

            <div className="mt-4 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">
                Rental days are assigned by the company based on distance — you don't choose them. Longer moves are automatically placed into multi-day tiers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
