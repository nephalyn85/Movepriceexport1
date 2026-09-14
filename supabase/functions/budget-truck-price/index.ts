import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Shared constants ─────────────────────────────────────────────────────────

const DEFAULT_DIESEL = 3.75;

const truckMpg: Record<string, number> = {
  "10": 12, "12": 12, "15": 10, "16": 10, "20": 9, "22": 9, "26": 8,
};

// ── Budget Pricing Engine (region-aware, demand-multiplier model) ─────────────
//
// Derived from real budgettruck.com quotes (April 2026).
// price = max(FLOOR[size], neutral_baseline(miles, size) × corridor_multiplier)
//
// Neutral baseline calibrated on Atlanta routes (demand-neutral city), R² > 0.998.

type Region = "NE" | "SE" | "FL" | "MW" | "SW" | "MT" | "PA" | "NW";

const STATE_REGION: Record<string, Region> = {
  ME:"NE",NH:"NE",VT:"NE",MA:"NE",RI:"NE",CT:"NE",NY:"NE",NJ:"NE",PA:"NE",DE:"NE",MD:"NE",DC:"NE",
  VA:"SE",WV:"SE",NC:"SE",SC:"SE",GA:"SE",AL:"SE",MS:"SE",TN:"SE",KY:"SE",AR:"SE",LA:"SE",
  FL:"FL",
  OH:"MW",IN:"MW",IL:"MW",MI:"MW",WI:"MW",MN:"MW",IA:"MW",MO:"MW",ND:"MW",SD:"MW",NE:"MW",KS:"MW",
  TX:"SW",OK:"SW",NM:"SW",AZ:"SW",
  CO:"MT",UT:"MT",WY:"MT",ID:"MT",MT:"MT",
  CA:"PA",NV:"PA",
  WA:"NW",OR:"NW",AK:"NW",HI:"NW",
};

function getRegion(state: string): Region {
  return STATE_REGION[state.toUpperCase()] ?? "MW";
}

const BASELINE: Record<string, { fixed: number; perMile: number; floor: number }> = {
  "12": { fixed: 316.56, perMile: 0.5500, floor: 119 },
  "16": { fixed: 335.51, perMile: 0.5777, floor: 125 },
  "26": { fixed: 618.87, perMile: 1.0714, floor: 799 },
};

// [mult_12ft, mult_16ft, mult_26ft] — calibrated per truck size from real data
const DEMAND_MULT: Record<string, [number, number, number]> = {
  "NE->NE":[0.52,1.27,1.24], "NE->SE":[2.20,2.41,2.95], "NE->FL":[2.20,2.41,2.95],
  "NE->MW":[1.00,1.00,1.00], "NE->SW":[1.10,1.18,2.12], "NE->MT":[1.00,1.00,1.00],
  "NE->PA":[1.00,1.00,1.00], "NE->NW":[1.00,1.00,1.00],
  "SE->NE":[0.98,0.98,0.98], "SE->SE":[1.10,1.10,1.10], "SE->FL":[1.10,1.10,1.10],
  "SE->MW":[1.00,1.00,1.00], "SE->SW":[1.00,1.00,1.00], "SE->MT":[1.00,1.00,1.00],
  "SE->PA":[1.00,1.00,1.00], "SE->NW":[0.98,0.98,0.98],
  "FL->NE":[1.20,1.19,1.58], "FL->SE":[1.20,1.19,1.58], "FL->FL":[1.10,1.10,1.10],
  "FL->MW":[1.20,1.19,1.58], "FL->SW":[1.20,1.19,1.58], "FL->MT":[1.20,1.19,1.58],
  "FL->PA":[1.20,1.19,1.58], "FL->NW":[1.20,1.19,1.58],
  "PA->NE":[2.17,2.39,3.04], "PA->SE":[2.22,2.44,3.16], "PA->FL":[2.22,2.44,3.16],
  "PA->MW":[2.00,2.20,2.80], "PA->SW":[1.40,1.50,1.80], "PA->MT":[1.30,1.40,1.70],
  "PA->PA":[0.93,1.02,0.90], "PA->NW":[1.10,1.15,1.30],
  "NW->NE":[1.39,1.39,1.87], "NW->SE":[1.39,1.39,1.87], "NW->FL":[1.39,1.39,1.87],
  "NW->MW":[1.20,1.20,1.50], "NW->SW":[1.10,1.10,1.30], "NW->MT":[1.00,1.00,1.00],
  "NW->PA":[1.00,1.00,1.00], "NW->NW":[1.00,1.00,1.00],
  "SW->NE":[1.35,1.62,2.15], "SW->SE":[1.20,1.30,1.60], "SW->FL":[1.20,1.30,1.60],
  "SW->MW":[1.00,1.00,1.00], "SW->SW":[1.00,1.00,1.00], "SW->MT":[1.00,1.00,1.00],
  "SW->PA":[1.00,1.00,1.00], "SW->NW":[1.00,1.00,1.00],
  "MW->NE":[1.00,1.10,1.27], "MW->SE":[1.00,1.05,1.15], "MW->FL":[1.00,1.05,1.15],
  "MW->SW":[0.85,0.85,0.90], "MW->MT":[0.85,0.85,0.90],
  "MW->PA":[1.00,1.00,1.00], "MW->NW":[0.85,0.85,0.90],
  "MT->NE":[1.10,1.10,1.30], "MT->SE":[1.10,1.10,1.30], "MT->FL":[1.10,1.10,1.30],
  "MT->MW":[1.00,1.00,1.00], "MT->SW":[1.00,1.00,1.00], "MT->MT":[1.00,1.00,1.00],
  "MT->PA":[1.00,1.00,1.00], "MT->NW":[1.00,1.00,1.00],
};

