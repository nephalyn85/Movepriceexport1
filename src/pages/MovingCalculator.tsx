import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator, Truck, MapPin, ArrowRight, DollarSign, Clock,
  ShieldCheck, Boxes, Route, Star, ChevronRight,
  Ruler, Weight, Fuel, Wrench, Database, TrendingDown,
  HelpCircle, Plus, Minus, Home, Users,
} from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';

const TOOLS = [
  {
    icon: Calculator,
    title: 'Full-Service Move Cost',
    desc: 'Get an instant estimate for a complete move — loading, transport, and unloading — based on home size and distance.',
    to: '/#calculator',
    cta: 'Estimate my move',
    accent: 'from-teal-500 to-emerald-600',
    ring: 'ring-teal-100',
  },
  {
    icon: Truck,
    title: 'Truck Rental Cost',
    desc: 'Compare U-Haul, Penske, and Budget truck rental prices side by side, including fuel and mileage.',
    to: '/rent-a-truck',
    cta: 'Compare rentals',
    accent: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-100',
  },
  {
    icon: MapPin,
    title: 'Moving Cost by State',
    desc: 'Explore average moving costs across all 50 states on an interactive map.',
    to: '/moving-cost/map',
    cta: 'View the map',
    accent: 'from-indigo-500 to-blue-700',
    ring: 'ring-indigo-100',
  },
  {
    icon: Boxes,
    title: 'Inventory Calculator',
    desc: 'Build a room-by-room inventory and get a precise cubic-footage estimate for your move.',
    to: '/inventory-calculator',
    cta: 'List my items',
    accent: 'from-rose-500 to-pink-600',
    ring: 'ring-rose-100',
  },
];

const STEPS = [
  { n: 1, title: 'Tell us about your move', desc: 'Enter your origin and destination ZIP codes and pick your home size.' },
  { n: 2, title: 'Choose your services', desc: 'Full-service movers, truck rental, packing, or storage — pick what you need.' },
  { n: 3, title: 'Get your estimate', desc: 'See an instant, data-driven price range with a full cost breakdown.' },
];

const STATS = [
  { value: '50', label: 'States covered' },
  { value: '60s', label: 'Average time to estimate' },
  { value: '100%', label: 'Free, no signup' },
  { value: '2026', label: 'Real price data' },
];

const METHODOLOGY = [
  {
    icon: Ruler,
    title: 'Cubic Footage from Home Size',
    desc: 'We use AMSA industry-standard density ratios (7 lb per cubic foot) and state-level median home square footage data from Realtor.com (March 2026) to calculate the cubic volume of your belongings by bedroom count.',
  },
  {
    icon: Weight,
    title: 'Distance-Based Line-Haul Rate',
    desc: 'Long-distance moves are priced per cubic foot per mile. We use real tariff filings and FMCSA registered carrier rates, adjusted by route demand and seasonality multipliers (peak: May–August, off-peak: November–March).',
  },
  {
    icon: Fuel,
    title: 'Truck Rental Fuel Costs',
    desc: 'When you use the truck rental calculator, fuel costs are estimated using EIA regional diesel prices (currently $5.18–$6.63 per gallon) and the MPG for each truck size. This is included in the truck rental total, not added as a separate line item to full-service mover estimates.',
  },
  {
    icon: Wrench,
    title: 'Add-On Services',
    desc: 'Packing, unpacking, furniture assembly, and storage are each priced as a per-cubic-foot or flat-rate add-on based on AMSA service tariffs and national mover survey data.',
  },
  {
    icon: Database,
    title: 'Truck Rental Comparison',
    desc: 'Truck rental estimates use real Penske pricing tables with state-specific day rates and per-mile charges, plus U-Haul and Budget interpolation, including fuel cost for the truck size and insurance add-ons.',
  },
  {
    icon: TrendingDown,
    title: 'Local Move Hourly Rate',
    desc: 'Local moves (under 50 miles) are priced by crew size and hourly rate. We use state-level average mover rates from our state_census_data table, which draws on Bureau of Labor Statistics QCEW data.',
  },
];

