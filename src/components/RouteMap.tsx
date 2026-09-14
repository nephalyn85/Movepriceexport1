import { useEffect, useRef } from 'react';

export interface FuelRegion {
  key: string;
  name: string;
  lat: number;
  lng: number;
  price: number | null;
  period: string;
}

interface RouteMapProps {
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  fromLabel?: string;
  toLabel?: string;
  fuelRegions?: FuelRegion[];
  disabled?: boolean;
  disabledMessage?: string;
}

declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

export default function RouteMap({
  fromLat, fromLng, toLat, toLng,
  fromLabel, toLabel,
  fuelRegions,
  disabled, disabledMessage,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<typeof window.L.map> | null>(null);
  const hasCoords = fromLat != null && fromLng != null && toLat != null && toLng != null;

  const isSameLocation = hasCoords && fromLat === toLat && fromLng === toLng;

  useEffect(() => {
    if (!mapRef.current || !window.L || !hasCoords || disabled) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const L = window.L;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const fromIcon = L.divIcon({
      className: '',
      html: `<div style="background:#0d9488;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const toIcon = L.divIcon({
      className: '',
      html: `<div style="background:#d97706;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    if (isSameLocation) {
      L.marker([fromLat!, fromLng!], { icon: fromIcon })
        .addTo(map)
        .bindPopup(`<strong>Local Move Area:</strong> ${fromLabel}`)
        .openPopup();
      // Show ~5 mile radius around the zip center
      const delta = 0.07;
      map.fitBounds(
        L.latLngBounds(
          [fromLat! - delta, fromLng! - delta],
          [fromLat! + delta, fromLng! + delta]
        ),
        { padding: [24, 24] }
      );
    } else {
      L.marker([fromLat!, fromLng!], { icon: fromIcon })
        .addTo(map)
        .bindPopup(`<strong>From:</strong> ${fromLabel}`)
        .openPopup();

      L.marker([toLat!, toLng!], { icon: toIcon })
        .addTo(map)
        .bindPopup(`<strong>To:</strong> ${toLabel}`);

      if (fuelRegions && fuelRegions.length > 0) {
        for (const region of fuelRegions) {
          if (region.price == null) continue;
          const priceLabel = `$${region.price.toFixed(3)}`;
          const fuelIcon = L.divIcon({
            className: '',
            html: `<div style="background:#fff;border:2px solid #d97706;border-radius:8px;padding:3px 7px;font-size:11px;font-weight:700;color:#92400e;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.18);display:flex;align-items:center;gap:4px;line-height:1.4;">⛽ ${priceLabel}</div>`,
            iconSize: [72, 26],
            iconAnchor: [36, 13],
          });
          const weekStr = region.period ? ` (week of ${region.period})` : '';
          L.marker([region.lat, region.lng], { icon: fuelIcon })
            .addTo(map)
            .bindPopup(
              `<strong>${region.name}</strong><br>Diesel: <strong>${priceLabel}/gal</strong>${weekStr}<br><em style="font-size:11px;color:#6b7280">EIA weekly retail price</em>`
            );
        }
      }

      fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
            const coords = data.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
            );
            L.polyline(coords, {
              color: '#0d9488',
              weight: 4,
              opacity: 0.8,
            }).addTo(map);
          }
        })
        .catch(() => {
          L.polyline(
            [[fromLat!, fromLng!], [toLat!, toLng!]],
            { color: '#0d9488', weight: 3, opacity: 0.6, dashArray: '8 6' }
          ).addTo(map);
        });

      const bounds = L.latLngBounds(
        [fromLat!, fromLng!],
        [toLat!, toLng!]
      );
      map.fitBounds(bounds, { padding: [48, 48] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [fromLat, fromLng, toLat, toLng, fromLabel, toLabel, fuelRegions, disabled, hasCoords, isSameLocation]);

  if (disabled || !hasCoords) {
    return (
      <div
        className="w-full rounded-xl overflow-hidden border border-slate-200 relative"
        style={{ height: '300px' }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Blank_US_Map_%28states_only%29.svg/1280px-Blank_US_Map_%28states_only%29.svg.png"
          alt="USA map"
          className="w-full h-full object-cover object-center"
          style={{ filter: 'saturate(0.3) opacity(0.45)' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow">
            <svg className="w-6 h-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700 text-center px-6 bg-white/70 backdrop-blur-sm rounded-lg py-2 shadow-sm">
            {disabledMessage || 'Enter both ZIP codes and select a truck size to see the route map'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-slate-200"
      style={{ height: '300px' }}
    />
  );
}
