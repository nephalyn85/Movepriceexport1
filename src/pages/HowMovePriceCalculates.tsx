import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import MovePriceCalculator from '../components/MovePriceCalculator';

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is a Move-Price estimate a binding quote?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. A Move-Price estimate is a non-binding price range, not a guaranteed final price. The final price is typically set by the mover based on actual volume (cubic feet) and services.' },
    },
    {
      '@type': 'Question',
      name: 'Do I need to create an account to use the Move-Price calculator?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. You do not need an account or email to see an estimate on the Move-Price calculator.' },
    },
    {
      '@type': 'Question',
      name: 'Does Move-Price show the estimate immediately?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Move-Price calculator shows an instant moving cost range on the page as soon as you enter your move details.' },
    },
    {
      '@type': 'Question',
      name: 'How does Move-Price calculate long-distance moving costs?',
      acceptedAnswer: { '@type': 'Answer', text: 'Move-Price uses home size, distance, estimated volume (cubic feet), services, and move timing to calculate a price range for long-distance moves.' },
    },
  ],
};

const FACTOR_ROWS = [
  { factor: 'Distance',         effect: 'More miles = higher cost' },
  { factor: 'Home size',        effect: 'More rooms = more cubic feet = higher cost' },
  { factor: 'Shipment volume',  effect: 'Larger cubic footage = higher cost' },
  { factor: 'Services',         effect: 'Packing, storage, and special handling increase price' },
  { factor: 'Move date',        effect: 'Peak season (May–September) and short notice raise cost' },
  { factor: 'Access',           effect: 'Stairs, long carries, and limited parking can increase cost' },
];

const FAQ_ITEMS = [
  {
    q: 'Is a Move-Price estimate a binding quote?',
    a: 'No. A Move-Price estimate is a non-binding price range, not a guaranteed final price. The final price is typically set by the mover based on actual volume (cubic feet) and services.',
  },
  {
    q: 'Do I need to create an account to use the Move-Price calculator?',
    a: 'No. You do not need an account or email to see an estimate on the Move-Price calculator.',
  },
  {
    q: 'Does Move-Price show the estimate immediately?',
    a: 'Yes. The Move-Price calculator shows an instant moving cost range on the page as soon as you enter your move details.',
  },
  {
    q: 'How does Move-Price calculate long-distance moving costs?',
    a: 'Move-Price uses home size, distance, estimated volume (cubic feet), services, and move timing to calculate a price range for long-distance moves.',
  },
];

