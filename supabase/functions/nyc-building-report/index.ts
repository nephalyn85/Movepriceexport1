import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOCRATA = "https://data.cityofnewyork.us/resource";

// NYC GeoSearch — normalizes address and returns BBL, lat/lng, borough
async function geocodeAddress(address: string) {
  const url = `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(address)}&size=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data?.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;

  // BBL = 10-digit: 1-digit borough + 5-digit block + 4-digit lot
  const bbl = props.addendum?.pad?.bbl ?? null;
  const boroughCode = bbl ? String(bbl)[0] : null;
  const block = bbl ? String(bbl).slice(1, 6) : null;
  const lot = bbl ? String(bbl).slice(6) : null;

  return {
    displayAddress: props.label ?? address,
    houseNumber: props.housenumber ?? "",
    streetName: props.street ?? "",
    borough: props.borough ?? "",
    borough_code: boroughCode,
    zip: props.postalcode ?? "",
    bbl,
    block,
    lot,
    lat,
    lng,
    neighborhood: props.neighbourhood ?? props.locality ?? "",
  };
}

// Fetch with timeout so one slow API doesn't block everything
async function fetchJSON(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function socrataUrl(dataset: string, params: Record<string, string>) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${SOCRATA}/${dataset}.json?${qs}`;
}

