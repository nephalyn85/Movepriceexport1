import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, CheckCircle, Shield, ShieldAlert, Building, MapPin, Bug, FileText,
  AlertTriangle, TrendingDown,
  Home, Truck, DollarSign, Zap, Users, ArrowRight,
  Clock, Loader2,
} from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import { supabase } from '../lib/supabase';

const BRAND = '#5EBB47';
const BRAND_LIGHT = '#edfbe8';

// ─── types ────────────────────────────────────────────────────────────────────

interface ReportData {
  geo: {
    displayAddress: string;
    houseNumber: string;
    streetName: string;
    borough: string;
    zip: string;
    neighborhood: string;
    lat: number;
    lng: number;
    bbl: string | null;
  };
  scores: {
    buildingScore: number;
    complaintScore: number;
    permitScore: number;
    transitScore: number;
  };
  hpd: {
    total: number;
    open: number;
    classA: number;
    classB: number;
    classC: number;
    openClassA: number;
    openClassB: number;
    openClassC: number;
    recent: Array<{
      class: string;
      description: string;
      date: string;
      status: string;
      ordernumber: string;
      apartment: string;
    }>;
  };
  complaints311: {
    total: number;
    topCategories: Array<{ type: string; count: number }>;
    recent: Array<{ type: string; descriptor: string; date: string; status: string }>;
  };
  bedBugs: {
    total: number;
    infestationYears: string[];
  };
  dob: {
    violations: number;
    openViolations: number;
    activePermits: Array<{ type: string; description: string; status: string; date: string }>;
  };
  building: {
    yearBuilt: string | null;
    units: string | null;
    floors: string | null;
    buildingClass: string | null;
    ownerName: string | null;
    landUse: string | null;
    assessedValue: string | null;
    floodZone: string | null;
    hasElevator: boolean | null;
  };
  transit: {
    nearbyStations: Array<{ name: string; lines: string; distanceFt: number }>;
    entranceCount: number;
  };
  evictions: {
    total: number;
    residential: number;
    years: string[];
    recent: Array<{ date: string; type: string; docket: string; marshal: string }>;
  };
  crimes: {
    total: number;
    felonies: number;
    misdemeanors: number;
    violations: number;
    topOffenses: Array<{ type: string; count: number }>;
    recent: Array<{ offense: string; detail: string; severity: string; date: string }>;
    radiusMeters: number;
  };
  totalOpenViolations: number;
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'How do I check an apartment before renting in NYC?',
    a: "Use Apartment Check NYC to research any building's violation history, 311 complaints, bed bug reports, permits, and landlord records — all from official NYC public data sources in one free report.",
  },
  {
    q: 'How can I see building violations in NYC?',
    a: 'NYC Housing Preservation & Development (HPD) and the Department of Buildings (DOB) maintain public records of all housing and building violations. Apartment Check NYC aggregates these records so you can see open violations, past violations, and their severity for any address.',
  },
  {
    q: 'How do I check landlord complaints in NYC?',
    a: "NYC 311 records all complaints made against a building or landlord, including heat outages, pest infestations, noise, and maintenance failures. Apartment Check NYC pulls the complaint history for any address so you can spot patterns before signing your lease.",
  },
  {
    q: 'How can I check bed bug history for an NYC apartment?',
    a: 'New York City landlords are required to disclose bed bug infestation history. NYC HPD maintains a Bed Bug Disclosure database. Our report includes bed bug history going back multiple years for the building.',
  },
  {
    q: 'How accurate is the apartment report?',
    a: 'All data is sourced directly from official NYC government databases including HPD, DOB, and 311. Records are updated regularly. While we strive for accuracy, always verify critical findings directly with the relevant city agency.',
  },
  {
    q: 'Is Apartment Check NYC free?',
    a: 'Yes. Basic apartment reports are completely free. We believe every NYC renter deserves access to public building data before signing a lease.',
  },
  {
    q: 'What public records are included in the report?',
    a: 'The report includes: NYC HPD housing violations, NYC DOB building violations and permits, 311 complaint history, property ownership records, bed bug disclosure data, building age and unit count, flood zone data, and nearby transit information.',
  },
  {
    q: 'Can I calculate moving costs after checking an apartment?',
    a: 'Yes! After reviewing your building report, Move-Price can estimate your total moving costs including any building-specific surcharges like elevator fees, COI requirements, and difficult street access. Use our moving cost calculator for an instant estimate.',
  },
];

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://move-price.com/apartment-check-nyc',
      url: 'https://move-price.com/apartment-check-nyc',
      name: 'Apartment Check NYC | Building Violations, Complaints & Landlord Report',
      description:
        'Research any NYC apartment before signing a lease. Check building violations, complaints, bed bug history, permits, landlord records, and moving considerations in one report.',
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://move-price.com' },
          { '@type': 'ListItem', position: 2, name: 'Apartment Check NYC', item: 'https://move-price.com/apartment-check-nyc' },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Apartment Check NYC',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: 'Free NYC apartment research tool. Check violations, complaints, bed bugs, and moving costs before signing a lease.',
    },
  ],
};

// ─── crime meter ──────────────────────────────────────────────────────────────

function calcCrimeScore(felonies: number, misdemeanors: number, violations: number): number {
  // Calibrated for NYC 200m radius / 12 months:
  //   ~5 felonies + 20 misdemeanors (typical block) ≈ score 40 (Low)
  //   ~10 felonies + 40 misdemeanors (busy area)    ≈ score 65 (Moderate–High)
  //   ~18+ felonies + 70+ misdemeanors              ≈ score 100 (Very High)
  const weighted = felonies * 3 + misdemeanors * 1 + violations * 0.1;
  return Math.min(Math.round((weighted / 110) * 100), 100);
}

