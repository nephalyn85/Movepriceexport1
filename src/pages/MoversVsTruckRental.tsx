import { useState, useEffect } from 'react';
import { Scale, Users, Truck, Check, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';
import { calculatePenskePricing } from '../lib/pricingEngine';


function fmt(n: number) {
  return '$' + n.toLocaleString();
}

const volumeRanges: Record<string, { low: number; high: number }> = {
  Studio: { low: 250, high: 450 },
  '1BR': { low: 500, high: 800 },
  '2BR': { low: 800, high: 1200 },
  '3BR': { low: 1200, high: 1800 },
  '4BR': { low: 1800, high: 2400 },
};

const freeMiles = 50;
const distanceTiers = {
  regional: { maxMiles: 250, pricePerCuFt: 3 },
  longDistance: { maxMiles: 500, pricePerCuFt: 4 },
};

function calcMovers(size: string, miles: number): { low: number; high: number } {
  const vol = volumeRanges[size];
  let low: number;
  let high: number;
  if (miles <= freeMiles) {
    low = vol.low * 1;
    high = vol.high * 1;
  } else if (miles <= distanceTiers.regional.maxMiles) {
    low = vol.low * distanceTiers.regional.pricePerCuFt;
    high = vol.high * distanceTiers.regional.pricePerCuFt;
  } else if (miles <= distanceTiers.longDistance.maxMiles) {
    low = vol.low * distanceTiers.longDistance.pricePerCuFt;
    high = vol.high * distanceTiers.longDistance.pricePerCuFt;
  } else if (miles <= 1000) {
    low = vol.low * 5.5;
    high = vol.high * 5.5;
  } else {
    low = vol.low * 6;
    high = vol.high * 6;
  }
  return { low: Math.round(low), high: Math.round(high) };
}

type TruckSizeKey = '12' | '16' | '22' | '26';

interface ScenarioInput {
  label: string;
  size: string;
  miles: number;
  distanceLabel: string;
  truckSize: TruckSizeKey;
  fromState: string;
  toState: string;
}

const scenarioInputs: ScenarioInput[] = [
  { label: 'Studio',     size: 'Studio', miles: 30,   distanceLabel: 'Local (~30 mi)',              truckSize: '12', fromState: 'NY', toState: 'NY' },
  { label: '1 Bedroom',  size: '1BR',    miles: 200,  distanceLabel: 'Regional (~200 mi)',          truckSize: '12', fromState: 'NY', toState: 'MA' },
  { label: '1 Bedroom',  size: '1BR',    miles: 750,  distanceLabel: 'Long Distance (~750 mi)',     truckSize: '12', fromState: 'NY', toState: 'IL' },
  { label: '1 Bedroom',  size: '1BR',    miles: 2000, distanceLabel: 'Cross-Country (~2,000 mi)',   truckSize: '12', fromState: 'NY', toState: 'TX' },
  { label: '2 Bedroom',  size: '2BR',    miles: 200,  distanceLabel: 'Regional (~200 mi)',          truckSize: '16', fromState: 'NY', toState: 'MA' },
  { label: '2 Bedroom',  size: '2BR',    miles: 750,  distanceLabel: 'Long Distance (~750 mi)',     truckSize: '16', fromState: 'NY', toState: 'IL' },
  { label: '2 Bedroom',  size: '2BR',    miles: 2000, distanceLabel: 'Cross-Country (~2,000 mi)',   truckSize: '16', fromState: 'NY', toState: 'TX' },
  { label: '3 Bedroom',  size: '3BR',    miles: 750,  distanceLabel: 'Long Distance (~750 mi)',     truckSize: '22', fromState: 'NY', toState: 'IL' },
  { label: '3 Bedroom',  size: '3BR',    miles: 2000, distanceLabel: 'Cross-Country (~2,000 mi)',   truckSize: '22', fromState: 'NY', toState: 'TX' },
  { label: '4 Bedroom',  size: '4BR',    miles: 1500, distanceLabel: 'Cross-Country (~1,500 mi)',   truckSize: '26', fromState: 'NY', toState: 'CA' },
  { label: '4 Bedroom',  size: '4BR',    miles: 2500, distanceLabel: 'Cross-Country (~2,500 mi)',   truckSize: '26', fromState: 'NY', toState: 'WA' },
];

const costTable = scenarioInputs.map((s) => {
  const movers = calcMovers(s.size, s.miles);
  const truck = calculatePenskePricing({ miles: s.miles, truckSize: s.truckSize, fromState: s.fromState, toState: s.toState });
  return {
    size: s.label,
    distance: s.distanceLabel,
    moversLow: movers.low,
    moversHigh: movers.high,
    truckLow: truck.totalEstimate[0],
    truckHigh: truck.totalEstimate[1],
  };
});

const faqs = [
  { q: 'When does hiring movers make more sense financially?', a: 'Hiring movers makes financial sense for moves over 500 miles, homes larger than 2 bedrooms, or when you factor in your own time, fuel, hotel stays, and the risk of injury. The convenience premium narrows as distance and home size increase.' },
  { q: 'What hidden costs come with truck rentals?', a: 'Truck rental ads show low daily rates but real costs add up: mileage fees ($0.29–$0.79/mi), fuel (trucks get 6–12 MPG), insurance ($15–$30/day), moving pads/dollies ($20–$60), tolls, and hotel stays for long trips.' },
  { q: 'Is hiring movers safer for my belongings?', a: 'Full-service movers carry liability coverage and are trained to pack and protect items. However, standard coverage is often just $0.60 per pound. For valuable items, purchase additional valuation protection or check your homeowners/renters insurance policy.' },
  { q: 'Can I do a hybrid move to save money?', a: 'Yes — a popular approach is renting a container (PODS, U-Pack) where you load and unload yourself but a driver handles the transport. This typically costs 30–50% less than full-service movers while eliminating the driving burden.' },
];

export default function MoversVsTruckRental() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Compare Moving Costs: Movers vs Truck Rental + DIY (Real Data, Instant Estimate)';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = 'Compare real moving costs instantly. See the true price of hiring movers vs renting a truck with fuel, tolls, and DIY expenses. No signup required.';

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      }))
    });
    document.head.appendChild(faqScript);

    return () => {
      document.title = 'Move-Price';
      document.head.removeChild(faqScript);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Movers vs Truck Rental - Which Is Cheaper for Your Move?"
        description="Compare full-service movers vs renting a truck for your move. See real cost breakdowns, pros and cons, and find out which option saves you money based on distance and home size."
        canonical="/movers-vs-truck-rental"
        keywords="movers vs truck rental, moving company vs DIY, should I hire movers or rent a truck, moving cost comparison, DIY moving vs professional movers"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-16 flex-1">
        <section className="relative w-full overflow-hidden" style={{ minHeight: '600px' }}>
          <img
            src="/Move-Price_MoversVStruck_rent.png"
            alt="Movers vs Truck Rental comparison"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/65 via-slate-900/30 to-transparent" />
          <div className="absolute inset-0 flex items-end justify-center px-4 pb-10">
            <div className="max-w-4xl w-full mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium text-white mb-3">
                <Scale className="w-4 h-4" /> Cost Comparison Guide
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg">Movers vs. Truck Rental</h1>
              <p className="text-white/80 text-base max-w-2xl mx-auto mt-2 drop-shadow">
                Side-by-side cost comparison to help you decide which option saves you more money.
              </p>
            </div>
          </div>
        </section>

        {/* Side-by-side summary */}
        <section className="max-w-4xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
          {(() => {
            const avgMoversMid = Math.round(costTable.reduce((s, r) => s + (r.moversLow + r.moversHigh) / 2, 0) / costTable.length / 100) * 100;
            const avgTruckMid  = Math.round(costTable.reduce((s, r) => s + (r.truckLow  + r.truckHigh)  / 2, 0) / costTable.length / 100) * 100;
            const minMovers    = Math.min(...costTable.map(r => r.moversLow));
            const maxMovers    = Math.max(...costTable.map(r => r.moversHigh));
            const minTruck     = Math.min(...costTable.map(r => r.truckLow));
            const maxTruck     = Math.max(...costTable.map(r => r.truckHigh));
            return (
              <>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Full-Service Movers</h2>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">They do everything — load, transport, unload. You just show up at your new place.</p>
                  <div className="bg-teal-50 rounded-lg px-4 py-3 mb-4">
                    <p className="text-xs text-teal-700 font-semibold uppercase tracking-wide">Average across all scenarios</p>
                    <p className="text-2xl font-bold text-teal-700">{fmt(avgMoversMid)}</p>
                    <p className="text-xs text-teal-600">range: {fmt(minMovers)} – {fmt(maxMovers)}</p>
                  </div>
                  <ul className="flex flex-col gap-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> No physical labor required</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> Liability coverage included</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> Faster for large homes</li>
                    <li className="flex items-center gap-2"><X className="w-4 h-4 text-rose-400" /> More expensive than renting</li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Truck Rental</h2>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">You rent the truck and do all the driving and loading yourself — or hire day laborers.</p>
                  <div className="bg-amber-50 rounded-lg px-4 py-3 mb-4">
                    <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Average across all scenarios</p>
                    <p className="text-2xl font-bold text-amber-700">{fmt(avgTruckMid)}</p>
                    <p className="text-xs text-amber-600">range: {fmt(minTruck)} – {fmt(maxTruck)} incl. fuel</p>
                  </div>
                  <ul className="flex flex-col gap-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> Lowest base price</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> Full control of schedule</li>
                    <li className="flex items-center gap-2"><X className="w-4 h-4 text-rose-400" /> You drive & load everything</li>
                    <li className="flex items-center gap-2"><X className="w-4 h-4 text-rose-400" /> Hidden costs add up fast</li>
                  </ul>
                </div>
              </>
            );
          })()}
        </section>

        {/* Calculator */}
        <section className="bg-white border-t border-slate-100 py-2">
          <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Compare Moving Costs: Movers vs Truck Rental + DIY (Real Data, Instant Estimate)</h1>
            <p className="text-slate-500 mb-6">See what you will actually pay — not guesses. Compare full-service movers vs DIY truck rental with real data in seconds.</p>
          </div>
          <MovePriceCalculator hideUsCostSection hideConsolidatedTable ctaLabel="Calculate My Moving Cost" />
        </section>

        {/* Cost table */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-slate-900">Cost Comparison by Scenario</h2>
            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full border border-teal-100">
              <Info className="w-3 h-3" /> Live from our calculator
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-5">Prices calculated using the same engine as our moving cost calculator — not generic estimates.</p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Home Size</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-slate-600">Distance</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-teal-600">Full-Service Movers</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-amber-600">Truck Rental (incl. fuel)</th>
                  </tr>
                </thead>
                <tbody>
                  {costTable.map((row, i) => {
                    const isNewGroup = i === 0 || costTable[i - 1].size !== row.size;
                    return (
                      <tr key={i} className={`border-b border-slate-100 last:border-0 ${isNewGroup && i !== 0 ? 'border-t-2 border-t-slate-200' : ''}`}>
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {isNewGroup ? row.size : <span className="text-slate-300 text-xs pl-2">↳</span>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{row.distance}</td>
                        <td className="px-4 py-3.5 text-center text-teal-700 font-semibold">{fmt(row.moversLow)} – {fmt(row.moversHigh)}</td>
                        <td className="px-4 py-3.5 text-center text-amber-700 font-semibold">{fmt(row.truckLow)} – {fmt(row.truckHigh)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Movers costs based on cubic footage pricing for a standard 2-person crew. Truck rental includes base rental + estimated fuel; excludes optional insurance and equipment add-ons.</p>
        </section>

        {/* FAQ */}
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
