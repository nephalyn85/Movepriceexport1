import { useState, useCallback, useRef, memo, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
  useMapContext,
} from 'react-simple-maps';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import {
  MapPin, TrendingUp, TrendingDown, Truck,
  Users, Info, ChevronRight, X,
} from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import MovePriceCalculator from '../components/MovePriceCalculator';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import { STATE_DATA, loadStateData, getDemandColor, getDemandLabel } from '../lib/stateMovingData';
import { calculateTruckPrice, calculateBudgetPrice } from '../lib/truckRentalPricing';
import { calculatePenskePricing } from '../lib/pricingEngine';

// US Atlas TopoJSON — real accurate state boundaries
const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

// FIPS code → state abbr mapping
const FIPS: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
  '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
  '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
  '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
  '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY',
};

// Geographic centroids [lng, lat] for each state label/marker
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL:[-86.7,32.8],AK:[-153,64],AZ:[-111.9,34.2],AR:[-92.4,34.9],CA:[-119.4,37.2],
  CO:[-105.5,39],CT:[-72.7,41.6],DE:[-75.5,39],DC:[-77,38.9],FL:[-81.5,27.8],
  GA:[-83.4,32.7],HI:[-157.5,20.2],ID:[-114.5,44.4],IL:[-89.2,40],IN:[-86.3,40],
  IA:[-93.5,42.1],KS:[-98.4,38.5],KY:[-84.9,37.5],LA:[-92,31],ME:[-69.4,45.3],
  MD:[-76.8,39],MA:[-71.8,42.3],MI:[-85.4,44.3],MN:[-94.3,46.4],MS:[-89.7,32.7],
  MO:[-92.5,38.4],MT:[-110.3,47],NE:[-99.9,41.5],NV:[-116.7,39.3],NH:[-71.6,44],
  NJ:[-74.4,40],NM:[-106.1,34.4],NY:[-75.5,42.9],NC:[-79.4,35.5],ND:[-100.5,47.5],
  OH:[-82.8,40.4],OK:[-97.5,35.5],OR:[-120.5,44],PA:[-77.2,40.9],RI:[-71.5,41.7],
  SC:[-80.9,33.8],SD:[-100.3,44.4],TN:[-86.3,35.9],TX:[-99.3,31.5],UT:[-111.1,39.3],
  VT:[-72.7,44.1],VA:[-78.7,37.5],WA:[-120.5,47.4],WV:[-80.6,38.6],WI:[-89.6,44.5],
  WY:[-107.6,43],
};

// Major routes to display on the map [fromAbbr, toAbbr, label, type]
// type: 'expensive' | 'cheap' | 'popular'
const MAP_ROUTES: Array<{
  from: string; to: string; label: string;
  type: 'expensive' | 'cheap' | 'popular';
  truck26: string;
}> = [
  { from: 'CA', to: 'NY', label: 'CA→NY', type: 'expensive', truck26: '$10,999' },
  { from: 'CA', to: 'TX', label: 'CA→TX', type: 'expensive', truck26: '$7,800' },
  { from: 'NY', to: 'FL', label: 'NY→FL', type: 'expensive', truck26: '$5,908' },
  { from: 'WA', to: 'NY', label: 'WA→NY', type: 'expensive', truck26: '$6,866' },
  { from: 'NJ', to: 'FL', label: 'NJ→FL', type: 'expensive', truck26: '$5,500' },
  { from: 'GA', to: 'NY', label: 'GA→NY', type: 'cheap', truck26: '$1,516' },
  { from: 'IL', to: 'WI', label: 'IL→WI', type: 'cheap', truck26: '$799' },
  { from: 'TX', to: 'FL', label: 'TX→FL', type: 'popular', truck26: '$3,200' },
  { from: 'TN', to: 'TX', label: 'TN→TX', type: 'popular', truck26: '$2,100' },
];

const ROUTE_STYLE: Record<string, {
  stroke: string; strokeWidth: number;
  dasharray?: string; label: string; markerId: string;
}> = {
  expensive: { stroke: '#ef4444', strokeWidth: 3.5, dasharray: '10 5', label: 'Most Expensive', markerId: 'arrow-expensive' },
  cheap:     { stroke: '#22c55e', strokeWidth: 3,                       label: 'Best Value',     markerId: 'arrow-cheap'     },
  popular:   { stroke: '#3b82f6', strokeWidth: 2.5, dasharray: '8 5',  label: 'Popular Route',  markerId: 'arrow-popular'   },
};

// Quadratic bezier control point: lift midpoint perpendicular to line
function curveControlPoint(
  x1: number, y1: number, x2: number, y2: number, curvature = 0.25,
): [number, number] {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Perpendicular offset
  return [mx - dy * curvature, my + dx * curvature];
}

