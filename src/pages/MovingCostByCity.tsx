import { useState, useEffect } from 'react';
import { Building2, DollarSign, TrendingUp, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';

const cities = [
  { city: 'New York, NY', localAvg: '$550–$1,200', longDistAvg: '$4,500–$9,000', tier: 'Very High', note: 'Walk-ups, COI requirements, and tight parking raise costs' },
  { city: 'San Francisco, CA', localAvg: '$500–$1,100', longDistAvg: '$4,000–$8,500', tier: 'Very High', note: 'Steep streets and parking add labor time' },
  { city: 'Los Angeles, CA', localAvg: '$400–$950', longDistAvg: '$3,500–$8,000', tier: 'High', note: 'Traffic delays inflate hourly moves' },
  { city: 'Seattle, WA', localAvg: '$380–$900', longDistAvg: '$3,200–$7,200', tier: 'High', note: 'Rain delays possible; hilly terrain common' },
  { city: 'Boston, MA', localAvg: '$420–$950', longDistAvg: '$3,400–$7,500', tier: 'High', note: 'Narrow streets and parking permits required' },
  { city: 'Washington, DC', localAvg: '$380–$900', longDistAvg: '$3,100–$7,000', tier: 'High', note: 'COI (certificate of insurance) often required' },
  { city: 'Chicago, IL', localAvg: '$300–$750', longDistAvg: '$2,800–$6,200', tier: 'Medium', note: 'Winters slow down moves; parking fees common' },
  { city: 'Miami, FL', localAvg: '$280–$700', longDistAvg: '$2,600–$5,800', tier: 'Medium', note: 'Hurricane season (June–Nov) spikes demand' },
  { city: 'Austin, TX', localAvg: '$260–$650', longDistAvg: '$2,400–$5,500', tier: 'Medium', note: 'Fast-growing city; book 6–8 weeks ahead' },
  { city: 'Denver, CO', localAvg: '$250–$650', longDistAvg: '$2,200–$5,000', tier: 'Medium', note: 'Altitude and hills can add time for large moves' },
  { city: 'Phoenix, AZ', localAvg: '$220–$580', longDistAvg: '$2,000–$4,800', tier: 'Low', note: 'Summer heat; early morning moves recommended' },
  { city: 'Dallas, TX', localAvg: '$220–$580', longDistAvg: '$2,100–$4,800', tier: 'Low', note: 'Sprawling metro; long drives between addresses' },
  { city: 'Atlanta, GA', localAvg: '$230–$600', longDistAvg: '$2,100–$4,900', tier: 'Low', note: 'Traffic is unpredictable; add buffer time' },
  { city: 'Nashville, TN', localAvg: '$200–$550', longDistAvg: '$1,900–$4,500', tier: 'Low', note: 'Fast growth; competitive market for movers' },
  { city: 'Charlotte, NC', localAvg: '$200–$520', longDistAvg: '$1,800–$4,200', tier: 'Low', note: 'Suburban sprawl keeps costs manageable' },
  { city: 'Columbus, OH', localAvg: '$180–$480', longDistAvg: '$1,700–$3,900', tier: 'Low', note: 'One of the most affordable metro areas to move in' },
];

const tierColors: Record<string, string> = {
  'Very High': 'bg-emerald-800 text-emerald-50',
  'High': 'bg-teal-700 text-teal-50',
  'Medium': 'bg-teal-200 text-teal-800',
  'Low': 'bg-emerald-100 text-emerald-700',
};

const faqs = [
  { q: 'Which city has the highest moving costs?', a: 'New York City and San Francisco consistently rank as the most expensive cities to move in and out of. Dense urban environments mean longer truck carries, elevator wait times, building requirements (COIs), and generally higher labor costs.' },
  { q: 'Why are moving costs so different by city?', a: 'Local moving costs are driven by average hourly wages, traffic and parking conditions, building requirements, and the number of competing movers in the area. Cities with high costs of living also tend to have higher moving labor rates.' },
  { q: 'Does it cost more to move in a high cost-of-living city?', a: 'Yes. Moving companies in expensive cities like NYC, SF, and Boston typically charge $120–$200/hour per mover vs. $80–$130/hour in mid-tier cities like Denver or Nashville.' },
  { q: 'How do I find the cheapest movers in my city?', a: 'Get at least 3 quotes from local movers, compare during off-peak times (October–April, mid-week), and consider partial DIY (pack yourself, hire movers for heavy items only). Using our calculator above gives you a fair baseline for comparison.' },
];

export default function MovingCostByCity() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('All');

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

  const tiers = ['All', 'Very High', 'High', 'Medium', 'Low'];
  const filtered = filter === 'All' ? cities : cities.filter(c => c.tier === filter);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Moving Cost by City - 2026 Price Comparison for Major US Cities"
        description="Compare moving costs across major US cities. See how local and long distance moving prices vary by location, from New York to Los Angeles to Chicago."
        canonical="/moving-cost-by-city"
        keywords="moving cost by city, moving prices by city, how much does it cost to move in NYC, city moving cost comparison, moving costs major cities"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-16 flex-1">
        <section className="relative text-white overflow-hidden" style={{ minHeight: '600px' }}>
          <img
            src="/Move-Price_MovingCostByCity.png"
            alt="Moving cost by city"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/55 via-slate-900/45 to-slate-900/70" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-4xl w-full mx-auto text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
                <Building2 className="w-4 h-4 text-teal-300" /> City Moving Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight drop-shadow-lg">Moving Cost by City</h1>
              <p className="text-slate-200 text-lg max-w-2xl mx-auto drop-shadow">
                Average local and long-distance moving costs for 16 major US cities — with city-specific tips.
              </p>
            </div>
          </div>
        </section>

        {/* Cost tier legend */}
        <section className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-600">Filter by cost tier:</span>
            {tiers.map(tier => (
              <button
                key={tier}
                onClick={() => setFilter(tier)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filter === tier
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </section>

        {/* City table */}
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600">City</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-slate-600">Cost Tier</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-teal-700">Local Move</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-emerald-700">Long Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((city, i) => (
                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{city.city}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{city.note}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tierColors[city.tier]}`}>{city.tier}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-teal-700 font-medium">{city.localAvg}</td>
                      <td className="px-4 py-3.5 text-center text-emerald-700 font-medium">{city.longDistAvg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Local move costs reflect a 2-bedroom apartment. Long-distance costs are for a 2-bedroom home move.</p>
        </section>

        {/* Tier explainer */}
        <section className="max-w-4xl mx-auto px-4 pb-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { tier: 'Very High', desc: '$500+/local • NYC, SF', icon: TrendingUp, color: 'rose' },
            { tier: 'High', desc: '$380–$500/local • LA, Seattle, Boston', icon: MapPin, color: 'amber' },
            { tier: 'Medium', desc: '$250–$380/local • Chicago, Miami, Austin', icon: DollarSign, color: 'blue' },
            { tier: 'Low', desc: 'Under $250/local • Phoenix, Nashville', icon: Building2, color: 'teal' },
          ].map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tierColors[t.tier]}`}>{t.tier}</span>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </section>

        {/* Calculator */}
        <section className="bg-white border-t border-slate-100 py-2">
          <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
            <h2 className="text-2xl font-bold text-teal-800 mb-1">Get Your City's Exact Moving Cost</h2>
            <p className="text-slate-500 mb-6">Enter your zip codes for a precise estimate based on your city and home size.</p>
          </div>
          <MovePriceCalculator hideConsolidatedTable hideUsCostSection />
          <div className="max-w-4xl mx-auto px-4 mt-12">
            <h2 className="text-2xl font-semibold text-teal-800 mb-3">How much does moving cost by city in the US?</h2>
            <p className="text-slate-600 mb-3">
              Moving costs vary dramatically from one US city to another. In high cost-of-living metros like New York, San Francisco, and Boston, a local 2-bedroom move typically runs <strong>$500 to $1,200</strong>, while long-distance relocations can reach <strong>$4,500 to $9,000</strong>. Mid-tier cities such as Chicago, Austin, and Denver average <strong>$250 to $750</strong> for a local move, and budget-friendly cities like Phoenix, Nashville, and Columbus often start under <strong>$250</strong> for small local jobs.
            </p>
            <p className="text-slate-600 mb-6">
              The biggest factors driving city-to-city price differences are labor rates, parking and building access (COI requirements, elevator reservations, stair carries), traffic patterns, and seasonal demand. Use the calculator above for an exact estimate based on your zip code, home size, and move date.
            </p>
            <div className="image-wrapper shadow-2xl shadow-slate-300/50">
              <img
                src="/Move-Price_MovingCostByCItyBottomPhoto.png"
                alt="US map showing moving routes and cost by city"
                className="w-full h-auto object-cover"
              />
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">
              Compare moving costs across cities nationwide
            </p>
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
