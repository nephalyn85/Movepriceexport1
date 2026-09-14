import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ZipCodeData {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

interface Waypoint {
  lat: number;
  lon: number;
}

async function getZipCodeCoordinates(zipCode: string): Promise<ZipCodeData | null> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!response.ok) return null;
    const data = await response.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      city: place["place name"],
      state: place["state abbreviation"],
    };
  } catch {
    return null;
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolateWaypoint(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  fraction: number
): Waypoint {
  return {
    lat: lat1 + (lat2 - lat1) * fraction,
    lon: lon1 + (lon2 - lon1) * fraction,
  };
}

async function getValhallaSegmentDistance(
  from: Waypoint,
  to: Waypoint
): Promise<number | null> {
  try {
    const body = {
      locations: [
        { lon: from.lon, lat: from.lat },
        { lon: to.lon, lat: to.lat },
      ],
      costing: "auto",
      directions_options: { units: "miles" },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("https://valhalla1.openstreetmap.de/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const legs = data.trip?.legs;
    if (!legs || legs.length === 0) return null;

    const totalMiles = legs.reduce((sum: number, leg: { summary: { length: number } }) => sum + leg.summary.length, 0);
    return totalMiles;
  } catch {
    return null;
  }
}

const MAX_VALHALLA_METERS = 1400000;

async function getValhallaDrivingDistance(
  fromLat: number, fromLon: number,
  toLat: number, toLon: number
): Promise<number | null> {
  const straightMeters = haversineDistance(fromLat, fromLon, toLat, toLon);

  if (straightMeters <= MAX_VALHALLA_METERS) {
    return getValhallaSegmentDistance(
      { lat: fromLat, lon: fromLon },
      { lat: toLat, lon: toLon }
    );
  }

  const numSegments = Math.ceil(straightMeters / MAX_VALHALLA_METERS) + 1;
  const waypoints: Waypoint[] = [];

  for (let i = 0; i <= numSegments; i++) {
    const fraction = i / numSegments;
    waypoints.push(interpolateWaypoint(fromLat, fromLon, toLat, toLon, fraction));
  }

  let totalMiles = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const segMiles = await getValhallaSegmentDistance(waypoints[i], waypoints[i + 1]);
    if (segMiles === null) return null;
    totalMiles += segMiles;
  }

  return totalMiles;
}

async function getOsrmDrivingDistance(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    return data.routes[0].distance / 1609.344;
  } catch {
    return null;
  }
}

function fallbackDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const straightMeters = haversineDistance(lat1, lon1, lat2, lon2);
  const straightMiles = straightMeters / 1609.344;
  return Math.round(straightMiles * 1.2);
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fromZip, toZip } = await req.json();

    if (!fromZip || !toZip) {
      return new Response(
        JSON.stringify({ error: "Both fromZip and toZip are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [fromData, toData] = await Promise.all([
      getZipCodeCoordinates(fromZip),
      getZipCodeCoordinates(toZip),
    ]);

    if (!fromData) {
      return new Response(
        JSON.stringify({ error: `Invalid origin zip code: ${fromZip}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!toData) {
      return new Response(
        JSON.stringify({ error: `Invalid destination zip code: ${toZip}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (fromZip === toZip) {
      return new Response(
        JSON.stringify({
          distance: 0,
          from: { zip: fromZip, city: fromData.city, state: fromData.state, lat: fromData.lat, lng: fromData.lng },
          to: { zip: toZip, city: toData.city, state: toData.state, lat: toData.lat, lng: toData.lng },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let distance: number | null = null;
    let source = "valhalla";

    distance = await getValhallaDrivingDistance(
      fromData.lat, fromData.lng,
      toData.lat, toData.lng
    );

    if (distance === null) {
      source = "osrm";
      distance = await getOsrmDrivingDistance(
        fromData.lat, fromData.lng,
        toData.lat, toData.lng
      );
    }

    if (distance === null) {
      source = "estimated";
      distance = fallbackDistance(fromData.lat, fromData.lng, toData.lat, toData.lng);
    }

    return new Response(
      JSON.stringify({
        distance: Math.round(distance),
        source,
        from: {
          zip: fromZip,
          city: fromData.city,
          state: fromData.state,
          lat: fromData.lat,
          lng: fromData.lng,
        },
        to: {
          zip: toZip,
          city: toData.city,
          state: toData.state,
          lat: toData.lat,
          lng: toData.lng,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
