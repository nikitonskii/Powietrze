# Spec 006: Miejsca (search + favorites, live)

**Status:** draft
**Milestone:** M-miejsca (core loop: search → live → favorites → active place)
**Sources:** `design/README.md` §"Screens/Views → 2. Miejsca (favorites + search)",
§"Interactions & Behavior" ("Tapping a Miejsca row opens Teraz for that index";
"`+` adds to places"; "Ulubione zostają na telefonie"), §"State Management"
(`places[]`, `searchMode`, active `index`); `docs/specs/005-nearest-station.md`
(the `Station`, per-`Station` reading builder, and `nearestStation` this reuses).

## Scope

Turn the Miejsca placeholder into the real screen: **search** GIOŚ stations by
name, **preview** a place's live air, **save favorites** (persisted on device,
no account), and a **favorites list** that shows each place's live air. Selecting
any place — a favorite, a search result, or the pinned **"Twoja lokalizacja"**
row — sets the app's **active place**, which drives **Teraz** and the **Teraz
tab-bar tint**. This removes the last `MOCK_PLACE` from the render path.

## Non-goals (deferred to a later Miejsca-polish milestone)

- **Swipe-to-delete, long-press reorder, "Edytuj" mode** — v1 deletes with a
  plain ✕ button per row; no gestures, no reordering.
- **Live air on every search result while typing** — results are name-only
  (instant, in-memory filter); live air loads on **preview (tap)** and in the
  favorites list. (Resolved ambiguity.)
- **Distance in results, "trend" arrows, recent-searches, nearby-suggestions
  panel** — not in v1.
- **Seed/demo places** — favorites start empty (only the live location row shows).
- **Auto-refresh / caching** — each reading is fetched once when its row mounts;
  no polling. (`AirQualitySource` makes refresh a later drop-in.)

## Public API

`src/core/places/index.ts` (pure; zero React/IO):
```ts
import type { Station } from '../geo';
export type ActivePlace = { kind: 'location' } | { kind: 'station'; station: Station };

// Diacritic- & case-insensitive substring over city + name. Empty/whitespace
// query → []. Results keep input order, capped at MAX_RESULTS (30).
export function searchStations(stations: Station[], query: string): Station[];
export const MAX_RESULTS = 30;

// Pure favorites list ops, keyed by station id.
export function addFavorite(list: Station[], s: Station): Station[]; // no-op if id present
export function removeFavorite(list: Station[], id: number): Station[];
export function hasFavorite(list: Station[], id: number): boolean;

// Persistence seam — a fake in tests, AsyncStorage adapter in the app.
export interface FavoritesStore {
  load(): Promise<Station[]>;
  save(list: Station[]): Promise<void>;
}
```
Diacritic folding is Polish-aware: `lower → NFD strip combining marks → ł→l`
(ł/Ł do not decompose under NFD). So `fold('Łódź') === 'lodz'`,
`fold('Wrocław') === 'wroclaw'`, `fold('Kraków') === 'krakow'`.

`src/data/gios` (grows):
```ts
// A source for one fixed Station — wraps the existing per-Station reading builder.
export function createStationSource(station: Station, fetchImpl?: typeof fetch): AirQualitySource;
```

`src/data/favorites/index.ts` (new; native adapter):
```ts
export function createAsyncStorageFavoritesStore(): FavoritesStore; // @react-native-async-storage/async-storage
```
Serializes `Station[]` to JSON under key `powietrze.favorites.v1`. Missing key or
unparseable value → `[]` (never throws).

Shared app-state (React contexts — `src/shared/place/`, importable by both
features; the concrete data-layer sources are **injected by `App.tsx`**):
```ts
// Injected: place → source. App builds it from data (createNearestStationSource / createStationSource).
type SourceForPlace = (place: ActivePlace) => AirQualitySource;

// Holds the ACTIVE place + its live reading (single source of truth for Teraz + tab tint).
// default active = { kind: 'location' } (resets on each launch — in-memory).
function ActivePlaceProvider(props: { sourceForPlace: SourceForPlace; children }): JSX.Element;
function useActivePlace(): {
  active: ActivePlace;
  setActive(p: ActivePlace): void;
  reading?: Reading;                    // the active place's reading
  status: 'loading' | 'ready' | 'stale';
};

// Loads favorites from the injected store on mount; add/remove persist on change.
function FavoritesProvider(props: { store: FavoritesStore; children }): JSX.Element;
function useFavorites(): { favorites: Station[]; add(s: Station): void; remove(id: number): void };

// One-shot reading for an arbitrary row (favorites list, preview). Uses the injected sourceForPlace.
function usePlaceReading(place: ActivePlace): { status: 'loading' | 'ready' | 'stale'; reading?: Reading };
```

