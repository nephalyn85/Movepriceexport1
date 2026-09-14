import { useState } from 'react';
import { Home, Clock, Users, DollarSign, ChevronDown, ChevronUp, MapPin, Truck } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';

const volumeRanges: Record<string, { low: number; high: number }> = {
  Studio: { low: 250, high: 450 },
  '1BR': { low: 500, high: 800 },
  '2BR': { low: 800, high: 1200 },
  '3BR': { low: 1200, high: 1800 },
  '4BR': { low: 1800, high: 2400 },
};

const LOCAL_MILES = 30;
const LONG_MILES = 500;

const distanceTiers = {
  local: { maxMiles: 50, pricePerCuFt: 1 },
  regional: { maxMiles: 250, pricePerCuFt: 3 },
  longDistance: { maxMiles: 500, pricePerCuFt: 4 },
};

const REGIONAL_MILES = 200;

function calcRange(sizeKey: string, miles: number): { low: number; high: number } {
  const vol = volumeRanges[sizeKey];
  let low: number, high: number;

  if (miles <= distanceTiers.local.maxMiles) {
    low = vol.low * distanceTiers.local.pricePerCuFt;
    high = vol.high * distanceTiers.local.pricePerCuFt;
  } else if (miles <= distanceTiers.regional.maxMiles) {
    low = vol.low * distanceTiers.regional.pricePerCuFt;
    high = vol.high * distanceTiers.regional.pricePerCuFt;
  } else {
    low = vol.low * distanceTiers.longDistance.pricePerCuFt;
    high = vol.high * distanceTiers.longDistance.pricePerCuFt;
  }

  return { low: Math.round(low), high: Math.round(high) };
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

function fmtRange(r: { low: number; high: number }): string {
  return `${fmt(r.low)}–${fmt(r.high)}`;
}

const homeSizes = [
  {
    size: 'Studio / Small Apartment',
    sqft: '< 600 sq ft',
    local: fmtRange(calcRange('Studio', LOCAL_MILES)),
    longDistance: fmtRange(calcRange('Studio', LONG_MILES)),
    hours: '2–4 hours',
    crew: '2 movers',
    items: 'Bed, dresser, couch, dining set, boxes',
    color: 'teal',
  },
  {
    size: '1-Bedroom Apartment',
    sqft: '600–900 sq ft',
    local: fmtRange(calcRange('1BR', LOCAL_MILES)),
    longDistance: fmtRange(calcRange('1BR', LONG_MILES)),
    hours: '3–5 hours',
    crew: '2 movers',
    items: 'Full bedroom set, living room furniture, kitchen appliances',
    color: 'blue',
  },
  {
    size: '2-Bedroom Home / Apt',
    sqft: '900–1,300 sq ft',
    local: fmtRange(calcRange('2BR', LOCAL_MILES)),
    longDistance: fmtRange(calcRange('2BR', LONG_MILES)),
    hours: '4–7 hours',
    crew: '2–3 movers',
    items: '2 bedroom sets, living/dining room, washer/dryer',
    color: 'emerald',
  },
  {
    size: '3-Bedroom Home',
    sqft: '1,300–2,000 sq ft',
    local: fmtRange(calcRange('3BR', LOCAL_MILES)),
    longDistance: fmtRange(calcRange('3BR', LONG_MILES)),
    hours: '6–9 hours',
    crew: '3 movers',
    items: '3 bedrooms, full living/dining, garage items',
    color: 'amber',
  },
  {
    size: '4-Bedroom Home',
    sqft: '2,000–3,000 sq ft',
    local: fmtRange(calcRange('4BR', LOCAL_MILES)),
    longDistance: fmtRange(calcRange('4BR', LONG_MILES)),
    hours: '8–12 hours',
    crew: '3–4 movers',
    items: 'Full house contents including multiple sets, outdoor furniture',
    color: 'rose',
  },
];

const colorMap: Record<string, { bg: string; text: string; badge: string; dot: string }> = {
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
};

const sizeKeys = ['Studio', '1BR', '2BR', '3BR', '4BR'];
const sizeLabels: Record<string, string> = {
  Studio: 'Studio',
  '1BR': '1 Bedroom',
  '2BR': '2 Bedroom',
  '3BR': '3 Bedroom',
  '4BR': '4 Bedroom',
};

const distanceBands = [
  { key: 'local', label: 'Local', sublabel: '< 50 miles', miles: LOCAL_MILES, icon: MapPin, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { key: 'regional', label: 'Regional', sublabel: '50–250 miles', miles: REGIONAL_MILES, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'longDistance', label: 'Long Distance', sublabel: '250–500+ miles', miles: LONG_MILES, icon: Truck, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
];

const matrixData = sizeKeys.map((key) => ({
  key,
  label: sizeLabels[key],
  local: calcRange(key, LOCAL_MILES),
  regional: calcRange(key, REGIONAL_MILES),
  longDistance: calcRange(key, LONG_MILES),
}));

const faqs = [
  {
    q: 'How much does it cost to move a studio or 1-bedroom apartment locally?',
    a: `Based on our calculator's pricing data, a local studio move (under 50 miles) typically runs $250–$450, while a 1-bedroom runs $500–$800. That covers a 2-mover crew for 2–5 hours. These estimates are based on cubic footage — a studio carries roughly 250–450 cu ft of belongings and a 1-bedroom 500–800 cu ft.`,
  },
  {
    q: 'How does home size affect which truck I need?',
    a: 'Our calculator maps home size directly to truck size: a studio fits a 10–12 ft truck, a 1-bedroom fits a 15–16 ft truck, a 2-bedroom needs a 20–22 ft truck, and 3–4 bedroom homes require a 26 ft truck. Choosing the right size avoids a second trip and lowers your total cost.',
  },
  {
    q: 'Why does moving cost jump so much for distances over 50 miles?',
    a: 'Our pricing tiers reflect real-world rate structures. Local moves (under 50 miles) are priced at roughly $1 per cu ft. Regional moves (50–250 miles) jump to $3 per cu ft, and long-distance moves (250–500+ miles) reach $4 per cu ft — reflecting multi-day rentals, fuel, and driver time. A 2-bedroom at 200 miles costs $2,400–$3,600 versus $800–$1,200 locally.',
  },
  {
    q: 'What is the cheapest time of year to move a large home?',
    a: 'Our calculator applies seasonal multipliers to rental pricing. Peak season (May–August) carries the highest rates. Moving in fall or winter (October–March) can save 15–25% on truck rental alone. For a 3–4 bedroom home moving 500 miles, that difference can be $400–$800.',
  },
  {
    q: 'How accurate are the estimates for a 4-bedroom home?',
    a: 'For a 4-bedroom home (roughly 1,800–2,400 cu ft of volume), our calculator estimates $1,800–$2,400 locally and $7,200–$9,600 for a 500-mile long-distance move. These are baseline estimates — actual costs vary based on your specific city corridor, floor access, and whether you hire full-service movers or rent a truck yourself.',
  },
];

export default function MovingCostByHomeSize() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeBand, setActiveBand] = useState<'local' | 'regional' | 'longDistance'>('local');

  const activeBandData = distanceBands.find((b) => b.key === activeBand)!;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Moving Cost by Home Size - Studio, 1BR, 2BR, 3BR, 4BR Prices"
        description="See how moving costs change with home size. Compare moving prices for studios, 1-bedroom, 2-bedroom, 3-bedroom, and 4+ bedroom homes. Get accurate estimates based on your home size."
        canonical="/moving-cost-by-home-size"
        keywords="moving cost by home size, moving cost 2 bedroom, moving cost 3 bedroom, moving cost studio apartment, moving price by bedroom count"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-16 flex-1">
        <section className="relative text-white overflow-hidden" style={{ minHeight: '600px' }}>
          <img
            src="/Move-Price_MovingCostByHomeSize.png"
            alt="Moving cost by home size illustration"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/75 via-teal-900/60 to-transparent" />
          <div className="absolute inset-0 flex items-center px-4">
            <div className="max-w-4xl w-full mx-auto">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-5 w-fit">
                <Home className="w-4 h-4" /> Home Size Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight drop-shadow-md">Moving Cost by Home Size</h1>
              <p className="text-white/85 text-lg max-w-2xl drop-shadow">
                From studios to 4-bedroom homes — see what you should expect to pay for local and long-distance moves.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 pt-5 pb-4 grid md:grid-cols-2 gap-3">
          {homeSizes.map((home, i) => {
            const c = colorMap[home.color];
            return (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className={`${c.bg} px-4 py-2.5 border-b border-slate-100`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className={`font-bold text-sm ${c.text}`}>{home.size}</h3>
                      <p className="text-xs text-slate-500">{home.sqft}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${c.badge}`}>{home.crew}</span>
                  </div>
                </div>
                <div className="px-4 py-2.5 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5"><DollarSign className="w-3 h-3" />Local Move</p>
                      <p className="font-bold text-slate-800 text-sm">{home.local}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5"><DollarSign className="w-3 h-3" />Long Distance</p>
                      <p className="font-bold text-slate-800 text-sm">{home.longDistance}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{home.hours}</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{home.crew}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Calculator */}
        <section className="bg-white border-t border-slate-100 py-2">
          <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Get Your Personalized Estimate</h2>
            <p className="text-slate-500 mb-6">Your home size is factored in automatically.</p>
          </div>
          <MovePriceCalculator hideConsolidatedTable hideUsCostSection />
        </section>

        {/* Cost Matrix */}
        <section className="bg-white border-t border-b border-slate-100 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Cost Matrix by Distance</h2>
              <p className="text-slate-500 text-sm">Select a distance band to compare estimated moving costs across all home sizes.</p>
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              {distanceBands.map((band) => {
                const isActive = activeBand === band.key;
                return (
                  <button
                    key={band.key}
                    onClick={() => setActiveBand(band.key as typeof activeBand)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      isActive
                        ? `${band.bg} ${band.border} ${band.color} shadow-sm`
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <band.icon className="w-4 h-4" />
                    <span>{band.label}</span>
                    <span className={`text-xs font-normal ${isActive ? band.color : 'text-slate-400'}`}>{band.sublabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className={`px-5 py-3.5 ${activeBandData.bg} border-b ${activeBandData.border} flex items-center gap-2`}>
                <activeBandData.icon className={`w-4 h-4 ${activeBandData.color}`} />
                <span className={`text-sm font-semibold ${activeBandData.color}`}>{activeBandData.label} Move — {activeBandData.sublabel}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/3">Home Size</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Estimate</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">High Estimate</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Typical Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((row, i) => {
                      const band = activeBand as 'local' | 'regional' | 'longDistance';
                      const range = row[band];
                      const colors = Object.values(colorMap);
                      const c = colors[i];
                      const maxHigh = Math.max(...matrixData.map((r) => r[band].high));
                      const barPct = Math.round((range.high / maxHigh) * 100);
                      return (
                        <tr key={row.key} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                              <span className="font-semibold text-slate-800 text-sm">{row.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-slate-700 font-medium text-sm">{fmt(range.low)}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-slate-800 font-bold text-sm">{fmt(range.high)}</span>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    activeBand === 'local' ? 'bg-teal-500' :
                                    activeBand === 'regional' ? 'bg-blue-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400 w-20 text-right">{fmtRange(range)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-400">Estimates based on cubic footage volume per home size. Actual costs vary by location, crew size, and service level.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-semibold text-slate-800 text-sm">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: openFaq === i ? '500px' : '0px' }}
                  aria-hidden={openFaq !== i}
                >
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
