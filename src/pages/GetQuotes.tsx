import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, MapPin, Home, Calendar, Star as Stairs, Package, Warehouse, Wrench, Send, ArrowLeft, AlertTriangle, Phone, Mail, User } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';

interface LeadRow {
  id: string;
  from_city: string;
  from_state: string;
  from_zip: string;
  to_city: string;
  to_state: string;
  to_zip: string;
  home_size: string;
  move_date: string | null;
  distance_miles: number;
  estimated_low: number;
  estimated_high: number;
  packing: boolean;
  storage: boolean;
  assembly: boolean;
  from_stairs: number;
  to_stairs: number;
  is_busy_day: boolean;
  storage_size: string | null;
  inventory_items: { name: string; room: string; qty: number; cubicFeet: number }[] | null;
  total_cubic_feet: number | null;
  lead_type: string;
  created_at: string;
}

const HOME_SIZE_LABELS: Record<string, string> = {
  studio: 'Studio', '1bed': '1 Bedroom', '2bed': '2 Bedrooms',
  '3bed': '3 Bedrooms', '4bed': '4+ Bedrooms', house: 'House (5+ rooms)',
};

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatPhone = (raw: string) => {
  const n = raw.replace(/\D/g, '');
  if (n.length <= 3) return n;
  if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}

function GetQuotes() {
  const [params] = useSearchParams();
  const leadId = params.get('lead');

  const [lead, setLead] = useState<LeadRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) { setNotFound(true); setLoading(false); return; }
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lead?id=${leadId}`, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    })
      .then(r => r.json())
      .then(({ lead, error }) => {
        if (error || !lead) { setNotFound(true); }
        else { setLead(lead); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [leadId]);

  const isValid =
    form.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.phone.replace(/\D/g, '').length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !lead) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone,
          fromCity: lead.from_city,
          fromState: lead.from_state,
          fromZip: lead.from_zip,
          toCity: lead.to_city,
          toState: lead.to_state,
          toZip: lead.to_zip,
          homeSize: lead.home_size,
          moveDate: lead.move_date ?? '',
          distanceMiles: lead.distance_miles,
          estimatedLow: lead.estimated_low,
          estimatedHigh: lead.estimated_high,
          packing: lead.packing,
          packingBoxes: 0,
          storage: lead.storage,
          storageUnitSize: lead.storage_size ?? '',
          storageUnitDimensions: '',
          assembly: lead.assembly,
          fromStairs: lead.from_stairs,
          toStairs: lead.to_stairs,
          isBusyDay: lead.is_busy_day,
          inventoryItems: lead.inventory_items ?? [],
          totalCubicFeet: lead.total_cubic_feet ?? null,
          leadType: 'quote',
          leadId: lead.id,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onAboutClick={() => {}} />
        <div className="flex-1 flex items-center justify-center pt-16">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onAboutClick={() => {}} />
        <div className="flex-1 flex items-center justify-center pt-16 px-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Link not found</h1>
            <p className="text-slate-500 mb-6">This link may have expired or is invalid. Head back to the calculator to get a fresh estimate.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Calculator
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const stairsParts: string[] = [];
  if (lead!.from_stairs > 0) stairsParts.push(`${lead!.from_stairs} floor${lead!.from_stairs !== 1 ? 's' : ''} at pickup`);
  if (lead!.to_stairs > 0) stairsParts.push(`${lead!.to_stairs} floor${lead!.to_stairs !== 1 ? 's' : ''} at drop-off`);

  const additionalServices: string[] = [];
  if (lead!.packing) additionalServices.push(`Packing service${lead!.storage_size ? '' : ''}`);
  if (lead!.storage) additionalServices.push(`Storage unit${lead!.storage_size ? ` — ${lead!.storage_size}` : ''}`);
  if (lead!.assembly) additionalServices.push('Furniture assembly');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Get Free Moving Quotes - Compare Movers & Truck Rentals | Move Price"
        description="Get free, no-obligation moving quotes from vetted movers and truck rental companies. Compare prices side by side and choose the best option for your budget."
        canonical="/get-quotes"
        keywords="free moving quotes, moving company quotes, compare movers, moving estimates, get moving quotes"
      />
      <Header onAboutClick={() => {}} />
      <div className="pt-16 flex-1">
        {/* Hero strip */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-600 px-4 py-10 text-center">
          <p className="text-teal-200 text-sm font-semibold uppercase tracking-wider mb-2">Your inventory is saved</p>
          <h1 className="text-3xl font-bold text-white mb-2">Get Your Free Moving Quotes</h1>
          <p className="text-teal-100 max-w-md mx-auto text-sm">
            We'll match you with the top 3 movers for your route. Just confirm your contact info below — your move details are already loaded.
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

          {/* Move details card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <h2 className="font-semibold text-slate-700 text-sm">Your Move Details</h2>
            </div>
            <div className="px-6 py-2">
              <DetailRow
                label="Moving From"
                value={[lead!.from_city, lead!.from_state].filter(Boolean).join(', ') + (lead!.from_zip ? ` ${lead!.from_zip}` : '')}
              />
              <DetailRow
                label="Moving To"
                value={[lead!.to_city, lead!.to_state].filter(Boolean).join(', ') + (lead!.to_zip ? ` ${lead!.to_zip}` : '')}
              />
              {lead!.distance_miles > 0 && (
                <DetailRow label="Distance" value={`${lead!.distance_miles.toLocaleString()} miles`} />
              )}
              {lead!.home_size && (
                <DetailRow label="Home Size" value={HOME_SIZE_LABELS[lead!.home_size] ?? lead!.home_size} />
              )}
              {lead!.move_date && (
                <DetailRow
                  label="Move Date"
                  value={
                    <span>
                      {formatDate(lead!.move_date)}
                      {lead!.is_busy_day && <span className="ml-1.5 text-red-500 text-xs font-semibold">(Peak day)</span>}
                    </span>
                  }
                />
              )}
              {stairsParts.length > 0 && (
                <DetailRow label="Stairs" value={stairsParts.join(', ')} />
              )}
              {additionalServices.length > 0 && (
                <DetailRow label="Additional Services" value={additionalServices.join(', ')} />
              )}
              {lead!.total_cubic_feet && (
                <DetailRow label="Inventory Volume" value={`${lead!.total_cubic_feet.toLocaleString()} ft³`} />
              )}
            </div>
            {lead!.estimated_low > 0 && (
              <div className="mx-6 mb-4 mt-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-teal-700">Estimated Cost</span>
                <span className="text-lg font-bold text-teal-600">
                  {formatPrice(lead!.estimated_low)} – {formatPrice(lead!.estimated_high)}
                </span>
              </div>
            )}
          </div>

          {/* Contact form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-teal-600" />
              <h2 className="font-semibold text-slate-700 text-sm">Your Contact Info</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                    placeholder="(555) 123-4567"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!isValid || submitting}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-base rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 mt-2"
              >
                {submitting
                  ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Get My Free Quotes</>
                }
              </button>

              <p className="text-center text-xs text-slate-400">
                Free &middot; No obligation &middot; We match you with top 3 movers
              </p>
            </form>
          </div>

          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-600 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to calculator
            </Link>
          </div>
        </div>
      </div>
      <Footer />

      {/* Success modal — shown on top without navigating away */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h2>
            <p className="text-slate-600 mb-4">Top 3 movers will contact you shortly with guaranteed quotes.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-2.5 text-left">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-700 text-sm">
                Check your email and phone within 24 hours. If you don't see our email, check your spam or promotions folder.
              </p>
            </div>
            <button
              onClick={() => setSubmitted(false)}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GetQuotes