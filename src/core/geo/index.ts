export interface Station {
  id: number;
  name: string;
  city: string;
  lat: number;
  lon: number;
}

export interface Geolocation {
  getCurrentPosition(): Promise<{ lat: number; lon: number }>;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

// Great-circle distance (haversine).
export function distanceKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// The station geometrically nearest (lat, lon). Throws on empty input.
export function nearestStation(
  lat: number,
  lon: number,
  stations: Station[],
): Station {
  if (stations.length === 0) throw new Error('geo: no stations to choose from');
  return stations.reduce((best, s) =>
    distanceKm(lat, lon, s.lat, s.lon) <
    distanceKm(lat, lon, best.lat, best.lon)
      ? s
      : best,
  );
}

// Hero label: strip a leading "<city>, " from the station name, add the GIOŚ suffix.
export function stationLabel(station: Station): string {
  const prefix = `${station.city}, `;
  const short = station.name.startsWith(prefix)
    ? station.name.slice(prefix.length)
    : station.name;
  return `${short} · stacja GIOŚ`;
}