function neutralPrice(miles: number, size: string): number {
  const b = BASELINE[size];
  if (!b) return 0;
  return Math.max(b.floor, b.fixed + b.perMile * miles);
}

function calculateBudgetPrice(miles: number, size: string, fromState: string, toState: string): number {
  if (miles <= 0 || !BASELINE[size]) return 0;
  const fr = getRegion(fromState);
  const tr = getRegion(toState);

  // MW->MW: distance-tiered multipliers (fleet rebalancing behavior)
  if (fr === "MW" && tr === "MW") {
    const b = BASELINE[size];
    if (!b) return 0;
    const n = neutralPrice(miles, size);
    const mult = miles < 200 ? 0.32 : miles <= 500 ? 1.02 : 0.72;
    return Math.max(b.floor, Math.round(n * mult));
  }

  const key = `${fr}->${tr}`;
  const entry = DEMAND_MULT[key] ?? [1.0, 1.0, 1.0];
  const mult = size === "12" ? entry[0] : size === "16" ? entry[1] : entry[2];
  return Math.round(neutralPrice(miles, size) * mult);
}

// ── U-Haul pricing table (10 / 15 / 20 / 26 ft) — ACTUAL driving miles ───────

const uhaulTable: { miles: number; prices: Record<string, number> }[] = [
  { miles: 57,   prices: { "10": 166,  "15": 178,  "20": 218,  "26": 261  } },
  { miles: 111,  prices: { "10": 228,  "15": 299,  "20": 374,  "26": 450  } },
  { miles: 228,  prices: { "10": 306,  "15": 370,  "20": 462,  "26": 554  } },
  { miles: 415,  prices: { "10": 612,  "15": 644,  "20": 805,  "26": 966  } },
  { miles: 577,  prices: { "10": 866,  "15": 911,  "20": 1139, "26": 1367 } },
  { miles: 707,  prices: { "10": 970,  "15": 1020, "20": 1330, "26": 1640 } },
  { miles: 806,  prices: { "10": 1050, "15": 1105, "20": 1440, "26": 1770 } },
  { miles: 860,  prices: { "10": 1080, "15": 1140, "20": 1480, "26": 1820 } },
  { miles: 1017, prices: { "10": 1112, "15": 1170, "20": 1521, "26": 1872 } },
  { miles: 1077, prices: { "10": 1750, "15": 1843, "20": 2395, "26": 3132 } },
  { miles: 1646, prices: { "10": 2074, "15": 2184, "20": 2839, "26": 3712 } },
  { miles: 1891, prices: { "10": 2275, "15": 2395, "20": 3114, "26": 4072 } },
  { miles: 1924, prices: { "10": 2302, "15": 2423, "20": 3150, "26": 4119 } },
  { miles: 2254, prices: { "10": 2547, "15": 2681, "20": 3486, "26": 4558 } },
  { miles: 2624, prices: { "10": 2824, "15": 2973, "20": 3865, "26": 5054 } },
  { miles: 2790, prices: { "10": 3200, "15": 3800, "20": 4600, "26": 5499 } },
];

// ── Penske pricing table (12 / 16 / 22 / 26 ft) — ACTUAL driving miles ───────

