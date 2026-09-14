import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Star, Search, MapPin, ExternalLink, Briefcase, Wrench } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import { trackClick } from '../lib/tracking';

interface MovingCompany {
  id: string;
  name: string;
  logo: string;
  googleRating: number;
  googleReviews: number;
  yelpRating: number;
  yelpReviews: number;
  combinedScore: number;
  hourlyRate: number;
  minimumHours: number;
  description: string;
}

const placeholderCompanies: MovingCompany[] = [
  {
    id: '1',
    name: 'Swift Movers',
    logo: '',
    googleRating: 4.8,
    googleReviews: 342,
    yelpRating: 4.5,
    yelpReviews: 128,
    combinedScore: 4.65,
    hourlyRate: 89,
    minimumHours: 2,
    description: 'Professional hourly moving services with experienced crews and fully equipped trucks.',
  },
  {
    id: '2',
    name: 'QuickMove Pros',
    logo: '',
    googleRating: 4.6,
    googleReviews: 521,
    yelpRating: 4.7,
    yelpReviews: 203,
    combinedScore: 4.65,
    hourlyRate: 95,
    minimumHours: 2,
    description: 'Fast and reliable hourly movers specializing in apartment and small home moves.',
  },
  {
    id: '3',
    name: 'Local Labor Heroes',
    logo: '',
    googleRating: 4.4,
    googleReviews: 189,
    yelpRating: 4.3,
    yelpReviews: 87,
    combinedScore: 4.35,
    hourlyRate: 75,
    minimumHours: 3,
    description: 'Budget-friendly hourly movers with strong backs and great attitudes.',
  },
];

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function HourlyMoving() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [searchInitiated, setSearchInitiated] = useState(false);

  const handleSearch = () => {
    if (zipCode.length === 5) {
      setSearchInitiated(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo
        title="Hourly Moving Services - Local Movers by the Hour | Move Price"
        description="Calculate hourly moving costs for local moves. Compare hourly mover rates, estimate how many hours you need, and find affordable local moving services near you."
        canonical="/hourly-moving"
        keywords="hourly moving, local movers, hourly mover rates, moving by the hour, local moving services, hourly moving cost"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calculator
          </Link>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/30">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Hourly Moving Services
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Find top-rated hourly movers in your area. Pay only for the time you need.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter your ZIP code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={zipCode.length !== 5}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Find Movers
              </button>
            </div>
          </div>

          {searchInitiated && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">
                  Available Movers Near {zipCode}
                </h2>
                <span className="text-sm text-slate-500">
                  {placeholderCompanies.length} companies found
                </span>
              </div>

              {placeholderCompanies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-slate-100"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-400 text-xs">Logo</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-800 mb-2">
                            {company.name}
                          </h3>
                          <p className="text-slate-600 text-sm">{company.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-2xl font-bold text-slate-900">
                            ${company.hourlyRate}
                            <span className="text-sm font-normal text-slate-500">/hr</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {company.minimumHours}hr minimum
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#4285F4] rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">G</span>
                          </div>
                          <StarRating rating={company.googleRating} />
                          <span className="text-sm text-slate-600">
                            {company.googleRating} ({company.googleReviews})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#D32323] rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">Y</span>
                          </div>
                          <StarRating rating={company.yelpRating} />
                          <span className="text-sm text-slate-600">
                            {company.yelpRating} ({company.yelpReviews})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">Combined Score:</span>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                            {company.combinedScore.toFixed(1)}
                          </span>
                        </div>
                        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                          Get Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <p className="text-blue-800">
                  More moving companies and real-time reviews coming soon. This page is under development.
                </p>
              </div>
            </div>
          )}

          {!searchInitiated && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Enter Your ZIP Code to Get Started
              </h3>
              <p className="text-slate-500">
                We'll show you top-rated hourly movers in your area with verified reviews from Google and Yelp.
              </p>
            </div>
          )}

          <div className="mt-12 grid sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Craigslist New York</p>
                  <h3 className="text-white font-semibold">Jobs &rsaquo; Transportation</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm mb-5">
                  Browse driver and transportation job listings posted in the New York area on Craigslist.
                </p>
                <a
                  href="https://newyork.craigslist.org/search/trp"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick('craigslist-ny-jobs-transport', 'Craigslist NY Jobs Transport')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  View Listings
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-teal-200 uppercase tracking-wider font-medium">Craigslist New York</p>
                  <h3 className="text-white font-semibold">Services &rsaquo; Labor & Moving</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm mb-5">
                  Find local labor and moving help available for hire in the New York area on Craigslist.
                </p>
                <a
                  href="https://newyork.craigslist.org/search/lbr"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick('craigslist-ny-services-labor', 'Craigslist NY Services Labor')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  View Listings
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
