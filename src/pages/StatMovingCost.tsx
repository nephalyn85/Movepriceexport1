import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Truck, Users, TrendingUp, TrendingDown, DollarSign,
  CheckCircle, Star, ChevronRight, ArrowRight, BarChart3,
  Home, Calendar, Info, Database, ExternalLink,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';
import {
  loadStateData, getStateBySlug, getStateData,
  getDemandColor, getDemandLabel, getTruckPrice, StateData,
} from '../lib/stateMovingData';
import Seo from '../components/Seo';
import { calculateLocalTruckPrice, calculateTruckPrice } from '../lib/truckRentalPricing';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return `$${n.toLocaleString()}`; }
function fmtRange(lo: number, hi: number) { return `${fmt(lo)} – ${fmt(hi)}`; }

function pct(n: number) {
  return (
    <span className={n >= 0 ? 'text-green-700' : 'text-red-600'} key={n}>
      {n >= 0 ? '+' : ''}{n.toFixed(2)}%
    </span>
  );
}

// Stacked bar showing same-county / intrastate / interstate split
function MobilityBar({ sc, ds, diff }: { sc: number; ds: number; diff: number }) {
  return (
    <div className="space-y-2">
      {[
        { label: 'Same county (local move)', val: sc, color: '#14b8a6' },
        { label: 'Different county, same state', val: ds, color: '#0ea5e9' },
        { label: 'Out of state', val: diff, color: '#f97316' },
      ].map(({ label, val, color }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-44 flex-shrink-0">{label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-10 text-right">{val.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── FAQ JSON-LD builder ─────────────────────────────────────────────────────

function buildFaqSchema(state: StateData, routesWithPrices: (StateData['popularRoutes'][0] & { truck26: number })[]) {
  const faqs = [
    {
      q: `How much does it cost to hire movers in ${state.name}?`,
      a: `For a local 2-bedroom move in ${state.name}, professional movers charge between ${fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1])}. Long-distance moves from ${state.name} average ${fmtRange(state.avgMoversLongDistance[0], state.avgMoversLongDistance[1])} depending on distance and home size.`,
    },
    state.abbr === 'HI' ? {
      q: `Can I rent a moving truck to leave Hawaii?`,
      a: `No — rental trucks cannot leave the Hawaiian islands. Moving to the continental U.S. requires ocean container shipping via carriers like Matson or Pasha Hawaii. A 20ft container from Honolulu to Los Angeles typically costs $3,000–$5,000, with transit time of 7–14 days. Local same-island truck rentals are available.`,
    } : {
      q: `How much does a moving truck rental cost in ${state.name}?`,
      a: `A 26ft U-Haul one-way truck rental from ${state.name} averages ${fmt(state.truckRentalAvg)} (based on ${state.avgInterstateMiles}-mile avg interstate distance). For the most popular route (${routesWithPrices[0]?.toCity ?? 'nearby city'}), a 26ft U-Haul costs approximately ${routesWithPrices[0] ? fmt(routesWithPrices[0].truck26) : 'N/A'}.`,
    },
    {
      q: `When is the cheapest time to move in ${state.name}?`,
      a: `The cheapest months to move in ${state.name} are ${state.bestMonths.join(', ')}. Avoid ${state.worstMonths.slice(0, 2).join(' and ')} when demand and prices peak — summer rates can be 25–40% higher than off-season.`,
    },
    state.abbr === 'HI' ? {
      q: `Is it cheaper to ship a container or hire movers from Hawaii?`,
      a: `DIY container shipping (you pack, carrier ships) is cheaper — typically $3,000–$5,000 for a 20ft container vs. $${state.avgMoversLongDistance[0].toLocaleString()}–$${state.avgMoversLongDistance[1].toLocaleString()} for full-service movers who coordinate the container for you. For large homes or fragile items, full-service movers are worth the premium.`,
    } : {
      q: `Is it cheaper to rent a truck or hire movers in ${state.name}?`,
      a: `Renting a truck is typically cheaper for short distances. From ${state.largestCity}, the first popular route costs ${routesWithPrices[0] ? fmt(routesWithPrices[0].truck26) : 'N/A'} for a 26ft truck vs. approximately ${routesWithPrices[0] ? fmtRange(routesWithPrices[0].moversLow, routesWithPrices[0].moversHigh) : 'N/A'} for professional movers. For 3BR+ homes or moves over 500 miles, compare both before deciding.`,
    },
    {
      q: `What is the average home size in ${state.name}?`,
      a: `The median listed home size in ${state.name} is ${state.medianHomeSqFt.toLocaleString()} square feet (Realtor.com, March 2026). A 2-bedroom home is estimated at ${state.median2brSqFt.toLocaleString()} sq ft (× 0.62), producing approximately ${state.derived2brCubicFeet.toLocaleString()} cubic feet of belongings.`,
    },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StatMovingCost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'truck' | 'movers'>('truck');
  const [state, setState] = useState<StateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadStateData()
      .then((data) => {
        if (cancelled) return;
        const found = slug ? data.find(s => s.slug === slug) : null;
        if (!found) { navigate('/moving-cost/map', { replace: true }); return; }
        setState(found);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) navigate('/moving-cost/map', { replace: true });
      });
    return () => { cancelled = true; };
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onAboutClick={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading state data…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  if (!state) return null;

  const demandColor = getDemandColor(state.demandLevel);
  const demandLabel = getDemandLabel(state.demandLevel);
  const BadgeIcon = state.demandLevel === 'very_high' || state.demandLevel === 'high' ? TrendingUp : TrendingDown;
  const nearbyStates = getStateData().filter(s => s.region === state.region && s.abbr !== state.abbr).slice(0, 6);

  const routesWithPrices = state.popularRoutes.map(r => ({
    ...r,
    truck12: getTruckPrice(r.miles, r.truckFromState, r.truckToState, '12'),
    truck16: getTruckPrice(r.miles, r.truckFromState, r.truckToState, '16'),
    truck26: getTruckPrice(r.miles, r.truckFromState, r.truckToState, '26'),
  }));

  const cheapestRoute = routesWithPrices.length
    ? routesWithPrices.reduce((a, b) => a.truck26 < b.truck26 ? a : b)
    : null;

  const localTruck12 = getTruckPrice(25, state.abbr, state.abbr, '12');
  const localTruck16 = getTruckPrice(25, state.abbr, state.abbr, '16');
  const localTruck26 = getTruckPrice(25, state.abbr, state.abbr, '26');

  // Intrastate one-way: 26ft U-Haul at avg intrastate miles
  const intrastate26 = calculateTruckPrice(state.avgIntrastateMiles, '26');
  // Interstate one-way avg: 26ft U-Haul at avg interstate miles (matches DB truck_rental_avg)
  const oneWayAvg26 = calculateTruckPrice(state.avgInterstateMiles, '26');
  // Weighted avg: 26ft U-Haul at derived_avg_move_miles (blend of all move types)
  const weightedAvg26 = calculateTruckPrice(state.derivedAvgMoveMiles, '26');

  const isHawaii = state.abbr === 'HI';

  const pageTitle = `${state.name} Moving Costs 2025 — Movers vs. Truck Rental | Real Data`;
  const pageDesc = isHawaii
    ? `Moving costs in Hawaii: local movers average ${fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1])} for a 2BR home (${state.medianHomeSqFt.toLocaleString()} sq ft median). Moving to the continental U.S. requires container shipping ($3,000–$8,000+). Prices and methodology from U.S. Census data.`
    : `Moving costs in ${state.name}: local movers average ${fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1])} for a 2BR home (${state.medianHomeSqFt.toLocaleString()} sq ft median). 26ft truck rental averages ${fmt(state.truckRentalAvg)}. Prices, routes, and methodology from U.S. Census data.`;

  const faqSchema = buildFaqSchema(state, routesWithPrices);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://move-price.com/' },
      { '@type': 'ListItem', position: 2, name: 'Moving Cost Map', item: 'https://move-price.com/moving-cost/map' },
      { '@type': 'ListItem', position: 3, name: `${state.name} Moving Costs`, item: `https://move-price.com/moving-cost/state/${state.slug}` },
    ],
  };

  const canonicalUrl = `https://move-price.com/moving-cost/state/${state.slug}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      <Seo
        title={pageTitle}
        description={pageDesc}
        canonical={canonicalUrl}
        keywords={`${state.name} moving cost, ${state.name} movers cost, ${state.name} truck rental, how much does it cost to move ${state.name}, ${state.name} moving estimate`}
        jsonLd={[faqSchema, breadcrumbSchema]}
      />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {/* Desktop: background-image with overlay. Mobile: solid green bg, image shown below. */}
      <section
        className="pt-24 pb-14 text-white relative hero-section"
        style={{
          minHeight: '600px',
          ...(state.heroImage ? {
            backgroundImage: `url(${state.heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 60%',
          } : undefined),
        }}
      >
        {/* Desktop overlay */}
        {state.heroImage
          ? <div className="hidden md:block absolute inset-0 bg-gradient-to-b from-slate-900/75 to-slate-800/88" />
          : <div className="hidden md:block absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800" />}
        {/* Mobile: same teal/emerald gradient as main page hero */}
        <div className="md:hidden absolute inset-0 bg-gradient-to-br from-teal-900/75 to-emerald-900/65" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-white/70 mb-6">
            <Link to="/" className="hover:text-teal-400 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/moving-cost/map" className="hover:text-teal-400 transition-colors">Moving Cost Map</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white">{state.name}</span>
          </nav>

          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="flex-1 min-w-0">
              {/* Demand badge */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border"
                  style={{ backgroundColor: demandColor + '20', borderColor: demandColor + '40', color: demandColor }}
                >
                  <BadgeIcon className="w-3.5 h-3.5" />
                  {demandLabel}
                </div>
                <span className="text-sm text-white/80">{state.region} · #{state.inboundRank} inbound rank</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {state.name} Moving Costs
              </h1>
              <p className="text-white text-lg max-w-2xl leading-relaxed">{pageDesc}</p>

              <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                <Database className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                Sources: Realtor.com Mar 2026 · ACS 2022 Table B07003 · IRS SOI Migration 2021–22 · Move-Price Pricing Engine
              </div>
            </div>

            {/* Hero stat tiles */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center min-w-[130px]">
                <p className="text-[10px] text-teal-300 font-bold uppercase tracking-wide mb-0.5">Professional Movers</p>
                <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Local 2BR Move</p>
                <p className="text-2xl font-bold text-white">{fmt(state.avgMoversLocal[0])}</p>
                <p className="text-sm text-white/80">– {fmt(state.avgMoversLocal[1])}</p>
              </div>
              {isHawaii ? (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center min-w-[130px]">
                  <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Container Shipping</p>
                  <p className="text-2xl font-bold text-teal-400">$3k–$8k+</p>
                  <p className="text-sm text-white/80">to mainland USA</p>
                </div>
              ) : (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center min-w-[130px]">
                  <p className="text-[10px] text-teal-300 font-bold uppercase tracking-wide mb-0.5">Truck Rental — DIY</p>
                  <p className="text-xs text-white/70 uppercase tracking-wide mb-2">26ft U-Haul (one-way)</p>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-white/50 whitespace-nowrap">{state.avgIntrastateMiles} mi intra</span>
                      <span className="text-base font-bold text-teal-400">{fmt(intrastate26)}</span>
                    </div>
                    <div className="border-t border-white/10" />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-white/50 whitespace-nowrap">{state.derivedAvgMoveMiles} mi wtd avg</span>
                      <span className="text-base font-bold text-teal-300">{fmt(weightedAvg26)}</span>
                    </div>
                    <div className="border-t border-white/10" />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-white/50 whitespace-nowrap">{state.avgInterstateMiles} mi inter</span>
                      <span className="text-base font-bold text-white">{oneWayAvg26 > 0 ? fmt(oneWayAvg26) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-only: show full image below hero text, uncropped */}
      {state.heroImage && (
        <div className="md:hidden bg-slate-800">
          <img
            src={state.heroImage}
            alt={`${state.name} moving illustration`}
            className="w-full h-auto block"
          />
        </div>
      )}

      {/* ── QUICK-STATS BAR ──────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-100">
            {[
              { label: 'IRS Inbound Rank', value: `#${state.inboundRank}`, sub: 'of 50 states', cite: 'IRS SOI' },
              { label: 'Net Migration Rate', value: `${state.netMigrationPct >= 0 ? '+' : ''}${state.netMigrationPct.toFixed(2)}%`, sub: state.netMigrationPct >= 0 ? 'net inbound' : 'net outbound', cite: 'IRS SOI' },
              { label: '2BR Est. Size', value: `${state.median2brSqFt.toLocaleString()} ft²`, sub: `all-home ${state.medianHomeSqFt.toLocaleString()} ft²`, cite: 'Realtor.com' },
              { label: 'Avg Move Distance', value: `${state.derivedAvgMoveMiles} mi`, sub: 'ACS-derived', cite: 'ACS 2022' },
              { label: 'Best Months', value: state.bestMonths.slice(0, 2).join(', '), sub: 'lowest prices', cite: '' },
            ].map(({ label, value, sub, cite }) => (
              <div key={label} className="text-center px-4 py-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{sub}</p>
                {cite && <p className="text-xs text-teal-600 font-medium mt-0.5">{cite}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW WE CALCULATE PRICES ──────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            How We Calculate {state.name} Moving Costs
          </h2>
          <p className="text-slate-500 mb-8 max-w-3xl">
            Every number on this page is derived from public government datasets and our real-world
            pricing engine — not surveys or guesses. Here is exactly where each figure comes from.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">

            {/* ACS Migration */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-4.5 h-4.5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Where {state.name} Movers Go</h3>
                  <p className="text-xs text-blue-700 font-medium">ACS 2022 · Table B07003</p>
                </div>
              </div>
              <MobilityBar
                sc={state.pctSameCounty}
                ds={state.pctDiffCountySameState}
                diff={state.pctDiffState}
              />
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2 font-medium">Top out-of-state destinations</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.topDestStates.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700">{s}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">Source: ACS State-to-State Flow Tables 2022</p>
              </div>
            </div>

            {/* Home size + cubic feet */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Home className="w-4.5 h-4.5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Home Size &amp; Move Volume</h3>
                  <p className="text-xs text-amber-700 font-medium">Realtor.com Inventory Data · March 2026</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-800">All-home median size</p>
                    <p className="text-xs text-slate-500">Active listings, all property types</p>
                  </div>
                  <span className="font-bold text-slate-900">{state.medianHomeSqFt.toLocaleString()} ft²</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-800">2BR estimated size</p>
                    <p className="text-xs text-slate-500">{state.medianHomeSqFt.toLocaleString()} × 0.62 ratio</p>
                  </div>
                  <span className="font-bold text-slate-900">{state.median2brSqFt.toLocaleString()} ft²</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-800">2BR move volume</p>
                    <p className="text-xs text-slate-500">{state.median2brSqFt.toLocaleString()} sqft × 0.652 CF/sqft (AMSA density)</p>
                  </div>
                  <span className="font-bold text-slate-900">{state.derived2brCubicFeet.toLocaleString()} ft³</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Avg move distance</p>
                    <p className="text-xs text-slate-500">Weighted from ACS flows + county area</p>
                  </div>
                  <span className="font-bold text-teal-700">{state.derivedAvgMoveMiles} mi</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                AMSA standard: 5,000 lbs ÷ 7 lbs/ft³ = 700 ft³ national anchor, scaled by state home size. A {state.derived2brCubicFeet.toLocaleString()} ft³ load fits in a 20ft truck (~1,015 ft³ capacity).
              </p>
            </div>

            {/* Truck pricing engine / Hawaii container note */}
            {isHawaii ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4.5 h-4.5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Shipping to the Mainland</h3>
                    <p className="text-xs text-teal-700 font-medium">Container &amp; Freight Only</p>
                  </div>
                </div>
                <div className="space-y-2.5 text-sm text-slate-700">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <p>Rental trucks cannot leave Hawaii — one-way continental rentals are not available from the islands</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <p>Moves to the continental U.S. require an ocean shipping container or freight barge (typically $3,000–$8,000+)</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <p>Local truck rentals (same-island, round-trip) are available from U-Haul, Budget, and Penske</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    <p>Major container carriers: Matson, Pasha Hawaii, Young Brothers (inter-island)</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  Local truck prices below are for same-island round-trip rentals only.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4.5 h-4.5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Truck Price Methodology</h3>
                    <p className="text-xs text-teal-700 font-medium">Move-Price Pricing Engine</p>
                  </div>
                </div>
                <div className="space-y-2.5 text-sm text-slate-700">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <p>Base rate from actual U-Haul quote data (by route and truck size)</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <p>State-level demand multiplier based on IRS migration imbalance (outbound states pay more)</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <p>Fuel surcharge computed from OPIS diesel price index by region</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    <p>Seasonal adjustment: +20–35% June–August, −10–20% January–March</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {state.name} demand level: <strong>{demandLabel}</strong> (IRS net rate: {state.netMigrationPct >= 0 ? '+' : ''}{state.netMigrationPct.toFixed(2)}%)
                </p>
              </div>
            )}
          </div>

          {/* Avg cost at derived distance */}
          <div className="bg-gradient-to-r from-teal-50 to-slate-50 rounded-2xl border border-teal-200 p-6">
            {isHawaii ? (
              <>
                <h3 className="font-bold text-slate-900 mb-1">
                  Hawaii Moving Costs at a Glance
                </h3>
                <p className="text-sm text-slate-500 mb-5">
                  Our pricing engine models continental one-way truck rentals only — it does not apply to Hawaii.
                  Local same-island truck rentals are day-rate based (not mileage one-way) and must be quoted directly from U-Haul, Budget, or Penske.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Local Movers (2BR)', value: fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1]), sub: 'same-island move', color: 'teal' },
                    { label: 'Mainland Movers (2BR)', value: fmtRange(state.avgMoversLongDistance[0], state.avgMoversLongDistance[1]), sub: 'incl. ocean freight', color: 'slate' },
                    { label: 'Container Shipping', value: '$3,000–$8,000+', sub: '20ft–40ft to mainland', color: 'amber' },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} className={`bg-white rounded-xl border border-${color}-200 p-4 text-center`}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-xl font-bold text-slate-900">{value}</p>
                      <p className="text-xs text-slate-400 mt-1">{sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Local truck rental rates in Hawaii are set by each location — call U-Haul, Budget, or Penske directly for a same-island day-rate quote. Moving to the mainland requires ocean container shipping (Matson, Pasha Hawaii); transit 7–14 days.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 mb-1">
                  Cost at Derived Average Move Distance ({state.derivedAvgMoveMiles} miles)
                </h3>
                <p className="text-sm text-slate-500 mb-5">
                  Calculated using the ACS-weighted average: {state.pctSameCounty.toFixed(1)}% local ×&nbsp;
                  {state.pctDiffCountySameState.toFixed(1)}% intrastate × {state.pctDiffState.toFixed(1)}% interstate,
                  weighted by county geography and ACS state-to-state flow data.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Truck Rental (DIY) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-teal-600" />
                      <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Truck Rental — DIY</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { size: '12ft', label: 'Studio', price: getTruckPrice(state.derivedAvgMoveMiles, state.abbr, state.abbr, '12') },
                        { size: '16ft', label: '1 Bedroom', price: getTruckPrice(state.derivedAvgMoveMiles, state.abbr, state.abbr, '16') },
                        { size: '26ft', label: '2–4 Bedrooms', price: getTruckPrice(state.derivedAvgMoveMiles, state.abbr, state.abbr, '26') },
                      ].map(({ size, label, price }) => (
                        <div key={size} className="bg-white rounded-xl border border-teal-200 p-3 text-center">
                          <p className="text-xs font-semibold text-teal-700 mb-0.5">{size}</p>
                          <p className="text-lg font-bold text-slate-900">{fmt(price)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Professional Movers */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-emerald-700" />
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Professional Movers</p>
                    </div>
                    <div className="bg-white rounded-xl border border-emerald-200 p-3 text-center h-[calc(100%-28px)] flex flex-col justify-center">
                      <p className="text-xs font-semibold text-emerald-700 mb-0.5">2BR Local Move</p>
                      <p className="text-2xl font-bold text-slate-900">{fmt(state.avgMoversLocal[0])}</p>
                      <p className="text-sm text-slate-500">– {fmt(state.avgMoversLocal[1])}</p>
                      <p className="text-xs text-slate-400 mt-1">Full-service, labor included</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── ROUTE PRICE TABLES ───────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Popular Routes from {state.largestCity}, {state.abbr}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isHawaii
                  ? 'Routes ranked by ACS 2022 out-migration volume. Container shipping required — rental trucks cannot leave Hawaii.'
                  : 'Routes ranked by ACS 2022 out-migration volume. Prices from our pricing engine.'}
              </p>
            </div>
            {!isHawaii && (
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                {(['truck', 'movers'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab === 'truck'
                      ? <><Truck className="w-4 h-4 inline mr-1.5 -mt-0.5" />Truck Rental</>
                      : <><Users className="w-4 h-4 inline mr-1.5 -mt-0.5" />Movers</>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isHawaii ? (
            /* Hawaii: show container shipping info + movers table */
            <div className="space-y-6">
              {/* Container shipping callout */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 mb-1">Rental Trucks Cannot Leave Hawaii</h3>
                    <p className="text-sm text-amber-800 leading-relaxed mb-3">
                      Moving from Hawaii to the continental U.S. requires ocean freight — you cannot rent a one-way moving truck off the islands.
                      The primary options are container shipping (FCL/LCL) via carriers like Matson or Pasha Hawaii.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        { label: '20ft Container', desc: 'Studio / 1–2BR', price: '$3,000–$5,000' },
                        { label: '40ft Container', desc: '3–4BR home', price: '$5,000–$8,000+' },
                        { label: 'LCL Shared', desc: 'Partial load', price: '$1,500–$3,500' },
                      ].map(({ label, desc, price }) => (
                        <div key={label} className="bg-white border border-amber-200 rounded-xl p-4 text-center">
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">{label}</p>
                          <p className="text-lg font-bold text-slate-900">{price}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-700 mt-3">
                      Estimates for Honolulu → Los Angeles or Seattle. Transit: 7–14 days. Carriers: Matson, Pasha Hawaii. Prices vary by season and fuel surcharges.
                    </p>
                  </div>
                </div>
              </div>

              {/* Movers table for Hawaii routes */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-slate-900 text-sm">Professional Movers — Mainland Routes</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Destination</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Miles</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Movers Low</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Movers High</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Shipping Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routesWithPrices.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 font-semibold text-slate-900">{r.toCity}, {r.toState}</td>
                          <td className="px-4 py-4 text-right text-sm text-slate-500">{r.miles.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right font-medium text-slate-800">{fmt(r.moversLow)}</td>
                          <td className="px-4 py-4 text-right font-medium text-red-600">{fmt(r.moversHigh)}</td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded-full">Ocean Container</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Mover estimates include ocean freight coordination. Full-service Hawaii → mainland movers typically handle container booking. Get at least 3 quotes.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Destination</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Miles</th>
                      {activeTab === 'truck' ? (
                        <>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">12ft (Studio)</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">16ft (1BR)</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">26ft (2–4BR)</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Save vs. Movers</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Movers Low</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Movers High</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">26ft Truck</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Truck Saves</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routesWithPrices.map((r, i) => {
                      const savings = r.moversLow - r.truck26;
                      const isBest = cheapestRoute && r.toCity === cheapestRoute.toCity && r.toState === cheapestRoute.toState;
                      return (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${isBest ? 'bg-green-50/40' : ''}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {isBest && <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full whitespace-nowrap">Best Value</span>}
                              <span className="font-semibold text-slate-900">{r.toCity}, {r.toState}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-slate-500">{r.miles.toLocaleString()}</td>
                          {activeTab === 'truck' ? (
                            <>
                              <td className="px-4 py-4 text-right font-medium text-slate-700">{fmt(r.truck12)}</td>
                              <td className="px-4 py-4 text-right font-medium text-slate-800">{fmt(r.truck16)}</td>
                              <td className="px-4 py-4 text-right font-bold text-slate-900">{fmt(r.truck26)}</td>
                              <td className="px-4 py-4 text-right">
                                {savings > 0
                                  ? <span className="text-sm font-semibold text-green-700">Save {fmt(savings)}</span>
                                  : <span className="text-sm text-slate-400">—</span>}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-4 text-right font-medium text-slate-800">{fmt(r.moversLow)}</td>
                              <td className="px-4 py-4 text-right font-medium text-red-600">{fmt(r.moversHigh)}</td>
                              <td className="px-4 py-4 text-right font-bold text-teal-700">{fmt(r.truck26)}</td>
                              <td className="px-4 py-4 text-right">
                                {savings > 0
                                  ? <span className="text-sm font-semibold text-green-700">{fmt(savings)}</span>
                                  : <span className="text-sm text-slate-400">Similar cost</span>}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {activeTab === 'truck'
                    ? 'Truck prices: U-Haul 26ft pricing table (2024–2025 quotes). Routes selected from ACS 2022 top out-migration destinations.'
                    : 'Mover estimates: industry average for a standard 2BR move. Local movers typically charge $80–$200/hr. Get at least 3 quotes.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── MOVERS vs DIY ────────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {isHawaii ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Container Shipping vs. Full-Service Movers</h2>
              <p className="text-slate-500 mb-7 max-w-2xl">
                When leaving Hawaii, you have two main options: ship your belongings yourself via ocean container, or hire a full-service mover who handles the container for you.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Container shipping DIY */}
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-teal-900">DIY Container Shipping</h3>
                      <p className="text-sm text-teal-700">You pack, carrier ships</p>
                    </div>
                  </div>
                  <div className="space-y-0 divide-y divide-teal-200 mb-5">
                    {[
                      { label: '20ft Container (1–2BR)', val: '$3,000–$5,000' },
                      { label: '40ft Container (3–4BR)', val: '$5,000–$8,000+' },
                      { label: 'LCL / Shared Container', val: '$1,500–$3,500' },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-teal-800">{label}</span>
                        <span className="font-bold text-teal-900">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {['Lower cost than full-service', 'You control packing quality', 'Carriers: Matson, Pasha Hawaii', '7–14 day transit to mainland'].map(p => (
                      <div key={p} className="flex items-center gap-2 text-sm text-teal-800">
                        <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-teal-600 mt-4">* Honolulu → Los Angeles or Seattle. Prices vary by season.</p>
                </div>

                {/* Full-service movers */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Full-Service Movers</h3>
                      <p className="text-sm text-slate-600">They handle everything including shipping</p>
                    </div>
                  </div>
                  <div className="space-y-0 divide-y divide-slate-200 mb-5">
                    {[
                      { label: 'Local move (2BR)', val: fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1]) },
                      { label: 'To mainland (2BR, incl. shipping)', val: fmtRange(state.avgMoversLongDistance[0], state.avgMoversLongDistance[1]) },
                      { label: `To ${routesWithPrices[0]?.toCity ?? 'Los Angeles'}`, val: routesWithPrices[0] ? fmtRange(routesWithPrices[0].moversLow, routesWithPrices[0].moversHigh) : '—' },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-slate-700">{label}</span>
                        <span className="font-bold text-slate-900">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {['No heavy lifting or packing', 'Movers coordinate ocean freight', 'Liability coverage included', 'Best for 3BR+ or fragile items'].map(p => (
                      <div key={p} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Movers vs. DIY Truck — Which Is Cheaper?</h2>
              <p className="text-slate-500 mb-7 max-w-2xl">
                Prices below are for the first popular route from {state.largestCity}. Use our calculator below for your specific ZIP codes.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Truck */}
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-teal-900">DIY Truck Rental</h3>
                      <p className="text-sm text-teal-700">You drive, you save</p>
                    </div>
                  </div>
                  <div className="space-y-0 divide-y divide-teal-200 mb-5">
                    {[
                      { label: '12ft (Studio/1BR)', val: routesWithPrices[0]?.truck12 },
                      { label: '16ft (1–2 Bedrooms)', val: routesWithPrices[0]?.truck16 },
                      { label: '26ft (3–4 Bedrooms)', val: routesWithPrices[0]?.truck26 },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-teal-800">{label}</span>
                        <span className="font-bold text-teal-900">{val ? fmt(val) : '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {['Lowest total cost', 'Full schedule control', 'Can tow a vehicle', 'Ideal for short–mid distance'].map(p => (
                      <div key={p} className="flex items-center gap-2 text-sm text-teal-800">
                        <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                  {routesWithPrices[0] && (
                    <p className="text-xs text-teal-600 mt-4">* Prices: {state.largestCity} → {routesWithPrices[0].toCity} ({routesWithPrices[0].miles.toLocaleString()} mi)</p>
                  )}
                </div>

                {/* Movers */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Professional Movers</h3>
                      <p className="text-sm text-slate-600">They handle everything</p>
                    </div>
                  </div>
                  <div className="space-y-0 divide-y divide-slate-200 mb-5">
                    {[
                      { label: 'Local move (2BR)', val: fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1]) },
                      { label: 'Long-distance (2BR)', val: fmtRange(state.avgMoversLongDistance[0], state.avgMoversLongDistance[1]) },
                      { label: `To ${routesWithPrices[0]?.toCity ?? '—'}`, val: routesWithPrices[0] ? fmtRange(routesWithPrices[0].moversLow, routesWithPrices[0].moversHigh) : '—' },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-slate-700">{label}</span>
                        <span className="font-bold text-slate-900">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {['No heavy lifting', 'Professional packing available', 'Liability coverage included', 'Best for 3BR+ or 500+ miles'].map(p => (
                      <div key={p} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── CALCULATOR ───────────────────────────────────────────────────── */}
      <section className="py-14 bg-gradient-to-b from-slate-100 to-white" id="calculator">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Get Your {state.name} Moving Quote</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Enter your ZIP codes for a real-time estimate — truck rental, movers, fuel, and tolls.
            </p>
          </div>
          <MovePriceCalculator />
        </div>
      </section>

      {/* ── CITY PRICE TABLE ─────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Moving Costs by City in {state.name}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {isHawaii
              ? 'Professional mover rates for local same-island moves. Local truck rentals are day-rate based — contact carriers directly for a quote.'
              : 'Truck prices from our pricing engine for a local move (~25 mi). Mover range is the state average for a 2BR local move.'}
          </p>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                    {isHawaii ? (
                      <>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Movers Local (2BR)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Movers to Mainland (2BR)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Container Shipping</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Local Truck Rental</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-teal-600 uppercase tracking-wide">Truck 12ft (Studio)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-teal-600 uppercase tracking-wide">Truck 16ft (1–2BR)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-teal-600 uppercase tracking-wide">Truck 26ft (3–4BR)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-700 uppercase tracking-wide">Movers (2BR)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.topCities.map((city, i) => (
                    <tr key={city.name} className={`hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-teal-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-teal-700" />
                          </div>
                          <span className="font-semibold text-slate-900">{city.name}</span>
                          {i === 0 && <span className="text-xs bg-teal-100 text-teal-700 font-medium px-2 py-0.5 rounded-full">Largest City</span>}
                        </div>
                      </td>
                      {isHawaii ? (
                        <>
                          <td className="px-4 py-4 text-right font-medium text-slate-800">{fmt(state.avgMoversLocal[0])} – {fmt(state.avgMoversLocal[1])}</td>
                          <td className="px-4 py-4 text-right font-medium text-slate-800">{fmt(state.avgMoversLongDistance[0])} – {fmt(state.avgMoversLongDistance[1])}</td>
                          <td className="px-4 py-4 text-right font-medium text-slate-800">$3,000–$8,000+</td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-1 rounded-full">Quote directly</span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 text-right font-medium text-slate-700">{fmt(localTruck12)}</td>
                          <td className="px-4 py-4 text-right font-medium text-slate-800">{fmt(localTruck16)}</td>
                          <td className="px-4 py-4 text-right font-bold text-slate-900">{fmt(localTruck26)}</td>
                          <td className="px-4 py-4 text-right font-medium text-slate-800">
                            {fmt(state.avgMoversLocal[0])} – {fmt(state.avgMoversLocal[1])}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <p className="text-xs text-slate-500">
                {isHawaii
                  ? 'Mover rates: industry averages for Hawaii. Local truck rentals are day-rate only — our continental pricing engine does not apply. Container rates: Matson/Pasha Hawaii estimates.'
                  : `Truck prices: U-Haul 26ft one-way. Intrastate: ${state.avgIntrastateMiles} mi avg within ${state.name}. Weighted avg: ${state.derivedAvgMoveMiles} mi (all move types). Interstate: ${state.avgInterstateMiles} mi avg to another state.`}
              </p>
              <a href="#calculator" className="text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1">
                Get your exact quote <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIPS + TIMING ────────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                {state.name} Moving Tips
              </h3>
              <div className="space-y-3">
                {state.movingTips.map((tip, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Best &amp; Worst Times to Move in {state.name}
              </h3>
              <div className="mb-5">
                <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4" /> Best months (lowest prices)
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.bestMonths.map(m => (
                    <span key={m} className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">{m}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Avoid these months (peak prices)
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.worstMonths.map(m => (
                    <span key={m} className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">{m}</span>
                  ))}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-sm text-slate-600">
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                Peak season (June–Aug) truck and mover prices are typically 25–40% higher than off-peak.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LONG-FORM SEO CONTENT ─────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            How Much Does It Cost to Move to or from {state.name}? (2025)
          </h2>

          <div className="space-y-5 text-slate-700 text-base leading-relaxed">
            {isHawaii ? (
              <p>
                Moving costs in <strong>Hawaii</strong> depend on home size and whether you are moving locally (same island)
                or to the continental United States. For a typical <strong>2-bedroom home in {state.largestCity}</strong>,
                local professional movers charge between <strong>{fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1])}</strong>.
                Moving to the mainland requires <strong>ocean container shipping</strong> — rental trucks cannot leave the islands.
                A 20ft shipping container from Honolulu to Los Angeles or Seattle typically costs <strong>$3,000–$5,000</strong>,
                while full-service movers (who coordinate the container for you) average <strong>{fmtRange(state.avgMoversLongDistance[0], state.avgMoversLongDistance[1])}</strong>.
              </p>
            ) : (
              <p>
                Moving costs in <strong>{state.name}</strong> depend on home size, distance, and whether you hire professional
                movers or rent a truck yourself. For a typical <strong>2-bedroom home in {state.largestCity}</strong>,
                local professional movers charge between <strong>{fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1])}</strong>.
                Long-distance moves from {state.name} average <strong>{fmtRange(state.avgMoversLongDistance[0], state.avgMoversLongDistance[1])}</strong>.
                A 26ft U-Haul one-way rental averages <strong>{fmt(state.truckRentalAvg)}</strong> ({state.avgInterstateMiles}-mile avg distance).
              </p>
            )}

            <p>
              The median listed home size in {state.name} is <strong>{state.medianHomeSqFt.toLocaleString()} square feet</strong> according
              to Realtor.com inventory data (March 2026). A 2-bedroom home is typically 62% of the all-home median —
              approximately <strong>{state.median2brSqFt.toLocaleString()} square feet</strong> in {state.name}. Move volume is
              calculated using the AMSA (American Moving &amp; Storage Association) industry standard: a 2-bedroom home averages
              5,000 lbs of household goods, which at 7 lbs per cubic foot of truck space equals 700 ft³ nationally. This is scaled
              proportionally by {state.name}'s home size relative to the national median, giving approximately{' '}
              <strong>{state.derived2brCubicFeet.toLocaleString()} cubic feet</strong> — fitting comfortably in a 20ft truck
              (~1,015 ft³ capacity) for most 2BR loads.
            </p>

            <p>
              According to ACS 2022 Geographic Mobility data (Table B07003), <strong>{state.pctSameCounty.toFixed(1)}%</strong> of{' '}
              {state.name} movers stay within the same county, <strong>{state.pctDiffCountySameState.toFixed(1)}%</strong> move
              to a different county within the state, and <strong>{state.pctDiffState.toFixed(1)}%</strong> move out of state.
              Weighting these percentages against actual county geography and ACS state-to-state migration flow data gives a
              derived average move distance of <strong>{state.derivedAvgMoveMiles} miles</strong> for {state.name} residents.
            </p>

            <p>
              IRS Statistics of Income (SOI) migration data for 2021–22 ranks {state.name}{' '}
              <strong>#{state.inboundRank} of 50 states</strong> for net inbound migration, with a net rate
              of <strong>{state.netMigrationPct >= 0 ? '+' : ''}{state.netMigrationPct.toFixed(2)}%</strong>.
              {state.netMigrationPct < -0.5 &&
                ` Because more residents leave ${state.name} than arrive, truck rental companies charge a demand premium on one-way rentals originating here — trucks must be repositioned at cost.`}
              {state.netMigrationPct > 0.8 &&
                ` ${state.name}'s strong inbound migration keeps professional movers busy year-round — book 5–8 weeks ahead during peak season.`}
              {' '}The most common out-of-state destinations from {state.name} are{' '}
              <strong>{state.topDestStates.slice(0, 3).join(', ')}</strong> (ACS flow data).
            </p>

            {routesWithPrices.length > 0 && (
              <p>
                For long-distance moves from {state.name}, truck prices for the most popular routes range from{' '}
                <strong>{fmt(Math.min(...routesWithPrices.map(r => r.truck26)))}</strong> to{' '}
                <strong>{fmt(Math.max(...routesWithPrices.map(r => r.truck26)))}</strong> for a 26ft U-Haul.
                Professional movers for the same routes range from{' '}
                <strong>{fmt(Math.min(...routesWithPrices.map(r => r.moversLow)))}</strong> to{' '}
                <strong>{fmt(Math.max(...routesWithPrices.map(r => r.moversHigh)))}</strong>.
              </p>
            )}

            <p>
              The <strong>best months to move in {state.name}</strong> are <strong>{state.bestMonths.join(', ')}</strong>,
              when demand is lower and you can save 20–35% compared to peak summer rates.
              Avoid <strong>{state.worstMonths.slice(0, 2).join(' and ')}</strong> — this is when mover availability
              is lowest and both truck and labor prices peak.
            </p>
          </div>

          {/* FAQ section for SEO — visible on page, also matches JSON-LD */}
          <div className="mt-10 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
            {[
              {
                q: `How much do movers cost in ${state.name}?`,
                a: `Local movers in ${state.name} charge ${fmtRange(state.avgMoversLocal[0], state.avgMoversLocal[1])} for a 2-bedroom home. Long-distance moves average ${fmtRange(state.avgMoversLongDistance[0], state.avgMoversLongDistance[1])} depending on distance.`,
              },
              isHawaii ? {
                q: `Can I rent a moving truck to leave Hawaii?`,
                a: `No — rental trucks cannot be taken off the Hawaiian islands. Moving to the continental U.S. requires ocean container shipping. A 20ft container from Honolulu to Los Angeles or Seattle typically costs $3,000–$5,000 through carriers like Matson or Pasha Hawaii. Local same-island truck rentals are available day-rate only — contact U-Haul, Budget, or Penske directly for pricing.`,
              } : {
                q: `How much is a moving truck rental in ${state.name}?`,
                a: `A 26ft U-Haul one-way rental from ${state.name} runs ${fmt(intrastate26)} for an intrastate move (avg ${state.avgIntrastateMiles} mi within ${state.name}), ${fmt(weightedAvg26)} at the weighted average distance (${state.derivedAvgMoveMiles} mi across all move types), or ${fmt(oneWayAvg26)} for an interstate move (avg ${state.avgInterstateMiles} mi to another state).`,
              },
              {
                q: `What is the cheapest time to move in ${state.name}?`,
                a: `${state.bestMonths.slice(0, 3).join(', ')} offer the lowest prices — typically 20–35% below peak summer rates. Avoid ${state.worstMonths.slice(0, 2).join(' and ')}.`,
              },
              {
                q: `What is the average home size in ${state.name}?`,
                a: `The median listed home size in ${state.name} is ${state.medianHomeSqFt.toLocaleString()} sq ft (Realtor.com, March 2026). A 2-bedroom home is estimated at ${state.median2brSqFt.toLocaleString()} sq ft (62% of the all-home median). Using the AMSA industry standard — 5,000 lbs for a 2BR ÷ 7 lbs/ft³ = 700 ft³ nationally — scaled by ${state.name}'s home size, a typical ${state.name} 2BR move produces approximately ${state.derived2brCubicFeet.toLocaleString()} ft³ of belongings.`,
              },
            ].map(({ q, a }) => (
              <details key={q} className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-slate-900 list-none">
                  {q}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-3" />
                </summary>
                <div className="px-5 pb-4 text-slate-700 text-sm leading-relaxed border-t border-slate-200 pt-3">{a}</div>
              </details>
            ))}
          </div>

          {/* Data sources citation box */}
          <div className="mt-10 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-600" />
              Data Sources &amp; Methodology
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { name: 'Median home size', source: 'Realtor.com Research Data — RDC Inventory Core Metrics (March 2026)', url: 'https://www.realtor.com/research/data/' },
                { name: 'Migration mobility %', source: 'ACS 2022 1-Year Estimates · Table B07003 (Geographic Mobility by Sex)', url: 'https://data.census.gov/' },
                { name: 'Top destination states', source: 'ACS 2022 State-to-State Migration Flow Tables', url: 'https://www.census.gov/topics/population/migration/guidance/state-to-state-migration-flows.html' },
                { name: 'Inbound rank & net rate', source: 'IRS Statistics of Income — Individual Income Tax Migration Data 2021–2022', url: 'https://www.irs.gov/statistics/soi-tax-stats-migration-data' },
                { name: 'Avg move distance', source: 'Derived: ACS mobility % × Census TIGER county areas × ACS flow data', url: '' },
                { name: 'Cubic feet estimate', source: 'Industry formula: median sq ft × 1.08 fill factor', url: '' },
                { name: 'Truck rental prices', source: 'U-Haul 26ft pricing table — sampled quotes 2024–2025, linearly interpolated by distance', url: '' },
                { name: 'Mover cost ranges', source: 'Industry averages from AMSA, HireAHelper, and moving company data', url: '' },
              ].map(({ name, source, url }) => (
                <div key={name} className="flex gap-2">
                  <span className="text-teal-500 flex-shrink-0 mt-0.5">▸</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{source}</p>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline flex items-center gap-0.5 mt-0.5">
                        View source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NEARBY STATES ────────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Compare {state.region} States</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
            {nearbyStates.map(s => (
              <Link
                key={s.abbr}
                to={`/moving-cost/state/${s.slug}`}
                className="group flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-400 hover:shadow-md transition-all text-center"
              >
                <span className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: getDemandColor(s.demandLevel) }} />
                <span className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{s.abbr}</span>
                <span className="text-xs text-slate-500 mt-0.5">#{s.inboundRank} rank</span>
                <span className="text-xs text-teal-600 font-medium mt-0.5">{fmt(s.truckRentalAvg)} avg</span>
              </Link>
            ))}
            <Link to="/moving-cost/map" className="flex flex-col items-center justify-center p-4 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-all text-center">
              <BarChart3 className="w-5 h-5 text-teal-600 mb-1" />
              <span className="font-semibold text-teal-700 text-sm">All States</span>
              <span className="text-xs text-teal-600 mt-0.5">View map</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
