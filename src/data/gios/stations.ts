// Isolates GIOŚ v1's JSON-LD Polish keys for station/findAll. `any` is used
// deliberately: GIOŚ returns untyped external JSON, narrowed at this boundary.
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

// GIOŚ v1 findAll is PAGINATED (20 stations/page, ~15 pages). Request one large
// page so all ~290 stations arrive in a single call (size=1000 → totalPages=1);
// without a size param the app would only see page 0's 20 stations and pick a
// wrong "nearest". No client-side paging in v1 — if GIOŚ ever exceeds 1000
// stations the tail would be dropped (documented, acceptable at today's ~290).
const FIND_ALL_PAGE_SIZE = 1000;

export async function fetchStations(
  fetchImpl: typeof fetch = fetch,
): Promise<Station[]> {
  const json = await (
    await fetchImpl(`${GIOS_BASE}/station/findAll?size=${FIND_ALL_PAGE_SIZE}`)
  ).json();
  return parseStations(json);
}
