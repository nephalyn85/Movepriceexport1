import { useState } from 'react';
import { Truck, Star, ChevronDown, ChevronUp, AlertCircle, MapPin, Navigation } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import TruckRentalCalculator from '../components/TruckRentalCalculator';
import {
  calculateTruckPrice,
  calculateBudgetPrice,
  calculateLocalTruckPrice,
  localPricing,
} from '../lib/truckRentalPricing';
import { calculatePenskePricing } from '../lib/pricingEngine';

function getPriceRange(company: 'uhaul' | 'penske' | 'budget', isLocal: boolean) {
  if (isLocal) {
    if (company === 'uhaul') {
      const small = calculateLocalTruckPrice(15, '10');
      const large = calculateLocalTruckPrice(15, '26');
      return `$${small}–$${large}`;
    }
    if (company === 'budget') {
      const small = calculateLocalTruckPrice(15, '12');
      const large = calculateLocalTruckPrice(15, '26');
      return `$${small}–$${large}`;
    }
    if (company === 'penske') {
      const small = calculatePenskePricing({ miles: 15, truckSize: '12', fromState: 'CA', toState: 'CA', isLocalMove: true });
      const large = calculatePenskePricing({ miles: 15, truckSize: '26', fromState: 'CA', toState: 'CA', isLocalMove: true });
      return `$${small.rentalBase}–$${large.rentalBase}`;
    }
  } else {
    if (company === 'uhaul') {
      const small = calculateTruckPrice(500, '10');
      const large = calculateTruckPrice(500, '26');
      return `$${small.toLocaleString()}–$${large.toLocaleString()}`;
    }
    if (company === 'budget') {
      const small = calculateBudgetPrice(500, '12');
      const large = calculateBudgetPrice(500, '26');
      return `$${small.toLocaleString()}–$${large.toLocaleString()}`;
    }
    if (company === 'penske') {
      const small = calculatePenskePricing({ miles: 500, truckSize: '12', fromState: 'CA', toState: 'TX', isLocalMove: false });
      const large = calculatePenskePricing({ miles: 500, truckSize: '26', fromState: 'CA', toState: 'TX', isLocalMove: false });
      return `$${small.rentalBase.toLocaleString()}–$${large.rentalBase.toLocaleString()}`;
    }
  }
  return '—';
}

const localUhaul = { small: calculateLocalTruckPrice(15, '10'), large: calculateLocalTruckPrice(15, '26') };
const ldUhaul = { small: calculateTruckPrice(500, '10'), large: calculateTruckPrice(500, '26') };
const localBudget = { small: calculateLocalTruckPrice(15, '12'), large: calculateLocalTruckPrice(15, '26') };
const ldBudget = { small: calculateBudgetPrice(500, '12'), large: calculateBudgetPrice(500, '26') };
const localPenskeSmall = calculatePenskePricing({ miles: 15, truckSize: '12', fromState: 'CA', toState: 'CA', isLocalMove: true });
const localPenskeLarge = calculatePenskePricing({ miles: 15, truckSize: '26', fromState: 'CA', toState: 'CA', isLocalMove: true });
const ldPenskeSmall = calculatePenskePricing({ miles: 500, truckSize: '12', fromState: 'CA', toState: 'TX', isLocalMove: false });
const ldPenskeLarge = calculatePenskePricing({ miles: 500, truckSize: '26', fromState: 'CA', toState: 'TX', isLocalMove: false });