// Renders curved arrow routes — must be inside ZoomableGroup so it gets the projection context
function CurvedRoutes({ showRoutes, zoom }: { showRoutes: boolean; zoom: number }) {
  const { projection } = useMapContext();
  if (!showRoutes || !projection) return null;

  const markersEl = (
    <defs>
      {/* White outline arrowhead — rendered only on the outline path, no colored tip at all */}
      {Object.entries(ROUTE_STYLE).map(([type, s]) => (
        <marker
          key={`${type}-outline`}
          id={`${s.markerId}-outline`}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0.5 L0,7.5 L7,4 z" fill="white" />
        </marker>
      ))}
      {/* Colored arrowhead on top */}
      {Object.entries(ROUTE_STYLE).map(([type, s]) => (
        <marker
          key={type}
          id={s.markerId}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,7 L7,3.5 z" fill={s.stroke} />
        </marker>
      ))}
    </defs>
  );

  const routes = MAP_ROUTES.map((route, i) => {
    const fromGeo = STATE_CENTROIDS[route.from];
    const toGeo   = STATE_CENTROIDS[route.to];
    if (!fromGeo || !toGeo) return null;

    const p1 = projection(fromGeo);
    const p2 = projection(toGeo);
    if (!p1 || !p2) return null;

    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const [cx, cy] = curveControlPoint(x1, y1, x2, y2, 0.28);

    const style = ROUTE_STYLE[route.type];
    const sw = style.strokeWidth / zoom;
    const d  = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

    return (
      <g key={i} style={{ pointerEvents: 'none' }}>
        {/* White outline — no arrowhead so there's no ghost tip */}
        <path
          d={d}
          fill="none"
          stroke="white"
          strokeWidth={sw * 3.2}
          strokeLinecap="round"
          opacity={0.8}
        />
        {/* Colored route with single arrowhead */}
        <path
          d={d}
          fill="none"
          stroke={style.stroke}
          strokeWidth={sw * 1.6}
          strokeLinecap="round"
          strokeDasharray={style.dasharray
            ? style.dasharray.split(' ').map(n => `${parseFloat(n) / zoom}`).join(' ')
            : undefined}
          markerEnd={`url(#${style.markerId})`}
          opacity={0.95}
        />
      </g>
    );
  });

  return <>{markersEl}{routes}</>;
}

const DEMAND_META = {
  very_high: { label: 'Very Expensive', color: '#dc2626' },
  high:      { label: 'Expensive',      color: '#f97316' },
  medium:    { label: 'Average',        color: '#eab308' },
  low:       { label: 'Affordable',     color: '#22c55e' },
};


// ─── State expansion overlay ──────────────────────────────────────────────────
// Renders an animated full-map overlay showing the selected state shape filled
// with its hero photo. Uses a separate ComposableMap with a custom projection
// centered + scaled to that state's centroid so the shape fills the container.

const MAP_WIDTH = 900;
const MAP_HEIGHT = 520;

// Shared TopoJSON cache for the overlay
let _geoCache: Record<string, unknown> | null = null;
let _geoCachePromise: Promise<Record<string, unknown>> | null = null;

function loadGeoData(): Promise<Record<string, unknown>> {
  if (_geoCache) return Promise.resolve(_geoCache);
  if (_geoCachePromise) return _geoCachePromise;
  _geoCachePromise = fetch(GEO_URL)
    .then(r => r.json())
    .then(d => { _geoCache = d; return d; });
  return _geoCachePromise;
}

interface StateOverlayProps {
  abbr: string;
  heroImage: string | undefined;
  demandColor: string;
  onClose: () => void;
  onNavigate: () => void;
  stateName: string;
}