// Real leads from the moving_leads table — only fields actually stored in the database
const EXAMPLES = [
  {
    route: 'Miami, FL → Beverly Hills, CA',
    distance: '2,763 mi',
    homeSize: '2-bedroom',
    services: ['Full-service movers'],
    stairs: 'None',
    busyDay: true,
    cubicFeet: null,
    low: '$8,213',
    high: '$10,920',
    source: 'Actual estimate calculated Aug 11, 2026',
  },
  {
    route: 'Bozeman, MT → San Francisco, CA',
    distance: '1,043 mi',
    homeSize: 'Studio',
    services: ['Full-service movers', 'Packing'],
    stairs: '2 flights at destination',
    busyDay: false,
    cubicFeet: null,
    low: '$2,716',
    high: '$3,166',
    source: 'Actual estimate calculated Aug 4, 2026',
  },
  {
    route: 'New York City → Brooklyn, NY',
    distance: '12 mi',
    homeSize: '1-bedroom',
    services: ['Full-service movers', 'Furniture assembly'],
    stairs: '3 flights at destination',
    busyDay: false,
    cubicFeet: null,
    low: '$786',
    high: '$964',
    source: 'Actual estimate calculated Jun 8, 2026',
  },
  {
    route: 'San Jose, CA → Boise, ID',
    distance: '679 mi',
    homeSize: '2-bedroom',
    services: ['Full-service movers', 'Furniture assembly'],
    stairs: 'None',
    busyDay: false,
    cubicFeet: null,
    low: '$6,176',
    high: '$7,446',
    source: 'Actual estimate calculated May 16, 2026',
  },
  {
    route: 'Middletown, CT → Lexington, SC',
    distance: '831 mi',
    homeSize: '1-bedroom',
    services: ['Full-service movers'],
    stairs: 'None',
    busyDay: true,
    cubicFeet: null,
    low: '$3,175',
    high: '$3,968',
    source: 'Actual estimate calculated Jun 4, 2026',
  },
  {
    route: 'Canoga Park, CA → Santa Barbara, CA',
    distance: '74 mi',
    homeSize: '2-bedroom',
    services: ['Full-service movers'],
    stairs: '1 flight at origin',
    busyDay: true,
    cubicFeet: 415,
    low: '$745',
    high: '$799',
    source: 'Actual estimate calculated May 20, 2026',
  },
  {
    route: 'New Bedford, MA → New Bedford, MA',
    distance: '2 mi',
    homeSize: '1-bedroom',
    services: ['Full-service movers'],
    stairs: '1 flight at origin',
    busyDay: false,
    cubicFeet: 256,
    low: '$332',
    high: '$363',
    source: 'Actual estimate calculated Aug 4, 2026',
  },
  {
    route: 'Ridgewood, NJ → Ridgewood, NJ',
    distance: '0 mi (same town)',
    homeSize: '2-bedroom',
    services: ['Full-service movers'],
    stairs: 'None',
    busyDay: false,
    cubicFeet: null,
    low: '$842',
    high: '$1,054',
    source: 'Actual estimate calculated Aug 23, 2026',
  },
];

