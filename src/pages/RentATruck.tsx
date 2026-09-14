import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TruckPricingVisual from '../components/TruckPricingVisual';
import { ArrowLeft, Star, MapPin, Fuel, Calculator, ArrowRight, Route, Info, Milestone, Truck as TruckIcon, CalendarDays, ChevronDown, ChevronUp, Users, Scale, CheckCircle, XCircle } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import RouteMap, { FuelRegion } from '../components/RouteMap';
import {
  DEFAULT_DIESEL_PRICE,
  uhaulSizeByHomeSize,
  penskeSizeByHomeSize,
  budgetSizeByHomeSize,
  truckSizes,
  truckAxleLabel,
  localPricing,
  calculateLocalTruckPrice,
  estimateRentalDays,
  calculateBudgetPrice,
  estimateBudgetDays,
  calcUhaulCosts,
  calcBudgetCosts,
  calcPenskeCosts,
  calcRentalBreakdown,
} from '../lib/truckRentalPricing';
import { calculatePenskePricing } from '../lib/pricingEngine';

interface TruckRentalCompany {
  id: string;
  name: string;
  logo: string;
  googleRating: number;
  googleReviews: number;
  yelpRating: number;
  yelpReviews: number;
  combinedScore: number;
  description: string;
}

interface DistanceResult {
  distance: number;
  from: { zip: string; city: string; state: string; lat: number; lng: number };
  to: { zip: string; city: string; state: string; lat: number; lng: number };
}

interface TruckRentalCompanyWithLink extends TruckRentalCompany {
  siteUrl: string;
  logoUrl: string;
  logoBg: string;
}

const placeholderCompanies: TruckRentalCompanyWithLink[] = [
  {
    id: '1',
    name: 'U-Haul',
    logo: '',
    logoUrl: '/U-haullogo.jpg',
    logoBg: '#E8241A',
    siteUrl: 'https://www.uhaul.com/Truck-Rentals/',
    googleRating: 4.2,
    googleReviews: 15420,
    yelpRating: 3.8,
    yelpReviews: 4230,
    combinedScore: 4.0,
    description: 'The largest DIY moving company with locations nationwide and a wide variety of truck sizes.',
  },
  {
    id: '2',
    name: 'Penske',
    logo: '',
    logoUrl: '/Penske-Truck-logo.png',
    logoBg: '#FFC20E',
    siteUrl: 'https://www.pensketruckrental.com',
    googleRating: 4.4,
    googleReviews: 8920,
    yelpRating: 4.1,
    yelpReviews: 2180,
    combinedScore: 4.25,
    description: 'Premium truck rental with newer vehicles and excellent customer service.',
  },
  {
    id: '3',
    name: 'Budget Truck',
    logo: '',
    logoUrl: '/budget-truck-1024x613.webp',
    logoBg: '#D0021B',
    siteUrl: 'https://www.budgettruck.com',
    googleRating: 4.0,
    googleReviews: 6540,
    yelpRating: 3.7,
    yelpReviews: 1890,
    combinedScore: 3.85,
    description: 'Affordable truck rentals with competitive pricing for budget-conscious movers.',
  },
];

const homeSizeCategories = [
  { value: 'studio', label: 'Studio', desc: 'Small apartment' },
  { value: '1br', label: '1 BR', desc: 'Apartment or small home' },
  { value: '2br', label: '2 BR', desc: 'Medium home' },
  { value: '3br', label: '3–4 BR', desc: 'Large home' },
];

const truckSizeToHome: Record<string, string> = {
  '10': 'Studio',
  '15': '1BR',
  '20': '2BR',
  '26': '3BR',
};

const homeVolumeRanges: Record<string, { low: number; high: number }> = {
  Studio: { low: 250, high: 450 },
  '1BR': { low: 450, high: 800 },
  '2BR': { low: 900, high: 1300 },
  '3BR': { low: 1300, high: 1800 },
};

const eastCoastStates = ['ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC'];
const midWestStates = ['OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS'];
const westStates = ['TX','OK','NM','AZ','CO','UT','NV','CA'];
const northWestStates = ['WA','OR','ID','MT','WY','AK','HI'];