function StateExpansionOverlay({ abbr, heroImage, demandColor, onClose, onNavigate, stateName }: StateOverlayProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  // pathD: the state shape path string projected at default AlbersUSA scale,
  // then scaled/translated to fill MAP_WIDTH x MAP_HEIGHT
  const [pathD, setPathD] = useState<string | null>(null);
  const [transform, setTransform] = useState('');
  const clipId = useMemo(() => `clip-${abbr}-${Math.random().toString(36).slice(2)}`, [abbr]);

  useEffect(() => {
    loadGeoData().then((topology) => {
      // Use d3-geo to project the state at a standard AlbersUSA projection
      // then compute its bounding box and derive a scale+translate to center it
      import('topojson-client').then(({ feature }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const states = feature(topology as any, (topology as any).objects.states);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fipsCode = Object.entries(FIPS).find(([, a]) => a === abbr)?.[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stateFeature = (states as any).features?.find((f: any) => f.id === fipsCode || String(f.id) === fipsCode);
        if (!stateFeature) return;

        // Project at 1:1 scale first to get raw coordinates
        const proj = geoAlbersUsa().scale(1000).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
        const pathGen = geoPath(proj);

        const d = pathGen(stateFeature);
        if (!d) return;

        // Compute bounding box [[x0,y0],[x1,y1]]
        const bounds = pathGen.bounds(stateFeature);
        const [[x0, y0], [x1, y1]] = bounds;
        const bw = x1 - x0, bh = y1 - y0;
        if (bw < 1 || bh < 1) return;

        // Scale to fill 82% of the container, centered
        const padding = 0.82;
        const scale = Math.min((MAP_WIDTH * padding) / bw, (MAP_HEIGHT * padding) / bh);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const tx = MAP_WIDTH / 2 - cx * scale;
        const ty = MAP_HEIGHT / 2 - cy * scale;

        setPathD(d);
        setTransform(`translate(${tx},${ty}) scale(${scale})`);
      });
    });
  }, [abbr]);

  useEffect(() => {
    const t = setTimeout(() => setPhase('visible'), 400);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setPhase('exit');
    setTimeout(onClose, 280);
  };

  return (
    <div
      className={`absolute inset-0 ${phase === 'exit' ? 'state-expand-exit' : 'state-expand-enter'}`}
      style={{ zIndex: 20, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(3px)' }}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Main SVG — state shape with photo inside */}
      {pathD && (
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Glow filter */}
            <filter id={`glow-${abbr}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
              <feFlood floodColor={demandColor} floodOpacity="0.55" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
              <feMerge>
                <feMergeNode in="colorBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* ClipPath using the projected+scaled path */}
            <clipPath id={clipId}>
              <path d={pathD} transform={transform} />
            </clipPath>
          </defs>

          {/* Glow shadow */}
          <path
            d={pathD}
            transform={transform}
            fill={demandColor}
            opacity="0.35"
            filter={`url(#glow-${abbr})`}
          />

          {/* Hero photo or solid fill, clipped to state shape */}
          {heroImage ? (
            <g clipPath={`url(#${clipId})`}>
              <image
                href={new URL(heroImage, window.location.href).href}
                x="0" y="0"
                width={MAP_WIDTH} height={MAP_HEIGHT}
                preserveAspectRatio="xMidYMid slice"
                opacity="0.95"
              />
              {/* Subtle color wash */}
              <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT}
                fill={demandColor} opacity="0.22" />
            </g>
          ) : (
            <path
              d={pathD}
              transform={transform}
              fill={demandColor}
              opacity="0.82"
            />
          )}

          {/* White border ring */}
          <path
            d={pathD}
            transform={transform}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.9"
          />
          {/* Demand color inner border */}
          <path
            d={pathD}
            transform={transform}
            fill="none"
            stroke={demandColor}
            strokeWidth="3"
            opacity="0.6"
          />
        </svg>
      )}

      {/* State name — centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none hero-fade-in">
        <span
          className="text-white font-black uppercase select-none"
          style={{
            fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)',
            textShadow: '0 2px 24px rgba(0,0,0,0.95), 0 0 60px rgba(0,0,0,0.7)',
            letterSpacing: '0.1em',
          }}
        >
          {stateName}
        </span>
      </div>

      {/* Action buttons */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 hero-fade-in"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={onNavigate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: demandColor, boxShadow: `0 4px 24px ${demandColor}88` }}
        >
          View Full Data
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleClose}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 transition-all hover:scale-105 active:scale-95"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
    </div>
  );
}


interface USAMapProps {
  hoveredState: string | null;
  selectedStateRef: React.MutableRefObject<string | null>;
  onHover: (abbr: string) => void;
  onLeave: () => void;
  onStateClick: (abbr: string) => void;
  showRoutes: boolean;
  stateMap: Record<string, (typeof STATE_DATA)[0]>;
  activeFilterRef: React.MutableRefObject<string>;
  renderToken: number; // increment this to force a repaint without changing other props
}

const USAMap = memo(function USAMap({
  onHover,
  onLeave,
  onStateClick,
  showRoutes,
  stateMap,
  selectedStateRef,
  activeFilterRef,
  renderToken,
}: USAMapProps) {
  // Suppress unused-var lint — renderToken is only here to trigger memo re-render
  void renderToken;

  const zoomRef = useRef(1);

  const handleMoveEnd = useCallback(({ zoom }: { zoom: number }) => {
    zoomRef.current = zoom;
  }, []);

  const zoom = zoomRef.current;
  const selectedState = selectedStateRef.current;
  const activeFilter = activeFilterRef.current;

  return (
    <ComposableMap
      projection="geoAlbersUsa"
      projectionConfig={{ scale: 860, center: [-96, 38] }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      height={520}
    >
      <ZoomableGroup minZoom={1} maxZoom={8} onMoveEnd={handleMoveEnd}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fips = geo.id as string;
              const abbr = FIPS[fips] ?? '';
              const state = stateMap[abbr];
              if (!state) return null;

              const isSelected = selectedState === abbr;
              const isFiltered = activeFilter !== 'all' && state.demandLevel !== activeFilter;
              const fill = isFiltered ? '#94a3b8' : getDemandColor(state.demandLevel);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => onStateClick(abbr)}
                  onMouseEnter={() => onHover(abbr)}
                  onMouseLeave={onLeave}
                  style={{
                    default: {
                      fill,
                      stroke: isSelected ? '#0f172a' : '#ffffff',
                      strokeWidth: isSelected ? 2 / zoom : 0.7,
                      outline: 'none',
                      filter: isSelected ? 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))' : 'none',
                    },
                    hover: {
                      fill: isFiltered ? '#64748b' : fill,
                      stroke: '#0f172a',
                      strokeWidth: 1.5 / zoom,
                      outline: 'none',
                      cursor: 'pointer',
                    },
                    pressed: {
                      fill,
                      stroke: '#0f172a',
                      strokeWidth: 1.5 / zoom,
                      outline: 'none',
                    },
                  }}
                />
              );
            })
          }
        </Geographies>

        <CurvedRoutes showRoutes={showRoutes} zoom={zoom} />

        {Object.entries(STATE_CENTROIDS).map(([abbr, [lng, lat]]) => {
          if (abbr === 'AK' || abbr === 'HI' || abbr === 'DC') return null;
          return (
            <Marker key={abbr} coordinates={[lng, lat]}>
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: `${Math.max(4, 9 / zoom)}px`,
                  fontWeight: '700',
                  fill: '#1e293b',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {abbr}
              </text>
            </Marker>
          );
        })}
      </ZoomableGroup>
    </ComposableMap>
  );
});

