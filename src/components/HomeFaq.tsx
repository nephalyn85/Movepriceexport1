import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    q: 'How does the Move Price calculator work?',
    a: 'Enter your origin and destination ZIP codes, select your home size, and choose your services. The calculator estimates costs for full-service movers, hourly movers, truck rentals, and packing services based on real pricing data.',
  },
  {
    q: 'Is Move Price free to use?',
    a: 'Yes. Move Price is completely free. There is no signup, no email required, and no personal information needed. Just enter your move details and get an instant estimate.',
  },
  {
    q: 'What is the difference between full-service and hourly movers?',
    a: 'Full-service movers handle everything — loading, transport, and unloading — and are priced based on your home size and distance. Hourly movers charge by the hour and work best for local moves, studio apartments, or smaller loads.',
  },
  {
    q: 'How accurate are the moving cost estimates?',
    a: 'Our estimates are calculated using three key factors: the cubic footage of your belongings (based on your home size and inventory), the distance of your move, and demand — whether you\'re moving during a busy period like summer or weekends versus off-peak times. This gives you a data-driven estimate that reflects real market conditions for your specific move.',
  },
  {
    q: 'Does the calculator include packing services?',
    a: 'Yes. You can add packing services as an optional add-on. The calculator estimates the cost based on your home size and whether you need full or partial packing.',
  },
  {
    q: 'Can I estimate the cost of renting a truck myself?',
    a: 'Absolutely. Select the truck rental option and enter your ZIP codes to see estimated rental costs from companies like U-Haul, Penske, and Budget. The estimate includes base rental, mileage, fuel, and tolls.',
  },
  {
    q: 'What home sizes does the calculator support?',
    a: 'The calculator supports studio/room, 1-bedroom, 2-bedroom, 3-bedroom, 4-bedroom, and 5+ bedroom homes so you can match your actual move size.',
  },
  {
    q: 'Does the estimate include storage units?',
    a: 'Yes. If you need temporary storage during your move, the calculator includes a storage cost estimate based on unit size and typical monthly rates in your area.',
  },
  {
    q: 'What factors affect moving costs the most?',
    a: 'Distance and home size are the biggest factors. Other key variables include stairs, number of heavy or specialty items, packing services, time of year (summer and weekends cost more), and whether you choose full-service or DIY truck rental.',
  },
  {
    q: 'Are long-distance and local moves calculated differently?',
    a: 'Our calculator gives you a guaranteed price estimate based on the cubic footage of your belongings — not by the hour or by weight. Whether your move is local or long-distance, the price is determined by the volume of items you\'re moving plus the distance, so there are no surprise charges on moving day.',
  },
];

export default function HomeFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Frequently Asked Questions</h2>
      <p className="text-slate-500 text-sm text-center mb-8">Everything you need to know about estimating your move cost</p>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-slate-50 transition-colors"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <span className="font-medium text-slate-800 text-sm sm:text-base">{faq.q}</span>
              {openIndex === i
                ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              }
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: openIndex === i ? '500px' : '0px' }}
              aria-hidden={openIndex !== i}
            >
              <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                {faq.a}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