export default function HowMovePriceCalculates() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = 'how-calc-faq-schema';
    tag.text = JSON.stringify(FAQ_SCHEMA);
    document.head.appendChild(tag);
    return () => { document.getElementById('how-calc-faq-schema')?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Seo
        title="How Move Price Calculates Long Distance Moving Costs"
        description="Transparent breakdown of how our moving cost calculator works. See the formula, data sources, and methodology behind our long distance moving cost estimates."
        canonical="/how-move-price-calculates-long-distance-moving-costs"
        keywords="how moving costs are calculated, moving cost formula, moving estimate methodology, how move price works, moving cost calculation"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />

      <div className="pt-16 flex-1">
        {/* Hero */}
        <section className="relative text-white overflow-hidden" style={{ minHeight: '340px' }}>
          <img
            src="/Move-Price_Long_Distance.png"
            alt="Long distance moving truck on highway"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 to-slate-800/65" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-3xl w-full mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
                How Move-Price Calculates Long-Distance Moving Costs (2026)
              </h1>
              <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Move-Price estimates costs using home size, move distance, estimated shipment volume (cubic feet),
                and selected services to generate an instant price range. The estimate is a non-binding range;
                the final price is determined after mover confirms your service.
              </p>
            </div>
          </div>
        </section>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* Calculator */}
        <div className="mb-12">
          <MovePriceCalculator
            headerLabel="Long-Distance Moving Cost Calculator"
            headerSubtext="Instant estimate · No account required · 2026 pricing"
            hideUsCostSection
          />
        </div>

        {/* Binding vs non-binding */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Is a Move-Price Estimate a Binding Quote or a Range?
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            A Move-Price estimate is a <strong>non-binding price range</strong>, not a guaranteed final price. It shows what a
            typical long-distance move with your inputs usually costs in 2026.
          </p>
          <ul className="space-y-3 mb-4">
            <li className="flex gap-3 items-start">
              <span className="mt-1 w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span className="text-slate-700 leading-relaxed">
                <strong>Binding quote:</strong> The mover guarantees the price (or a "binding not-to-exceed" cap).
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="mt-1 w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span className="text-slate-700 leading-relaxed">
                <strong>Non-binding estimate:</strong> The final price is based on actual volume (cubic feet), services, and distance after loading.
              </span>
            </li>
          </ul>
          <p className="text-slate-600 leading-relaxed">
            Move-Price currently presents its output as an instant estimate, which in the moving industry is typically a range
            that can change once the mover inspects your belongings.
          </p>
        </section>

        {/* How does it calculate */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            How Does Move-Price Calculate Long-Distance Moving Costs?
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Move-Price uses the following factors to calculate a long-distance moving estimate:
          </p>
          <ul className="space-y-3 mb-4">
            {[
              { label: 'Origin and destination', desc: 'The distance between your old and new address (mileage).' },
              { label: 'Home size', desc: 'Number of bedrooms or rooms, which correlates to shipment volume.' },
              { label: 'Estimated volume (cubic feet)', desc: 'Based on home size and typical cubic footage per room.' },
              { label: 'Selected services', desc: 'Packing, crating, appliance prep, storage, and special handling.' },
              { label: 'Move timing', desc: 'Peak season (summer), short-notice moves, and weekends often cost more.' },
              { label: 'Access and logistics', desc: 'Stairs, long carries, elevator use, and parking restrictions can affect cost.' },
            ].map(({ label, desc }) => (
              <li key={label} className="flex gap-3 items-start">
                <span className="mt-1 w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span className="text-slate-700 leading-relaxed">
                  <strong>{label}</strong> – {desc}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 leading-relaxed">
            The calculator combines these inputs to produce a price range that reflects industry averages for long-distance moves in 2026.
          </p>
        </section>

        {/* Step by step */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Step-by-Step: How the Move-Price Estimate Works
          </h2>
          <ol className="space-y-2 mb-4 list-decimal list-inside">
            {[
              'You enter your moving dates, origin, and destination.',
              'You select your home size (e.g., 1-bedroom, 2-bedroom, 3+ bedrooms).',
              'You choose additional services (packing, storage, insurance, etc.).',
              'The calculator estimates shipment volume (cubic feet) from your home size.',
              'It applies per-mile rates and service fees to generate a price range.',
              'You see the estimate instantly on the page, without needing an account.',
            ].map((step, i) => (
              <li key={i} className="text-slate-700 leading-relaxed pl-1">{step}</li>
            ))}
          </ol>
          <p className="text-slate-600 leading-relaxed">
            For long-distance moves, the final price is usually set by the carrier based on actual volume (cubic feet) and services, not the initial estimate.
          </p>
        </section>

        {/* Factors table */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            What Affects Your Long-Distance Move Price on Move-Price?
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Factor</th>
                  <th className="px-4 py-3 text-left font-semibold">How It Affects Price</th>
                </tr>
              </thead>
              <tbody>
                {FACTOR_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.factor}</td>
                    <td className="px-4 py-3 text-slate-600">{row.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-600 leading-relaxed">
            These are the same factors that professional long-distance movers use to price moves.
          </p>
        </section>

        {/* Free + no account */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Is the Move-Price Calculator Free and Do I Need an Account?
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Yes. The Move-Price moving cost calculator is free to use and does not require you to create an account or enter
            your email to see an estimate. You can get an instant moving cost range directly on the page.
          </p>
        </section>

        {/* Accuracy */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            How Accurate Is the Move-Price Long-Distance Estimate?
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            The Move-Price estimate is designed to be a realistic range based on typical 2026 moving costs, not a final carrier
            quote. Accuracy depends on:
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'How well your home size and items match typical cubic footage assumptions.',
              'Whether you include all services you actually need.',
              'The actual shipment volume (cubic feet) and distance confirmed by the carrier.',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="mt-1 w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span className="text-slate-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 leading-relaxed">
            For binding pricing, you must get a final quote from a licensed mover after they inspect your shipment.
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">FAQ</h2>
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