export default function MovingCostMap() {
  const navigate = useNavigate();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  // selectedState and activeFilter live in refs so USAMap memo never sees prop changes
  // A single renderToken state drives re-renders for the info card / filter buttons
  const selectedStateRef = useRef<string | null>(null);
  const activeFilterRef = useRef<string>('all');
  const [renderToken, setRenderToken] = useState(0);
  const repaint = useCallback(() => setRenderToken(n => n + 1), []);

  // The overlay state is separate from selectedState — it shows the expansion animation
  const [overlayAbbr, setOverlayAbbr] = useState<string | null>(null);

  const [showRoutes, setShowRoutes] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(STATE_DATA.length > 0);
  const [dataError, setDataError] = useState(false);

  // Convenience read for filter buttons
  const activeFilter = activeFilterRef.current as 'all' | 'very_high' | 'high' | 'medium' | 'low';

  useEffect(() => {
    if (!dataLoaded) {
      loadStateData()
        .then((result) => {
          if (result.length === 0) setDataError(true);
          setDataLoaded(true);
        })
        .catch(() => {
          setDataError(true);
          setDataLoaded(true);
        });
    }
  }, [dataLoaded]);

  const stateMap = useMemo(() => Object.fromEntries(STATE_DATA.map(s => [s.abbr, s])), [dataLoaded]);

  const handleStateClick = useCallback((abbr: string) => {
    // Toggle overlay: clicking same state closes it, clicking new state opens it
    setOverlayAbbr(prev => prev === abbr ? null : abbr);
    selectedStateRef.current = abbr;
    repaint();
  }, [repaint]);

  const handleNavigateToState = useCallback((abbr?: string) => {
    const sel = abbr ?? selectedStateRef.current;
    if (!sel) return;
    const state = stateMap[sel];
    if (state) navigate(`/moving-cost/state/${state.slug}`);
  }, [navigate, stateMap]);

  const handleHover = useCallback((abbr: string) => {
    setHoveredState(abbr);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredState(null);
  }, []);

  const cheapestState     = [...STATE_DATA].filter(s => s.truckRentalAvg > 0).sort((a, b) => a.truckRentalAvg - b.truckRentalAvg)[0];
  const mostExpensiveState = [...STATE_DATA].filter(s => s.abbr !== 'HI').sort((a, b) => b.truckRentalAvg - a.truckRentalAvg)[0];
  const topInbound  = STATE_DATA.filter(s => s.inboundRank <= 5).sort((a, b) => a.inboundRank - b.inboundRank);
  const topOutbound = STATE_DATA.filter(s => s.inboundRank >= 46).sort((a, b) => b.inboundRank - a.inboundRank);

  const hoveredStateData = hoveredState ? stateMap[hoveredState] : null;

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onAboutClick={() => setIsAboutOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading map data…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (dataError || STATE_DATA.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onAboutClick={() => setIsAboutOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-slate-700 font-semibold mb-2">Could not load map data</p>
            <p className="text-slate-500 text-sm mb-4">There was a problem connecting to the database. Please try refreshing the page.</p>
            <button
              onClick={() => { setDataLoaded(false); setDataError(false); }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Interactive Moving Cost Map - Compare Costs Across All 50 States"
        description="Explore our interactive map of moving costs across all 50 US states. See demand levels, migration trends, and average moving prices at a glance."
        canonical="/moving-cost/map"
        keywords="moving cost map, interactive moving map, state moving costs, US moving cost comparison, moving cost by state map"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Hero */}
      <section className="relative pt-24 pb-10 overflow-hidden text-white" style={{ minHeight: 340 }}>
        {/* Background photo */}
        <img
          src="/IMG_7129.JPG"
          alt="Moving truck with US map"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-slate-900/60" />
        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-500/30 text-teal-300 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <MapPin className="w-4 h-4" />
            Interactive Moving Cost Map — All 50 States
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Interactive Moving Cost Map by State — Live Pricing
          </h1>
          <p className="text-slate-200 text-lg max-w-2xl mx-auto">
            Real pricing data for every state. See expensive vs. affordable routes, click any state for full pricing details, calculators, and city-by-city breakdowns.
          </p>
        </div>
      </section>

      {/* Quick stats */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
              <TrendingDown className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-teal-700 font-medium uppercase tracking-wide">Cheapest Origin</p>
                <p className="font-bold text-slate-900">{cheapestState.name}</p>
                <p className="text-sm text-teal-700">~${cheapestState.truckRentalAvg.toLocaleString()} avg</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <TrendingUp className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Most Expensive</p>
                <p className="font-bold text-slate-900">{mostExpensiveState.name}</p>
                <p className="text-sm text-emerald-700">~${mostExpensiveState.truckRentalAvg.toLocaleString()} avg</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
              <Users className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-teal-700 font-medium uppercase tracking-wide">#1 Move-In State</p>
                <p className="font-bold text-slate-900">Texas</p>
                <p className="text-sm text-teal-700">Most inbound moves</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <Truck className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Priciest Corridor</p>
                <p className="font-bold text-slate-900">CA → East Coast</p>
                <p className="text-sm text-emerald-700">$9,400–$11,000 (26ft)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map section */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Map toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter:</span>
              {(['all', 'very_high', 'high', 'medium', 'low'] as const).map(f => {
                const meta = f === 'all' ? null : DEMAND_META[f];
                return (
                  <button
                    key={f}
                    onClick={() => { activeFilterRef.current = f; repaint(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      activeFilter === f
                        ? f === 'all'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'text-white border-transparent'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                    style={activeFilter === f && f !== 'all' ? { backgroundColor: meta!.color, borderColor: meta!.color } : {}}
                  >
                    {f === 'all' ? 'All States' : meta!.label}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setShowRoutes(r => !r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    showRoutes ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {showRoutes ? 'Hide Routes' : 'Show Routes'}
                </button>
              </div>
            </div>

            {/* Map + Tooltip layout */}
            <div className="relative bg-emerald-50 overflow-hidden" style={{ height: 520 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <USAMap
                  hoveredState={hoveredState}
                  selectedStateRef={selectedStateRef}
                  activeFilterRef={activeFilterRef}
                  renderToken={renderToken}
                  onHover={handleHover}
                  onLeave={handleLeave}
                  onStateClick={handleStateClick}
                  showRoutes={showRoutes}
                  stateMap={stateMap}
                />
              </div>

              {/* State expansion overlay — shown on state click */}
              {overlayAbbr && stateMap[overlayAbbr] && (
                <StateExpansionOverlay
                  key={overlayAbbr}
                  abbr={overlayAbbr}
                  heroImage={stateMap[overlayAbbr].heroImage}
                  demandColor={getDemandColor(stateMap[overlayAbbr].demandLevel)}
                  stateName={stateMap[overlayAbbr].name}
                  onClose={() => {
                    setOverlayAbbr(null);
                    selectedStateRef.current = null;
                    repaint();
                  }}
                  onNavigate={() => handleNavigateToState(overlayAbbr)}
                />
              )}

              {/* State data card — bottom-left, shown when overlay is open */}
              {overlayAbbr && stateMap[overlayAbbr] && (() => {
                const sd = stateMap[overlayAbbr];
                return (
                  <div
                    className="absolute bottom-4 left-4 bg-white border border-slate-200 rounded-xl shadow-xl w-56 overflow-hidden animate-fade-in"
                    style={{ zIndex: 30 }}
                  >
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ backgroundColor: getDemandColor(sd.demandLevel) }}
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-white" />
                        <span className="font-bold text-white text-sm">{sd.name}</span>
                      </div>
                      <button
                        onClick={() => { setOverlayAbbr(null); selectedStateRef.current = null; repaint(); }}
                        className="text-white/80 hover:text-white transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-2 gap-1.5">
                      <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                        <p className="text-xs text-slate-500 leading-none mb-0.5">26ft truck</p>
                        <p className="font-bold text-slate-900 text-xs">
                          {sd.truckRentalAvg > 0 ? `$${sd.truckRentalAvg.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                        <p className="text-xs text-slate-500 leading-none mb-0.5">Movers (2BR)</p>
                        <p className="font-bold text-slate-900 text-xs">
                          ${sd.avgMoversLocal[0].toLocaleString()}–${sd.avgMoversLocal[1].toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                        <p className="text-xs text-slate-500 leading-none mb-0.5">Inbound rank</p>
                        <p className="font-bold text-slate-900 text-xs">#{sd.inboundRank} of 50</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                        <p className="text-xs text-slate-500 leading-none mb-0.5">Best months</p>
                        <p className="font-bold text-slate-900 text-xs">{sd.bestMonths.slice(0, 2).join(', ')}</p>
                      </div>
                    </div>
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => handleNavigateToState(overlayAbbr)}
                        className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        View routes & calculator
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Hover hint — only when overlay is not open */}
              {!overlayAbbr && hoveredStateData && (
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-2.5 pointer-events-none" style={{ zIndex: 10 }}>
                  <p className="text-sm font-semibold text-slate-800">{hoveredStateData.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {hoveredStateData.truckRentalAvg > 0 ? `26ft truck ~$${hoveredStateData.truckRentalAvg.toLocaleString()} · ` : ''}
                    {getDemandLabel(hoveredStateData.demandLevel)}
                  </p>
                  <p className="text-xs text-teal-600 font-medium mt-1">Click to explore</p>
                </div>
              )}

              {/* Default hint */}
              {!overlayAbbr && !hoveredStateData && (
                <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 pointer-events-none" style={{ zIndex: 10 }}>
                  <Info className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Hover a state for pricing · Click to explore · Scroll to zoom
                </div>
              )}
            </div>

            {/* Legend + route key */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Truck cost:</span>
                {Object.entries(DEMAND_META).map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs text-slate-600">{meta.label}</span>
                  </div>
                ))}
              </div>
              {showRoutes && (
                <div className="flex flex-wrap items-center gap-4 md:ml-6 md:pl-6 md:border-l border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Routes:</span>
                  <div className="flex items-center gap-1.5">
                    <svg width="32" height="14" viewBox="0 0 32 14">
                      <defs><marker id="leg-exp" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,5 L5,2.5 z" fill="#ef4444"/></marker></defs>
                      <path d="M2 11 Q 16 2 30 7" fill="none" stroke="#7f1d1d" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
                      <path d="M2 11 Q 16 2 30 7" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 3" markerEnd="url(#leg-exp)"/>
                    </svg>
                    <span className="text-xs text-slate-600">Most expensive</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="32" height="14" viewBox="0 0 32 14">
                      <defs><marker id="leg-chp" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,5 L5,2.5 z" fill="#22c55e"/></marker></defs>
                      <path d="M2 11 Q 16 2 30 7" fill="none" stroke="#14532d" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
                      <path d="M2 11 Q 16 2 30 7" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#leg-chp)"/>
                    </svg>
                    <span className="text-xs text-slate-600">Best value</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="32" height="14" viewBox="0 0 32 14">
                      <defs><marker id="leg-pop" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,5 L5,2.5 z" fill="#3b82f6"/></marker></defs>
                      <path d="M2 11 Q 16 2 30 7" fill="none" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
                      <path d="M2 11 Q 16 2 30 7" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" markerEnd="url(#leg-pop)"/>
                    </svg>
                    <span className="text-xs text-slate-600">Popular routes</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Route comparison */}
      <section className="py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">Most Expensive Routes — Truck Rental</h2>
              </div>
              <div className="space-y-3">
                {(
                  [
                    { from: 'CA', to: 'NY', miles: 2800, movers: '8,000–14,000' },
                    { from: 'CA', to: 'GA', miles: 2200, movers: '6,500–12,000' },
                    { from: 'WA', to: 'NY', miles: 2850, movers: '7,000–12,000' },
                    { from: 'NY', to: 'FL', miles: 1280, movers: '4,000–9,000' },
                    { from: 'NJ', to: 'FL', miles: 1270, movers: '4,000–8,500' },
                  ] as Array<{ from: string; to: string; miles: number; movers: string }>
                ).map((r, i) => {
                  const uhaul  = calculateTruckPrice(r.miles, '26');
                  const budget = calculateBudgetPrice(r.miles, '26', r.from, r.to);
                  const penske = calculatePenskePricing({ miles: r.miles, truckSize: '26', fromState: r.from, toState: r.to, isLocalMove: false }).rentalBase;
                  const prices = [
                    { name: 'U-Haul',  price: uhaul  },
                    { name: 'Budget',  price: budget  },
                    { name: 'Penske',  price: penske  },
                  ].sort((a, b) => a.price - b.price);
                  const cheapest = prices[0];
                  const priciest = prices[prices.length - 1];
                  return (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-bold text-slate-400 w-5 mt-0.5 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm">
                            {stateMap[r.from]?.largestCity}, {r.from} → {stateMap[r.to]?.largestCity}, {r.to}
                          </div>
                          <div className="text-xs text-slate-500 mb-2">{r.miles.toLocaleString()} miles · 26ft truck</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {prices.map(p => (
                              <div key={p.name} className={`rounded-lg px-2 py-1.5 text-center ${p.name === cheapest.name ? 'bg-teal-100 border border-teal-200' : 'bg-white border border-slate-200'}`}>
                                <div className="text-xs font-semibold text-slate-500">{p.name}</div>
                                <div className={`text-sm font-bold ${p.name === cheapest.name ? 'text-teal-700' : 'text-slate-700'}`}>
                                  ${p.price.toLocaleString()}
                                </div>
                                {p.name === cheapest.name && <div className="text-[10px] text-teal-600 font-semibold">Best price</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-5">
                <TrendingDown className="w-5 h-5 text-teal-600" />
                <h2 className="text-xl font-bold text-slate-900">Cheapest One-Way Routes — Truck Rental</h2>
              </div>
              <div className="space-y-3">
                {(
                  [
                    { from: 'IL', to: 'WI', miles: 90,   movers: '850–1,500' },
                    { from: 'GA', to: 'NY', miles: 870,  movers: '2,200–5,000' },
                    { from: 'GA', to: 'CO', miles: 1400, movers: '3,200–6,500' },
                    { from: 'TX', to: 'NY', miles: 1550, movers: '4,500–8,000' },
                    { from: 'FL', to: 'TX', miles: 1090, movers: '3,000–6,500' },
                  ] as Array<{ from: string; to: string; miles: number; movers: string }>
                ).map((r, i) => {
                  const uhaul  = calculateTruckPrice(r.miles, '26');
                  const budget = calculateBudgetPrice(r.miles, '26', r.from, r.to);
                  const penske = calculatePenskePricing({ miles: r.miles, truckSize: '26', fromState: r.from, toState: r.to, isLocalMove: false }).rentalBase;
                  const prices = [
                    { name: 'U-Haul',  price: uhaul  },
                    { name: 'Budget',  price: budget  },
                    { name: 'Penske',  price: penske  },
                  ].sort((a, b) => a.price - b.price);
                  const cheapest = prices[0];
                  return (
                    <div key={i} className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-bold text-teal-500 w-5 mt-0.5 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm">
                            {stateMap[r.from]?.largestCity}, {r.from} → {stateMap[r.to]?.largestCity}, {r.to}
                          </div>
                          <div className="text-xs text-slate-500 mb-2">{r.miles.toLocaleString()} miles · 26ft truck</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {prices.map(p => (
                              <div key={p.name} className={`rounded-lg px-2 py-1.5 text-center ${p.name === cheapest.name ? 'bg-teal-200 border border-teal-300' : 'bg-white border border-teal-100'}`}>
                                <div className="text-xs font-semibold text-slate-500">{p.name}</div>
                                <div className={`text-sm font-bold ${p.name === cheapest.name ? 'text-teal-800' : 'text-slate-700'}`}>
                                  ${p.price.toLocaleString()}
                                </div>
                                {p.name === cheapest.name && <div className="text-[10px] text-teal-700 font-semibold">Best price</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse all states */}
      <section className="py-10 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Browse All 50 States</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Info className="w-4 h-4" />
              Click any state for full data
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {STATE_DATA.sort((a, b) => a.name.localeCompare(b.name)).map(state => (
              <button
                key={state.abbr}
                onClick={() => navigate(`/moving-cost/state/${state.slug}`)}
                className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-400 hover:shadow-md transition-all text-left"
              >
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">{state.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">${state.truckRentalAvg > 0 ? state.truckRentalAvg.toLocaleString() : 'N/A'} avg</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getDemandColor(state.demandLevel) }} />
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Migration insights */}
      <section className="py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Migration Trends Drive Moving Prices</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-teal-50 rounded-2xl p-6 border border-teal-100">
              <h3 className="font-bold text-teal-900 text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Top 5 Move-In States
              </h3>
              <div className="space-y-3">
                {topInbound.map((s, i) => (
                  <button key={s.abbr} onClick={() => navigate(`/moving-cost/state/${s.slug}`)} className="w-full flex items-center gap-3 group">
                    <span className="w-6 h-6 rounded-full bg-teal-200 text-teal-800 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-slate-900 text-left group-hover:text-teal-700 transition-colors">{s.name}</span>
                    <span className="text-xs text-teal-700 font-semibold">${s.avgMoversLocal[0].toLocaleString()}–${s.avgMoversLocal[1].toLocaleString()}</span>
                    <ChevronRight className="w-4 h-4 text-teal-400" />
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
              <h3 className="font-bold text-emerald-900 text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Top 5 Move-Out States
              </h3>
              <div className="space-y-3">
                {topOutbound.slice(0, 5).map((s, i) => (
                  <button key={s.abbr} onClick={() => navigate(`/moving-cost/state/${s.slug}`)} className="w-full flex items-center gap-3 group">
                    <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-slate-900 text-left group-hover:text-emerald-700 transition-colors">{s.name}</span>
                    <span className="text-xs text-emerald-700 font-semibold">~${s.truckRentalAvg.toLocaleString()} avg</span>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO copy */}
      <section className="py-10 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How Moving Costs Vary by State</h2>
          <div className="space-y-4 text-sm leading-relaxed text-slate-600">
            <p>Moving costs across the United States vary by a factor of up to 10x for identical truck sizes driven similar distances. The primary driver isn't mileage — it's <strong>truck fleet demand imbalance</strong>. States with high outbound migration (California, New York, New Jersey, Illinois) charge massive premiums because Budget, U-Haul, and Penske need to reposition empty trucks back to high-demand areas after each rental.</p>
            <p>A 26ft Budget truck from <strong>Los Angeles to New York</strong> costs <strong>$10,999</strong> — while the same truck from Atlanta to New York is just <strong>$1,516</strong>. That's a 7x difference for comparable distances. The red route lines on the map above show the most expensive corridors; green lines show the cheapest one-way opportunities.</p>
            <p>Professional movers also vary significantly by state. Our <strong>moving cost calculator</strong> uses real market data — including local labor rates, fuel costs, seasonal demand, and home size — to give you an accurate estimate for your specific move. Whether you're hiring full-service movers or renting a truck, use our <strong>state-by-state pages</strong> to compare both options side by side and find the cheapest way to move.</p>
          </div>
        </div>
      </section>

      {/* Moving Cost Calculator */}
      <MovePriceCalculator />

      {/* FAQ — static HTML for crawler visibility */}
      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Moving Cost Map — Frequently Asked Questions</h2>
            <p className="text-slate-500 text-base max-w-2xl mx-auto">Real answers backed by our live pricing data across all 50 states.</p>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {([
              {
                q: 'What is the cheapest state to move from in 2025?',
                a: 'Based on our 26ft truck rental data, moving from Georgia is among the cheapest in the country. A one-way 26ft truck from Atlanta, GA to New York, NY costs approximately $1,516 — compared to over $10,999 for the same truck from Los Angeles, CA. States like Tennessee, Texas, and Florida also offer lower outbound truck rental rates because rental companies have excess fleet in those markets and incentivize one-way moves out.',
              },
              {
                q: 'Why does a moving truck cost so much more from California than from Georgia?',
                a: 'Truck rental pricing is driven by fleet demand imbalance, not just mileage. California, New York, New Jersey, and Illinois are high outbound migration states — creating a surplus of trucks at the destination and a shortage at the origin. U-Haul, Budget, and Penske charge premium one-way rates from these states to cover the cost of repositioning empty trucks. A 26ft U-Haul from Los Angeles to New York can cost $10,999, while the reverse route is often $3,000–$5,000 less.',
              },
              {
                q: 'How much does it cost to hire movers vs. rent a truck for a long-distance move?',
                a: 'For a 2-bedroom home on a cross-country move (2,000–2,800 miles), professional movers typically cost $6,500–$14,000, while renting a 26ft truck costs $3,000–$11,000 depending on route direction. For shorter moves under 500 miles, hiring movers for a 2BR home averages $1,200–$4,500, while truck rental runs $800–$2,500. Our calculator on this page shows both options side-by-side using real market rates for your specific origin state.',
              },
              {
                q: 'Which states have the highest moving costs?',
                a: 'California, New York, New Jersey, Washington, and Massachusetts consistently have the highest moving costs — both for truck rentals and professional movers. California leads due to high labor rates, long interstate distances, and extreme truck rental demand imbalance. A local move within California for a 2BR home averages $1,200–$2,800, and long-distance truck rentals out of California run $7,800–$10,999 for 26ft trucks headed east.',
              },
              {
                q: 'Which states are the most affordable to move to?',
                a: 'Texas, Florida, Tennessee, Georgia, and the Carolinas are the most affordable destination states for long-distance moves. These are high inbound migration states — Texas is the #1 move-in state in the country — meaning rental companies have plenty of inventory and prices are competitive. Moving into Texas from the Midwest or Southeast can be accomplished for $1,500–$3,500 with a 26ft truck rental, well below the national average.',
              },
              {
                q: 'What is the most expensive moving route in the US?',
                a: 'The California to New York corridor is consistently the most expensive moving route in the US. A 26ft truck rental from Los Angeles to New York City averages $10,999, covering approximately 2,800 miles. Professional full-service movers on this route run $8,000–$14,000 for a 2-bedroom home. The California to Georgia route is the second most expensive at approximately $7,800–$9,500 for a 26ft truck.',
              },
              {
                q: 'What is the cheapest long-distance moving route in the US?',
                a: 'Illinois to Wisconsin (Chicago to Milwaukee area) is the most affordable documented route at approximately $799 for a 26ft truck rental — just 90 miles. For true long-distance routes (over 500 miles), Georgia to New York at roughly $1,516 and Tennessee to Texas at around $2,100 represent the best value corridors. These routes benefit from surplus truck supply at the origin and high demand at the destination.',
              },
              {
                q: 'When is the cheapest time of year to move?',
                a: 'The cheapest months to move are October through February. Moving demand peaks between May and September — especially June, July, and August — when families relocate before the school year. During peak season, truck rental rates can be 20–40% higher and professional movers are often booked weeks in advance. Booking a late fall or winter date can save $500–$2,000 on a long-distance move. Our state pages show the best and worst months for each individual state.',
              },
              {
                q: 'How does home size affect moving costs?',
                a: 'Home size is one of the biggest factors in moving cost. A studio or 1BR apartment typically generates 300–500 cubic feet of goods, requiring a 10–15ft truck and 2 movers. A 2BR home averages 700–900 cubic feet — a 26ft truck and 2–3 movers. A 4BR home can exceed 1,500 cubic feet, requiring 3–4 movers. Every additional bedroom adds approximately $300–$800 to local moves and $1,500–$3,000 to long-distance moves.',
              },
              {
                q: 'What states are people moving to the most in 2025?',
                a: 'According to migration data integrated into our platform, Texas, Florida, North Carolina, South Carolina, and Tennessee are the top inbound migration states in 2025. Texas leads nationally — driven by job growth in Austin, Dallas, and Houston — followed by Florida, which benefits from no state income tax and a growing tech and finance sector. This high inbound demand means these states have well-stocked truck rental fleets and competitive moving company markets, resulting in lower move-in costs.',
              },
              {
                q: 'Should I hire movers or rent a truck for a cross-country move?',
                a: 'For moves over 1,000 miles, renting a truck is almost always cheaper — but requires significantly more effort. On the California to New York route, professional movers cost $8,000–$14,000 while a 26ft truck rental runs $10,999, making movers surprisingly competitive. For shorter long-distance moves (500–1,000 miles), the gap is larger: movers might charge $3,000–$6,000 while a truck rental costs $1,500–$3,000. Key factors: physical help available, comfort driving a large vehicle, and whether you can handle 2–3 days of driving.',
              },
              {
                q: 'How accurate is the moving cost data on this map?',
                a: 'Our state pricing data is calculated using a multi-factor model incorporating: actual U-Haul, Budget, and Penske truck rental rates by state and route direction; US Census American Community Survey (ACS) mobility data for inbound/outbound migration flows; American Housing Survey (AHS) median home square footage by state; real labor market rates for moving crews; and seasonal demand multipliers. Prices are updated regularly and represent realistic estimates for a standard 2-bedroom move.',
              },
            ] as { q: string; a: string }[]).map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none hover:bg-slate-50 transition-colors">
                  <h3 className="text-base font-semibold text-slate-900 leading-snug">{faq.q}</h3>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 group-open:bg-teal-100 flex items-center justify-center transition-colors">
                    <svg className="w-3.5 h-3.5 text-slate-500 group-open:text-teal-600 group-open:rotate-45 transition-transform duration-200" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 1v12M1 7h12" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-1">
                  <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