const companies = [
  {
    name: 'U-Haul',
    localRange: `$${localUhaul.small}–$${localUhaul.large}`,
    ldRange: `$${ldUhaul.small.toLocaleString()}–$${ldUhaul.large.toLocaleString()}`,
    perMile: `$${localPricing['10'].perMile}/mi (local)`,
    sizes: '10, 15, 20, 26 ft',
    perks: 'Largest network, 24/7 pickup, most locations nationwide',
    drawbacks: 'Per-mile fees accumulate fast on local moves',
    rating: 3.8,
    best: 'Local moves',
    color: 'amber',
  },
  {
    name: 'Penske',
    localRange: `$${localPenskeSmall.rentalBase}–$${localPenskeLarge.rentalBase}`,
    ldRange: `$${ldPenskeSmall.rentalBase.toLocaleString()}–$${ldPenskeLarge.rentalBase.toLocaleString()}`,
    perMile: 'Unlimited miles (one-way)',
    sizes: '12, 16, 22, 26 ft',
    perks: 'Newer trucks, unlimited miles one-way, better fuel economy',
    drawbacks: 'Higher base rate, fewer locations than U-Haul',
    rating: 4.2,
    best: 'Long-distance moves',
    color: 'blue',
  },
  {
    name: 'Budget',
    localRange: `$${localBudget.small}–$${localBudget.large}`,
    ldRange: `$${ldBudget.small.toLocaleString()}–$${ldBudget.large.toLocaleString()}`,
    perMile: `$${localPricing['12'].perMile}/mi (local)`,
    sizes: '12, 16, 26 ft',
    perks: 'Frequent discounts, AARP & AAA rates available',
    drawbacks: 'Older fleet at some locations',
    rating: 3.5,
    best: 'Budget-conscious moves',
    color: 'rose',
  },
  {
    name: 'Enterprise',
    localRange: '$75–$180',
    ldRange: '$900–$2,200',
    perMile: 'Unlimited (one-way)',
    sizes: '16, 26 ft',
    perks: 'No mileage charge one-way, corporate & fleet discounts',
    drawbacks: 'Fewest locations, premium pricing, limited size options',
    rating: 4.0,
    best: 'Business / corporate',
    color: 'teal',
  },
];

const sizingGuide = [
  { truck: '10 ft', best: 'Studio', capacity: '~1,500 lbs' },
  { truck: '15 ft', best: '1 bedroom', capacity: '~3,000 lbs' },
  { truck: '20 ft', best: '2 bedroom home', capacity: '~5,000 lbs' },
  { truck: '26 ft', best: '3–4 bedroom home', capacity: '~10,000 lbs' },
];

const hiddenCosts = [
  { item: 'Fuel', note: 'Trucks get 6–12 MPG. Budget $0.35–$0.70/mile extra.' },
  { item: 'Insurance (CDW)', note: '$15–$30/day. Check if your auto insurance covers rental trucks.' },
  { item: 'Moving pads / blankets', note: '$10–$30 per bundle. Essential for protecting furniture.' },
  { item: 'Dolly / hand truck', note: '$10–$20/day. Worth it for appliances and heavy boxes.' },
  { item: 'Tolls', note: 'Truck height may restrict some routes. Budget accordingly.' },
  { item: 'Fuel top-off fee', note: '$30–$75 if you return the truck below the agreed fuel level.' },
];