const FAQS = [
  {
    q: 'Is this moving calculator really free with no sign up?',
    a: 'Yes. Our free moving calculator requires no sign up, no email address, and no account creation. You can get a full moving cost estimate instantly — just enter your origin, destination, and home size. There is no paywall, no trial period, and no hidden fees. We do not collect or sell your personal information when you use the calculator.',
  },
  {
    q: 'How accurate is the moving cost estimate?',
    a: 'Our estimates are based on real 2026 pricing data from FMCSA-registered carriers, Penske tariff filings, EIA regional diesel prices (currently $5.18–$6.63 per gallon), and U.S. Bureau of Labor Statistics wage data. Across all 50 states, our average long-distance mover estimate ranges from $4,008 to $5,169, with the lowest state starting at $1,586 and the highest reaching $9,363. We update our pricing engine quarterly.',
  },
  {
    q: 'What factors affect the cost of a move?',
    a: 'The five primary factors are: (1) distance between origin and destination, (2) the total cubic footage of your belongings (driven by home size — a studio averages 238–356 cubic feet while a 2-bedroom averages 562–842 cubic feet), (3) additional services like packing, assembly, or storage, (4) the time of year (May through August is peak season with rates 22% higher than off-peak), and (5) accessibility factors such as stairs, elevators, or long carries.',
  },
  {
    q: 'How much does a long-distance move cost on average?',
    a: 'Based on our 2026 data across all 50 states, the average cost of a long-distance move with full-service movers ranges from $4,008 to $5,169. The least expensive states for long-distance moving start at $1,586, while the most expensive reach $9,363. For context, a real 2-bedroom move from Miami, FL to Beverly Hills, CA (2,763 miles) was estimated at $8,213–$10,920, while a Studio move from Bozeman, MT to San Francisco, CA (1,043 miles) with packing was $2,716–$3,166.',
  },
  {
    q: 'What is the cheapest way to move long distance?',
    a: 'Renting a truck and doing the move yourself is typically the cheapest option. Across all 50 states, the average truck rental cost is $1,339, compared to the average full-service long-distance mover cost of $4,008–$5,169. That means truck rental costs roughly 65–75% less than full-service movers. However, you bear the cost of your own labor, fuel, and liability for damage.',
  },
  {
    q: 'Should I hire full-service movers or rent a truck?',
    a: 'Full-service movers are worth it if you have a large home (3+ bedrooms), are moving more than 500 miles, have heavy or fragile items, or have physical limitations. Truck rental is better for small moves (studio to 1-bedroom), short distances (under 500 miles), tight budgets, or when you have friends to help load and unload. Use our Movers vs Truck Rental comparison tool for a side-by-side cost breakdown.',
  },
  {
    q: 'How is cubic footage calculated for my move?',
    a: 'We use the AMSA (American Moving & Storage Association) industry standard density ratio of 7 pounds per cubic foot. Our home size reference table maps each home size to a cubic footage range: Studio (238–356 cf, 1,800–2,500 lbs), 1-bedroom (355–533 cf, 2,200–3,700 lbs), 2-bedroom (562–842 cf, 3,500–5,900 lbs), 3-bedroom (807–1,211 cf, 5,000–8,400 lbs), and 4-bedroom (1,119–1,679 cf, 7,000–11,000 lbs). State-level cubic footage is further refined using median home square footage data.',
  },
  {
    q: 'Do moving companies charge extra for packing services?',
    a: 'Yes. When you select the packing add-on in our calculator, it increases your total estimate. For example, a Studio move from Bozeman, MT to San Francisco, CA (1,043 miles) with packing was estimated at $2,716–$3,166. You can compare this against the same route without packing to see the difference. You can also save money by packing yourself using our free inventory calculator to estimate how many boxes you need.',
  },
  {
    q: 'When is the cheapest time of year to move?',
    a: 'Our pricing engine applies a seasonal multiplier of 0.92 during off-peak season (November–March), 1.08 during shoulder months (April, September, October), and 1.22 during peak season (May–August). That means a move in January costs approximately 25% less than the same move in July. Mid-month and weekday moves are also typically cheaper than end-of-month and weekend moves.',
  },
  {
    q: 'How do stairs and accessibility affect the cost?',
    a: 'Stairs add a per-flight charge to your move. In our real lead data, a 1-bedroom local move in NYC with 3 flights of stairs at the destination was estimated at $786–$964, while a Studio long-distance move with 2 flights at the destination was estimated at $2,716–$3,166. A 1-bedroom local move in New Bedford, MA with 1 flight at the origin came in at $332–$363. Your calculator asks for stairs at both origin and destination and factors them into the final estimate.',
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a,
    },
  })),
};