const penskeTable: { miles: number; prices: Record<string, number> }[] = [
  { miles: 57,   prices: { "12": 185,  "16": 220,  "22": 355,  "26": 355  } },
  { miles: 111,  prices: { "12": 260,  "16": 340,  "22": 598,  "26": 598  } },
  { miles: 228,  prices: { "12": 350,  "16": 422,  "22": 737,  "26": 737  } },
  { miles: 415,  prices: { "12": 700,  "16": 735,  "22": 1279, "26": 1279 } },
  { miles: 577,  prices: { "12": 990,  "16": 1041, "22": 1810, "26": 1810 } },
  { miles: 707,  prices: { "12": 1108, "16": 1165, "22": 2114, "26": 2114 } },
  { miles: 806,  prices: { "12": 1200, "16": 1262, "22": 2288, "26": 2288 } },
  { miles: 860,  prices: { "12": 1234, "16": 1302, "22": 2350, "26": 2350 } },
  { miles: 1017, prices: { "12": 1270, "16": 1337, "22": 2416, "26": 2416 } },
  { miles: 1077, prices: { "12": 1820, "16": 2050, "22": 3200, "26": 3200 } },
  { miles: 1570, prices: { "12": 2450, "16": 2820, "22": 4200, "26": 4200 } },
  { miles: 1646, prices: { "12": 2530, "16": 2910, "22": 4320, "26": 4320 } },
  { miles: 1891, prices: { "12": 2820, "16": 3240, "22": 4810, "26": 4810 } },
  { miles: 1924, prices: { "12": 2860, "16": 3280, "22": 4860, "26": 4860 } },
  { miles: 2254, prices: { "12": 3080, "16": 3540, "22": 5250, "26": 5250 } },
  { miles: 2459, prices: { "12": 3589, "16": 4125, "22": 6091, "26": 6091 } },
  { miles: 2730, prices: { "12": 3303, "16": 3798, "22": 5615, "26": 5615 } },
  { miles: 2790, prices: { "12": 3850, "16": 4900, "22": 6800, "26": 6800 } },
];

// ── Truck size mappings ───────────────────────────────────────────────────────

const BUDGET_SIZES = ["12", "16", "26"];
const UHAUL_SIZES  = ["10", "15", "20", "26"];
const PENSKE_SIZES = ["12", "16", "22", "26"];

// ── Table interpolation (U-Haul and Penske only) ─────────────────────────────

function interpolate(
  table: { miles: number; prices: Record<string, number> }[],
  rawMiles: number,
  size: string,
): number {
  const clamped = Math.min(Math.round(rawMiles), table[table.length - 1].miles);
  for (let i = 0; i < table.length; i++) {
    const row = table[i];
    if (clamped <= row.miles) {
      if (i === 0) return row.prices[size] ?? 0;
      const prev = table[i - 1];
      const prevPrice = prev.prices[size] ?? 0;
      const rowPrice  = row.prices[size]  ?? 0;
      if (!prevPrice || !rowPrice) return rowPrice || prevPrice || 0;
      const t = (clamped - prev.miles) / (row.miles - prev.miles);
      return Math.round(prevPrice + t * (rowPrice - prevPrice));
    }
  }
  return table[table.length - 1].prices[size] ?? 0;
}

function fuelRange(miles: number, size: string, diesel = DEFAULT_DIESEL): [number, number] {
  const mpg = truckMpg[size] ?? 10;
  const gallons = miles / mpg;
  return [Math.round(gallons * diesel * 0.9), Math.round(gallons * diesel * 1.15)];
}

// ── Distance helpers ─────────────────────────────────────────────────────────

async function getZipCoords(zip: string): Promise<{ lat: number; lng: number; city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      city: place["place name"],
      state: place["state abbreviation"],
    };
  } catch { return null; }
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.2);
}