const faqs = [
  {
    q: 'What is the cheapest truck rental for a local move?',
    a: `For a local move (under 50 miles), U-Haul and Budget both start around $${localUhaul.small}–$${localBudget.small} for a small truck, but the per-mile fee of $1.79/mi means a 30-mile move round-trip adds roughly $107 in mileage alone. Our calculator factors in fuel, mileage, and your actual distance so you see the real total — not just the teaser rate.`,
  },
  {
    q: 'How much does it cost to rent a truck for a 500-mile move?',
    a: `For a 500-mile one-way move, rental-only costs (before fuel) run approximately: U-Haul 10 ft $${ldUhaul.small.toLocaleString()}, U-Haul 26 ft $${ldUhaul.large.toLocaleString()}; Penske 12 ft $${ldPenskeSmall.rentalBase.toLocaleString()}, Penske 26 ft $${ldPenskeLarge.rentalBase.toLocaleString()}; Budget 12 ft $${ldBudget.small.toLocaleString()}, Budget 26 ft $${ldBudget.large.toLocaleString()}. Add fuel (6–12 MPG) at current diesel prices for the true cost. Use our calculator above for your exact route.`,
  },
  {
    q: 'What size truck do I need for my home?',
    a: 'A 10 ft truck fits a studio (up to ~450 cu ft). A 15 ft handles a 1-bedroom (~764 cu ft). A 20 ft covers a 2-bedroom home (~1,015 cu ft). A 26 ft is needed for 3–4 bedrooms (~1,611 cu ft). When in doubt, go one size up — a bigger truck costs marginally more but prevents costly second trips.',
  },
  {
    q: 'Is Penske cheaper than U-Haul for long-distance moves?',
    a: `It depends on the route. For a 500-mile move in a medium truck, Penske rental ($${ldPenskeSmall.rentalBase.toLocaleString()}) and U-Haul ($${ldUhaul.small.toLocaleString()}) are comparable on rental cost, but Penske includes unlimited miles on one-way moves while U-Haul charges per mile. Penske trucks also tend to get better fuel economy, which can save $50–$150 in fuel on long hauls.`,
  },
  {
    q: 'What hidden costs should I budget for beyond the rental rate?',
    a: 'Fuel is the biggest extra — at 8–12 MPG and current diesel prices, expect $0.35–$0.60 per mile in fuel. Add collision damage waiver insurance ($15–$30/day), moving pads ($10–$30), a dolly ($10–$20/day), and tolls if your route crosses toll roads. Our calculator includes fuel and toll estimates automatically.',
  },
  {
    q: 'Can I hire movers to load my rental truck?',
    a: 'Yes — renting a truck and hiring labor-only movers is a popular hybrid approach that costs significantly less than full-service moving. Services like HireAHelper, Dolly, and TaskRabbit let you book hourly labor for loading and unloading only. You drive, they lift.',
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700' },
};

export default function CheapMovingTruckRentals() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Cheap Moving Truck Rentals - Compare U-Haul, Budget & Penske"
        description="Find the cheapest moving truck rentals near you. Compare U-Haul, Budget, and Penske truck rental prices, sizes, and features to get the best deal for your move."
        canonical="/cheap-moving-truck-rentals"
        keywords="cheap moving truck rentals, U-Haul rental, Budget truck rental, Penske truck rental, cheapest moving truck, truck rental comparison"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-16 flex-1">
        <section className="relative text-white overflow-hidden" style={{ minHeight: '320px' }}>
          <img
            src="/Move-Price_RentAtruckComparationSize.png"
            alt="Moving truck size comparison"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-black/20" />
          <div className="relative max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
              <Truck className="w-4 h-4" /> Truck Rental Guide
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight drop-shadow-lg">Cheap Moving Truck Rentals</h1>
            <p className="text-white/90 text-lg max-w-2xl mx-auto drop-shadow">
              U-Haul, Penske, and Budget compared side-by-side so you know which one actually saves you money.
            </p>
          </div>
        </section>

        {/* Company Cards */}
        <section className="max-w-4xl mx-auto px-4 pt-5 pb-3 grid md:grid-cols-2 gap-3">
          {companies.map((co, i) => {
            const c = colorMap[co.color];
            return (
              <div key={i} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${c.border}`}>
                <div className={`${c.bg} px-4 py-2.5 border-b border-slate-100`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-sm ${c.text}`}>{co.name}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>Best for: {co.best}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-semibold text-slate-700">{co.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2.5 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-400">Local (15 mi)</p>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">{co.localRange}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Navigation className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-400">500-mile move</p>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">{co.ldRange}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-1.5">
                    <p className="text-xs text-slate-500"><span className="font-medium text-slate-600">Mileage:</span> {co.perMile}</p>
                  </div>
                  <div className="flex gap-2">
                    <p className="flex-1 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-1.5">{co.perks}</p>
                    <p className="flex-1 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-1.5">{co.drawbacks}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Truck Rental Calculator */}
        <section className="bg-slate-50 border-t border-slate-100 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Calculate Your Truck Rental Cost</h2>
              <p className="text-slate-500">Get an instant estimate for U-Haul, Penske, and Budget — including fuel and tolls.</p>
            </div>
            <TruckRentalCalculator />
          </div>
        </section>

        {/* Sizing guide */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-5">What Size Truck Do You Need?</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Truck Size</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Best For</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-slate-600">Max Capacity</th>
                </tr>
              </thead>
              <tbody>
                {sizingGuide.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="px-5 py-3.5 font-bold text-amber-600">{row.truck}</td>
                    <td className="px-5 py-3.5 text-slate-700">{row.best}</td>
                    <td className="px-5 py-3.5 text-center text-slate-500">{row.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Hidden costs */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Hidden Costs to Budget For</h2>
          <p className="text-slate-500 text-sm mb-5">Truck rental ads only show the base rate. Here's what actually adds to your bill:</p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
            {hiddenCosts.map((cost, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{cost.item}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{cost.note}</p>
                </div>
              </div>
            ))}
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
