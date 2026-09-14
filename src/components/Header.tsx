import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, Users, Package, BookOpen, Truck, Calculator, MapPin, Building } from 'lucide-react';

interface HeaderProps {
  onAboutClick: () => void;
}

export default function Header({ onAboutClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAboutClick = () => {
    onAboutClick();
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  const handleClose = () => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
      <div className="hidden md:block absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400"></div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <img src="/image0.png" alt="Move Price" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-xl font-bold text-slate-900">Move Price</span>
          </a>

          <nav className="hidden md:flex items-center gap-2">
            {/* More Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors rounded-lg hover:bg-slate-100"
              >
                More
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link
                    to="/free-moving-calculator-no-sign-up"
                    onClick={handleClose}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium">Moving Calculator</p>
                      <p className="text-xs text-slate-500">Free estimate, no sign up</p>
                    </div>
                  </Link>
                  <Link
                    to="/moving-cost/map"
                    onClick={handleClose}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium">Cost by State</p>
                      <p className="text-xs text-slate-500">Interactive USA map</p>
                    </div>
                  </Link>
                  <button
                    onClick={handleAboutClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium">About Us</p>
                      <p className="text-xs text-slate-500">Who we are</p>
                    </div>
                  </button>
                  <Link
                    to="/rent-a-truck"
                    onClick={handleClose}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">Rent A Truck</p>
                      <p className="text-xs text-slate-500">Compare truck rentals</p>
                    </div>
                  </Link>
                  <Link
                    to="/bin-rentals"
                    onClick={handleClose}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">Plastic Bins</p>
                      <p className="text-xs text-slate-500">Rent moving bins</p>
                    </div>
                  </Link>
                  <Link
                    to="/blog"
                    onClick={handleClose}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Blog</p>
                      <p className="text-xs text-slate-500">Moving tips & guides</p>
                    </div>
                  </Link>
                  <Link
                    to="/apartment-check-nyc"
                    onClick={handleClose}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Apartment Check NYC</p>
                      <p className="text-xs text-slate-500">Research before you rent</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-4 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="">
              <p className="px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Services & More</p>
              <Link to="/free-moving-calculator-no-sign-up" onClick={handleClose} className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-teal-600" />
                </div>
                <span className="font-medium">Moving Calculator</span>
              </Link>
              <Link to="/moving-cost/map" onClick={handleClose} className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-teal-600" />
                </div>
                <span className="font-medium">Cost by State</span>
              </Link>
              <Link to="/rent-a-truck" onClick={handleClose} className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium">Rent A Truck</span>
              </Link>
              <Link to="/bin-rentals" onClick={handleClose} className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="font-medium">Plastic Bins</span>
              </Link>
              <Link to="/blog" onClick={handleClose} className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium">Blog</span>
              </Link>
              <Link to="/apartment-check-nyc" onClick={handleClose} className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-medium">Apartment Check NYC</span>
              </Link>
              <button
                onClick={handleAboutClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-medium">About Us</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
