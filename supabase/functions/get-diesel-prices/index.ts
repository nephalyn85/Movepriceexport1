import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CACHE_TTL_HOURS = 6;

const EIA_REGIONS: Record<string, { name: string; seriesId: string; lat: number; lng: number }> = {
  east_coast:  { name: "East Coast",       seriesId: "EMD_EPD2D_PTE_R10_DPG", lat: 38.5,  lng: -77.0  },
  new_england: { name: "New England",      seriesId: "EMD_EPD2D_PTE_R1X_DPG", lat: 43.5,  lng: -71.5  },
  central_atl: { name: "Central Atlantic", seriesId: "EMD_EPD2D_PTE_R1Y_DPG", lat: 40.0,  lng: -75.5  },
  lower_atl:   { name: "Lower Atlantic",   seriesId: "EMD_EPD2D_PTE_R1Z_DPG", lat: 33.5,  lng: -84.0  },
  midwest:     { name: "Midwest",          seriesId: "EMD_EPD2D_PTE_R20_DPG", lat: 41.5,  lng: -87.5  },
  gulf_coast:  { name: "Gulf Coast",       seriesId: "EMD_EPD2D_PTE_R30_DPG", lat: 30.0,  lng: -92.0  },
  rocky_mtn:   { name: "Rocky Mountain",   seriesId: "EMD_EPD2D_PTE_R40_DPG", lat: 41.5,  lng: -106.0 },
  west_coast:  { name: "West Coast",       seriesId: "EMD_EPD2D_PTE_R50_DPG", lat: 37.5,  lng: -120.0 },
  california:  { name: "California",       seriesId: "EMD_EPD2D_PTE_SCA_DPG", lat: 36.5,  lng: -119.5 },
};

const STATIC_FALLBACK_PRICES: Record<string, number> = {
  east_coast:  5.50,
  new_england: 5.86,
  central_atl: 5.87,
  lower_atl:   5.33,
  midwest:     5.74,
  gulf_coast:  5.18,
  rocky_mtn:   5.52,
  west_coast:  6.63,
  california:  7.36,
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRegionsAlongRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): string[] {
  const steps = 8;
  const covered = new Set<string>();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = fromLat + (toLat - fromLat) * t;
    const lng = fromLng + (toLng - fromLng) * t;

    let closest = "";
    let minDist = Infinity;
    for (const [key, region] of Object.entries(EIA_REGIONS)) {
      const d = haversine(lat, lng, region.lat, region.lng);
      if (d < minDist) { minDist = d; closest = key; }
    }
    if (closest) covered.add(closest);
  }

  return Array.from(covered);
}

async function fetchFromEIA(regionKey: string): Promise<{ price: number | null; period: string | null }> {
  try {
    const region = EIA_REGIONS[regionKey];
    const apiKey = Deno.env.get("EIA_API_KEY") || "DEMO_KEY";
    const url = `https://api.eia.gov/v2/petroleum/pri/gnd/data/?frequency=weekly&data[0]=value&facets[series][]=${region.seriesId}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1&api_key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return { price: null, period: null };
    const json = await resp.json();
    const rows = json?.response?.data;
    if (!rows || rows.length === 0) return { price: null, period: null };
    const price = parseFloat(rows[0].value);
    return { price: isNaN(price) ? null : price, period: rows[0].period ?? null };
  } catch {
    return { price: null, period: null };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { fromLat, fromLng, toLat, toLng } = await req.json();

    if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
      return new Response(JSON.stringify({ error: "Missing coordinates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const relevantRegionKeys = getRegionsAlongRoute(fromLat, fromLng, toLat, toLng);
    const now = new Date();
    const cacheExpiry = new Date(now.getTime() - CACHE_TTL_HOURS * 60 * 60 * 1000);

    const { data: cachedRows } = await supabase
      .from("diesel_price_cache")
      .select("*")
      .in("region_key", relevantRegionKeys);

    const cachedMap = new Map<string, { price: number | null; period: string | null; fetched_at: string }>();
    for (const row of cachedRows ?? []) {
      cachedMap.set(row.region_key, row);
    }

    const staleKeys = relevantRegionKeys.filter((key) => {
      const cached = cachedMap.get(key);
      if (!cached) return true;
      return new Date(cached.fetched_at) < cacheExpiry;
    });

    if (staleKeys.length > 0) {
      const freshResults = await Promise.all(
        staleKeys.map(async (key) => {
          const { price, period } = await fetchFromEIA(key);
          return { key, price, period };
        })
      );

      const upsertRows = freshResults.map(({ key, price, period }) => ({
        region_key: key,
        region_name: EIA_REGIONS[key].name,
        price: price ?? STATIC_FALLBACK_PRICES[key] ?? null,
        period: period ?? "fallback",
        lat: EIA_REGIONS[key].lat,
        lng: EIA_REGIONS[key].lng,
        fetched_at: now.toISOString(),
      }));

      await supabase.from("diesel_price_cache").upsert(upsertRows, { onConflict: "region_key" });

      for (const row of upsertRows) {
        cachedMap.set(row.region_key, { price: row.price, period: row.period, fetched_at: row.fetched_at });
      }
    }

    const prices = relevantRegionKeys.map((key) => {
      const cached = cachedMap.get(key);
      const region = EIA_REGIONS[key];
      const price = cached?.price ?? STATIC_FALLBACK_PRICES[key] ?? null;
      return {
        key,
        name: region.name,
        lat: region.lat,
        lng: region.lng,
        price,
        period: cached?.period ?? "fallback",
      };
    });

    const validPrices = prices.filter((p) => p.price != null) as { price: number }[];
    const avgPrice = validPrices.length > 0
      ? Math.round((validPrices.reduce((s, p) => s + p.price, 0) / validPrices.length) * 100) / 100
      : 3.75;

    return new Response(JSON.stringify({ regions: prices, avgDieselPrice: avgPrice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