function crimeLevel(score: number): { label: string; color: string; bg: string; border: string } {
  if (score <= 20) return { label: 'Very Low',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  if (score <= 45) return { label: 'Low',        color: '#65a30d', bg: '#f7fee7', border: '#d9f99d' };
  if (score <= 65) return { label: 'Moderate',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  if (score <= 80) return { label: 'High',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  return                    { label: 'Very High', color: '#991b1b', bg: '#fef2f2', border: '#fca5a5' };
}

function CrimeMeter({ score }: { score: number }) {
  const W = 260, H = 150, cx = 130, cy = 140, R = 110, stroke = 18;
  const START_ANGLE = 210, END_ANGLE = 330; // degrees, 0=right
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arcSpan = (360 - START_ANGLE + END_ANGLE); // 120deg arc from 210→330 (going clockwise through 270)
  // Actually: arc from -150° to -30° (i.e. sweeping 120° bottom arc, left→right)
  // We want a 240° arc (open at the top): from 150° to 30° going clockwise = 240° sweep
  const startDeg = 150; // left side
  const endDeg   = 30;  // right side
  const totalSweep = 240; // clockwise

  const arcPoint = (deg: number) => ({
    x: cx + R * Math.cos(toRad(deg)),
    y: cy + R * Math.sin(toRad(deg)),
  });

  // Arc path helper (always clockwise, large-arc if sweep > 180)
  const arcPath = (from: number, sweep: number, r: number) => {
    const s = arcPoint(from);
    const eDeg = from + sweep; // clockwise
    const eX = cx + r * Math.cos(toRad(eDeg));
    const eY = cy + r * Math.sin(toRad(eDeg));
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${eX} ${eY}`;
  };

  // Color stops across the 240° sweep
  const zones = [
    { from: 0,   to: 0.20, color: '#16a34a' }, // very low
    { from: 0.20, to: 0.45, color: '#65a30d' }, // low
    { from: 0.45, to: 0.65, color: '#f59e0b' }, // moderate
    { from: 0.65, to: 0.80, color: '#dc2626' }, // high
    { from: 0.80, to: 1.00, color: '#991b1b' }, // very high
  ];

  // Needle angle
  const needleDeg = startDeg + (score / 100) * totalSweep;
  const needleTip = { x: cx + (R - stroke / 2 - 4) * Math.cos(toRad(needleDeg)), y: cy + (R - stroke / 2 - 4) * Math.sin(toRad(needleDeg)) };
  const needleBase = { x: cx + 14 * Math.cos(toRad(needleDeg + 180)), y: cy + 14 * Math.sin(toRad(needleDeg + 180)) };
  const needleL = { x: cx + 6 * Math.cos(toRad(needleDeg + 90)), y: cy + 6 * Math.sin(toRad(needleDeg + 90)) };
  const needleR = { x: cx + 6 * Math.cos(toRad(needleDeg - 90)), y: cy + 6 * Math.sin(toRad(needleDeg - 90)) };

  const level = crimeLevel(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Track (grey bg arc) */}
        <path
          d={arcPath(startDeg, totalSweep, R)}
          fill="none" stroke="#e2e8f0" strokeWidth={stroke} strokeLinecap="round"
        />
        {/* Colored zone arcs */}
        {zones.map(({ from, to, color }) => {
          const fDeg = startDeg + from * totalSweep;
          const sweep = (to - from) * totalSweep;
          return (
            <path
              key={color + from}
              d={arcPath(fDeg, sweep, R)}
              fill="none" stroke={color} strokeWidth={stroke - 2} strokeLinecap="butt"
              opacity={0.35}
            />
          );
        })}
        {/* Filled progress arc up to score */}
        <path
          d={arcPath(startDeg, (score / 100) * totalSweep, R)}
          fill="none" stroke={level.color} strokeWidth={stroke - 2} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${level.color}60)` }}
        />
        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleL.x},${needleL.y} ${needleBase.x},${needleBase.y} ${needleR.x},${needleR.y}`}
          fill={level.color}
          style={{ filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.25))` }}
        />
        <circle cx={cx} cy={cy} r={7} fill={level.color} />
        <circle cx={cx} cy={cy} r={3.5} fill="white" />
        {/* Zone labels */}
        {[
          { label: 'Low',  deg: startDeg + 0.10 * totalSweep },
          { label: 'Med',  deg: startDeg + 0.55 * totalSweep },
          { label: 'High', deg: startDeg + 0.90 * totalSweep },
        ].map(({ label, deg }) => {
          const rLabel = R + stroke + 10;
          return (
            <text
              key={label}
              x={cx + rLabel * Math.cos(toRad(deg))}
              y={cy + rLabel * Math.sin(toRad(deg))}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="#94a3b8" fontWeight="600" fontFamily="system-ui"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Label below gauge */}
      <div className="flex flex-col items-center -mt-4">
        <span className="text-3xl font-extrabold tracking-tight" style={{ color: level.color }}>{score}</span>
        <span className="text-xs text-slate-400 mt-0.5">out of 100</span>
        <span
          className="mt-2 px-3 py-1 rounded-full text-sm font-bold"
          style={{ backgroundColor: level.bg, color: level.color, border: `1px solid ${level.border}` }}
        >
          {level.label} Crime Area
        </span>
      </div>
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

// DOB permit job-type codes → plain-English labels
const DOB_PERMIT_TYPES: Record<string, string> = {
  'NB':  'New Building Construction',
  'DM':  'Demolition',
  'A1':  'Major Alteration (structural change)',
  'A2':  'Minor Alteration (interior/mechanical)',
  'A3':  'Minor Alteration (pre-filing)',
  'BL':  'Boiler Installation / Repair',
  'EQ':  'Construction Equipment (crane, scaffold)',
  'FO':  'Foundation & Earthwork',
  'FP':  'Fire Suppression System',
  'MH':  'Mechanical / HVAC',
  'PL':  'Plumbing',
  'SD':  'Standpipe (fire water system)',
  'SG':  'Sign',
  'EL':  'Electrical',
  'SB':  'Soil Boring',
  'CC':  'Curb Cut',
  'LA':  'Landscape',
};

// Official MTA NYC subway line colors
const SUBWAY_COLORS: Record<string, string> = {
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
  '4': '#00933C', '5': '#00933C', '6': '#00933C',
  'A': '#2850AD', 'C': '#2850AD', 'E': '#2850AD',
  'B': '#FF6319', 'D': '#FF6319', 'F': '#FF6319', 'M': '#FF6319',
  'N': '#FCCC0A', 'Q': '#FCCC0A', 'R': '#FCCC0A', 'W': '#FCCC0A',
  '7': '#B933AD',
  'G': '#6CBE45',
  'J': '#996633', 'Z': '#996633',
  'L': '#A7A9AC',
  'S': '#808183',
  'SIR': '#002D87',
};

function SubwayBadge({ line }: { line: string }) {
  const bg = SUBWAY_COLORS[line.toUpperCase()] ?? '#808183';
  const textColor = line === 'N' || line === 'Q' || line === 'R' || line === 'W' ? '#000' : '#fff';
  return (
    <span
      style={{ backgroundColor: bg, color: textColor, minWidth: 22 }}
      className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-bold leading-none"
    >
      {line}
    </span>
  );
}

function ScoreBadge({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} strokeWidth="8" stroke="#e5e7eb" fill="none" />
          <circle
            cx="48" cy="48" r={radius} strokeWidth="8" fill="none"
            stroke={color} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{score}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-600 text-center">{label}</span>
    </div>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function FeatureCard({ icon, title, description, source, color, iconBg }: {
  icon: React.ReactNode; title: string; description: string; source?: string; color: string; iconBg?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 overflow-hidden" style={{ backgroundColor: iconBg ?? (color + '12') }}>
        <div className="w-full h-full flex items-center justify-center p-1" style={{ color }}>{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed mb-3">{description}</p>
      {source && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <DatabaseIcon className="w-3 h-3" />
          <span>Data: {source}</span>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, yes }: { label: string; yes?: boolean }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3.5 px-4 text-sm font-medium text-slate-700">{label}</td>
      <td className="py-3.5 px-4 text-center">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ backgroundColor: BRAND_LIGHT }}>
          <CheckCircle className="w-4 h-4" style={{ color: BRAND }} />
        </span>
      </td>
      <td className="py-3.5 px-4 text-center">
        {yes ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50">
            <Clock className="w-4 h-4 text-amber-500" />
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50">
            <span className="text-red-400 text-lg leading-none">×</span>
          </span>
        )}
      </td>
    </tr>
  );
}

function violationClassColor(cls: string) {
  if (cls === 'C') return '#dc2626';
  if (cls === 'B') return '#ef4444';
  return '#f59e0b';
}

function scoreColor(score: number) {
  if (score >= 75) return BRAND;
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

function riskLabel(buildingScore: number) {
  if (buildingScore >= 75) return { label: 'Low Risk', color: BRAND };
  if (buildingScore >= 50) return { label: 'Moderate Risk', color: '#f59e0b' };
  return { label: 'High Risk', color: '#ef4444' };
}

function formatDate(iso: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso.slice(0, 10); }
}

// ─── map tile background ──────────────────────────────────────────────────────
// Renders 3×1 OSM tiles stitched into a seamless map background — no key needed.

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function MapTileBg({ lat, lng }: { lat: number; lng: number }) {
  const [loaded, setLoaded] = useState(0);
  const googleKey = (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) ?? '';

  if (!lat || !lng) return null;

  // Prefer Google Street View if key is configured
  if (googleKey) {
    const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=900x320&location=${lat},${lng}&fov=80&pitch=5&key=${googleKey}`;
    return (
      <img
        src={svUrl}
        alt="" aria-hidden="true"
        onLoad={() => setLoaded(1)}
        onError={() => setLoaded(-1)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: loaded === 1 ? 1 : 0, transition: 'opacity 0.6s ease' }}
      />
    );
  }

  // Free fallback: stitch 3 OSM tiles side-by-side at zoom 17
  const zoom = 17;
  const { x, y } = latLngToTile(lat, lng, zoom);
  const tiles = [x - 1, x, x + 1].map(tx => ({
    tx,
    url: `https://tile.openstreetmap.org/${zoom}/${tx}/${y}.png`,
  }));
  const TILE = 256;
  const W = TILE * 3;
  const H = TILE;

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: loaded >= tiles.length ? 1 : 0, transition: 'opacity 0.6s ease' }}
    >
      {tiles.map(({ tx, url }, i) => (
        <image
          key={tx}
          href={url}
          x={i * TILE} y={0}
          width={TILE} height={TILE}
          onLoad={() => setLoaded(c => c + 1)}
        />
      ))}
    </svg>
  );
}

