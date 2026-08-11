// Isolates GIOŚ v1's JSON-LD Polish keys for station/findAll. `any` is used
// deliberately: GIOŚ returns untyped external JSON, narrowed at this boundary.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Station } from '../../core/geo';
import { GIOS_BASE } from './constants';

const STATIONS_KEY = 'Lista stacji pomiarowych';
const LAT_KEY = 'WGS84 φ N'; // "WGS84 φ N" — φ is U+03C6
const LON_KEY = 'WGS84 λ E'; // "WGS84 λ E" — λ is U+03BB

// Empty/whitespace/null/non-numeric → NaN (so the entry is dropped). Guards the
// raw string because Number('') === 0, which would otherwise pass as valid.
function toCoord(v: unknown): number {
  if (typeof v !== 'string' || v.trim() === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function parseStations(findAllJson: any): Station[] {
  const list: any[] = findAllJson?.[STATIONS_KEY] ?? [];
  const out: Station[] = [];
  for (const e of list) {
    const lat = toCoord(e[LAT_KEY]);
    const lon = toCoord(e[LON_KEY]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue; // drop invalid coords
    out.push({
      id: e['Identyfikator stacji'],
      name: e['Nazwa stacji'],
      city: e['Nazwa miasta'],
      lat,
      lon,
    });
  }
  return out;
}

export async function fetchStations(
  fetchImpl: typeof fetch = fetch,
): Promise<Station[]> {
  const json = await (await fetchImpl(`${GIOS_BASE}/station/findAll`)).json();
  return parseStations(json);
}