function getRegionRate(state: string): number {
  const s = state.toUpperCase();
  if (eastCoastStates.includes(s)) return 5.5;
  if (midWestStates.includes(s)) return 6;
  if (westStates.includes(s)) return 6;
  if (northWestStates.includes(s)) return 7;
  return 6;
}

function estimateMovingCost(miles: number, truckSize: string, toState: string): { low: number; high: number; homeSize: string } {
  const homeSize = truckSizeToHome[truckSize] ?? '2BR';
  const vol = homeVolumeRanges[homeSize] ?? { low: 800, high: 1200 };
  let low = 0;
  let high = 0;
  if (miles <= 50) {
    low = vol.low * 1;
    high = vol.high * 1;
  } else if (miles <= 250) {
    low = vol.low * 3;
    high = vol.high * 3;
  } else if (miles <= 500) {
    low = vol.low * 4;
    high = vol.high * 4;
  } else {
    const rate = getRegionRate(toState);
    low = vol.low * rate;
    high = vol.high * rate;
  }
  return { low: Math.round(low), high: Math.round(high), homeSize };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= Math.round(rating) ? 'text-teal-400 fill-teal-400' : 'text-slate-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function RentATruck() {
  useEffect(() => {
    document.title = 'Truck Rental Cost Calculator | U-Haul, Penske & Budget Estimates | Move Price';

    const metaTags: HTMLMetaElement[] = [];
    const setMeta = (attrs: Record<string, string>) => {
      const el = document.createElement('meta');
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      metaTags.push(el);
    };

    setMeta({ name: 'description', content: 'Compare U-Haul, Penske, and Budget truck rental costs instantly. Enter ZIP codes and home size for a free estimate including fuel, tolls, and rental days.' });
    setMeta({ property: 'og:type', content: 'website' });
    setMeta({ property: 'og:url', content: 'https://www.move-price.com/rent-a-truck' });
    setMeta({ property: 'og:title', content: 'Truck Rental Cost Calculator — U-Haul, Penske & Budget' });
    setMeta({ property: 'og:description', content: 'Compare U-Haul, Penske, and Budget truck rental costs. Free estimate by ZIP code — includes fuel, tolls, and rental days.' });
    setMeta({ property: 'og:image', content: 'https://www.move-price.com/MovingTruckRentalMove-Price.png' });
    setMeta({ name: 'twitter:card', content: 'summary_large_image' });
    setMeta({ name: 'twitter:title', content: 'Truck Rental Cost Calculator — U-Haul, Penske & Budget' });
    setMeta({ name: 'twitter:description', content: 'Compare U-Haul, Penske, and Budget truck rental costs. Free estimate by ZIP code — includes fuel, tolls, and rental days.' });
    setMeta({ name: 'twitter:image', content: 'https://www.move-price.com/MovingTruckRentalMove-Price.png' });

    const webPageScript = document.createElement('script');
    webPageScript.type = 'application/ld+json';
    webPageScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Truck Rental Cost Calculator",
      "description": "Estimate truck rental costs based on distance, truck size, and rental duration using real pricing data.",
      "url": "https://www.move-price.com/rent-a-truck"
    });
    document.head.appendChild(webPageScript);

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "How accurate are the truck rental estimates?", "acceptedAnswer": { "@type": "Answer", "text": "Our estimates are based on real pricing patterns from major rental companies including base rates, per-mile charges, and estimated rental days. Actual prices may vary depending on availability, location, and promotions at the time of booking." } },
        { "@type": "Question", "name": "What is included in the rental cost estimate?", "acceptedAnswer": { "@type": "Answer", "text": "The rental estimate covers the base truck rental fee and mileage charges. Fuel cost and toll estimates are shown separately so you can see the full picture of your move cost." } },
        { "@type": "Question", "name": "Why does the estimate show multiple rental days?", "acceptedAnswer": { "@type": "Answer", "text": "Truck rental companies assign rental days based on your move distance, not the actual time you drive. Longer moves are placed into multi-day tiers automatically. You can review the day breakdown in the estimator." } },
        { "@type": "Question", "name": "Does the calculator include fuel costs?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Fuel cost is estimated separately using the current national diesel average price and the truck's approximate MPG for your selected truck size." } },
        { "@type": "Question", "name": "Are tolls included in the estimate?", "acceptedAnswer": { "@type": "Answer", "text": "Toll costs are estimated based on your route corridor using standard 2-axle vehicle rates. These are ranges since actual toll amounts depend on the specific route you drive." } },
        { "@type": "Question", "name": "Which truck size should I choose?", "acceptedAnswer": { "@type": "Answer", "text": "A 10 ft truck works well for studio moves. A 15 ft truck suits a 1-bedroom apartment. A 20 ft truck is ideal for a 2-bedroom home, and a 26 ft truck handles 3–4 bedroom homes or full house moves." } },
        { "@type": "Question", "name": "Do I need to sign up or provide personal information?", "acceptedAnswer": { "@type": "Answer", "text": "No. This calculator requires no signup, no email, and no personal data. Just enter your ZIP codes and truck size to get an instant estimate." } },
        { "@type": "Question", "name": "Can I compare multiple truck rental companies?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. After running your estimate, scroll down to see U-Haul, Penske, and Budget Truck with links to get quotes directly on their websites." } }
      ]
    });
    document.head.appendChild(faqScript);

    return () => {
      document.title = 'Moving Cost Calculator | Free Instant Moving Estimate | Move Price';
      metaTags.forEach((el) => document.head.removeChild(el));
      document.head.removeChild(webPageScript);
      document.head.removeChild(faqScript);
    };
  }, []);

  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const [fromZip, setFromZip] = useState(searchParams.get('from') ?? '');
  const [toZip, setToZip] = useState(searchParams.get('to') ?? '');
  const [homeSize, setHomeSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DistanceResult | null>(null);
  const [fuelRegions, setFuelRegions] = useState<FuelRegion[]>([]);
  const [avgDieselPrice, setAvgDieselPrice] = useState<number | null>(null);
  const [comparisonExpanded, setComparisonExpanded] = useState(false);
  const [returnToSame, setReturnToSame] = useState(false);

  const uhaulTruckSize = homeSize ? uhaulSizeByHomeSize[homeSize] : '';
  const selectedTruck = truckSizes.find((t) => t.value === uhaulTruckSize);

  const calcCosts = (miles: number, truck: typeof truckSizes[0], fromState: string, toState: string, local: boolean) => {
    return calcUhaulCosts(miles, truck.value, fromState, toState, local, avgDieselPrice ?? DEFAULT_DIESEL_PRICE);
  };

  const handleCalculate = async () => {
    if (fromZip.length !== 5 || toZip.length !== 5 || !homeSize) return;
    setLoading(true);
    setError('');
    setResult(null);
    setFuelRegions([]);
    setAvgDieselPrice(null);
    setComparisonExpanded(false);

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

  const sameZip = fromZip.length === 5 && fromZip === toZip;
  const autoLocal =
    result !== null &&
    result.distance < 50 &&
    result.from.state === result.to.state;
  const isLocalMode = returnToSame || sameZip || autoLocal;
  const costs = result && selectedTruck ? calcCosts(result.distance, selectedTruck, result.from.state, result.to.state, isLocalMode) : null;
  const budgetTruckSize = homeSize ? budgetSizeByHomeSize[homeSize] : '';
  const penskeTruckSizeKey = homeSize ? penskeSizeByHomeSize[homeSize] : '';

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo
        title="Rent a Moving Truck - Truck Rental Calculator & Size Guide"
        description="Calculate your moving truck rental cost instantly. Compare truck sizes, prices, and features. Find the right truck for your move and get an accurate cost estimate."
        canonical="/rent-a-truck"
        keywords="rent a moving truck, truck rental calculator, moving truck sizes, truck rental cost, moving truck comparison"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />

      {/* Hero */}
      <div className="relative w-full overflow-hidden" style={{ height: '480px' }}>
        <img
          src="/MovingTruckRentalMove-Price.png"
          alt="Moving truck parked ready for rental"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/40 text-teal-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 backdrop-blur-sm">
            <TruckIcon className="w-3.5 h-3.5" />
            U-Haul · Penske · Budget
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
            Truck Rental Cost Calculator
          </h1>
          <p className="text-lg sm:text-xl text-slate-200 max-w-xl mb-6 leading-relaxed">
            Compare U-Haul, Penske, and Budget — instant estimate by ZIP code, truck size, and distance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-teal-400" /> Fuel & tolls included</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-teal-400" /> No signup required</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-teal-400" /> Real pricing patterns</span>
          </div>
        </div>
        <div className="absolute bottom-4 left-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calculator
          </Link>
        </div>
      </div>

      <div className="pb-16 px-4 pt-10">
        <div className="max-w-4xl mx-auto">

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-600" />
              Truck Rental Calculator
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  From ZIP Code
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                  <input
                    type="text"
                    placeholder="Enter ZIP"
                    value={fromZip}
                    onChange={(e) => {
                      setFromZip(e.target.value.replace(/\D/g, '').slice(0, 5));
                      setResult(null);
                    }}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  To ZIP Code
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  <input
                    type="text"
                    placeholder="Enter ZIP"
                    value={toZip}
                    onChange={(e) => {
                      setToZip(e.target.value.replace(/\D/g, '').slice(0, 5));
                      setResult(null);
                    }}
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
                    onChange={(e) => {
                      setReturnToSame(e.target.checked);
                      setResult(null);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border-2 border-slate-300 rounded peer-checked:border-teal-500 peer-checked:bg-teal-500 transition-all flex items-center justify-center group-hover:border-teal-400">
                    {returnToSame && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors select-none">
                  Return truck to same location
                </span>
              </label>
              {(returnToSame || sameZip) && (
                <p className="mt-1.5 ml-6 text-xs text-teal-700">
                  {sameZip && !returnToSame ? 'Same ZIP detected — ' : ''}Local pricing applies: flat base rate + per-mile charge (round-trip mileage for fuel)
                </p>
              )}
            </div>

            {result && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estimated Rental Days
                </label>
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl w-fit">
                  <span className="text-xl font-semibold text-slate-900">{estimateRentalDays(result.distance)}</span>
                  <span className="text-sm text-slate-600">{estimateRentalDays(result.distance) === 1 ? 'day' : 'days'} (auto-estimated)</span>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Home / Load Size
              </label>
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
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        homeSize === cat.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
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

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 space-y-6">
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
                              if (el.parentElement) {
                                el.parentElement.innerHTML = `<span class="font-bold text-xs text-slate-400">${company.name}</span>`;
                              }
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
                      <div className="text-2xl font-bold text-slate-900">
                        ${costs.rental.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {isLocalMode
                          ? (() => {
                              const p = localPricing[uhaulTruckSize];
                              return p ? `$${p.base.toFixed(2)} base + $${p.perMile.toFixed(2)}/mi` : '';
                            })()
                          : `${estimateRentalDays(result.distance)} ${estimateRentalDays(result.distance) === 1 ? 'day' : 'days'} incl.`
                        }
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
                        {costs.tolls[1] === 0
                          ? 'None'
                          : `$${costs.tolls[0]} – $${costs.tolls[1]}`}
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
                      ? `Diesel price from EIA weekly retail data. Mileage estimates are approximations.`
                      : `Fuel prices and mileage estimates are approximations. Actual costs may vary.`}
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
                                  if (el.parentElement) {
                                    el.parentElement.innerHTML = `<span class="font-bold text-xs text-slate-700">${company.name}</span>`;
                                  }
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
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setComparisonExpanded((v) => !v)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                <Scale className="w-4 h-4" />
                {comparisonExpanded ? 'Hide Comparison' : 'Compare with Hiring Movers'}
              </button>
              <Link
                to="/#calculator"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                <Calculator className="w-4 h-4" />
                Free Moving Calculator
              </Link>
            </div>

            {comparisonExpanded && (() => {
              const movers = result ? estimateMovingCost(result.distance, uhaulTruckSize, result.to.state) : { low: 0, high: 0, homeSize: '—' };
              const truckTotal = costs ? costs.total : [0, 0];
              const savings = { low: movers.low - truckTotal[1], high: movers.high - truckTotal[0] };
              const diyIsCheaper = result ? savings.low > 0 : false;
              return (
                    <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-800 px-5 py-4 flex items-center gap-3">
                        <Scale className="w-5 h-5 text-teal-400 flex-shrink-0" />
                        <div>
                          <h4 className="text-white font-semibold text-sm">DIY vs. Hiring Movers</h4>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {result ? `Based on your ${result.distance.toLocaleString()}-mile move · ${movers.homeSize} home equivalent` : 'Enter your route above to see a personalized comparison'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                        <div className="p-5 bg-teal-50">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <TruckIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">Rent a Truck (DIY)</div>
                              <div className="text-xs text-slate-500">Your current estimate</div>
                            </div>
                          </div>
                          <div className={`text-2xl font-bold mb-3 ${result ? 'text-teal-700' : 'text-slate-300'}`}>
                            ${truckTotal[0].toLocaleString()} – ${truckTotal[1].toLocaleString()}
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-500" /> Lower cost</div>
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-500" /> Full control of your schedule</div>
                            <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-slate-400" /> You do all the heavy lifting</div>
                            <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-slate-400" /> Requires packing your own truck</div>
                            <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-slate-400" /> Fuel, tolls & driving on you</div>
                          </div>
                        </div>

                        <div className="p-5 bg-white">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">Hire Professional Movers</div>
                              <div className="text-xs text-slate-500">Full-service moving company</div>
                            </div>
                          </div>
                          <div className={`text-2xl font-bold mb-3 ${result ? 'text-slate-700' : 'text-slate-300'}`}>
                            ${movers.low.toLocaleString()} – ${movers.high.toLocaleString()}
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Crew handles loading & unloading</div>
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Less physical effort for you</div>
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Often includes basic liability</div>
                            <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-slate-400" /> Higher overall cost</div>
                            <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-slate-400" /> Less flexibility in scheduling</div>
                          </div>
                        </div>
                      </div>

                      <div className={`px-5 py-4 flex items-start gap-3 ${result && diyIsCheaper ? 'bg-emerald-50 border-t border-emerald-100' : 'bg-slate-50 border-t border-slate-100'}`}>
                        <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${result && diyIsCheaper ? 'text-emerald-600' : 'text-slate-500'}`} />
                        <p className={`text-sm ${result && diyIsCheaper ? 'text-emerald-800' : 'text-slate-700'}`}>
                          {!result
                            ? 'Enter your ZIP codes and click Calculate to see how much you could save by renting a truck vs. hiring movers.'
                            : diyIsCheaper
                            ? <>Renting a truck typically saves you <span className="font-semibold">${savings.low.toLocaleString()} – ${savings.high.toLocaleString()}</span> on this route compared to hiring full-service movers. The trade-off is time and physical effort.</>
                            : <>For this move distance, professional movers may be <strong>competitively priced</strong>. Get a free exact quote on our <Link to="/" className="underline text-teal-700 hover:text-teal-900">Moving Calculator</Link>.</>
                          }
                        </p>
                      </div>

                      <div className="px-5 py-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <p className="text-xs text-slate-500 flex-1">
                          Moving company estimate uses the same ZIP codes. Enter move date &amp; add-ons for a personalized quote.
                        </p>
                        <Link
                          to="/#calculator"
                          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
                        >
                          Get Full Moving Estimate
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
            </div>
              );
            })()}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <span className="text-xl">🚚</span>
              How your price is calculated
            </h2>
            <p className="text-slate-600 text-sm mb-5">
              Your estimate is based on real truck rental pricing patterns:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="flex flex-col items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Milestone className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm mb-1">Miles determine the base cost</div>
                  <div className="text-xs text-slate-500">The farther you move, the higher the per-mile charge applied to your rental.</div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <TruckIcon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm mb-1">Truck size adjusts the rate</div>
                  <div className="text-xs text-slate-500">Larger trucks cost more per day and per mile due to fuel consumption and vehicle size.</div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm mb-1">Days assigned based on distance</div>
                  <div className="text-xs text-slate-500">Rental days are auto-estimated from your mileage — you don't choose them yourself.</div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-teal-800">
                <span className="font-semibold">You do not choose days</span> — companies assign them based on how far you are moving.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-xl">📆</span>
              Why your rental shows multiple days
            </h2>
            <p className="text-slate-600 text-sm mb-5">
              Truck rental companies do not charge per hour or per user selection. Instead, they use distance-based time windows:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-700 font-bold text-xs">1–2d</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Short moves</div>
                  <div className="text-xs text-slate-500">Local &amp; regional distances</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-teal-700 font-bold text-xs">3–5d</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Medium moves</div>
                  <div className="text-xs text-slate-500">Cross-state distances</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-700 font-bold text-xs">6–8d</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Long moves</div>
                  <div className="text-xs text-slate-500">Cross-country distances</div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Example:</span> A 2,900 mile move is automatically placed into a long-distance tier, which increases rental duration.
              </p>
            </div>
          </div>

          <TruckPricingVisual />

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Truck Rental Companies
            </h2>
          </div>

          <div className="space-y-6">
            {placeholderCompanies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-slate-100"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  <div
                    className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden p-3 border border-slate-100"
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    <img
                      src={company.logoUrl}
                      alt={`${company.name} logo`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        if (el.parentElement) {
                          el.parentElement.style.backgroundColor = company.logoBg;
                          el.parentElement.innerHTML = `<span class="text-white font-bold text-lg">${company.name}</span>`;
                        }
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">
                        {company.name}
                      </h3>
                      <p className="text-slate-600 text-sm">{company.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-6 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#4285F4] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">G</span>
                        </div>
                        <StarRating rating={company.googleRating} />
                        <span className="text-sm text-slate-600">
                          {company.googleRating} ({company.googleReviews.toLocaleString()})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#D32323] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">Y</span>
                        </div>
                        <StarRating rating={company.yelpRating} />
                        <span className="text-sm text-slate-600">
                          {company.yelpRating} ({company.yelpReviews.toLocaleString()})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">Combined Score:</span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                          {company.combinedScore.toFixed(1)}
                        </span>
                      </div>
                      <a
                        href={company.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                      >
                        Visit Site
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Frequently Asked Questions</h2>
            <FaqSection />
          </div>
        </div>
      </div>

      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

const faqs = [
  {
    q: 'How accurate are the truck rental estimates?',
    a: 'Our estimates are based on real pricing patterns from major rental companies including base rates, per-mile charges, and estimated rental days. Actual prices may vary depending on availability, location, and promotions at the time of booking.',
  },
  {
    q: 'What is included in the rental cost estimate?',
    a: 'The rental estimate covers the base truck rental fee and mileage charges. Fuel cost and toll estimates are shown separately so you can see the full picture of your move cost.',
  },
  {
    q: 'Why does the estimate show multiple rental days?',
    a: 'Truck rental companies assign rental days based on your move distance, not the actual time you drive. Longer moves are placed into multi-day tiers automatically. You can review the day breakdown in the estimator.',
  },
  {
    q: 'Does the calculator include fuel costs?',
    a: 'Yes. Fuel cost is estimated separately using the current national diesel average price and the truck\'s approximate MPG for your selected truck size.',
  },
  {
    q: 'Are tolls included in the estimate?',
    a: 'Toll costs are estimated based on your route corridor using standard 2-axle vehicle rates. These are ranges since actual toll amounts depend on the specific route you drive.',
  },
  {
    q: 'Which truck size should I choose?',
    a: 'A 10 ft truck works well for studio moves. A 15 ft truck suits a 1-bedroom apartment. A 20 ft truck is ideal for a 2-bedroom home, and a 26 ft truck handles 3–4 bedroom homes or full house moves.',
  },
  {
    q: 'Do I need to sign up or provide personal information?',
    a: 'No. This calculator requires no signup, no email, and no personal data. Just enter your ZIP codes and truck size to get an instant estimate.',
  },
  {
    q: 'Can I compare multiple truck rental companies?',
    a: 'Yes. After running your estimate, scroll down to see U-Haul, Penske, and Budget Truck with links to get quotes directly on their websites.',
  },
];

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-slate-50 transition-colors"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span className="font-medium text-slate-800 text-sm sm:text-base">{faq.q}</span>
            {openIndex === i
              ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
            }
          </button>
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: openIndex === i ? '500px' : '0px' }}
            aria-hidden={openIndex !== i}
          >
            <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {faq.a}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
