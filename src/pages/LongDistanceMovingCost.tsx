import { useState, useEffect } from 'react';
import { MapPin, TrendingUp, Home, Truck, DollarSign, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';

// Prices from moving calculator (full-service movers):
// 100–250 mi  → $3/cu ft  | 250–500 mi → $4/cu ft
// 500–2,000 mi → $6/cu ft (midwest region)  | 2,000+ mi → $7/cu ft (northwest region)
// Volume: Studio 250–450 cu ft | 1BR 500–800 | 2BR 800–1,200 | 3BR 1,200–1,800
const distanceData = [
  { distance: '100–250 miles',   studio: '$750–$1,350',   oneBed: '$1,500–$2,400', twoBed: '$2,400–$3,600',  threeBed: '$3,600–$5,400'  },
  { distance: '250–500 miles',   studio: '$1,000–$1,800', oneBed: '$2,000–$3,200', twoBed: '$3,200–$4,800',  threeBed: '$4,800–$7,200'  },
  { distance: '500–1,000 miles', studio: '$1,500–$2,700', oneBed: '$3,000–$4,800', twoBed: '$4,800–$7,200',  threeBed: '$7,200–$10,800' },
  { distance: '1,000–2,000 miles',studio:'$1,500–$2,700', oneBed: '$3,000–$4,800', twoBed: '$4,800–$7,200',  threeBed: '$7,200–$10,800' },
  { distance: '2,000+ miles',    studio: '$1,750–$3,150', oneBed: '$3,500–$5,600', twoBed: '$5,600–$8,400',  threeBed: '$8,400–$12,600' },
];

const routeExamples = [
  {
    from: 'New Jersey',
    to: 'California',
    miles: '2,800 mi',
    studio: '$1,750–$3,150',
    oneBed: '$3,500–$5,600',
    twoBed: '$5,600–$8,400',
    threeBed: '$8,400–$12,600',
    note: 'Cross-country corridor — peak summer demand adds 15–25%',
    color: 'teal',
  },
  {
    from: 'New York',
    to: 'Texas',
    miles: '1,750 mi',
    studio: '$1,500–$2,700',
    oneBed: '$3,000–$4,800',
    twoBed: '$4,800–$7,200',
    threeBed: '$7,200–$10,800',
    note: 'High-volume corridor — competitive pricing, more carriers available',
    color: 'emerald',
  },
  {
    from: 'Florida',
    to: 'Illinois',
    miles: '1,300 mi',
    studio: '$1,500–$2,700',
    oneBed: '$3,000–$4,800',
    twoBed: '$4,800–$7,200',
    threeBed: '$7,200–$10,800',
    note: 'Southeast to Midwest — winter pricing often lower than summer',
    color: 'blue',
  },
];

const faqs = [
  { q: 'How are long-distance moving costs calculated?', a: 'Long-distance movers typically charge based on the total cubic footage of your shipment and the distance traveled. Additional charges apply for fuel surcharges, stairs, long carries, and packing services. Cross-country moves often include binding or non-binding estimates.' },
  { q: 'When is the cheapest time to move long distance?', a: 'The cheapest time to move is during off-peak months (October–April), mid-month, and mid-week. Summer (May–September) is the most expensive due to high demand. Booking 8–12 weeks in advance also helps secure lower rates.' },
  { q: 'Should I hire movers or rent a truck for long distance?', a: 'For moves under 300 miles, truck rental is usually cheaper. For moves over 500 miles — especially if you have a lot of furniture — full-service movers often make more financial sense when you factor in gas, hotels, meals, and your own time.' },
  { q: 'Are long-distance moving quotes binding?', a: 'Not always. A "binding estimate" means the price is fixed. A "non-binding estimate" can change based on actual weight. Always ask for a binding estimate if you want price certainty, and get at least 3 quotes.' },
];

export default function LongDistanceMovingCost() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      }))
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Long Distance Moving Cost Calculator - 2026 Price Guide"
        description="Calculate long distance moving costs with our free calculator. Compare full-service movers vs truck rental for interstate moves. Get instant estimates based on distance and home size."
        canonical="/long-distance-moving-cost"
        keywords="long distance moving cost, interstate moving cost, cross country moving price, long distance moving calculator, out of state moving cost"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-16 flex-1">
        {/* Hero */}
        <section className="relative text-white overflow-hidden" style={{ minHeight: '600px' }}>
          <img
            src="/Move-Price_Long_Distance.png"
            alt="Long distance moving truck"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/70 to-emerald-900/60" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-4xl w-full mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
                <MapPin className="w-4 h-4" /> Long Distance Moving Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Long Distance Moving Cost</h1>
              <p className="text-teal-100 text-lg max-w-2xl mx-auto">
                Complete cost breakdowns by distance and home size — plus a free calculator to get your exact estimate.
              </p>
            </div>
          </div>
        </section>

        {/* Key Stats */}
        <section className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: 'National Average', value: '$4,800', color: 'teal' },
            { icon: TrendingUp, label: 'Avg. Rate per Cu Ft', value: '$5.50–$6.00', color: 'emerald' },
            { icon: Truck, label: 'Most Common Move', value: '500–1,000 mi', color: 'blue' },
            { icon: Home, label: 'Avg. Home Size', value: '2-Bedroom', color: 'amber' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
              <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Cost Table */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Cost by Distance & Home Size</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Distance</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-slate-600">Studio</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-slate-600">1-Bedroom</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-slate-600">2-Bedroom</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-slate-600">3-Bedroom</th>
                  </tr>
                </thead>
                <tbody>
                  {distanceData.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{row.distance}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{row.studio}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{row.oneBed}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{row.twoBed}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{row.threeBed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Estimates based on our moving calculator using cu ft volume pricing. No packing, storage, or stairs included. Actual costs vary by region, season, and add-ons.</p>
        </section>

        {/* Calculator */}
        <section className="bg-white border-t border-slate-100 py-2">
          <div className="max-w-4xl mx-auto px-4 pt-6 pb-2 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Long Distance Moving Services and Cost Calculator 2026</h2>
            <p className="text-slate-500 mb-6 max-w-2xl mx-auto">Compare long distance moving costs instantly. See real estimates for movers vs truck rental, including fuel and tolls. No signup required. Or get 3 guaranteed quotes from top movers for free without obligation.</p>
          </div>
          <MovePriceCalculator
            headerLabel="Long Distance Moving Calculator"
            headerSubtext="Compare prices and let moving companies compete for you"
            hideUsCostSection
          />
        </section>

        {/* Real Route Examples */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Real Route Examples</h2>
          <p className="text-slate-500 mb-6 text-sm">Actual price ranges based on our pricing model for popular long-distance corridors.</p>
          <div className="flex flex-col gap-5">
            {routeExamples.map((route, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className={`bg-${route.color}-600 px-5 py-4 flex items-center gap-3`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MapPin className="w-4 h-4 text-white/80 flex-shrink-0" />
                    <span className="text-white font-semibold text-base truncate">{route.from}</span>
                    <ArrowRight className="w-4 h-4 text-white/60 flex-shrink-0" />
                    <MapPin className="w-4 h-4 text-white/80 flex-shrink-0" />
                    <span className="text-white font-semibold text-base truncate">{route.to}</span>
                  </div>
                  <span className={`text-${route.color}-100 text-sm font-medium bg-white/15 rounded-full px-3 py-0.5 flex-shrink-0`}>{route.miles}</span>
                </div>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs text-slate-500 mb-3 italic">{route.note}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Studio', value: route.studio },
                      { label: '1-Bedroom', value: route.oneBed },
                      { label: '2-Bedroom', value: route.twoBed },
                      { label: '3-Bedroom', value: route.threeBed },
                    ].map((item, j) => (
                      <div key={j} className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                        <p className="text-sm font-bold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="px-5 pb-4 text-xs text-slate-400 mt-2">Full-service movers · No packing or storage included · Prices vary by season and carrier</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-semibold text-slate-800 text-sm">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: openFaq === i ? '500px' : '0px' }}
                  aria-hidden={openFaq !== i}
                >
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
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
