import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Send, CheckCircle, Shield, Star, Truck, Scale, Users, XCircle, Info, ArrowRight, Lock, ShieldCheck, ClipboardList, FileText, AlertTriangle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { calcDIYTotalFromHomeSize } from '../lib/truckRentalPricing';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
}

export interface InventoryLineItem {
  name: string;
  room: string;
  cubicFeet: number;
  qty: number;
}

interface MoveDetails {
  fromZip: string;
  toZip: string;
  homeSize: string;
  packing: boolean;
  packingBoxes: number;
  storage: boolean;
  assembly: boolean;
  estimatedLow: number;
  estimatedHigh: number;
  distanceMiles: number;
  fromCity: string;
  fromState: string;
  toCity: string;
  toState: string;
  moveDate: Date;
  fromStairs: number;
  toStairs: number;
  isBusyDay: boolean;
  baseLow: number;
  baseHigh: number;
  packingCost: number;
  storageCost: number;
  stairsCost: number;
  peakSurchargeLow: number;
  peakSurchargeHigh: number;
  storageUnitSize: string;
  storageUnitDimensions: string;
  avgDieselPrice?: number;
  // Optional inventory fields
  inventoryItems?: InventoryLineItem[];
  totalCubicFeet?: number;
}

interface LeadCaptureFormProps {
  moveDetails: MoveDetails;
  onSuccess: () => void;
}

interface BreakdownRow {
  label: string;
  detail: string;
  priceLow: number;
  priceHigh: number;
}

type LeadMode = 'quote' | 'email_list' | 'both';

