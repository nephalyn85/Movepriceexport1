import { useState } from "react";
import { Truck as TruckIcon, MapPin as MapPinIcon, Calendar as CalendarIcon, ArrowRight as ArrowRightIcon, Loader as LoaderIcon } from "lucide-react";

type TruckSize = "12ft" | "16ft" | "22ft" | "26ft";

interface CalculatorResult {
  estimated_price: number;
  range: { low: number; high: number };
  rental_base: number;
  fuel_estimate: { low: number; high: number };
  miles: number;
  distance_source: string;
  rental_days: number;
  truck_size: string;
  season: string;
  distance_band: string;
  corridor: string;
  from: { zip: string; city: string; state: string };
  to: { zip: string; city: string; state: string };
}

const truckOptions: { value: TruckSize; label: string; rooms: string }[] = [
  { value: "12ft", label: "12 ft", rooms: "Studio – 1 BR" },
  { value: "16ft", label: "16 ft", rooms: "1–2 BR" },
  { value: "22ft", label: "22 ft", rooms: "2–3 BR" },
  { value: "26ft", label: "26 ft", rooms: "3–4 BR" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function Calculator() {
  const [originZip, setOriginZip] = useState("");
  const [destZip, setDestZip] = useState("");
  const [days, setDays] = useState(3);
  const [truckSize, setTruckSize] = useState<TruckSize>("16ft");
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          origin_zip: originZip.trim(),
          destination_zip: destZip.trim(),
          days,
          truck_size: truckSize,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <TruckIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Truck Rental Estimator</h1>
          <p className="text-slate-500 mt-2">Get an instant price estimate for your move</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                    Origin ZIP Code
                  </span>
                </label>
                <input
                  type="text"
                  value={originZip}
                  onChange={e => setOriginZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="e.g. 11385"
                  maxLength={5}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                    Destination ZIP Code
                  </span>
                </label>
                <input
                  type="text"
                  value={destZip}
                  onChange={e => setDestZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="e.g. 60601"
                  maxLength={5}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <TruckIcon className="w-3.5 h-3.5 text-slate-400" />
                  Truck Size
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {truckOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTruckSize(opt.value)}
                    className={`py-2.5 px-3 rounded-xl border text-center transition ${
                      truckSize === opt.value
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{opt.rooms}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  Rental Days
                  <span className="ml-auto text-blue-600 font-semibold">{days} {days === 1 ? "day" : "days"}</span>
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={14}
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1 day</span>
                <span>14 days</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || originZip.length < 5 || destZip.length < 5}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  Calculate Price
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {result && (
            <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Estimated Total</div>
                  <div className="text-4xl font-bold text-slate-900">{fmt(result.estimated_price)}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Range: {fmt(result.range.low)} – {fmt(result.range.high)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500">
                    {result.from.city}, {result.from.state}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs my-0.5 justify-end">
                    <ArrowRightIcon className="w-3 h-3" />
                  </div>
                  <div className="text-sm text-slate-500">
                    {result.to.city}, {result.to.state}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Distance", value: `${result.miles.toLocaleString()} mi` },
                  { label: "Rental Base", value: fmt(result.rental_base) },
                  { label: "Fuel Estimate", value: `${fmt(result.fuel_estimate.low)} – ${fmt(result.fuel_estimate.high)}` },
                  { label: "Rental Days", value: `${result.rental_days} ${result.rental_days === 1 ? "day" : "days"}` },
                  { label: "Truck", value: result.truck_size },
                  { label: "Season", value: result.season.charAt(0).toUpperCase() + result.season.slice(1) },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-3.5 py-3">
                    <div className="text-xs text-slate-500 mb-0.5">{item.label}</div>
                    <div className="text-sm font-semibold text-slate-800">{item.value}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 text-center">
                Estimate includes rental + fuel. Taxes, tolls, and add-ons not included.
                {result.distance_source === "estimated" && " Distance is approximated."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
