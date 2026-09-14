import { useEffect } from 'react';
import { X, Shield, Eye, Heart } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Who We Are</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 leading-relaxed">
              We're a team built on over <span className="font-semibold text-slate-900">20 years of real experience</span> in the moving industry.
            </p>

            <p className="text-slate-600 leading-relaxed mt-4">
              After decades of seeing how pricing works behind the scenes, one thing became clear — most people don't actually know what their move should cost. Estimates are often inconsistent, unclear, and sometimes inflated, leaving customers guessing and overpaying.
            </p>

            <p className="text-slate-600 leading-relaxed mt-4">
              <span className="font-semibold text-teal-600">That's why we created Move Price.</span>
            </p>

            <div className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Our Mission</h3>
              <p className="text-slate-600 leading-relaxed">
                Bring transparency and fairness to moving costs. We're building a tool that gives realistic, data-driven estimates so you can understand your move before speaking to any company.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-teal-50 rounded-xl text-center">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-teal-600" />
                </div>
                <p className="font-medium text-slate-900">No Pressure</p>
                <p className="text-sm text-slate-500 mt-1">No sales tactics</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Eye className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-medium text-slate-900">Transparent</p>
                <p className="text-sm text-slate-500 mt-1">Clear pricing</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-xl text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-cyan-600" />
                </div>
                <p className="font-medium text-slate-900">For You</p>
                <p className="text-sm text-slate-500 mt-1">Built with care</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mt-8">
              We believe everyone deserves to know what they should be paying — and to feel confident about it.
            </p>

            <p className="text-slate-500 italic mt-6 text-center">
              This is just the beginning, and we're building it with real people in mind.
            </p>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-teal-200">
                <img src="/Move-Price_CEO.jpg" alt="Bojan Mladenovic" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Bojan Mladenovic</p>
                <p className="text-sm text-teal-600 font-medium">Chief Executive Officer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