function BreakdownTable({ rows, formatPrice }: { rows: BreakdownRow[]; formatPrice: (n: number) => string }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm">
      <div className="bg-slate-800 px-4 py-3">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Cost Breakdown</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Item</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Detail</th>
            <th className="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-4 py-3 text-slate-800 font-medium">{row.label}</td>
              <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{row.detail}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                {row.priceLow === row.priceHigh
                  ? formatPrice(row.priceLow)
                  : <>{formatPrice(row.priceLow)}<span className="text-slate-400 font-normal mx-1">–</span>{formatPrice(row.priceHigh)}</>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeadCaptureForm({ moveDetails, onSuccess }: LeadCaptureFormProps) {
  const hasInventory = !!(moveDetails.inventoryItems && moveDetails.inventoryItems.length > 0);

  const [mode, setMode] = useState<LeadMode>(hasInventory ? 'both' : 'quote');
  const [form, setForm] = useState<LeadFormData>({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(true);

  const emailOnly = mode === 'email_list';

  const formatPrice = (price: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const formatPhoneNumber = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 3) return n;
    if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone: formatPhoneNumber(e.target.value) });
    setError(null);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 10;

  const isFormValid = form.name.trim().length >= 2 && isValidEmail(form.email)
    && (emailOnly || isValidPhone(form.phone));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const inventoryForDb = hasInventory
        ? moveDetails.inventoryItems!.map(i => ({ name: i.name, room: i.room, qty: i.qty, cubicFeet: i.cubicFeet }))
        : null;

      const { data: insertedLead, error: dbError } = await supabase.from('moving_leads').insert({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: emailOnly ? '' : form.phone,
        from_zip: moveDetails.fromZip,
        to_zip: moveDetails.toZip,
        home_size: moveDetails.homeSize,
        packing: moveDetails.packing,
        storage: moveDetails.storage,
        assembly: moveDetails.assembly,
        estimated_low: moveDetails.estimatedLow,
        estimated_high: moveDetails.estimatedHigh,
        distance_miles: moveDetails.distanceMiles,
        from_city: moveDetails.fromCity,
        from_state: moveDetails.fromState,
        to_city: moveDetails.toCity,
        to_state: moveDetails.toState,
        move_date: moveDetails.moveDate.toISOString().split('T')[0],
        from_stairs: moveDetails.fromStairs,
        to_stairs: moveDetails.toStairs,
        is_busy_day: moveDetails.isBusyDay,
        storage_size: moveDetails.storage ? `${moveDetails.storageUnitSize} (${moveDetails.storageUnitDimensions})` : null,
        inventory_items: inventoryForDb,
        total_cubic_feet: moveDetails.totalCubicFeet ?? null,
        lead_type: mode,
      }).select('id').maybeSingle();

      if (dbError) throw dbError;

      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: emailOnly ? '' : form.phone,
            fromCity: moveDetails.fromCity,
            fromState: moveDetails.fromState,
            fromZip: moveDetails.fromZip,
            toCity: moveDetails.toCity,
            toState: moveDetails.toState,
            toZip: moveDetails.toZip,
            homeSize: moveDetails.homeSize,
            moveDate: moveDetails.moveDate.toISOString().split('T')[0],
            distanceMiles: moveDetails.distanceMiles,
            estimatedLow: moveDetails.estimatedLow,
            estimatedHigh: moveDetails.estimatedHigh,
            packing: moveDetails.packing,
            packingBoxes: moveDetails.packingBoxes,
            storage: moveDetails.storage,
            storageUnitSize: moveDetails.storageUnitSize,
            storageUnitDimensions: moveDetails.storageUnitDimensions,
            assembly: moveDetails.assembly,
            fromStairs: moveDetails.fromStairs,
            toStairs: moveDetails.toStairs,
            isBusyDay: moveDetails.isBusyDay,
            inventoryItems: inventoryForDb,
            totalCubicFeet: moveDetails.totalCubicFeet ?? null,
            leadType: mode,
            leadId: insertedLead?.id ?? null,
          }),
        });
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr);
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Lead submission error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        {/* Keep the form panel visible so the page doesn't shift */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 p-8 sm:p-10 opacity-30 pointer-events-none select-none" aria-hidden="true" />

        {/* Fixed overlay modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-[fadeIn_0.2s_ease-out]">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {mode === 'email_list' ? 'Inventory List Sent!' : 'Request Submitted!'}
            </h2>
            <p className="text-slate-600 mb-3">
              {mode === 'email_list'
                ? 'Your moving inventory list is on its way to your inbox.'
                : mode === 'both'
                ? 'Your inventory list and quote request have been sent.'
                : 'Our top 3 movers will contact you shortly with guaranteed quotes.'}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-2.5 text-left">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-700 text-sm">
                {mode === 'quote'
                  ? "Check your email and phone within 24 hours. If you don't see our email, check your spam or promotions folder."
                  : "Check your inbox — it arrives within a few minutes. If you don't see it, check your spam or promotions folder."}
              </p>
            </div>
            <button
              onClick={() => onSuccess()}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              Done
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-gradient-to-br from-teal-600 to-teal-700 p-8 sm:p-10">

      {/* Price summary — only shown for quote/both modes */}
      {mode !== 'email_list' && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Your Estimated Price</h2>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4">
            <div className="text-center">
              <p className="text-teal-100 text-sm font-medium mb-2">Price Range</p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-4xl sm:text-5xl font-bold text-white">
                  {formatPrice(moveDetails.estimatedLow)}
                </span>
                <span className="text-2xl text-teal-200">—</span>
                <span className="text-4xl sm:text-5xl font-bold text-white">
                  {formatPrice(moveDetails.estimatedHigh)}
                </span>
              </div>
            </div>
          </div>

          {(() => {
            const homeSizeLabel = (() => {
              const hs = (moveDetails.homeSize ?? '').toLowerCase().replace(/\s/g, '');
              if (hs === '1br' || hs === '1bedroom') return '1 Bedroom';
              if (hs === '2br' || hs === '2bedroom') return '2 Bedroom';
              if (hs === '3br' || hs === '3bedroom') return '3 Bedroom';
              if (hs === '4br' || hs === '4+' || hs === '4bedroom') return '4 Bedroom';
              return 'Studio';
            })();
            const distanceTierLabel = moveDetails.distanceMiles <= 50 ? 'Local' : moveDetails.distanceMiles <= 250 ? 'Regional' : moveDetails.distanceMiles <= 500 ? 'Long-distance' : 'Cross-country';
            const rows: BreakdownRow[] = [
              {
                label: 'Base move',
                detail: `${homeSizeLabel} · ${moveDetails.distanceMiles.toLocaleString()} mi · ${distanceTierLabel}${moveDetails.isBusyDay ? ' · Peak date (+30%)' : ''}`,
                priceLow: moveDetails.baseLow,
                priceHigh: moveDetails.baseHigh,
              },
            ];
            if (moveDetails.stairsCost > 0) {
              rows.push({ label: 'Stairs', detail: `${moveDetails.fromStairs + moveDetails.toStairs} flight${moveDetails.fromStairs + moveDetails.toStairs !== 1 ? 's' : ''} × $20`, priceLow: moveDetails.stairsCost, priceHigh: moveDetails.stairsCost });
            }
            if (moveDetails.packing && moveDetails.packingCost > 0) {
              rows.push({ label: 'Packing', detail: `${moveDetails.packingBoxes} boxes`, priceLow: moveDetails.packingCost, priceHigh: moveDetails.packingCost });
            }
            if (moveDetails.storage && moveDetails.storageCost > 0) {
              rows.push({ label: 'Storage', detail: '1 month, sized for your home', priceLow: moveDetails.storageCost, priceHigh: moveDetails.storageCost });
            }
            if (moveDetails.assembly) {
              rows.push({ label: 'Assembly', detail: 'Furniture dis/reassembly', priceLow: 30, priceHigh: 75 });
            }
            return <BreakdownTable rows={rows} formatPrice={formatPrice} />;
          })()}
        </div>
      )}

      {/* Mode chooser — only shown when inventory exists */}
      {hasInventory && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-3">What would you like?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { key: 'quote',      icon: Star,          label: 'Get Free Quotes',     sub: 'Compare top 3 movers' },
              { key: 'email_list', icon: ClipboardList, label: 'Email My Item List',  sub: 'Get your inventory PDF' },
              { key: 'both',       icon: FileText,      label: 'Both',                sub: 'Quotes + list in one' },
            ] as { key: LeadMode; icon: React.ElementType; label: string; sub: string }[]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  mode === opt.key
                    ? 'border-white bg-white/20 text-white'
                    : 'border-white/20 text-teal-100 hover:border-white/40 hover:bg-white/10'
                }`}
              >
                <opt.icon className={`w-4 h-4 shrink-0 ${mode === opt.key ? 'text-white' : 'text-teal-300'}`} />
                <div>
                  <div className={`text-sm font-semibold ${mode === opt.key ? 'text-white' : 'text-teal-100'}`}>{opt.label}</div>
                  <div className="text-xs text-teal-200 mt-0.5">{opt.sub}</div>
                </div>
                {mode === opt.key && (
                  <CheckCircle className="w-4 h-4 text-white ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inventory item summary — shown when email_list or both */}
      {hasInventory && mode !== 'quote' && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-teal-200 shrink-0" />
            <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider">
              Your Moving Inventory ({moveDetails.inventoryItems!.length} items · {moveDetails.totalCubicFeet?.toLocaleString()} ft³)
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {Object.entries(
              moveDetails.inventoryItems!.reduce<Record<string, InventoryLineItem[]>>((acc, item) => {
                if (!acc[item.room]) acc[item.room] = [];
                acc[item.room].push(item);
                return acc;
              }, {})
            ).map(([room, roomItems]) => (
              <div key={room} className="mb-2">
                <div className="text-teal-300 text-xs font-semibold uppercase tracking-wide mb-1">{room}</div>
                {roomItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-teal-100 py-0.5">
                    <span>{item.qty > 1 ? `${item.name} ×${item.qty}` : item.name}</span>
                    <span className="text-teal-300 ml-2 shrink-0">{(item.cubicFeet * item.qty).toFixed(0)} ft³</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            {mode === 'email_list'
              ? 'Get Your Inventory List by Email'
              : mode === 'both'
              ? 'Get Quotes + Your Inventory List'
              : 'Get Guaranteed Quotes from Top 3 Movers'}
          </div>
          <p className="text-slate-600 text-sm">
            {mode === 'email_list'
              ? 'Enter your email and we\'ll send your complete item list instantly.'
              : 'Compare prices and save up to 40% on your move'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" id="name" name="name" value={form.name} onChange={handleChange} placeholder="John Smith"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all duration-200" />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="email" id="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all duration-200" />
            </div>
            {(mode === 'email_list' || mode === 'both') && (
              <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                This email may land in your spam or promotions folder.
              </p>
            )}
          </div>

          {!emailOnly && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="tel" id="phone" name="phone" value={form.phone} onChange={handlePhoneChange} placeholder="(555) 123-4567"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all duration-200" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
              <p className="text-center text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={!isFormValid || isSubmitting}
            className="w-full py-4 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-teal-600/30 hover:shadow-xl hover:shadow-teal-600/40 disabled:shadow-none mt-6">
            {isSubmitting ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
            ) : mode === 'email_list' ? (
              <><ClipboardList className="w-5 h-5" /> Send Me My List</>
            ) : (
              <><Send className="w-5 h-5" /> {mode === 'both' ? 'Get Quotes + Send List' : 'Get My Free Quotes'}</>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-teal-600" /><span>100% Free</span></div>
            <div className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-teal-600" /><span>Licensed Movers</span></div>
            <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-teal-600" /><span>No Obligation</span></div>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-sm">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
                <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center border border-emerald-200">
                <Lock className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Safe Data Certified</div>
              <div className="text-[10px] text-slate-500 mt-0.5">256-bit SSL · Your info stays private</div>
            </div>
          </div>
        </div>
      </div>

      {/* DIY comparison — only for quote/both modes */}
      {mode !== 'email_list' && (() => {
        const [diyLow, diyHigh] = calcDIYTotalFromHomeSize(moveDetails.distanceMiles, moveDetails.homeSize, moveDetails.fromState, moveDetails.toState, moveDetails.avgDieselPrice);
        const savings = { low: moveDetails.estimatedLow - diyHigh, high: moveDetails.estimatedHigh - diyLow };
        const diyIsCheaper = diyHigh < moveDetails.estimatedLow;
        return (
          <div className="mt-4">
            <button onClick={() => setShowComparison(v => !v)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-semibold rounded-xl transition-all text-sm border-2 border-slate-600 shadow-lg shadow-black/30 hover:shadow-xl hover:shadow-black/40">
              <Scale className="w-4 h-4 flex-shrink-0" />
              {showComparison ? 'Hide Comparison' : 'Compare Hiring Movers vs. DIY'}
            </button>

            {showComparison && (
              <div className="mt-3 rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-slate-900/60 px-5 py-4 flex items-center gap-3">
                  <Scale className="w-5 h-5 text-teal-300 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold text-sm">Hiring Movers vs. DIY</h4>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Based on your {moveDetails.distanceMiles.toLocaleString()}-mile move · {moveDetails.homeSize} home
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                  <div className="p-5 bg-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">Hire Professional Movers</div>
                        <div className="text-xs text-slate-300">Your estimate above</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-3">
                      {formatPrice(moveDetails.estimatedLow)} – {formatPrice(moveDetails.estimatedHigh)}
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-200">
                      <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Crew handles loading & unloading</div>
                      <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Less physical effort for you</div>
                      <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Often includes basic liability</div>
                      <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-white/40" /> Higher overall cost</div>
                    </div>
                  </div>

                  <div className="p-5 bg-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">Rent a Truck (DIY)</div>
                        <div className="text-xs text-teal-200">Truck rental + fuel estimate</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-teal-300 mb-3">
                      ${diyLow.toLocaleString()} – ${diyHigh.toLocaleString()}
                    </div>
                    <div className="space-y-1.5 text-xs text-teal-100">
                      <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-400" /> Lower overall cost</div>
                      <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-400" /> Full control of your schedule</div>
                      <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-white/40" /> You do all the heavy lifting</div>
                      <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-white/40" /> Fuel, tolls & driving on you</div>
                    </div>
                  </div>
                </div>

                <div className={`px-5 py-4 flex items-start gap-3 ${diyIsCheaper ? 'bg-emerald-900/40 border-t border-emerald-400/20' : 'bg-slate-900/40 border-t border-white/10'}`}>
                  <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${diyIsCheaper ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <p className={`text-sm ${diyIsCheaper ? 'text-emerald-200' : 'text-slate-300'}`}>
                    {diyIsCheaper
                      ? <>Renting a truck typically saves you <span className="font-semibold">${savings.low.toLocaleString()} – ${savings.high.toLocaleString()}</span> on this move. The trade-off is your time and physical effort.</>
                      : <>For this move, professional movers may be <strong className="text-white">competitively priced</strong> once you factor in truck rental, fuel, and the physical work involved.</>
                    }
                  </p>
                </div>

                <div className="px-5 py-4 bg-slate-900/30 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <p className="text-xs text-slate-400 flex-1">
                    Truck estimate includes rental + fuel. Tolls, moving supplies, and your time are not included.
                  </p>
                  <Link
                    to={`/rent-a-truck?from=${moveDetails.fromZip}&to=${moveDetails.toZip}`}
                    onClick={() => window.scrollTo(0, 0)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
                  >
                    Get Truck Pricing
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
