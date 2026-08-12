# Harness journal 06 — Miejsca (search + favorites, live)

**Milestone:** M-miejsca · **Spec:** `docs/specs/006-miejsca.md` · **Plan:** `docs/superpowers/plans/2026-08-12-m-miejsca.md` · **Branch:** `feature/m-miejsca` (stacked on `feature/m-loc-nearest`)

## What the app gained
A real **Miejsca** screen: search GIOŚ stations by name (diacritic-folding, instant
in-memory filter), **preview** a place's live air, **save favorites** that persist on
device (no account), and a favorites list where each row shows live air. Every place —
a favorite, a search result, or the pinned **"Twoja lokalizacja"** row — sets the app's
**active place**, which now drives **Teraz** and the **Teraz tab-bar tint**. This
finally removed the last `MOCK_PLACE` from the render path.

## What the harness gained
- **`src/shared/place`** — the pattern for cross-feature app state: React contexts that
  hold core types and *injected* data-layer implementations (`sourceForPlace`,
  `FavoritesStore`, the station list), so `features` still never import `data`
  (App.tsx does the injection). The constitution's `shared` description was amended to
  name this ("cross-feature app-state contexts").
- A generalized reading hook: `useCurrentReading` became `usePlaceReading(place)`, and
  the single-source `AirSourceContext` became an `ActivePlaceProvider` that any surface
  (Teraz, the tab tint, each list row) reads.
- `src/core/places` (pure search + favorites ops) and a `FavoritesStore` seam behind
  AsyncStorage (ADR-011).

## Layers introduced / changed
- `src/core/places`: `searchStations` (Polish `ł→l`+NFD fold), favorites list ops,
  `ActivePlace`, `FavoritesStore` (pure).
- `src/data`: `createStationSource` (reading for any station); `src/data/favorites`
  (AsyncStorage adapter, ADR-011).
- `src/shared/place`: `PlaceSourceProvider`/`useSourceForPlace`, `usePlaceReading`,
  `ActivePlaceProvider`/`useActivePlace`, `FavoritesProvider`/`useFavorites`,
  `StationsProvider`/`useStations`.
- `src/features/teraz`: driven by the active place; `Hero` gained an `eyebrow` prop.
  Deleted `AirSourceContext`, `useCurrentReading`, `mockData`.
- `src/features/miejsca`: `MiejscaScreen`, `PlaceRow`, `SearchField`.
- `src/app/AppNavigator`: consumes `useActivePlace()` for the live Teraz tint.

## Mid-build corrections (critic, pre-build)
The `critic` returned NEEDS-REVISION on spec 006 and caught four real gaps before code:
1. **B1 — the milestone silently orphaned the M-loc/M-data wiring** (`AirSourceContext`,
   `useCurrentReading`, `mockData`) and would break 4 tests. → a **Migration** section
   made every deletion/retarget part of the spec's scope.
2. **M1 — `Hero` hardcoded "TWOJA LOKALIZACJA"**, wrong once Teraz shows a selected
   place. → an `eyebrow` prop (`'MIEJSCE'` for a station) + an AC asserting the difference.
3. **M2 — the live tab tint is a structural AppNavigator change** (module-scope →
   context consumer). → spelled out in AC 006-10.
4. **M3 — the muted "—" failed-row path had no AC.** → AC 006-6b + AC 006-8.
It also verified the diacritic folds against the real fixture, the AsyncStorage
round-trip, and that the injection design keeps `features` from importing `data`.

## Build-time discoveries (things the plan/executor hit)
- **AsyncStorage v3 jest mock**: the shipped mock moved to an ESM `/jest` exports
  subpath that Jest's CJS transform can't load — replaced with a 6-line hand-rolled
  in-memory stub (ADR-011 records this).
- **A test the plan's Migration list missed**: `Hero.test.tsx` imported the deleted
  `MOCK_PLACE` and needed the new `eyebrow` prop — fixed in the migration task.
- **`jest.mock` hoisting**: the plan's MiejscaScreen test referenced `navigate` (a
  non-`mock`-prefixed var) inside the factory — renamed to `mockNavigate`.
- **Cross-task integration**: once `MiejscaScreen` became real, `AppNavigator.test`'s
  provider stack (written earlier) was missing `Favorites`/`Stations` providers —
  tapping the Miejsca tab threw until the wrapper was completed.

## Known limitations (deferred, documented)
- **No gestures** — v1 deletes with a plain ✕ button; swipe-to-delete, long-press
  reorder, and "Edytuj" mode are a later polish milestone.
- **Search results are name-only** — live air loads on preview / in favorites, not per
  keystroke (API cost).
- **No distance, trend arrows, recent-searches, nearby-suggestions panel.**
- **No refresh/cache** — each row fetches once on mount; `AirQualitySource` makes
  refresh a drop-in later.
- Active place resets to location on each launch (favorites persist; the selection does not).

## Manual evidence (AC 006-11)
Native rebuild done (new AsyncStorage pod). iPhone 16 Pro, iOS 18.3.1.
- **On-device boot with the full new stack** (`ac-006-11-boot-live-stack.png`): the app
  launches cleanly through `StationsProvider → PlaceSourceProvider → FavoritesProvider →
  ActivePlaceProvider`, the **AsyncStorage native module loads** (favorites `load()` runs,
  no crash), `fetchStations(?size=1000)` runs, the active place resolves, and Teraz shows
  live air with the live tab tint and the `TWOJA LOKALIZACJA` eyebrow. This is the check
  unit tests can't give: the real native module + provider tree initialize on device.
- **The interactive walkthrough** (tab → search → **+**add → tap-preview → relaunch-persist)
  needs UI taps that can't be driven headlessly here (no `idb`/accessibility — same wall as
  M-loc's permission prompt). That exact logic is covered by automated **AC 006-8/9** against
  a real in-memory store; a full visual walkthrough is offered to the human on request.

Note: the yellow "view warnings" toast is the **intentional `__DEV__` fallback log**
(`[nearest] … showing Kraków`) firing because the device's nearest station has no fresh
PM2.5 right now — documented behavior, silent in release (`__DEV__` false). No React/RN
defect-warnings (lists key by station id; only Apple-internal NSURL deprecation notices).

## Retro — corrections became rules
_(placeholder — filled at merge, step 10)_
