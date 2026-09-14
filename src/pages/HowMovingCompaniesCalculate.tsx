import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';

// Sq ft from EIA RECS 2020 Table HC10.9 (avg sq ft by bedrooms, all U.S. occupied housing units)
// CF derived using AMSA industry-standard density formula (CF = sq ft × 0.65 for typical household density)
// Ranges represent ±15% around the mean — reflects typical variation in furnishing levels
// Source: U.S. Energy Information Administration, 2020 RECS Table HC10.9
const CUBIC_FEET_TABLE = [
  { size: 'Studio',      sqft: '657',   cf: '370–500 cu ft',     weight: '2,600–3,500 lbs' },
  { size: '1 Bedroom',   sqft: '791',   cf: '440–610 cu ft',     weight: '3,100–4,300 lbs' },
  { size: '2 Bedroom',   sqft: '1,274', cf: '720–990 cu ft',     weight: '5,000–6,900 lbs' },
  { size: '3 Bedroom',   sqft: '1,917', cf: '1,080–1,490 cu ft', weight: '7,600–10,400 lbs' },
  { size: '4+ Bedroom',  sqft: '2,658', cf: '1,500–2,060 cu ft', weight: '10,500–14,400 lbs' },
];

// Real averages at ~644 miles from Move-Price pricing engine
const COST_TABLE = [
  { size: 'Studio',      miles: '500 mi', low: 1523,  high: 1964  },
  { size: '1 Bedroom',   miles: '500 mi', low: 2204,  high: 2843  },
  { size: '2 Bedroom',   miles: '500 mi', low: 4008,  high: 5169  },
  { size: '3 Bedroom',   miles: '500 mi', low: 6613,  high: 8530  },
  { size: '4+ Bedroom',  miles: '500 mi', low: 9218,  high: 11890 },
];

