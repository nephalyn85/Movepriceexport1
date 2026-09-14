import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { miles: 64,   days: 1, ft10: 166,  ft15: 178,  ft20: 218,  ft26: 261  },
  { miles: 124,  days: 2, ft10: 228,  ft15: 299,  ft20: 374,  ft26: 450  },
  { miles: 254,  days: 2, ft10: 306,  ft15: 370,  ft20: 462,  ft26: 554  },
  { miles: 463,  days: 3, ft10: 612,  ft15: 644,  ft20: 805,  ft26: 966  },
  { miles: 644,  days: 4, ft10: 866,  ft15: 911,  ft20: 1139, ft26: 1367 },
  { miles: 961,  days: 4, ft10: 1133, ft15: 1193, ft20: 1491, ft26: 1789 },
  { miles: 1038, days: 5, ft10: 1453, ft15: 1529, ft20: 1988, ft26: 2599 },
  { miles: 1838, days: 6, ft10: 2074, ft15: 2184, ft20: 2839, ft26: 3712 },
  { miles: 2149, days: 6, ft10: 2302, ft15: 2423, ft20: 3150, ft26: 4119 },
  { miles: 2518, days: 7, ft10: 2547, ft15: 2681, ft20: 3486, ft26: 4558 },
  { miles: 2931, days: 8, ft10: 2824, ft15: 2973, ft20: 3865, ft26: 5054 },
  { miles: 3326, days: 9, ft10: 3088, ft15: 3251, ft20: 4226, ft26: 5526 },
];

const colors = {
  ft10: '#0d9488',
  ft15: '#059669',
  ft20: '#64748b',
  ft26: '#0f766e',
};

const formatDollar = (v: number) => `$${v.toLocaleString()}`;

export default function TruckPricingVisual() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Truck Rental Pricing by Distance</h2>
        <p className="text-sm text-slate-500">How rental cost increases with mileage across all truck sizes — based on real U-Haul pricing data</p>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="miles"
              tickFormatter={(v) => `${v.toLocaleString()} mi`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip formatter={(v: number) => formatDollar(v)} labelFormatter={(l) => `${Number(l).toLocaleString()} miles`} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Line type="monotone" dataKey="ft10" name="10 ft" stroke={colors.ft10} strokeWidth={2.5} dot={{ r: 4 }} animationDuration={1000} />
            <Line type="monotone" dataKey="ft15" name="15 ft" stroke={colors.ft15} strokeWidth={2.5} dot={{ r: 4 }} animationDuration={1100} />
            <Line type="monotone" dataKey="ft20" name="20 ft" stroke={colors.ft20} strokeWidth={2.5} dot={{ r: 4 }} animationDuration={1200} />
            <Line type="monotone" dataKey="ft26" name="26 ft" stroke={colors.ft26} strokeWidth={2.5} dot={{ r: 4 }} animationDuration={1300} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Max Distance Shown</div>
          <div className="text-lg font-bold text-slate-800">3,326 miles</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Price Trend</div>
          <div className="text-lg font-bold text-slate-800">Rises steadily</div>
          <div className="text-xs text-slate-500">with mileage &amp; truck size</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Data Source</div>
          <div className="text-lg font-bold text-slate-800">Real U-Haul data</div>
          <div className="text-xs text-slate-500">sampled pricing points</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Pricing Comparison Table</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Miles</th>
              <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
              <th className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.ft10 }}>10 ft</th>
              <th className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.ft15 }}>15 ft</th>
              <th className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.ft20 }}>20 ft</th>
              <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.ft26 }}>26 ft</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="py-2.5 pr-4 font-medium text-slate-800">{row.miles.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-slate-600">{row.days}</td>
                <td className="py-2.5 pr-4 text-slate-700">${row.ft10.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-slate-700">${row.ft15.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-slate-700">${row.ft20.toLocaleString()}</td>
                <td className="py-2.5 text-slate-700">${row.ft26.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