// Haversine distance in meters between two lat/lng points
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Score 0–100 based on closest subway entrance and count within 400m
function calcTransitScore(
  entrances: Array<{ lat: number; lon: number }>,
  buildingLat: number,
  buildingLon: number
): number {
  if (entrances.length === 0) return 20;

  const distances = entrances.map(e => distanceMeters(buildingLat, buildingLon, e.lat, e.lon));
  const closest = Math.min(...distances);
  const within400 = distances.filter(d => d <= 400).length;

  let base: number;
  if (closest <= 100) base = 98;
  else if (closest <= 200) base = 90;
  else if (closest <= 350) base = 80;
  else if (closest <= 500) base = 68;
  else if (closest <= 700) base = 52;
  else base = 35;

  // Bonus for multiple nearby entrances (more lines = better access)
  const countBonus = within400 >= 7 ? 10 : within400 >= 4 ? 6 : within400 >= 2 ? 3 : 0;

  return Math.min(100, Math.round(base + countBonus));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const address = body?.address?.trim();
  if (!address || address.length < 5) {
    return new Response(JSON.stringify({ error: "Address too short" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Step 1: geocode
  const geo = await geocodeAddress(address);
  if (!geo) {
    return new Response(JSON.stringify({ error: "Could not geocode address. Try a more specific NYC address." }), {
      status: 422,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { houseNumber, streetName, zip, borough, bbl, lat, lng, displayAddress, neighborhood } = geo;

  // Build query params shared across datasets
  const twoyearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Step 2: parallel data fetch
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    hpdViolationsRaw,
    complaintsRaw,
    bedBugRaw,
    dobViolationsRaw,
    dobPermitsRaw,
    plutoRaw,
    subwayRaw,
    evictionsRaw,
    crimesRaw,
  ] = await Promise.all([
    // HPD Housing Maintenance Code Violations
    fetchJSON(socrataUrl("wvxf-dwi5", {
      "$where": `upper(housenumber)='${houseNumber.toUpperCase()}' AND upper(streetname) LIKE '${streetName.toUpperCase().split(" ")[0]}%'`,
      "$limit": "500",
      "$order": "inspectiondate DESC",
    })),

    // 311 Service Requests (last 2 years)
    fetchJSON(socrataUrl("erm2-nwe9", {
      "$where": `upper(incident_address) LIKE '${houseNumber.toUpperCase()} ${streetName.toUpperCase().split(" ")[0]}%' AND created_date >= '${twoyearsAgo}'`,
      "$limit": "200",
      "$order": "created_date DESC",
      "$select": "complaint_type,descriptor,created_date,status,closed_date,resolution_description",
    })),

    // Bed Bug Disclosure (HPD)
    fetchJSON(socrataUrl("wz6d-aqnd", {
      "$where": `upper(buildingaddress) LIKE '${houseNumber.toUpperCase()} ${streetName.toUpperCase().split(" ")[0]}%'`,
      "$limit": "50",
    })),

    // DOB Violations (by BBL if available, fallback to address)
    bbl
      ? fetchJSON(socrataUrl("3h2n-5cm9", {
          "$where": `bbl='${bbl}'`,
          "$limit": "200",
          "$order": "issue_date DESC",
        }))
      : fetchJSON(socrataUrl("3h2n-5cm9", {
          "$where": `upper(house_number)='${houseNumber.toUpperCase()}' AND upper(street)='${streetName.toUpperCase()}'`,
          "$limit": "200",
          "$order": "issue_date DESC",
        })),

    // DOB Permits
    fetchJSON(socrataUrl("ipu4-2q9a", {
      "$where": `upper(house__)='${houseNumber.toUpperCase()}' AND upper(street_name) LIKE '${streetName.toUpperCase().split(" ")[0]}%'`,
      "$limit": "50",
      "$order": "filing_date DESC",
    })),

    // PLUTO property data
    bbl
      ? fetchJSON(socrataUrl("64uk-42ks", {
          "bbl": bbl,
          "$limit": "1",
        }))
      : null,

    // MTA Subway Entrances within 800m (data.ny.gov dataset i9wp-a4ja)
    fetchJSON(
      `https://data.ny.gov/resource/i9wp-a4ja.json?$where=${encodeURIComponent(`within_circle(entrance_georeference,${lat},${lng},800)`)}&$limit=50&$select=stop_name,daytime_routes,entrance_latitude,entrance_longitude`
    ),

    // NYC Marshal Evictions (dataset 6z8x-wfk4)
    fetchJSON(socrataUrl("6z8x-wfk4", {
      "$where": `upper(eviction_address) LIKE '${houseNumber.toUpperCase()} ${streetName.toUpperCase().split(" ")[0]}%'`,
      "$limit": "100",
      "$order": "executed_date DESC",
      "$select": "eviction_address,executed_date,residential_commercial_ind,eviction_zip,marshal_first_name,marshal_last_name,docket_number",
    })),

    // NYPD Complaint Data — within 200m of building, last 12 months (dataset qgea-i56i)
    fetchJSON(socrataUrl("qgea-i56i", {
      "$where": `within_circle(lat_lon,${lat},${lng},200) AND cmplnt_fr_dt >= '${oneYearAgo}'`,
      "$limit": "300",
      "$select": "ofns_desc,law_cat_cd,cmplnt_fr_dt,pd_desc",
      "$order": "cmplnt_fr_dt DESC",
    })),
  ]);

  // Step 3: normalize data
  const hpdViolations = Array.isArray(hpdViolationsRaw) ? hpdViolationsRaw : [];
  const complaints = Array.isArray(complaintsRaw) ? complaintsRaw : [];
  const bedBugs = Array.isArray(bedBugRaw) ? bedBugRaw : [];
  const dobViolations = Array.isArray(dobViolationsRaw) ? dobViolationsRaw : [];
  const dobPermits = Array.isArray(dobPermitsRaw) ? dobPermitsRaw : [];
  const pluto = Array.isArray(plutoRaw) ? plutoRaw[0] : (plutoRaw ?? null);
  const subwayEntrances = Array.isArray(subwayRaw) ? subwayRaw : [];
  const evictionsRaw2 = Array.isArray(evictionsRaw) ? evictionsRaw as Record<string, string>[] : [];
  const crimes = Array.isArray(crimesRaw) ? crimesRaw as Record<string, string>[] : [];

  // HPD violation stats
  const openHPD = hpdViolations.filter((v: Record<string, string>) =>
    (v.currentstatus ?? v.status ?? "").toUpperCase().includes("OPEN") ||
    (v.currentstatus ?? v.status ?? "").toUpperCase().includes("ACTIVE")
  );
  const classA = hpdViolations.filter((v: Record<string, string>) => v.class === "A" || v.novclass === "A").length;
  const classB = hpdViolations.filter((v: Record<string, string>) => v.class === "B" || v.novclass === "B").length;
  const classC = hpdViolations.filter((v: Record<string, string>) => v.class === "C" || v.novclass === "C").length;
  const openClassA = openHPD.filter((v: Record<string, string>) => v.class === "A" || v.novclass === "A").length;
  const openClassB = openHPD.filter((v: Record<string, string>) => v.class === "B" || v.novclass === "B").length;
  const openClassC = openHPD.filter((v: Record<string, string>) => v.class === "C" || v.novclass === "C").length;

  // 311 complaint categories
  const complaintCategories: Record<string, number> = {};
  for (const c of complaints as Record<string, string>[]) {
    const type = c.complaint_type ?? "Other";
    complaintCategories[type] = (complaintCategories[type] ?? 0) + 1;
  }
  const topComplaints = Object.entries(complaintCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([type, count]) => ({ type, count }));

  // Open DOB violations
  const openDOB = dobViolations.filter((v: Record<string, string>) =>
    !(v.disposition_date) || v.violation_status?.toUpperCase().includes("ACTIVE")
  ).length;

  // Active permits
  const activePermits = dobPermits.filter((p: Record<string, string>) =>
    (p.work_type ?? "").length > 0
  );

  // Bed bug history: count years with infestations
  const bedBugYears = new Set(
    bedBugs.flatMap((b: Record<string, string>) => {
      const infected = parseInt(b.infested_dwelling_unit_count ?? "0", 10);
      if (infected > 0 && b.filing_date) return [b.filing_date.slice(0, 4)];
      return [];
    })
  );

  // Building info from PLUTO
  const yearBuilt = pluto?.yearbuilt ?? pluto?.year_built ?? null;
  const units = pluto?.unitsres ?? pluto?.residential_units ?? null;
  const floors = pluto?.numfloors ?? pluto?.num_floors ?? null;
  const buildingClass = pluto?.bldgclass ?? pluto?.building_class ?? null;
  const ownerName = pluto?.ownername ?? pluto?.owner_name ?? null;
  const landUse = pluto?.landuse ?? null;
  const assessedValue = pluto?.assesstot ?? pluto?.assessed_total ?? null;
  const floodZone = pluto?.floodzone ?? null;

  // Elevator inference: NYC bldgclass D* = elevator apt, C* = walk-up
  const floorsNum = floors ? parseFloat(String(floors)) : null;
  const bldgClassFirst = buildingClass ? String(buildingClass).toUpperCase()[0] : null;
  let hasElevator: boolean | null = null;
  if (bldgClassFirst === 'D') hasElevator = true;
  else if (bldgClassFirst === 'C') hasElevator = false;
  else if (floorsNum !== null) {
    if (floorsNum >= 7) hasElevator = true;
    else if (floorsNum <= 3) hasElevator = false;
  }

  // Parse subway entrance coords — dataset i9wp-a4ja on data.ny.gov
  const parsedEntrances = subwayEntrances
    .map((e: Record<string, unknown>) => {
      const eLat = parseFloat(String(e.entrance_latitude ?? ""));
      const eLon = parseFloat(String(e.entrance_longitude ?? ""));
      if (isNaN(eLat) || isNaN(eLon)) return null;
      return { lat: eLat, lon: eLon, name: String(e.stop_name ?? ""), line: String(e.daytime_routes ?? "") };
    })
    .filter(Boolean) as Array<{ lat: number; lon: number; name: string; line: string }>;

  // Deduplicate stations by name and compute distances
  const stationMap = new Map<string, { name: string; lines: Set<string>; distM: number }>();
  for (const e of parsedEntrances) {
    const d = distanceMeters(lat, lng, e.lat, e.lon);
    const routes = e.line.split(" ").filter(Boolean);
    const existing = stationMap.get(e.name);
    if (!existing || d < existing.distM) {
      stationMap.set(e.name, {
        name: e.name,
        lines: existing ? new Set([...existing.lines, ...routes]) : new Set(routes),
        distM: d,
      });
    } else {
      routes.forEach(r => existing.lines.add(r));
    }
  }

  const nearbyStations = Array.from(stationMap.values())
    .sort((a, b) => a.distM - b.distM)
    .slice(0, 5)
    .map(s => ({
      name: s.name,
      lines: Array.from(s.lines).filter(Boolean).join(", "),
      distanceFt: Math.round(s.distM * 3.28084),
    }));

  // Compute scores (0–100, higher = better for renter)
  function clamp(n: number) { return Math.min(100, Math.max(0, Math.round(n))); }

  const totalOpenViolations = openHPD.length + openDOB;
  const buildingScore = clamp(
    100
    - openClassC * 20
    - openClassB * 8
    - openClassA * 3
    - openDOB * 5
    - Math.min(bedBugYears.size * 10, 30)
  );
  const complaintScore = clamp(100 - Math.min(complaints.length * 2.5, 70));
  const permitScore = clamp(100 - Math.min(dobViolations.length * 3, 50));
  const transitScore = calcTransitScore(parsedEntrances, lat, lng);

  // Eviction stats
  const residentialEvictions = evictionsRaw2.filter(e =>
    (e.residential_commercial_ind ?? "").toUpperCase().startsWith("R")
  );
  const evictionYears = new Set(
    evictionsRaw2
      .map(e => e.executed_date?.slice(0, 4))
      .filter(Boolean)
  );
  const recentEvictions = evictionsRaw2.slice(0, 10).map(e => ({
    date: e.executed_date ?? "",
    type: e.residential_commercial_ind ?? "",
    docket: e.docket_number ?? "",
    marshal: [e.marshal_first_name, e.marshal_last_name].filter(Boolean).join(" "),
  }));

  // Crime stats
  const felonies = crimes.filter(c => (c.law_cat_cd ?? "").toUpperCase() === "FELONY");
  const misdemeanors = crimes.filter(c => (c.law_cat_cd ?? "").toUpperCase() === "MISDEMEANOR");
  const violations = crimes.filter(c => (c.law_cat_cd ?? "").toUpperCase() === "VIOLATION");

  const offenseCounts: Record<string, number> = {};
  for (const c of crimes) {
    const desc = c.ofns_desc ?? "OTHER";
    offenseCounts[desc] = (offenseCounts[desc] ?? 0) + 1;
  }
  const topOffenses = Object.entries(offenseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => ({ type, count }));

  const recentCrimes = crimes.slice(0, 8).map(c => ({
    offense: c.ofns_desc ?? "UNKNOWN",
    detail: c.pd_desc ?? "",
    severity: c.law_cat_cd ?? "",
    date: c.cmplnt_fr_dt ?? "",
  }));

  // Recent violations (last 20 for display)
  const recentViolations = hpdViolations.slice(0, 20).map((v: Record<string, string>) => ({
    class: v.class ?? v.novclass ?? "?",
    description: v.novdescription ?? v.violation_description ?? "Violation",
    date: v.inspectiondate ?? v.novissueddate ?? "",
    status: v.currentstatus ?? v.status ?? "",
    ordernumber: v.ordernumber ?? "",
    apartment: v.apartment ?? v.apt ?? "",
  }));

  // Recent 311 complaints
  const recentComplaints = (complaints as Record<string, string>[]).slice(0, 15).map(c => ({
    type: c.complaint_type ?? "Other",
    descriptor: c.descriptor ?? "",
    date: c.created_date ?? "",
    status: c.status ?? "",
  }));

  return new Response(
    JSON.stringify({
      geo: { displayAddress, houseNumber, streetName, borough, zip, neighborhood, lat, lng, bbl },
      scores: { buildingScore, complaintScore, permitScore, transitScore },
      hpd: {
        total: hpdViolations.length,
        open: openHPD.length,
        classA, classB, classC,
        openClassA, openClassB, openClassC,
        recent: recentViolations,
      },
      complaints311: {
        total: complaints.length,
        topCategories: topComplaints,
        recent: recentComplaints,
      },
      bedBugs: {
        total: bedBugs.length,
        infestationYears: Array.from(bedBugYears).sort().reverse(),
      },
      dob: {
        violations: dobViolations.length,
        openViolations: openDOB,
        activePermits: activePermits.slice(0, 5).map((p: Record<string, string>) => ({
          type: p.job_type ?? p.work_type ?? "",
          description: p.job_description ?? p.job_desc ?? "",
          status: p.status ?? p.work_permit_status ?? "",
          date: p.filing_date ?? p.issued_date ?? "",
        })),
      },
      building: {
        yearBuilt,
        units,
        floors,
        buildingClass,
        ownerName,
        landUse,
        assessedValue,
        floodZone,
        hasElevator,
      },
      transit: {
        nearbyStations,
        entranceCount: parsedEntrances.length,
      },
      totalOpenViolations,
      crimes: {
        total: crimes.length,
        felonies: felonies.length,
        misdemeanors: misdemeanors.length,
        violations: violations.length,
        topOffenses,
        recent: recentCrimes,
        radiusMeters: 200,
      },
      evictions: {
        total: evictionsRaw2.length,
        residential: residentialEvictions.length,
        years: Array.from(evictionYears).sort().reverse(),
        recent: recentEvictions,
      },
    }),
    {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
});
