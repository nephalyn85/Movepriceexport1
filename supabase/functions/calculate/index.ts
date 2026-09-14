import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type TruckSize = "12" | "16" | "22" | "26";
type Season = "peak" | "shoulder" | "offpeak";

const truckSizes: Record<TruckSize, { label: string; mpg: number }> = {
  "12": { label: "12 ft", mpg: 13 },
  "16": { label: "16 ft", mpg: 10 },
  "22": { label: "22 ft", mpg: 8  },
  "26": { label: "26 ft", mpg: 7  },
};

const penskePricingTable: { miles: number; days: number; prices: Record<TruckSize, number> }[] = [
  { miles: 64,   days: 1,  prices: { "12": 185,  "16": 220,  "22": 355,  "26": 355  } },
  { miles: 124,  days: 2,  prices: { "12": 260,  "16": 340,  "22": 598,  "26": 598  } },
  { miles: 254,  days: 2,  prices: { "12": 350,  "16": 422,  "22": 737,  "26": 737  } },
  { miles: 463,  days: 3,  prices: { "12": 700,  "16": 735,  "22": 1279, "26": 1279 } },
  { miles: 644,  days: 4,  prices: { "12": 990,  "16": 1041, "22": 1810, "26": 1810 } },
  { miles: 790,  days: 4,  prices: { "12": 1108, "16": 1165, "22": 2114, "26": 2114 } },
  { miles: 900,  days: 5,  prices: { "12": 1200, "16": 1262, "22": 2288, "26": 2288 } },
  { miles: 961,  days: 5,  prices: { "12": 1234, "16": 1302, "22": 2350, "26": 2350 } },
  { miles: 1136, days: 5,  prices: { "12": 1270, "16": 1337, "22": 2416, "26": 2416 } },
  { miles: 1202, days: 6,  prices: { "12": 1820, "16": 2050, "22": 3200, "26": 3200 } },
  { miles: 1754, days: 8,  prices: { "12": 2450, "16": 2820, "22": 4200, "26": 4200 } },
  { miles: 1838, days: 8,  prices: { "12": 2530, "16": 2910, "22": 4320, "26": 4320 } },
  { miles: 2112, days: 9,  prices: { "12": 2820, "16": 3240, "22": 4810, "26": 4810 } },
  { miles: 2149, days: 9,  prices: { "12": 2860, "16": 3280, "22": 4860, "26": 4860 } },
  { miles: 2518, days: 10, prices: { "12": 3080, "16": 3540, "22": 5250, "26": 5250 } },
  { miles: 2746, days: 10, prices: { "12": 3825, "16": 4397, "22": 6091, "26": 6091 } },
  { miles: 2931, days: 11, prices: { "12": 3303, "16": 3798, "22": 5615, "26": 5615 } },
  { miles: 3326, days: 12, prices: { "12": 3650, "16": 4200, "22": 6200, "26": 6200 } },
];

function lookupPenskePrice(miles: number, size: TruckSize): { price: number; days: number } {
  const adjusted = Math.round(miles);
  for (let i = 0; i < penskePricingTable.length; i++) {
    const row = penskePricingTable[i];
    if (adjusted <= row.miles) {
      if (i === 0) return { price: row.prices[size], days: row.days };
      const prev = penskePricingTable[i - 1];
      const t = (adjusted - prev.miles) / (row.miles - prev.miles);
      return {
        price: Math.round(prev.prices[size] + t * (row.prices[size] - prev.prices[size])),
        days: row.days,
      };
    }
  }
  const last = penskePricingTable[penskePricingTable.length - 1];
  const secondLast = penskePricingTable[penskePricingTable.length - 2];
  const slope = (last.prices[size] - secondLast.prices[size]) / (last.miles - secondLast.miles);
  return {
    price: Math.round(last.prices[size] + slope * (adjusted - last.miles)),
    days: last.days,
  };
}

const seasonMultipliers: Record<Season, number> = { peak: 1.22, shoulder: 1.08, offpeak: 0.92 };

function getSeason(month: number): Season {
  if (month >= 5 && month <= 8) return "peak";
  if (month === 4 || month === 9 || month === 10) return "shoulder";
  return "offpeak";
}

const distanceBands = [
  { maxMiles: 50,       label: "Local"          },
  { maxMiles: 150,      label: "Short Regional" },
  { maxMiles: 350,      label: "Regional"       },
  { maxMiles: 700,      label: "Long Regional"  },
  { maxMiles: 1300,     label: "Interstate"     },
  { maxMiles: 2000,     label: "Long Distance"  },
  { maxMiles: Infinity, label: "Cross Country"  },
];