const FAQ_ITEMS = [
  {
    q: 'How do interstate movers estimate costs?',
    a: 'Interstate movers estimate costs using shipment size (weight or cubic feet), mileage, labor requirements, and optional services such as packing or storage. Most carriers apply a per-pound or per-cubic-foot rate multiplied by distance.',
  },
  {
    q: 'What is the biggest factor in long-distance moving cost?',
    a: 'Shipment size and total distance are the two largest pricing factors. A 2-bedroom home averages 720–990 cubic feet based on national average home sizes. Each additional 100 miles adds roughly $150–$400 depending on the carrier.',
  },
  {
    q: 'Why are moving quotes so different between companies?',
    a: 'Quotes differ because carriers use different inventory assumptions, pricing models, included services, insurance tiers, and fuel surcharge structures. A binding quote from an in-home inspection is always more accurate than an online estimate.',
  },
  {
    q: 'Do movers charge by cubic feet or weight?',
    a: 'Some interstate movers use cubic-foot pricing while others use shipment weight. Van line carriers typically use weight-based pricing. Many independent carriers and container companies use cubic feet.',
  },
  {
    q: 'What is a binding vs non-binding moving estimate?',
    a: 'A binding estimate locks in the agreed price based on the inventory and services listed. A non-binding estimate may change based on final shipment weight, cubic feet, or additional services added at loading.',
  },
  {
    q: 'How accurate is the Move-Price calculator?',
    a: 'Move-Price generates a realistic planning range based on 2026 industry pricing data across all 50 states. It is not a carrier quote — final pricing is set by the moving company after confirming your actual inventory and services.',
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How Moving Companies Calculate Long-Distance Moving Costs (2026)',
  description: 'Long-distance moving companies calculate costs using shipment size, distance, labor, and services. Learn how movers price interstate moves and how to estimate your own cost.',
  dateModified: '2026-05-01',
  datePublished: '2026-05-01',
  author: { '@type': 'Organization', name: 'Move-Price' },
  publisher: { '@type': 'Organization', name: 'Move-Price', url: 'https://move-price.com' },
};

function fmt(n: number) {
  return '$' + n.toLocaleString();
}

export default function HowMovingCompaniesCalculate() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.id = 'how-mco-meta-desc';
    metaDesc.content = 'Long-distance moving companies calculate costs using shipment size (cubic feet or weight), total distance, labor, and services. See 2026 pricing examples by home size and learn what drives interstate moving quotes.';
    document.head.appendChild(metaDesc);

    const faqTag = document.createElement('script');
    faqTag.type = 'application/ld+json';
    faqTag.id = 'how-mco-faq-schema';
    faqTag.text = JSON.stringify(FAQ_SCHEMA);
    document.head.appendChild(faqTag);

    const articleTag = document.createElement('script');
    articleTag.type = 'application/ld+json';
    articleTag.id = 'how-mco-article-schema';
    articleTag.text = JSON.stringify(ARTICLE_SCHEMA);
    document.head.appendChild(articleTag);

    return () => {
      document.getElementById('how-mco-meta-desc')?.remove();
      document.getElementById('how-mco-faq-schema')?.remove();
      document.getElementById('how-mco-article-schema')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Seo
        title="How Moving Companies Calculate Long Distance Moving Costs"
        description="Learn how professional moving companies calculate long distance moving costs. Understand cubic feet, weight, distance, and the factors that drive your final moving quote."
        canonical="/how-moving-companies-calculate-long-distance-moving-costs"
        keywords="how movers calculate costs, moving company pricing, long distance moving cost factors, cubic feet moving, moving quote breakdown"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />

      <div className="pt-16 flex-1">
        {/* Hero */}
        <section className="relative text-white overflow-hidden" style={{ minHeight: '320px' }}>
          <img
            src="/Move-Price_Long_Distance.png"
            alt="Long-distance moving truck on highway"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-slate-800/70" />
          <div className="absolute inset-0 flex items-end px-4 pb-10">
            <div className="max-w-3xl mx-auto w-full">
              <p className="text-slate-300 text-sm font-medium mb-2 uppercase tracking-wide">Last Updated: May 2026</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                How Moving Companies Calculate<br className="hidden sm:block" /> Long-Distance Moving Costs
              </h1>
            </div>
          </div>
        </section>

        <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

          {/* Direct answer box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-10">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Direct Answer</p>
            <p className="text-slate-800 text-base leading-relaxed">
              Long-distance moving companies calculate costs using <strong>shipment size</strong>, <strong>total distance</strong>, <strong>labor requirements</strong>, and <strong>additional services</strong> such as packing or storage. Most interstate movers base pricing on either shipment weight or estimated cubic feet combined with mileage and access conditions. Final pricing may change after inventory verification, shuttle requirements, or additional services are confirmed.
            </p>
          </div>

          {/* Calculator — near top per spec */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Estimate Your Long-Distance Moving Cost</h2>
            <p className="text-slate-500 text-sm mb-5">Real 2026 pricing data · No account required · Instant result</p>
            <MovePriceCalculator
              headerLabel="Long-Distance Moving Cost Calculator"
              headerSubtext="Instant estimate · No account required · 2026 pricing"
              hideUsCostSection
            />
          </section>

          {/* Intro */}
          <p className="text-slate-600 leading-relaxed mb-10">
            Most interstate moving estimates are based on a combination of shipment volume, travel distance, labor complexity, and optional services. While every carrier uses slightly different pricing models, the majority of long-distance moving companies calculate costs using the same core variables. Understanding how moving estimates work can help customers compare quotes, avoid surprise charges, and identify unrealistic pricing.
          </p>

          {/* Main Factors */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Main Factors That Affect Long-Distance Moving Costs</h2>

            <h3 className="text-lg font-semibold text-slate-800 mb-2">1. Shipment Size</h3>
            <p className="text-slate-600 leading-relaxed mb-3">
              Shipment size is one of the biggest factors in long-distance moving pricing. Movers typically estimate shipment volume using either weight or cubic feet. Larger shipments require more truck space, more labor, more fuel, longer loading times, and additional packing materials. Most interstate moving companies calculate larger home moves at significantly higher rates due to truck capacity requirements.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-6">2. Moving Distance</h3>
            <p className="text-slate-600 leading-relaxed mb-3">
              Longer moves increase transportation costs, fuel usage, toll expenses, and driver time. Interstate moving prices generally increase as mileage increases. Cross-country moves typically cost more than regional interstate relocations because carriers must account for fuel costs, DOT regulations, driver scheduling, route planning, and delivery windows.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-6">3. Weight vs. Cubic Feet</h3>
            <p className="text-slate-600 leading-relaxed">
              Many long-distance movers price shipments using either total weight or estimated cubic feet. Weight-based estimates are common with van line carriers, while cubic-foot pricing is often used by carriers operating on volume-based inventory systems. Cubic feet measures the amount of physical truck space a shipment occupies.
            </p>
          </section>

          {/* Cubic feet table */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Typical Cubic Feet by Home Size</h2>
            <p className="text-slate-500 text-sm mb-4">
              Sq ft based on EIA RECS 2020 national averages · CF calculated using AMSA industry-standard density formula · Range reflects ±15% typical furnishing variation
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Home Size</th>
                    <th className="px-4 py-3 text-left font-semibold">Avg Sq Ft</th>
                    <th className="px-4 py-3 text-left font-semibold">Est. Cubic Feet</th>
                    <th className="px-4 py-3 text-left font-semibold">Est. Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {CUBIC_FEET_TABLE.map((row, i) => (
                    <tr key={row.size} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.size}</td>
                      <td className="px-4 py-3 text-slate-500">{row.sqft}</td>
                      <td className="px-4 py-3 text-slate-600">{row.cf}</td>
                      <td className="px-4 py-3 text-slate-600">{row.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Sources: U.S. Energy Information Administration,{' '}
              <a href="https://www.eia.gov/consumption/residential/data/2020/" className="underline hover:text-slate-600" target="_blank" rel="noopener noreferrer">
                2020 Residential Energy Consumption Survey (RECS), Table HC10.9
              </a>
              ; AMSA Household Goods Industry Standard Density Formula.
            </p>
          </section>

          {/* Cost table */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Average Long-Distance Moving Costs (2026)</h2>
            <p className="text-slate-500 text-sm mb-4">
              Calculated by Move-Price pricing engine · Full-service movers · ~500-mile move · National average
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Home Size</th>
                    <th className="px-4 py-3 text-left font-semibold">Distance</th>
                    <th className="px-4 py-3 text-left font-semibold">Average Cost Range</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_TABLE.map((row, i) => (
                    <tr key={row.size} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.size}</td>
                      <td className="px-4 py-3 text-slate-600">{row.miles}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{fmt(row.low)}–{fmt(row.high)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-2">Actual pricing varies by region, seasonality, inventory complexity, access conditions, and carrier.</p>
          </section>

          {/* Additional Services */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Additional Services That Increase Moving Costs</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Additional services can significantly increase interstate moving prices. Common extra charges include packing services, storage, shuttle service, long carry fees, stair fees, elevator delays, furniture disassembly, crating, and bulky item handling. Packing services and storage are among the most common reasons final moving costs increase above initial estimates.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['Packing services','Storage','Shuttle service','Long carry fees','Stair fees','Elevator delays','Furniture disassembly','Crating','Bulky item handling'].map(item => (
                <div key={item} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Why quotes change */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Why Moving Quotes Change</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Long-distance moving estimates may change if additional inventory is added, access conditions change, packing services are added, storage becomes necessary, or pickup or delivery logistics change. Many pricing changes occur because the original inventory list was incomplete or inaccurate.
            </p>
          </section>

          {/* Binding vs non-binding */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Binding vs. Non-Binding Estimates</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-5">
                <p className="font-semibold text-slate-800 mb-2">Binding Estimates</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Lock in the agreed price based on the inventory and services listed in the estimate. The carrier cannot charge more than the binding price unless you add services.
                </p>
              </div>
              <div className="border border-slate-200 rounded-xl p-5">
                <p className="font-semibold text-slate-800 mb-2">Non-Binding Estimates</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  May change based on final shipment weight, cubic feet, or additional services. Many interstate moving companies use non-binding estimates during the initial quoting phase.
                </p>
              </div>
            </div>
          </section>

          {/* How Move-Price calculates */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">How Move-Price Calculates Long-Distance Moving Costs</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Move-Price estimates moving costs using home size, estimated shipment volume (cubic feet), move distance, and optional services to generate instant price ranges for interstate and long-distance moves. The calculator considers estimated cubic feet, home size, move distance, packing services, storage needs, and move type.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Move-Price estimates are based on 2026 pricing data across all 50 states, using the national average interstate move distance of approximately 644 miles and per-state cubic footage averages derived from U.S. housing data.
            </p>
          </section>

          {/* Methodology */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Methodology</h2>
            <p className="text-slate-600 leading-relaxed text-sm">
              Move-Price estimates moving costs using publicly available moving industry pricing data, shipment size averages, cubic-foot inventory ranges derived from U.S. Census Bureau housing surveys, and interstate transportation trends. Cubic feet estimates use state-level median home square footage data from the American Housing Survey. Pricing examples reflect estimated national moving cost ranges for full-service movers at approximately 500 miles and may vary by region, carrier availability, seasonality, and service requirements.
            </p>
          </section>

          {/* Internal links */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Related Moving Cost Guides</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { to: '/long-distance-moving-cost', label: 'Long-Distance Moving Cost Guide', desc: 'Average costs by distance and home size' },
                { to: '/moving-cost-by-home-size', label: 'Moving Cost by Home Size', desc: 'Detailed breakdown from studio to 4+ bedroom' },
                { to: '/state-to-state-moving-cost', label: 'State-to-State Moving Costs', desc: 'Interstate price examples for all 50 states' },
                { to: '/movers-vs-truck-rental', label: 'Movers vs. Truck Rental', desc: 'Compare full-service movers to DIY rental' },
                { to: '/how-move-price-calculates', label: 'How Move-Price Calculates Costs', desc: 'Methodology behind our pricing engine' },
                { to: '/rent-a-truck', label: 'Truck Rental Cost Estimator', desc: 'U-Haul, Penske, and Budget price ranges' },
              ].map(({ to, label, desc }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex flex-col gap-0.5 border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-800 text-sm group-hover:text-slate-900">{label}</span>
                  <span className="text-slate-500 text-xs">{desc}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-800 text-sm leading-snug">{item.q}</span>
                    {openFaq === i
                      ? <ChevronUp size={17} className="text-slate-400 shrink-0" />
                      : <ChevronDown size={17} className="text-slate-400 shrink-0" />
                    }
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>

      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