// ─── live report component ────────────────────────────────────────────────────

function LiveReport({ data, onReset }: { data: ReportData; onReset: () => void }) {
  const { scores, hpd, complaints311, bedBugs, dob, building, geo, transit, evictions, crimes } = data;
  const risk = riskLabel(scores.buildingScore);
  const totalMaxViolations = Math.max(hpd.classA + hpd.classB + hpd.classC, 1);
  const dobMaxViolations = Math.max(dob.violations, 1);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Report header */}
      <div className="relative overflow-hidden px-6 py-6 sm:py-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: '#0d1f0f', minHeight: 140 }}>
        {/* Map background (OSM tiles free, Google Street View if key set) */}
        <MapTileBg lat={geo.lat} lng={geo.lng} />
        {/* Overlay matching hero — image tinted + gradient fade */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,31,15,0.30) 0%, rgba(13,31,15,0.55) 60%, rgba(13,31,15,0.80) 100%)' }} />
        <div className="relative z-10">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1">Live Apartment Report</p>
          <p className="text-white font-bold text-lg">{geo.displayAddress}</p>
          <p className="text-white/60 text-sm mt-0.5">
            {[geo.neighborhood, geo.borough].filter(Boolean).join(' · ')} · Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ backgroundColor: risk.color + '25', color: risk.color, border: `1px solid ${risk.color}40` }}>
            <Shield className="w-4 h-4" />
            {risk.label}
          </div>
          <button onClick={onReset} className="text-white/50 hover:text-white text-xs underline underline-offset-2 transition-colors">
            New Search
          </button>
        </div>
      </div>

      {/* Score overview */}
      <div className="px-6 py-8 border-b border-slate-100">
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          <ScoreBadge score={scores.buildingScore} label="Building Score" color={scoreColor(scores.buildingScore)} />
          <ScoreBadge score={scores.transitScore} label="Transit Score" color={scoreColor(scores.transitScore)} />
          <ScoreBadge score={scores.complaintScore} label="Complaint Score" color={scoreColor(scores.complaintScore)} />
          <ScoreBadge score={scores.permitScore} label="Permit Score" color={scoreColor(scores.permitScore)} />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-y divide-slate-100 border-b border-slate-100">
        {[
          { label: 'Open Violations', value: String(data.totalOpenViolations), color: data.totalOpenViolations > 5 ? '#ef4444' : data.totalOpenViolations > 0 ? '#f59e0b' : BRAND, img: '/files_9503471-2026-06-19T23-54-36-285Z-NYC_icon_openViolations.jpg' },
          { label: '311 Complaints', value: String(complaints311.total), color: complaints311.total > 10 ? '#ef4444' : complaints311.total > 3 ? '#f59e0b' : BRAND, img: '/files_9503471-2026-06-19T23-54-36-146Z-NYC_icon_311Compaints.jpg' },
          { label: 'Bed Bug Reports', value: String(bedBugs.total), color: bedBugs.total > 0 ? '#ef4444' : BRAND, img: '/files_9503471-2026-06-19T23-54-36-110Z-NYC_icon_bedBugReports.jpg' },
          { label: 'Active Permits', value: dob.activePermits.length === 0 ? 'None' : [...new Set(dob.activePermits.map(p => p.type))].slice(0, 3).join(', '), color: dob.activePermits.length > 3 ? '#f59e0b' : BRAND, img: '/files_9503471-2026-06-22T23-36-17-067Z-files_9503471-2026-06-22T23-02-07-657Z-NYC_icon_ActivePermits.png' },
          { label: 'Year Built', value: building.yearBuilt ?? '—', color: '#4a7c59', img: '/files_9503471-2026-06-22T23-36-53-342Z-files_9503471-2026-06-22T23-02-08-117Z-NYC_icon_YearBuilt.png' },
          { label: 'Residential Units', value: building.units ?? '—', color: BRAND, img: '/files_9503471-2026-06-22T23-37-00-068Z-files_9503471-2026-06-22T23-02-04-382Z-NYC_icon_ResidentalUnits.png' },
        ].map(({ label, value, color, img }) => (
          <div key={label} className="px-4 py-6 flex flex-col items-center text-center">
            <img src={img} alt={label} className="w-14 h-14 object-contain mb-3" />
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* All sections on one page */}
      <div className="divide-y divide-slate-100">

        {/* HPD Violations */}
        <div className="p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> HPD Violations
          </h3>
          <div className="space-y-3">
            {[
              { type: 'Class C — Immediately Hazardous', open: hpd.openClassC, total: hpd.classC, color: '#dc2626' },
              { type: 'Class B — Hazardous', open: hpd.openClassB, total: hpd.classB, color: '#ef4444' },
              { type: 'Class A — Non-Hazardous', open: hpd.openClassA, total: hpd.classA, color: '#f59e0b' },
              { type: 'DOB Violations', open: dob.openViolations, total: dob.violations, color: '#8b5cf6' },
            ].map(({ type, open, total, color }) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-56 shrink-0">{type}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${(total / Math.max(totalMaxViolations, dobMaxViolations)) * 100}%`,
                    backgroundColor: color,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
                <span className="text-xs text-slate-500 w-20 text-right shrink-0">
                  {open > 0 ? <span className="font-semibold" style={{ color }}>{open} open</span> : null}
                  {open > 0 && total > open ? ' / ' : null}
                  <span className="text-slate-400">{total} total</span>
                </span>
              </div>
            ))}
          </div>
          {hpd.recent.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent HPD Violations</p>
              <div className="space-y-2">
                {hpd.recent.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: violationClassColor(v.class) }}>
                      {v.class}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium leading-snug">{v.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        {v.date && <span className="text-xs text-slate-400">{formatDate(v.date)}</span>}
                        {v.apartment && <span className="text-xs text-slate-400">Apt {v.apartment}</span>}
                        <span className={`text-xs font-medium ${v.status.toUpperCase().includes('OPEN') ? 'text-red-500' : 'text-slate-400'}`}>
                          {v.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-4 text-slate-400 text-sm">No HPD violation records found for this address.</p>
          )}
        </div>

        {/* 311 Complaints */}
        <div className="p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" /> 311 Complaints
          </h3>
          {complaints311.topCategories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Complaint Categories (Last 2 Years)</p>
              <div className="space-y-2">
                {complaints311.topCategories.map(({ type, count }) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 flex-1 truncate">{type}</span>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400"
                        style={{ width: `${(count / complaints311.topCategories[0].count) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {complaints311.recent.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent 311 Complaints</p>
              <div className="space-y-2">
                {complaints311.recent.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{c.type}</p>
                      {c.descriptor && <p className="text-xs text-slate-500 mt-0.5">{c.descriptor}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        {c.date && <span className="text-xs text-slate-400">{formatDate(c.date)}</span>}
                        <span className={`text-xs font-medium ${c.status.toUpperCase().includes('OPEN') ? 'text-amber-500' : 'text-slate-400'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-4 text-slate-400 text-sm">No 311 complaints found in the last 2 years.</p>
          )}
          {bedBugs.infestationYears.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <Bug className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Bed Bug History Reported</p>
                  <p className="text-xs text-red-600 mt-1">
                    Infestations recorded in: {bedBugs.infestationYears.join(', ')}. NYC law requires landlords to disclose this history.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DOB & Permits */}
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Building className="w-4 h-4 text-purple-500" /> Building Violations & Construction Permits
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The NYC Department of Buildings (DOB) enforces structural and safety codes — things like illegal construction, unsafe conditions, and missing certificates of occupancy. These are separate from HPD housing violations above. Active permits indicate ongoing construction work in the building.
            </p>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 border text-center ${dob.openViolations > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-3xl font-bold ${dob.openViolations > 0 ? 'text-red-600' : 'text-slate-900'}`}>{dob.openViolations}</p>
              <p className="text-xs font-semibold text-slate-600 mt-1">Open Violations</p>
              <p className="text-xs text-slate-400 mt-0.5">of {dob.violations} total on record</p>
            </div>
            <div className={`rounded-xl p-4 border text-center ${dob.activePermits.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-3xl font-bold ${dob.activePermits.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{dob.activePermits.length}</p>
              <p className="text-xs font-semibold text-slate-600 mt-1">Active Permits</p>
              <p className="text-xs text-slate-400 mt-0.5">construction activity on file</p>
            </div>
          </div>

          {dob.activePermits.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Active Construction Permits</p>
              <div className="space-y-2">
                {dob.activePermits.map((p, i) => {
                  const typeLabel = DOB_PERMIT_TYPES[p.type?.toUpperCase() ?? ''] ?? (p.type || 'General Work');
                  return (
                    <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-purple-700">{p.type || '—'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{typeLabel}</p>
                        {p.description && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{p.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                          {p.date && <span className="text-xs text-slate-400">{formatDate(p.date)}</span>}
                          {p.status && <span className="text-xs text-slate-500">{p.status}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-3">Active permits mean workers may access the building during your tenancy. Major work (NB, DM, A1) can cause noise, dust, and disruption.</p>
            </div>
          )}

          {dob.activePermits.length === 0 && dob.violations === 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700">No DOB violations or active permits on record — a good sign for building safety compliance.</p>
            </div>
          )}

          {dob.violations > 0 && dob.openViolations === 0 && (
            <p className="text-xs text-slate-400">All {dob.violations} DOB violation(s) on record have been resolved or dismissed.</p>
          )}
        </div>

        {/* Building Info */}
        <div className="p-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Home className="w-4 h-4 text-slate-500" /> Building Information
          </h3>
          <div className="space-y-1">
            {building.hasElevator !== null && (
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Elevator</span>
                <span className={`text-sm font-semibold ${building.hasElevator ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {building.hasElevator ? 'Yes — Elevator Building' : 'No — Walk-Up'}
                </span>
              </div>
            )}
            {[
              { label: 'Year Built', value: building.yearBuilt },
              { label: 'Residential Units', value: building.units },
              { label: 'Floors', value: building.floors },
              { label: 'Building Class', value: building.buildingClass },
              { label: 'Owner on Record', value: building.ownerName },
              { label: 'Assessed Value', value: building.assessedValue ? `$${parseInt(building.assessedValue).toLocaleString()}` : null },
              { label: 'Flood Zone', value: building.floodZone },
              { label: 'Borough', value: geo.borough },
              { label: 'ZIP Code', value: geo.zip },
              { label: 'BBL', value: geo.bbl },
            ].map(({ label, value }) => value ? (
              <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-semibold text-slate-900 text-right max-w-[60%] truncate">{value}</span>
              </div>
            ) : null)}
            {!building.yearBuilt && !building.units && !building.ownerName && (
              <p className="text-center py-6 text-slate-400 text-sm">
                Building property data not available. The address may not be in the NYC PLUTO database.
              </p>
            )}
          </div>
        </div>

        {/* Transit */}
        <div className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-5 h-5 flex-shrink-0" aria-label="MTA">
              <circle cx="50" cy="50" r="50" fill="#0039A6"/>
              <text x="50" y="68" textAnchor="middle" fontSize="52" fontWeight="bold" fontFamily="Arial,Helvetica,sans-serif" fill="white">M</text>
            </svg>
            Nearby Subway Stations
          </h3>
          {transit.nearbyStations.length > 0 ? (
            <div className="space-y-0">
              {transit.nearbyStations.map((station, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{station.name}</p>
                      {station.lines && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {station.lines.split(", ").map(l => l.trim()).filter(Boolean).map(line => (
                            <SubwayBadge key={line} line={line} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 ml-3 shrink-0">{station.distanceFt.toLocaleString()} ft</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-slate-400 text-sm">No subway entrances found within 800m</p>
          )}
        </div>

        {/* Evictions */}
        <div className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-500" /> Eviction History
          </h3>
          {evictions && evictions.total > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
                  <p className="text-3xl font-bold text-amber-700">{evictions.total}</p>
                  <p className="text-xs text-amber-600 mt-1">Total Marshal Evictions</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <p className="text-3xl font-bold text-slate-900">{evictions.residential}</p>
                  <p className="text-xs text-slate-500 mt-1">Residential Evictions</p>
                </div>
              </div>
              {evictions.years.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Years with Eviction Activity</p>
                  <p className="text-sm text-amber-800">{evictions.years.join(', ')}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Evictions</p>
                <div className="space-y-2">
                  {evictions.recent.map((e, i) => (
                    <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {e.type?.toUpperCase().startsWith('R') ? 'Residential' : e.type?.toUpperCase().startsWith('C') ? 'Commercial' : e.type || 'Unknown'}
                          </span>
                          {e.docket && <span className="text-xs text-slate-400">Docket {e.docket}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {e.date && <span className="text-xs text-slate-400">{formatDate(e.date)}</span>}
                          {e.marshal && <span className="text-xs text-slate-500">Marshal: {e.marshal}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">Source: NYC Department of Investigation — Marshal Evictions dataset</p>
            </>
          ) : (
            <p className="text-center py-4 text-slate-400 text-sm">No marshal eviction records found for this address.</p>
          )}
        </div>

        {/* Crimes */}
        <div className="p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" /> Nearby Crime Activity
          </h3>

          {crimes && crimes.total > 0 ? (
            <>
              {/* Crime meter */}
              {(() => {
                const crimeScore = calcCrimeScore(crimes.felonies, crimes.misdemeanors, crimes.violations);
                const level = crimeLevel(crimeScore);
                return (
                  <div className="rounded-2xl border p-5 flex flex-col items-center gap-2" style={{ backgroundColor: level.bg, borderColor: level.border }}>
                    <CrimeMeter score={crimeScore} />
                    <p className="text-xs text-slate-500 text-center mt-1 max-w-xs">
                      Based on {crimes.total} NYPD complaints within ~650 ft over the past 12 months
                    </p>
                  </div>
                );
              })()}

              {/* Severity breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-xl p-3 border text-center ${crimes.felonies > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-2xl font-bold ${crimes.felonies > 0 ? 'text-red-600' : 'text-slate-400'}`}>{crimes.felonies}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Felonies</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">robbery, assault, burglary</p>
                </div>
                <div className={`rounded-xl p-3 border text-center ${crimes.misdemeanors > 5 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-2xl font-bold ${crimes.misdemeanors > 5 ? 'text-amber-700' : 'text-slate-600'}`}>{crimes.misdemeanors}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Misdemeanors</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">petty theft, harassment</p>
                </div>
                <div className="rounded-xl p-3 border border-slate-100 bg-slate-50 text-center">
                  <p className="text-2xl font-bold text-slate-500">{crimes.violations}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Violations</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">minor infractions</p>
                </div>
              </div>

              {/* Top offense types */}
              {crimes.topOffenses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Most Common Offense Types</p>
                  <div className="space-y-2">
                    {crimes.topOffenses.map(({ type, count }) => (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 flex-1 truncate capitalize">{type.toLowerCase()}</span>
                        <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-400"
                            style={{ width: `${(count / crimes.topOffenses[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-5 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent incidents */}
              {crimes.recent.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Reported Incidents</p>
                  <div className="space-y-2">
                    {crimes.recent.map((c, i) => {
                      const severityColor =
                        c.severity.toUpperCase() === 'FELONY' ? '#dc2626' :
                        c.severity.toUpperCase() === 'MISDEMEANOR' ? '#f59e0b' : '#94a3b8';
                      return (
                        <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                          <span
                            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-white text-[9px] font-bold flex-shrink-0 mt-0.5 uppercase leading-none"
                            style={{ backgroundColor: severityColor, minWidth: 48 }}
                          >
                            {c.severity || '—'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 capitalize">{c.offense.toLowerCase()}</p>
                            {c.detail && <p className="text-xs text-slate-500 mt-0.5 capitalize">{c.detail.toLowerCase()}</p>}
                            {c.date && <p className="text-xs text-slate-400 mt-0.5">{formatDate(c.date)}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 w-full flex flex-col items-center">
                <CrimeMeter score={0} />
                <p className="text-xs text-emerald-700 text-center mt-1 font-medium">No NYPD complaints found within 650 ft in the past 12 months.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Moving CTA */}
      <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Ready to move into this building?</p>
          <p className="text-xs text-slate-500 mt-0.5">Estimate your moving costs with Move-Price — including building-specific surcharges.</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: BRAND }}
        >
          <DollarSign className="w-4 h-4" />
          Calculate Moving Costs
        </Link>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function ApartmentCheckNYC() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = { title: document.title };
    document.title = 'Apartment Check NYC | Building Violations, Complaints & Landlord Report';

    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
      return el;
    };

    const metas = [
      setMeta('description', 'Research any NYC apartment before signing a lease. Check building violations, complaints, bed bug history, permits, landlord records, and moving considerations in one free report.'),
      setMeta('keywords', 'apartment check nyc, check apartment before renting, apartment building report, landlord check nyc, apartment violations nyc, nyc building violations, apartment history report'),
      setMeta('og:title', 'Apartment Check NYC | Building Violations, Complaints & Landlord Report', false),
      setMeta('og:description', 'Free NYC apartment research tool. Check violations, complaints, bed bugs, and moving costs before signing a lease.', false),
      setMeta('og:type', 'website', false),
      setMeta('og:url', 'https://move-price.com/apartment-check-nyc', false),
    ];

    return () => {
      document.title = prev.title;
      metas.forEach(el => el?.remove());
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim().length < 5) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('nyc-building-report', {
        body: { address: address.trim() },
      });

      if (fnError) throw new Error(fnError.message ?? 'Request failed');
      if (data?.error) throw new Error(data.error);

      setReport(data as ReportData);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReport(null);
    setError(null);
    setTimeout(() => searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <Seo
        title="Apartment Check NYC - Research Any NYC Building Before You Sign"
        description="Free NYC apartment check tool. Look up bed bug reports, 311 complaints, open violations, active permits, building age, and residential units for any NYC address before you sign a lease."
        canonical="/apartment-check-nyc"
        keywords="NYC apartment check, NYC building report, bed bug reports NYC, 311 complaints NYC, NYC housing violations, NYC apartment research"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />

      {/* ── HERO ── */}
      <section className="pt-16" aria-label="Hero">
        <div className="relative overflow-hidden" style={{ background: '#0d1f0f' }}>
          <div className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: 'url(/MovePrice-New_York.png)', opacity: 0.80, backgroundPosition: 'center 30%' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,31,15,0.30) 0%, rgba(13,31,15,0.45) 60%, rgba(13,31,15,0.70) 100%)' }} />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20 text-white/80" style={{ backgroundColor: 'rgba(94,187,71,0.15)' }}>
              <Shield className="w-4 h-4" style={{ color: BRAND }} />
              Free NYC Apartment Research Tool
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
              Research Any NYC Apartment<br className="hidden sm:block" />
              <span style={{ color: BRAND }}> Before You Sign a Lease</span>
            </h1>

            <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8 leading-relaxed">
              Get real building violations, complaint history, bed bug reports, permits, and ownership records — pulled live from official NYC databases.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
              <Link
                to="/"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-200 border-2 border-white/30 hover:bg-white/25 hover:border-white/50 hover:-translate-y-0.5 backdrop-blur-sm"
              >
                <DollarSign className="w-5 h-5" />
                Calculate Moving Costs
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Enter NYC address (e.g. 250 W 55th St, New York)"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                    aria-label="Enter NYC apartment address"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || address.trim().length < 5}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-95 shadow-lg whitespace-nowrap disabled:opacity-60"
                  style={{ backgroundColor: BRAND, boxShadow: `0 4px 20px ${BRAND}50` }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? 'Fetching Data…' : 'Generate Apartment Report'}
                </button>
              </div>

              {error && (
                <div className="mt-4 bg-red-500/20 backdrop-blur rounded-xl px-5 py-4 text-sm text-white border border-red-400/30 text-left flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-300" />
                  <div>
                    <p className="font-semibold mb-0.5">Could not load report</p>
                    <p className="text-white/70">{error}</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="mt-4 bg-white/10 backdrop-blur rounded-xl px-5 py-4 text-sm text-white/90 border border-white/20 text-left flex items-start gap-3">
                  <Loader2 className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" style={{ color: BRAND }} />
                  <div>
                    <p className="font-semibold mb-1">Pulling live data from NYC databases…</p>
                    <p className="text-white/70">Checking HPD violations, 311 complaints, DOB records, and bed bug disclosures. This takes 5–10 seconds.</p>
                  </div>
                </div>
              )}
            </form>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/70">
              {['NYC HPD Live Data', 'DOB & 311 Records', 'NYPD Crime Data', 'Bed Bug History', 'Free Building Research'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" style={{ color: BRAND }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile sticky search */}
        <div className="sm:hidden sticky top-16 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter NYC address"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || address.trim().length < 5}
              className="px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
            </button>
          </form>
        </div>
      </section>

      {/* ── LIVE REPORT ── */}
      {report && (
        <section className="py-12 bg-slate-50" ref={reportRef}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <LiveReport data={report} onReset={handleReset} />
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      {!report && (
        <section className="py-20 bg-slate-50" aria-labelledby="how-it-works-heading">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                How Apartment Check NYC Works
              </h2>
              <p className="text-slate-600 text-lg max-w-xl mx-auto">
                Get a comprehensive building report in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-10 left-[calc(33%+2rem)] right-[calc(33%+2rem)] h-0.5 opacity-30"
                style={{ backgroundImage: `linear-gradient(to right, ${BRAND}, ${BRAND})` }} />
              {[
                { num: 1, img: '/files_9503471-2026-06-23T20-02-38-121Z-files_9503471-2026-06-23T15-52-17-375Z-NYC_icon_EnterAddress.png', title: 'Enter Address', desc: 'Search any NYC apartment building by street address. Works for all five boroughs.' },
                { num: 2, img: '/files_9503471-2026-06-23T20-02-25-833Z-files_9503471-2026-06-23T15-52-17-925Z-NYC_icon_LiveDataPull.png', title: 'Live Data Pull', desc: 'We query NYC HPD, DOB, 311, and other official city APIs in real time.' },
                { num: 3, img: '/files_9503471-2026-06-23T20-02-15-156Z-files_9503471-2026-06-23T15-52-16-918Z-NYC_icon_ReviewYourReport.png', title: 'Review Your Report', desc: 'Get a clear, organized report to help you understand risks before signing a lease.' },
              ].map(({ num, img, title, desc }) => (
                <div key={num} className="flex flex-col items-center text-center group">
                  <div className="relative w-24 h-24 flex items-center justify-center mb-5 transition-transform group-hover:-translate-y-1">
                    <img src={img} alt={title} className="w-full h-full object-contain" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shadow-md">{num}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHAT'S INCLUDED ── */}
      <section className="py-20 bg-white" aria-labelledby="whats-included-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 id="whats-included-heading" className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              What's Included in Your Apartment Report
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Every report pulls from official New York City public data sources — the same records city agencies use.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Row 1 — green bg */}
            <FeatureCard icon={<img src="/files_9503471-2026-06-19T23-54-36-285Z-NYC_icon_openViolations.jpg" alt="" className="w-full h-full object-contain" />} title="HPD Housing Violations"
              description="Open and historical violations — heat outages, mold, water leaks, lead paint, and safety issues — classified by severity (A, B, C)."
              source="NYC HPD" color="#ef4444" iconBg={BRAND_LIGHT} />
            <FeatureCard icon={<img src="/files_9503471-2026-06-22T23-36-17-067Z-files_9503471-2026-06-22T23-02-07-657Z-NYC_icon_ActivePermits.png" alt="" className="w-full h-full object-contain" />} title="DOB Violations & Permits"
              description="Active DOB violations, open permits, construction activity, and stop-work orders from the Department of Buildings."
              source="NYC DOB" color="#f97316" iconBg={BRAND_LIGHT} />
            <FeatureCard icon={<img src="/files_9503471-2026-06-19T23-54-36-146Z-NYC_icon_311Compaints.jpg" alt="" className="w-full h-full object-contain" />} title="311 Complaint History"
              description="Noise, rodents, heat loss, sanitation, and other quality-of-life complaints filed by tenants — broken down by category."
              source="NYC 311" color="#3b82f6" iconBg={BRAND_LIGHT} />
            <FeatureCard icon={<img src="/files_9503471-2026-06-19T23-54-36-110Z-NYC_icon_bedBugReports.jpg" alt="" className="w-full h-full object-contain" />} title="Bed Bug History"
              description="Infestation history going back multiple years. NYC landlords are legally required to disclose bed bug history before you sign."
              source="NYC HPD" color="#dc2626" iconBg={BRAND_LIGHT} />
            {/* Row 2 — white bg */}
            <FeatureCard icon={<img src="/files_9503471-2026-06-22T22-22-47-627Z-files_9503471-2026-06-22T22-02-06-752Z-files_9503471-2026-06-22T16-20-14-997Z-NYC_icon_Crime.jpg" alt="" className="w-full h-full object-contain" />} title="Nearby Crime Activity"
              description="NYPD complaint data within 650 ft — felonies, misdemeanors, and violations by offense type for the past 12 months, with a visual crime meter."
              source="NYPD Open Data" color="#7c3aed" iconBg="white" />
            <FeatureCard icon={<img src="/files_9503471-2026-06-22T22-02-18-310Z-files_9503471-2026-06-22T16-20-15-121Z-NYC_icon_Eviction.jpg" alt="" className="w-full h-full object-contain" />} title="Eviction Filings"
              description="Building-level eviction filings and marshal activity by year. Patterns of evictions can indicate landlord-tenant disputes or building instability."
              source="NYC DOI Marshals" color="#f59e0b" iconBg="white" />
            <FeatureCard icon={<img src="/files_9503471-2026-06-22T23-36-53-342Z-files_9503471-2026-06-22T23-02-08-117Z-NYC_icon_YearBuilt.png" alt="" className="w-full h-full object-contain" />} title="Building Profile"
              description="Year built, number of units, floors, building class, owner name, assessed value, elevator status, and flood zone classification."
              source="NYC PLUTO" color="#8b5cf6" iconBg="white" />
            <FeatureCard icon={<img src="/files_9503471-2026-06-23T03-01-15-782Z-NYC_icon_SubwayAccess.png" alt="" className="w-full h-full object-contain" />} title="Nearby Subway Access"
              description="Closest subway stations, lines served, and walking distance — so you can evaluate your commute before committing to a lease."
              source="MTA Open Data" color={BRAND} iconBg="white" />
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-20 bg-white" aria-labelledby="comparison-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="comparison-heading" className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Why Renters Use Apartment Check NYC
            </h2>
            <p className="text-slate-600 text-lg">Stop searching across six different city websites. Get everything in one place.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500 w-[45%]">Feature</th>
                  <th className="py-4 px-4 text-center text-sm font-bold" style={{ color: BRAND }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <Shield className="w-5 h-5" />
                      Apartment Check NYC
                    </div>
                  </th>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">
                    <div className="flex flex-col items-center gap-0.5">
                      <Clock className="w-5 h-5" />
                      Searching Yourself
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompareRow label="HPD Housing Violations (Class A/B/C)" />
                <CompareRow label="DOB Violations & Active Permits" />
                <CompareRow label="311 Complaint History by Category" />
                <CompareRow label="Bed Bug Disclosure History" />
                <CompareRow label="NYPD Crime Data (650 ft radius)" />
                <CompareRow label="Eviction Filing History" />
                <CompareRow label="Owner Name & Building Profile" />
                <CompareRow label="Nearby Subway Stations" />
                <CompareRow label="All in One Report" />
                <CompareRow label="Free to Use" />
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-500">Searching yourself means 6+ websites, hours of work, and missed data.</p>
              <button
                onClick={() => searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: BRAND }}
              >
                Check My Apartment <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {[
              { icon: <DatabaseIcon className="w-5 h-5" />, title: 'Official City Data', desc: 'All records sourced directly from NYC HPD, DOB, 311, and PLUTO via official open data APIs.' },
              { icon: <Zap className="w-5 h-5" />, title: 'Live Lookups', desc: 'Each report is fetched in real time — you always see the latest violations and complaints.' },
              { icon: <Users className="w-5 h-5" />, title: 'Built by Moving Experts', desc: 'Move-Price helps thousands of renters and movers navigate NYC relocations every year.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-slate-100 flex flex-col gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_LIGHT, color: BRAND }}>
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{title}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-slate-50" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-lg">Everything you need to know about checking an NYC apartment before renting.</p>
          </div>
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none hover:bg-slate-50 transition-colors">
                  <h3 className="font-semibold text-slate-900 text-base leading-snug">{item.q}</h3>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 group-open:bg-green-100 flex items-center justify-center transition-colors">
                    <svg className="w-3.5 h-3.5 text-slate-500 group-open:text-green-600 group-open:rotate-45 transition-transform duration-200" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 1v12M1 7h12" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── RELATED TOOLS ── */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wide mb-6">Related Move-Price Tools</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { to: '/', label: 'Moving Cost Calculator', desc: 'Get an instant moving estimate', icon: <DollarSign className="w-4 h-4" /> },
              { to: '/long-distance-moving-cost', label: 'How Much Do Movers Cost?', desc: 'Full-service mover pricing guide', icon: <Truck className="w-4 h-4" /> },
              { to: '/moving-cost/map', label: 'Moving Cost by State', desc: 'Compare costs across all 50 states', icon: <MapPin className="w-4 h-4" /> },
            ].map(({ to, label, desc, icon }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: BRAND_LIGHT, color: BRAND }}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-700">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #1a3a2a 60%, #1e4d2b 100%)' }} aria-labelledby="final-cta-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20 text-white/80" style={{ backgroundColor: 'rgba(94,187,71,0.15)' }}>
            <Shield className="w-4 h-4" style={{ color: BRAND }} />
            Free NYC Apartment Research
          </div>
          <h2 id="final-cta-heading" className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Know More Before You Sign Your Lease
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            Research any NYC apartment and avoid costly surprises. Free building violations, complaints, and moving insights — live from city databases.
          </p>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
            <div className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter NYC address"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none"
                  aria-label="Enter NYC apartment address for report"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || address.trim().length < 5}
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 whitespace-nowrap disabled:opacity-60"
                style={{ backgroundColor: BRAND, boxShadow: `0 4px 20px ${BRAND}50` }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? 'Fetching…' : 'Generate Apartment Report'}
              </button>
            </div>
          </form>
          <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors">
            <DollarSign className="w-4 h-4" />
            Or Calculate Your Moving Costs →
          </Link>
        </div>
      </section>

      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