function getDistanceBandLabel(miles: number): string {
  return (distanceBands.find(b => miles <= b.maxMiles) ?? distanceBands[distanceBands.length - 1]).label;
}

const stateZones: Record<string, number> = {
  ME:1,NH:1,VT:1,MA:1,RI:1,CT:1,NY:1,NJ:1,PA:1,DE:1,MD:1,DC:1,
  VA:2,WV:2,NC:2,SC:2,GA:2,FL:2,AL:2,MS:2,TN:2,KY:2,
  OH:3,IN:3,IL:3,MI:3,WI:3,MN:3,IA:3,MO:3,ND:3,SD:3,NE:3,KS:3,
  TX:4,OK:4,AR:4,LA:4,
  CO:5,UT:5,NV:5,AZ:5,NM:5,ID:5,MT:5,WY:5,
  CA:6,HI:6,
  WA:7,OR:7,AK:7,
};

function getCorridorKey(fromState: string, toState: string): string {
  const fz = stateZones[fromState.toUpperCase()] ?? 3;
  const tz = stateZones[toState.toUpperCase()] ?? 3;
  return `${fz}-${tz}`;
}

interface ZipData { lat: number; lng: number; city: string; state: string; }

async function getZipCoords(zip: string): Promise<ZipData | null> {
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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getDrivingMiles(from: ZipData, to: ZipData): Promise<{ miles: number; source: string }> {
  try {
    const body = {
      locations: [
        { lon: from.lng, lat: from.lat },
        { lon: to.lng, lat: to.lat },
      ],
      costing: "auto",
      directions_options: { units: "miles" },
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch("https://valhalla1.openstreetmap.de/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const legs = data.trip?.legs;
      if (legs?.length) {
        const miles = legs.reduce((s: number, l: { summary: { length: number } }) => s + l.summary.length, 0);
        return { miles: Math.round(miles), source: "valhalla" };
      }
    }
  } catch { /* fallthrough */ }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]) {
        return { miles: Math.round(data.routes[0].distance / 1609.344), source: "osrm" };
      }
    }
  } catch { /* fallthrough */ }

  const straightM = haversine(from.lat, from.lng, to.lat, to.lng);
  return { miles: Math.round((straightM / 1609.344) * 1.2), source: "estimated" };
}

function normalizeTruckSize(input: string): TruckSize {
  const s = input.replace(/ft|'/gi, "").trim();
  const map: Record<string, TruckSize> = { "10": "12", "12": "12", "15": "16", "16": "16", "20": "22", "22": "22", "26": "26" };
  return map[s] ?? "16";
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { origin_zip, destination_zip, truck_size } = body;

    if (!origin_zip || !destination_zip || !truck_size) {
      return new Response(JSON.stringify({ error: "origin_zip, destination_zip, and truck_size are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [fromData, toData] = await Promise.all([getZipCoords(origin_zip), getZipCoords(destination_zip)]);

    if (!fromData) return new Response(JSON.stringify({ error: `Invalid origin zip: ${origin_zip}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!toData)   return new Response(JSON.stringify({ error: `Invalid destination zip: ${destination_zip}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { miles, source: distanceSource } = await getDrivingMiles(fromData, toData);
    const truckKey = normalizeTruckSize(String(truck_size));
    const truck = truckSizes[truckKey];

    const { price: rentalBase, days: rentalDays } = lookupPenskePrice(miles, truckKey);

    const month = new Date().getMonth() + 1;
    const season = getSeason(month);
    const seasonMult = seasonMultipliers[season];

    const seasonAdjustedBase = Math.round(rentalBase * seasonMult);

    const fuelGallons = miles / truck.mpg;
    const diesel = 3.75;
    const fuelMin = Math.round(fuelGallons * diesel * 0.92);
    const fuelMax = Math.round(fuelGallons * diesel * 1.12);

    const totalMin = seasonAdjustedBase + fuelMin;
    const totalMax = seasonAdjustedBase + fuelMax;

    return new Response(JSON.stringify({
      estimated_price: Math.round((totalMin + totalMax) / 2),
      range: { low: totalMin, high: totalMax },
      rental_base: seasonAdjustedBase,
      fuel_estimate: { low: fuelMin, high: fuelMax },
      miles,
      distance_source: distanceSource,
      rental_days: rentalDays,
      truck_size: truck.label,
      season,
      distance_band: getDistanceBandLabel(miles),
      corridor: getCorridorKey(fromData.state, toData.state),
      from: { zip: origin_zip, city: fromData.city, state: fromData.state },
      to: { zip: destination_zip, city: toData.city, state: toData.state },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
