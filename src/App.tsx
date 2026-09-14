import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DollarSign, Clock, ShieldCheck } from 'lucide-react';
import MovePriceCalculator from './components/MovePriceCalculator';
import Header from './components/Header';
import AboutModal from './components/AboutModal';
import Footer from './components/Footer';
import HomeFaq from './components/HomeFaq';
import Seo from './components/Seo';

const HOME_FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'How does the Move Price calculator work?', acceptedAnswer: { '@type': 'Answer', text: 'Enter your origin and destination ZIP codes, select your home size, and choose your services. The calculator estimates costs for full-service movers, hourly movers, truck rentals, and packing services based on real pricing data.' } },
    { '@type': 'Question', name: 'Is Move Price free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Move Price is completely free. There is no signup, no email required, and no personal information needed. Just enter your move details and get an instant estimate.' } },
    { '@type': 'Question', name: 'What is the difference between full-service and hourly movers?', acceptedAnswer: { '@type': 'Answer', text: 'Full-service movers handle everything — loading, transport, and unloading — and are priced based on your home size and distance. Hourly movers charge by the hour and work best for local moves, studio apartments, or smaller loads.' } },
    { '@type': 'Question', name: 'How accurate are the moving cost estimates?', acceptedAnswer: { '@type': 'Answer', text: "Our estimates are calculated using three key factors: the cubic footage of your belongings (based on your home size and inventory), the distance of your move, and demand — whether you're moving during a busy period like summer or weekends versus off-peak times. This gives you a data-driven estimate that reflects real market conditions for your specific move." } },
    { '@type': 'Question', name: 'Does the calculator include packing services?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can add packing services as an optional add-on. The calculator estimates the cost based on your home size and whether you need full or partial packing.' } },
    { '@type': 'Question', name: 'Can I estimate the cost of renting a truck myself?', acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. Select the truck rental option and enter your ZIP codes to see estimated rental costs from companies like U-Haul, Penske, and Budget. The estimate includes base rental, mileage, fuel, and tolls.' } },
    { '@type': 'Question', name: 'What home sizes does the calculator support?', acceptedAnswer: { '@type': 'Answer', text: 'The calculator supports studio/room, 1-bedroom, 2-bedroom, 3-bedroom, 4-bedroom, and 5+ bedroom homes so you can match your actual move size.' } },
    { '@type': 'Question', name: 'Does the estimate include storage units?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. If you need temporary storage during your move, the calculator includes a storage cost estimate based on unit size and typical monthly rates in your area.' } },
    { '@type': 'Question', name: 'What factors affect moving costs the most?', acceptedAnswer: { '@type': 'Answer', text: 'Distance and home size are the biggest factors. Other key variables include stairs, number of heavy or specialty items, packing services, time of year (summer and weekends cost more), and whether you choose full-service or DIY truck rental.' } },
    { '@type': 'Question', name: 'Are long-distance and local moves calculated differently?', acceptedAnswer: { '@type': 'Answer', text: "Our calculator gives you a guaranteed price estimate based on the cubic footage of your belongings — not by the hour or by weight. Whether your move is local or long-distance, the price is determined by the volume of items you're moving plus the distance, so there are no surprise charges on moving day." } },
  ],
};

function App() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#calculator') {
      setTimeout(() => {
        document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.hash]);

  useEffect(() => {
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = 'home-faq-schema';
    tag.text = JSON.stringify(HOME_FAQ_SCHEMA);
    document.head.appendChild(tag);
    return () => { document.getElementById('home-faq-schema')?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
      <Seo
        title="Moving Cost Calculator | Free Instant Moving Estimate | Move Price"
        description="Calculate your moving costs instantly. Free moving estimate tool for local and long-distance moves. Get accurate pricing based on home size, distance, and services. No obligation quote in seconds."
        canonical="/"
        keywords="moving cost calculator, moving estimate, how much does it cost to move, moving quote, moving price estimate, local moving costs, long distance moving prices, moving company calculator, relocation cost estimator, household moving estimate"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-16 flex-1">
        {/* Hero */}
        <section className="relative text-white overflow-hidden" style={{ minHeight: '600px' }}>
          <img
            src="/IMG_7128.JPG"
            alt="Happy family moving into new home"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/75 to-emerald-900/65" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-4xl w-full mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
                <DollarSign className="w-4 h-4" /> Free Moving Cost Estimator
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                How Much Does Moving Cost?
              </h1>
              <p className="text-teal-100 text-lg max-w-2xl mx-auto mb-8">
                Get an instant estimate based on your move size, distance, and service type — no signup required.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-teal-100">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-teal-300" /> Takes 60 seconds</div>
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal-300" /> No spam, ever</div>
                <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-teal-300" /> Real 2026 price data</div>
              </div>
            </div>
          </div>
        </section>
        <MovePriceCalculator />
        <HomeFaq />
      </div>
      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

export default App;