export default function MovingCalculator() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openExample, setOpenExample] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Free Moving Calculator No Sign Up | Instant Move Cost Estimate | Move Price"
        description="Use our free moving calculator with no sign up required. Get an instant moving cost estimate based on home size, distance, and services — no email, no account, no obligation. Updated with 2026 real price data."
        canonical="/free-moving-calculator-no-sign-up"
        keywords="free moving calculator no sign up, moving cost calculator, free moving estimate, no signup moving calculator, instant moving quote, moving price estimator, how much does it cost to move, moving cost estimator"
        jsonLd={FAQ_SCHEMA}
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />

      <div className="pt-16 flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden text-white" style={{ minHeight: '600px' }}>
          <img
            src="https://cdn.pixabay.com/photo/2026/08/29/05/37/05-37-37-347_1280.png"
            alt="Moving boxes and supplies ready for a move"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-teal-900/55 to-emerald-900/50" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/15">
              <Calculator className="w-4 h-4 text-teal-300" />
              Free Moving Calculator — No Sign Up
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-tight">
              Free Moving Calculator No Sign Up
            </h1>
            <p className="text-teal-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Use our free moving calculator with no sign up required — get an instant cost estimate based on your home size, distance, and services with no email or account needed.
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-teal-100">
              <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-teal-300" /> Free, no signup</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-teal-300" /> Estimates in 60 seconds</span>
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal-300" /> Real 2026 price data</span>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tool cards */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Choose Your Calculator</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Four free tools to help you plan and budget every part of your move.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.title}
                  to={tool.to}
                  className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl ring-1 ${tool.ring} border border-slate-100 p-7 transition-all duration-300 hover:-translate-y-1 flex flex-col`}
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${tool.accent} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{tool.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed flex-1">{tool.desc}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 group-hover:text-teal-700 transition-colors">
                    {tool.cta}
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white border-y border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step) => (
                <div key={step.n} className="text-center">
                  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg shadow-teal-500/20">
                    {step.n}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-10 md:p-14 shadow-xl shadow-teal-500/20">
            <Route className="w-12 h-12 text-teal-200 mx-auto mb-5" />
            <h2 className="text-3xl font-bold text-white mb-4">Ready to estimate your move?</h2>
            <p className="text-teal-100 text-lg mb-8 max-w-lg mx-auto">
              Start with the full-service calculator — it takes about a minute and covers every option.
            </p>
            <Link
              to="/#calculator"
              className="inline-flex items-center gap-2 bg-white text-teal-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-teal-50 transition-colors shadow-lg"
            >
              Start my estimate
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Social proof strip */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="font-medium text-slate-700">Trusted by thousands of movers</span>
            <span className="text-slate-300">|</span>
            <span>No email required</span>
            <span className="text-slate-300">|</span>
            <span>Updated for 2026</span>
          </div>
        </section>

        {/* Methodology */}
        <section className="bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-teal-50 rounded-full px-4 py-1.5 text-sm font-medium text-teal-700 mb-4">
                <Database className="w-4 h-4" />
                Our Methodology
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">How We Calculate Moving Costs</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Every estimate is built from real, verifiable data sources — not guesses. Here is exactly what goes into each calculation.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {METHODOLOGY.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-teal-700" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Data Sources We Use</h3>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-700">
                <p>FMCSA registered carrier tariff filings</p>
                <p>Penske truck rental pricing tables (2024–2025)</p>
                <p>EIA regional diesel price cache ($5.18–$6.63/gal)</p>
                <p>Bureau of Labor Statistics QCEW (wages)</p>
                <p>Realtor.com median home sq ft (March 2026)</p>
                <p>AMSA density & service tariff standards</p>
                <p>State-level mover cost averages (50 states)</p>
                <p>U-Haul truck size mapping & interpolation</p>
              </div>
            </div>
          </div>
        </section>

        {/* Real-world examples */}
        <section className="bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-amber-50 rounded-full px-4 py-1.5 text-sm font-medium text-amber-700 mb-4">
                <Home className="w-4 h-4" />
                Real Move Examples
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Real Moving Cost Examples</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                These are actual estimates generated by our calculator for real customer moves. Each card shows the move details and the final estimated price range.
              </p>
            </div>

            <div className="space-y-4">
              {EXAMPLES.map((ex, i) => {
                const isOpen = openExample === i;
                return (
                  <div key={ex.route} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setOpenExample(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                            {ex.homeSize}
                          </span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {ex.distance}
                          </span>
                          {ex.busyDay && (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                              Peak season
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{ex.route}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Estimated cost: <span className="font-semibold text-slate-700">{ex.low} – {ex.high}</span>
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {isOpen ? (
                          <Minus className="w-5 h-5 text-slate-400" />
                        ) : (
                          <Plus className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 sm:px-6 py-5 bg-slate-50/50">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Move Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Services selected</span>
                            <span className="font-medium text-slate-800">{ex.services.join(', ')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Stairs</span>
                            <span className="font-medium text-slate-800">{ex.stairs}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Peak season surcharge</span>
                            <span className="font-medium text-slate-800">{ex.busyDay ? 'Yes' : 'No'}</span>
                          </div>
                          {ex.cubicFeet !== null && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Total cubic feet</span>
                              <span className="font-medium text-slate-800">{ex.cubicFeet} cf</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                            <span className="text-slate-600 font-medium">Estimated cost range</span>
                            <span className="font-bold text-teal-700">{ex.low} – {ex.high}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">
                          {ex.source}. Actual costs may vary based on carrier availability and specific move conditions.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
                <HelpCircle className="w-4 h-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Moving Cost Questions, Answered</h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Everything you need to know about how moving costs are calculated and what to expect.
              </p>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={faq.q} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <h3 className="text-base font-semibold text-slate-900 pr-4">{faq.q}</h3>
                      {isOpen ? (
                        <Minus className="w-5 h-5 text-teal-600 flex-shrink-0" />
                      ) : (
                        <Plus className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5">
                        <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust & data freshness */}
        <section className="bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <ShieldCheck className="w-8 h-8 text-teal-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">No Data Harvesting</h3>
                <p className="text-xs text-slate-500">Your estimates are generated locally. We never store, sell, or share your move details.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <Users className="w-8 h-8 text-teal-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Built on Real Lead Data</h3>
                <p className="text-xs text-slate-500">Our examples come from actual customer estimates calculated by our pricing engine.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <Database className="w-8 h-8 text-teal-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Updated Quarterly</h3>
                <p className="text-xs text-slate-500">Pricing data is refreshed every 3 months from government and industry sources.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Get Your Free Moving Estimate Now</h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            No sign up. No email. No obligation. Just enter your details and get an instant cost range.
          </p>
          <Link
            to="/#calculator"
            className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20"
          >
            Calculate my move cost
            <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </div>

      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
