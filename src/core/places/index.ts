import type { Station } from '../geo';

export type ActivePlace =
  | { kind: 'location' }
  | { kind: 'station'; station: Station };
// Stable identity for the location place (safe as a useEffect/useMemo dependency).
export const LOCATION_PLACE: ActivePlace = { kind: 'location' };
export const MAX_RESULTS = 30;

// Polish-aware fold: lowercase → strip NFD combining marks → ł→l (ł has no NFD form).
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');
}

// Diacritic/case-insensitive substring over "city name". Empty query → []. Capped.
export function searchStations(stations: Station[], query: string): Station[] {
  const q = fold(query.trim());
  if (!q) return [];
  const out: Station[] = [];
  for (const s of stations) {
    if (fold(`${s.city} ${s.name}`).includes(q)) {
      out.push(s);
      if (out.length === MAX_RESULTS) break;
    }
  }
  return out;
}

export function hasFavorite(list: Station[], id: number): boolean {
  return list.some(s => s.id === id);
}
export function addFavorite(list: Station[], s: Station): Station[] {
  return hasFavorite(list, s.id) ? list : [...list, s]; // same ref on no-op
}
export function removeFavorite(list: Station[], id: number): Station[] {
  return list.filter(s => s.id !== id);
}

// Persistence seam — a fake in tests, AsyncStorage adapter in the app.
export interface FavoritesStore {
  load(): Promise<Station[]>;
  save(list: Station[]): Promise<void>;
}

// Moves list[from] to index `to`. Returns the SAME reference on a no-op (from === to)
// or any out-of-bounds index, so callers can skip a redundant persist.
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list;
  }
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function defaultPlace(
  loc: boolean,
  defaultStation: Station,
): ActivePlace {
  return loc ? LOCATION_PLACE : { kind: 'station', station: defaultStation };
}
