import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Leaf, Truck, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';

interface BinCompany {
  slug: string;
  name: string;
  url: string;
  description: string;
  features: string[];
}

const binCompanies: BinCompany[] = [
  {
    slug: 'bin-it',
    name: 'Bin-It',
    url: 'https://bin-it.com',
    description: 'Delivers reusable plastic bins with pickup after your move. Ideal for full apartment moves.',
    features: ['Free delivery', 'Pickup included', 'Multiple sizes'],
  },
  {
    slug: 'gorilla-bins',
    name: 'Gorilla Bins',
    url: 'https://gorillabins.com',
    description: 'Eco-friendly bins strong enough for heavy items. Weekly rental options available.',
    features: ['Extra durable', 'Weekly rentals', 'Eco-friendly'],
  },
  {
    slug: 'uhaul',
    name: 'U-Haul',
    url: 'https://uhaul.com',
    description: 'Convenient option if renting a truck. Some locations offer reusable moving crates.',
    features: ['Truck combos', 'Wide availability', 'One-stop shop'],
  },
];

export default function BinRentals() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo
        title="Plastic Moving Bin Rentals - Eco-Friendly Moving Supplies"
        description="Rent durable plastic moving bins instead of cardboard boxes. Eco-friendly, stackable, and delivered to your door. Compare bin rental options for your next move."
        canonical="/bin-rentals"
        keywords="moving bin rentals, plastic moving boxes, eco-friendly moving supplies, reusable moving bins, rent moving bins"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />

      <main className="pt-24 pb-16 px-5">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calculator
          </Link>

          <div className="text-center mb-12">
            <div className="mb-6">
              <img
                src="/nephalyn_Photorealistic_moving_scene_of_neatly_stacked_durabl_c9f984d1-44c8-4eb6-a26c-f6a2efe5d085_1.png"
                alt="Plastic moving bins"
                className="max-w-xl w-full object-contain mx-auto"
              />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Plastic Moving Bin Rentals in NYC
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Skip the cardboard. Rent durable, eco-friendly plastic bins for your next move in New York City.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Leaf className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Eco-Friendly</h3>
              <p className="text-slate-600 text-sm">Reusable bins reduce waste and eliminate the need for cardboard boxes.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">More Durable</h3>
              <p className="text-slate-600 text-sm">Stackable and waterproof, plastic bins protect your belongings better.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Convenient</h3>
              <p className="text-slate-600 text-sm">Most companies deliver to your door and pick up after your move.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            NYC Bin Rental Companies
          </h2>

          <div className="space-y-4 mb-12">
            {binCompanies.map((company) => (
              <Link
                key={company.slug}
                to={`/go/${company.slug}`}
                className="block bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-1 group-hover:text-teal-600 transition-colors">
                      {company.name}
                    </h3>
                    <p className="text-teal-600 text-sm mb-3">{company.url}</p>
                    <p className="text-slate-600 mb-4">{company.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {company.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-slate-100 rounded-full group-hover:bg-teal-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:text-teal-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl p-8 text-center border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Are you a plastic moving bin rental company in NYC?
            </h3>
            <p className="text-slate-600 mb-4">
              Get your company listed here and reach thousands of NYC movers.
            </p>
            <a
              href="mailto:admin@move-price.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
            >
              Contact Us to Get Listed
            </a>
          </div>
        </div>
      </main>

      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