`App.tsx` builds the data pieces once and injects them:
`const nearest = createNearestStationSource(createDeviceGeolocation(), fetch)`;
`sourceForPlace = p => p.kind === 'location' ? nearest : createStationSource(p.station, fetch)`;
`favoritesStore = createAsyncStorageFavoritesStore()`; wraps `ActivePlaceProvider`
+ `FavoritesProvider` around the navigator.

**Hero eyebrow (was hardcoded).** `Hero.tsx` renders a fixed `TWOJA LOKALIZACJA`
eyebrow; since Teraz now shows non-location places it takes an `eyebrow: string`
prop. `TerazScreen` passes `'TWOJA LOKALIZACJA'` when `active.kind === 'location'`
and `'MIEJSCE'` when `active.kind === 'station'`.

## Migration (this milestone supersedes the M-loc/M-data-1 Teraz wiring)

Turning Teraz multi-place replaces the single-source wiring. The spec owns these
moves (not an executor guess):
- **Delete `src/features/teraz/AirSourceContext.tsx` and `useCurrentReading.ts`** —
  superseded by `src/shared/place` (`ActivePlaceProvider`/`useActivePlace`/
  `usePlaceReading`). The fetch-once `loading|ready|stale` logic of
  `useCurrentReading` moves verbatim into `usePlaceReading`.
