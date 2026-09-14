import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
                <img src="/image0.png" alt="Move Price" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Move-Price</p>
                <p className="text-slate-500 text-xs leading-tight">Free Moving Cost Calculator USA</p>
              </div>
            </a>
            <p className="text-xs text-slate-500 leading-relaxed">
              Move smarter. Settle in faster. Free estimates for local and long-distance moves across all 50 states.
            </p>
            <p className="text-xs text-slate-600">© 2026 Move Price</p>
          </div>

          {/* Cost Guides */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Cost Guides</p>
            <ul className="flex flex-col gap-2.5">
              {[
                { to: '/moving-cost/map', label: 'Moving Cost Map (All States)' },
                { to: '/long-distance-moving-cost', label: 'Long Distance Moving Cost' },
                { to: '/movers-vs-truck-rental', label: 'Movers vs. Truck Rental' },
                { to: '/moving-cost-by-home-size', label: 'Moving Cost by Home Size' },
                { to: '/cheap-moving-truck-rentals', label: 'Cheap Moving Truck Rentals' },
                { to: '/state-to-state-moving-cost', label: 'State-to-State Moving Cost' },
                { to: '/moving-cost-by-city', label: 'Moving Cost by City' },
              ].map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="text-sm text-slate-400 hover:text-teal-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services & Legal */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Services</p>
            <ul className="flex flex-col gap-2.5 mb-6">
              {[
                { to: '/hourly-moving', label: 'Hourly Moving' },
                { to: '/rent-a-truck', label: 'Rent A Truck' },
                { to: '/bin-rentals', label: 'Plastic Moving Bins' },
                { to: '/blog', label: 'Moving Tips Blog' },
              ].map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="text-sm text-slate-400 hover:text-teal-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Legal</p>
            <ul className="flex flex-col gap-2">
              <li><Link to="/privacy-policy" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-use" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">Terms of Use</Link></li>
              <li><a href="mailto:contact@move-price.com" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-600 text-center leading-relaxed max-w-2xl mx-auto">
            <strong className="text-slate-500">Move Price</strong> is a free moving cost calculator that helps users estimate local and long-distance moving costs in the United States based on home size, distance, and services. All content © 2026 Move-Price.com. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
