import { useState, useEffect } from 'react';
import { TrendingUp, MapPin, DollarSign, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';

const routes = [
  { from: 'New York, NY', to: 'Los Angeles, CA', distance: '2,800 mi', movers: '$4,800–$9,200', truck: '$1,400–$2,100', popular: true },
  { from: 'Chicago, IL', to: 'Houston, TX', distance: '1,100 mi', movers: '$2,800–$5,500', truck: '$750–$1,200', popular: false },
  { from: 'Los Angeles, CA', to: 'Phoenix, AZ', distance: '370 mi', movers: '$1,400–$3,200', truck: '$450–$750', popular: true },
  { from: 'New York, NY', to: 'Miami, FL', distance: '1,280 mi', movers: '$3,000–$6,000', truck: '$800–$1,300', popular: true },
  { from: 'Seattle, WA', to: 'San Francisco, CA', distance: '810 mi', movers: '$2,200–$4,500', truck: '$600–$1,000', popular: false },
  { from: 'Dallas, TX', to: 'Atlanta, GA', distance: '780 mi', movers: '$2,000–$4,200', truck: '$550–$950', popular: false },
  { from: 'Boston, MA', to: 'Washington, DC', distance: '440 mi', movers: '$1,600–$3,500', truck: '$480–$800', popular: true },
  { from: 'Denver, CO', to: 'Las Vegas, NV', distance: '750 mi', movers: '$2,000–$4,000', truck: '$520–$900', popular: false },
  { from: 'San Francisco, CA', to: 'Portland, OR', distance: '640 mi', movers: '$1,900–$3,800', truck: '$500–$880', popular: false },
  { from: 'Minneapolis, MN', to: 'Chicago, IL', distance: '410 mi', movers: '$1,500–$3,200', truck: '$440–$750', popular: false },
  { from: 'Nashville, TN', to: 'Dallas, TX', distance: '670 mi', movers: '$1,900–$3,900', truck: '$520–$880', popular: false },
  { from: 'Phoenix, AZ', to: 'Austin, TX', distance: '870 mi', movers: '$2,300–$4,600', truck: '$620–$1,050', popular: false },
];

const tips = [
  { tip: 'Get at least 3 binding quotes', detail: 'Prices vary widely between carriers. Getting 3 written binding estimates protects you from price increases.' },
  { tip: 'Ship during off-peak season', detail: 'October through April sees 20–35% lower rates vs. summer. Mid-month and mid-week also see better pricing.' },
  { tip: 'Sell or donate before moving', detail: 'Long-distance movers charge by weight. Eliminating 500 lbs can save $200–$600 on cross-country moves.' },
  { tip: 'Ask about binding vs. non-binding estimates', detail: 'A binding estimate guarantees your price. Non-binding estimates can increase by up to 10% on delivery day.' },
];

const faqs = [
  { q: 'How much does it cost to move from NY to LA?', a: 'A New York to Los Angeles move costs roughly $4,800–$9,200 for full-service movers, depending on home size. The route is ~2,800 miles, and moving a 2-bedroom home typically costs $6,000–$7,500. Budget an extra $1,000 for storage if delivery timing is flexible.' },
  { q: 'How long do state-to-state moves take?', a: 'Most interstate moves take 3–14 business days for delivery. Shorter routes (under 800 miles) may be delivered in 2–5 days. Cross-country moves (2,000+ miles) can take 7–14 days. Discuss delivery windows with your mover before signing.' },
  { q: 'What documents do I need for an interstate move?', a: 'Legitimate interstate movers are FMCSA-registered and must provide a Bill of Lading, a binding or non-binding estimate, and a pamphlet called "Your Rights and Responsibilities When You Move." Always verify a mover\'s USDOT number before booking.' },
  { q: 'How do I avoid interstate moving scams?', a: 'Red flags include very low quotes, no in-home or video survey, requests for large upfront deposits, and unmarked trucks. Always verify the USDOT number on FMCSA\'s website, get a written binding estimate, and never pay more than 10–20% upfront.' },
];

export default function StateToStateMovingCost() {
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
        title="State-to-State Moving Cost Calculator - Interstate Move Prices"
        description="Calculate state-to-state moving costs for any route in the US. Compare full-service movers and truck rental prices for popular interstate moves. Free instant estimates."
        canonical="/state-to-state-moving-cost"
        keywords="state to state moving cost, interstate moving cost, cross state moving price, state to state movers, interstate move calculator"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-16 flex-1">
        <section className="relative text-white overflow-hidden" style={{ minHeight: '600px' }}>
          <img
            src="/Move-Price_StateToStateMovingCost.png"
            alt="State-to-state moving routes across the US"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/50 to-slate-900/75" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-4xl w-full mx-auto text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
                <TrendingUp className="w-4 h-4 text-teal-300" /> State-to-State Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight drop-shadow-lg">State-to-State Moving Cost</h1>
              <p className="text-slate-200 text-lg max-w-2xl mx-auto drop-shadow">
                Real price data for the 12 most popular interstate moving routes in the US.
              </p>
            </div>
          </div>
        </section>

        {/* Quick stats */}
        <section className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Average interstate move', value: '$4,800', icon: DollarSign },
            { label: 'Most popular season', value: 'June–Aug', icon: TrendingUp },
            { label: 'Avg. delivery time', value: '3–14 days', icon: Truck },
            { label: 'Peak mileage routes', value: '1,000+ mi', icon: MapPin },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center mx-auto mb-3">
                <s.icon className="w-5 h-5 text-teal-700" />
              </div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Routes Table */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-bold text-teal-800 mb-5">Popular Interstate Moving Routes</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Route</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-slate-600">Distance</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-teal-600">Full-Service Movers</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-amber-600">Truck Rental</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route, i) => (
                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-slate-800">{route.from}</p>
                            <p className="text-xs text-slate-400">to {route.to}</p>
                          </div>
                          {route.popular && (
                            <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Popular</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500 text-xs">{route.distance}</td>
                      <td className="px-4 py-3.5 text-center text-teal-700 font-medium">{route.movers}</td>
                      <td className="px-4 py-3.5 text-center text-amber-700 font-medium">{route.truck}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Costs shown for a 2-bedroom home. Prices vary by season, carrier, and additional services.</p>
        </section>

        {/* Calculator */}
        <section className="bg-white border-t border-slate-100 py-2">
          <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
            <h2 className="text-2xl font-bold text-teal-800 mb-1">Get Your Route's Exact Estimate</h2>
            <p className="text-slate-500 mb-6">Enter your origin and destination zip codes for a personalized price.</p>
          </div>
          <MovePriceCalculator hideUsCostSection hideConsolidatedTable />
        </section>

        {/* Tips */}
        <section className="max-w-4xl mx-auto px-4 pt-10 pb-10">
          <h2 className="text-2xl font-bold text-teal-800 mb-5">How to Save on Your Interstate Move</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {tips.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <p className="font-bold text-teal-700 mb-2 text-sm">{t.tip}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{t.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-teal-800 mb-6">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-semibold text-teal-800 text-sm">{faq.q}</span>
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