- **Delete `src/features/teraz/mockData.ts` (`MOCK_PLACE`)** — nothing references it
  after the tab-tint rewiring (AC 006-10). Move the `Place` render type it exports
  into `Hero.tsx` (Hero's own prop type); `Place` is not app state.
- **Retarget the 4 tests that mount the old wiring** (they must stay green — DoD #2):
  - `TerazScreen.test.tsx` (004 AC-8) and `TerazScreen.nearest.test.tsx` (005 AC-7):
    wrap in `ActivePlaceProvider` with a fake `sourceForPlace` instead of
    `AirSourceProvider`; the rendered-output assertions are unchanged.
  - `useCurrentReading.test.tsx`: replaced by the `usePlaceReading` tests (AC 006-6b).
  - `AppNavigator.test.tsx` (`AC-11`, tint = `scene(MOCK_PLACE.index).key`): rewritten
    as AC 006-10 (tint from the active reading).

## Behavior — Acceptance Criteria

Core `src/core/places` — unit-tested, pinned (fixture `src/core/geo/__fixtures__/stations.json`: 400 Kraków, 530 Warszawa, 706 Gdańsk, 114 Wrocław):
- **AC 006-1** — `searchStations`: diacritic/case-insensitive substring over city+name.
  Pins: `searchStations(S, 'wroclaw').map(s=>s.id) === [114]` (ł-fold);
  `searchStations(S, 'KRAK').map(s=>s.id) === [400]` (ó-fold, case);
  **multi-match, input order preserved**: `searchStations(S, 'k').map(s=>s.id) === [400, 706]`
  (Kraków + Gdańsk fold to contain 'k'; Warszawa/Wrocław don't);
  `searchStations(S, '') === []`; `searchStations(S, '  ') === []`;
  `searchStations(S, 'zzzz') === []`. Cap: over a synthetic 40-station list all
  matching → `.length === 30`, input order preserved.
- **AC 006-2** — favorites ops. Pins: `addFavorite([], k).map(id) === [400]`;
  `addFavorite([k], k) === [k]` (no dup); `removeFavorite([k,w], 400).map(id) === [530]`;
  `hasFavorite([k], 400) === true`, `hasFavorite([], 400) === false`.

Data — fake fetch / mocked AsyncStorage:
- **AC 006-3** — `createStationSource(warszawa530, fakeFetch)` where `fakeFetch`
  serves `sensors400.json` (reused for `/sensors/{id}`) then `getData2752.json`,
  resolves `{ index: 5, pm25: 5.0, measuredAt: '2026-08-11 21:00:00', city: 'Warszawa', station: 'Al. Niepodległości · stacja GIOŚ' }`,
  calling `${GIOS_BASE}/station/sensors/530` then `${GIOS_BASE}/data/getData/2752`.
- **AC 006-4** — `createAsyncStorageFavoritesStore` round-trips (jest AsyncStorage
  mock): `save([kraków, warszawa])` then `load()` deep-equals `[kraków, warszawa]`;
  `load()` with no stored key → `[]`; `load()` with an unparseable stored string → `[]`
  (inject the raw non-JSON string directly via the mock's `AsyncStorage.setItem('powietrze.favorites.v1', 'not json')`).

Shared contexts — RNTL with fakes:
- **AC 006-5** — `FavoritesProvider` with a fake store: mounts → `favorites` = the
  store's loaded list; `add(s)` appends and calls `store.save` with the new list;
  `add` of a present id is a no-op (no extra save); `remove(id)` drops it and persists.
- **AC 006-6** — `ActivePlaceProvider` with a fake `sourceForPlace`: default
  `active.kind === 'location'` and `reading` resolves the location source's reading;
  `setActive({kind:'station', station: warszawa})` switches `reading` to that
  station's; `status` is `'loading'` until the first reading resolves.
- **AC 006-6b** — `usePlaceReading(place)`: with a fake `sourceForPlace` resolving a
  fixed `Reading` → `status:'ready'` exposing it; with a `sourceForPlace` that
  **rejects** → `status:'stale'` and **no** `reading` (never throws). This is the
  contract behind the muted "—" row (AC 006-8).

Screens — RNTL:
- **AC 006-7** — `TerazScreen` renders the **active** place's reading AND the right
  eyebrow: active = location (fake reading city 'Kraków', index 4) shows Kraków/4
  under eyebrow **'TWOJA LOKALIZACJA'**; after `setActive` to a Warszawa station
  (fake reading city 'Warszawa', index 42) shows Warszawa/42 under eyebrow
  **'MIEJSCE'** (the label differs by `active.kind`). No `MOCK_PLACE` in the tree.
- **AC 006-8** — `MiejscaScreen` default state: renders the pinned **'Twoja
  lokalizacja'** row (live, via `usePlaceReading({kind:'location'})`) and one row per
  favorite (live). Empty favorites → the hint 'Wyszukaj i dodaj miejsce' is shown.
  Tapping a favorite row calls `setActive({kind:'station', station})` and navigates
  to the Teraz tab (via the injected navigation seam — see Resolved ambiguities).
  A favorite row whose reading **fails** (fake `sourceForPlace` rejects for that
  station) renders a muted **'—'** in place of the index, not a Kraków value.
- **AC 006-9** — `MiejscaScreen` search: entering 'krak' shows a result row for
  Kraków (station name, no index chip); its **'+'** calls `add(station)` (favorite
  appears, `store.save` called); tapping the result row calls `setActive` +
  navigates to Teraz (preview). Duplicate '+' is a no-op.
- **AC 006-10** — the **Teraz tab-bar tint** derives from the active reading's index,
  not `MOCK_PLACE`. This is a **structural change**: `AppNavigator` today computes
  `activeTints` at module scope and calls `makeTabBar(activeTints)` once. It becomes a
  consumer of `useActivePlace()` (rendered inside `ActivePlaceProvider`) and
  recomputes the Teraz tint = `scene(activeReading.index).key` per render (a neutral
  tint — `colors.accent` — while `status==='loading'` / no reading). Test: a navigator
  rendered with a fake active reading of index N tints the Teraz tab `scene(N).key`;
  `MOCK_PLACE` is deleted from the app render path (rewrites the old `AC-11` test).

Manual:
- **AC 006-11** — On the simulator: search a city → tap a result → Teraz shows its
  live air → back to Miejsca, '+' saves it → tap the favorite → Teraz updates →
  tap 'Twoja lokalizacja' → Teraz returns to the nearest station → **kill &
  relaunch** → the favorite is still there. *(Screenshots: favorites list, a
  previewed place, post-relaunch persistence.)*

## Resolved ambiguities

- **Search results are name-only; live air on preview.** Fetching PM2.5 for every
  result per keystroke (~2 GIOŚ calls each) is impractical; results filter the
  in-memory station list instantly, live air loads when a place is previewed or is a
  favorite. "Everything live" holds for the places that matter.
- **Active place = shared app state, not navigation params.** A single
  `ActivePlaceProvider` holds `active` + its live `reading`; Teraz and the tab tint
  read it (one source of truth kills `MOCK_PLACE`). Default `location`, resets on
  launch (in-memory). Tapping a row = `setActive` + switch to the Teraz tab.
- **Favorites persist on device, no account** (`FavoritesStore` → AsyncStorage).
  Favorites are `Station[]` (full identity, so a row renders without re-fetching
  `findAll`). Start empty; the pinned location row means the list is never truly empty.
- **A failed row reading shows a muted "—"**, not a Kraków fallback — the Kraków
  fallback is only for **location** mode (`createNearestStationSource`).
  `createStationSource` surfaces its failure to the row as `stale` with no reading.
- **Features never import `data`** (layering): `App.tsx` builds the sources +
  store and injects them through the `src/shared/place` contexts.
- **Navigation seam** (AC 006-8/9 "navigates to Teraz tab"): `MiejscaScreen` uses
  react-navigation's `useNavigation().navigate('Teraz')`. Tests render it inside a
  `NavigationContainer` (or a minimal navigation mock) and assert `navigate` was
  called with `'Teraz'` after `setActive`.

## Risks & config

- **New dep `@react-native-async-storage/async-storage` → ADR-011** (a DoD gate),
  `pod install`, and its **jest mock** (the package ships
  `@react-native-async-storage/async-storage/jest/async-storage-mock`) wired in
  `jest.setup.js`. ADR-011 justifies it over alternatives (`react-native-mmkv` —
  another native dep, faster but unneeded at this size; `expo-*` — needs the Expo
  runtime). New-Architecture compatible.
- **Boundaries**: `src/shared/place/*` are shared contexts importable by both
  features; they hold core types + injected data implementations (shared → core
  only; no `shared → data`). No eslint change (the `shared` element already exists).
- **`src/core/places`** stays pure (search + list ops; no React/IO).
- No new GIOŚ endpoints — search reuses the in-memory `fetchStations()` list;
  readings reuse the per-`Station` builder.
- **File-size rule**: `MiejscaScreen` grows large — decompose into `PlaceRow`
  (one live row: city/station/index chip or muted "—"), `SearchField`, and
  `SearchResults`, keeping every file ≤200 lines and every function ≤40.
- **Constitution amendment (rule update)**: CLAUDE.md describes `src/shared` as
  "UI kit, tokens". `src/shared/place` adds cross-feature app-state contexts —
  the only layer both features may import (core is React-free; features can't
  import `app`). Update CLAUDE.md's `shared` description to include shared
  app-state, in the same change (per the harness rule that corrections become
  committed rule changes).

## Verification

- **AC 006-1, 006-2** — `src/core/places/__tests__/*`.
- **AC 006-3** — `src/data/gios/__tests__/stationSource.test.ts` (fake fetch).
- **AC 006-4** — `src/data/favorites/__tests__/*` (jest AsyncStorage mock).
- **AC 006-5, 006-6, 006-6b** — `src/shared/place/__tests__/*` (RNTL, fake store +
  fake `sourceForPlace` incl. a rejecting one for 006-6b).
- **AC 006-7 … 006-10** — RNTL in `src/features/teraz` / `src/features/miejsca` /
  `src/app` with fakes; includes the 4 retargeted/rewritten tests named in
  **Migration** (they must stay green — DoD #2).
- **AC 006-11** — recorded manual evidence: simulator screenshots (`docs/harness/evidence/06/`).