async function getDrivingMiles(
  origin: string,
  destination: string,
): Promise<{ miles: number; source: string; from: { city: string; state: string } | null; to: { city: string; state: string } | null }> {
  const [from, to] = await Promise.all([getZipCoords(origin), getZipCoords(destination)]);
  if (!from || !to) return { miles: 0, source: "error", from: null, to: null };

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]) {
        return {
          miles: Math.round(data.routes[0].distance / 1609.344),
          source: "osrm",
          from: { city: from.city, state: from.state },
          to: { city: to.city, state: to.state },
        };
      }
    }
  } catch { /* fall through to haversine */ }

  return {
    miles: haversineMiles(from.lat, from.lng, to.lat, to.lng),
    source: "estimated",
    from: { city: from.city, state: from.state },
    to: { city: to.city, state: to.state },
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url  = new URL(req.url);
    const path = url.pathname.replace(/^\/budget-truck-price/, "") || "/";
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ── GET /price?origin=ZIP&destination=ZIP&carrier=budget|uhaul|penske&truck=SIZE
    if (path === "/price" && req.method === "GET") {
      const origin      = url.searchParams.get("origin") ?? "";
      const destination = url.searchParams.get("destination") ?? "";
      const carrier     = (url.searchParams.get("carrier") ?? "budget").toLowerCase();
      const truck       = url.searchParams.get("truck") ?? "";

      if (!origin || !destination) {
        return json({ error: "origin and destination zip codes are required" }, 400);
      }
      const validCarriers = ["budget", "uhaul", "penske"];
      if (!validCarriers.includes(carrier)) {
        return json({ error: `carrier must be one of: ${validCarriers.join(", ")}` }, 400);
      }
      const sizeMap: Record<string, string[]> = { budget: BUDGET_SIZES, uhaul: UHAUL_SIZES, penske: PENSKE_SIZES };
      if (!truck || !sizeMap[carrier].includes(truck)) {
        return json({ error: `For ${carrier}, truck must be one of: ${sizeMap[carrier].join(", ")}` }, 400);
      }

      const { miles, source, from, to } = await getDrivingMiles(origin, destination);
      if (miles === 0) return json({ error: "Could not resolve one or both zip codes" }, 400);

      let rental: number;
      if (carrier === "budget") {
        rental = calculateBudgetPrice(miles, truck, from?.state ?? "GA", to?.state ?? "GA");
      } else {
        const tableMap = { uhaul: uhaulTable, penske: penskeTable };
        rental = interpolate(tableMap[carrier as "uhaul" | "penske"], miles, truck);
      }

      const [fuelLow, fuelHigh] = fuelRange(miles, truck);
      return json({ carrier, truck: `${truck}ft`, miles, distanceSource: source, from, to, rental, fuelEstimate: { low: fuelLow, high: fuelHigh }, totalEstimate: { low: rental + fuelLow, high: rental + fuelHigh } });
    }

    // ── GET /compare?origin=ZIP&destination=ZIP&size=small|medium|large
    if (path === "/compare" && req.method === "GET") {
      const origin      = url.searchParams.get("origin") ?? "";
      const destination = url.searchParams.get("destination") ?? "";
      const size        = (url.searchParams.get("size") ?? "medium").toLowerCase();

      if (!origin || !destination) {
        return json({ error: "origin and destination zip codes are required" }, 400);
      }
      const sizeToTrucks: Record<string, { budget: string; uhaul: string; penske: string; label: string }> = {
        small:  { budget: "12", uhaul: "10", penske: "12", label: "Small (studio / 1 BR)" },
        medium: { budget: "16", uhaul: "15", penske: "16", label: "Medium (1–2 BR)" },
        large:  { budget: "26", uhaul: "26", penske: "26", label: "Large (3–4 BR)" },
      };
      if (!sizeToTrucks[size]) {
        return json({ error: "size must be one of: small, medium, large" }, 400);
      }

      const trucks = sizeToTrucks[size];
      const { miles, source, from, to } = await getDrivingMiles(origin, destination);
      if (miles === 0) return json({ error: "Could not resolve one or both zip codes" }, 400);

      const budget = calculateBudgetPrice(miles, trucks.budget, from?.state ?? "GA", to?.state ?? "GA");
      const uhaul  = interpolate(uhaulTable,  miles, trucks.uhaul);
      const penske = interpolate(penskeTable, miles, trucks.penske);

      const carriers = [
        { name: "Budget",  truck: `${trucks.budget}ft`, rental: budget },
        { name: "U-Haul",  truck: `${trucks.uhaul}ft`,  rental: uhaul  },
        { name: "Penske",  truck: `${trucks.penske}ft`, rental: penske },
      ];
      const cheapest = carriers.reduce((a, b) => (a.rental <= b.rental ? a : b)).name;

      return json({ size: trucks.label, miles, distanceSource: source, from, to, carriers, cheapest });
    }

    return json({
      error: "Not found",
      endpoints: [
        "GET /price?origin=ZIP&destination=ZIP&carrier=budget|uhaul|penske&truck=SIZE",
        "GET /compare?origin=ZIP&destination=ZIP&size=small|medium|large",
      ],
    }, 404);

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
