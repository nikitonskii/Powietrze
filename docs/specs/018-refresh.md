# Spec 018: Pull-to-refresh + freshness on Teraz/Miejsca

**Status:** draft
**Milestone:** M-refresh · **No new dependency** (RN `RefreshControl` is on board)
**Sources:** existing `usePlaceReading`/`usePlaceDetail` fetch model; `formatFreshness` (`src/core/air`); spec 004 (refresh was deferred there)

## Goal
Let the user pull down on Teraz and Miejsca to re-fetch live GIOŚ data, and show
the data's age ("1 godz temu") on Miejsca rows too (Teraz already shows it). A
refresh naturally re-publishes the widget snapshot (via the existing
`WidgetSyncProvider`), softening the widget's "stale between app opens" limit — no
extra widget wiring.

## Design

### A global refresh signal (`src/shared/refresh/`)
```ts
// Context: a monotonically-increasing signal + a trigger + an in-flight flag.
export function RefreshProvider(props: { children: React.ReactNode }): JSX.Element;
export function useRefreshSignal(): number;                       // consumed by the fetch hooks (deps)
export function useRefresh(): { refresh: () => void; refreshing: boolean };
```
- `refresh()` bumps `signal` (a number) and sets `refreshing = true`.
- Every mounted `usePlaceReading` / `usePlaceDetail` includes `signal` in its
  effect deps, so ONE `refresh()` re-fetches the Teraz active place **and** all
  Miejsca rows at once.
- `refreshing` lifecycle (the crux — see Open Questions): tracked by an
  **in-flight counter**. A fetch hook, ONLY when it re-runs because `signal`
  changed (not on mount / place change), calls `begin()` before the fetch and
  `end()` in a `finally`; `refreshing = count > 0`. `refresh()` also arms a
  **safety timeout** (e.g. 8s) that force-clears `refreshing` if no hook responded
  or a fetch hangs, so the spinner can never stick. The hooks distinguish a
  signal-triggered run from a mount/place-change run via a `useRef` of the last
  seen signal.

### Fetch hooks (`src/shared/place/usePlaceReading.ts`, `usePlaceDetail.ts`)
- Add `useRefreshSignal()` to the effect dependency list (alongside
  `sourceForPlace`, `placeKey`). A signal bump re-runs the effect → refetch.
- On a **signal-triggered** run (signal changed vs the ref), wrap the fetch in
  `begin()/…/end()` (via `useRefresh()`), so the provider's in-flight counter
  reflects real outstanding refreshes. On a mount/place-change run, do NOT count
  (that's normal loading, not a user refresh).
- Behavior otherwise unchanged: success → `ready`; rejection → `stale` keeping the
  last reading; detail rejection → `undefined`.

### Screens
- **Teraz** (`TerazScreen`, a `ScrollView`): add
  `refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor=… />}`
  (`refreshing`/`refresh` from `useRefresh()`), styled for the dark theme.
- **Miejsca** (the favorites list — `ScrollView`/`FlatList`): same `RefreshControl`.
- **`App.tsx`**: mount `<RefreshProvider>` ABOVE `PlaceSourceProvider`/`ActivePlaceProvider`
  and the navigator, so both the active place and all rows share one signal.

### Miejsca row freshness (`src/features/miejsca/PlaceRow.tsx`)
- Show the data age under the row using `formatFreshness(reading.measuredAt, new Date())`
  (reuse the core helper the hero uses). Only when a `reading` exists (not for
  `brak danych`). Keep it subtle (dim text), consistent with the row's existing subtitle.

### Widget (no new work — verify only)
A refresh updates the active reading → `WidgetSyncProvider` republishes on identity
change (spec 017). Confirm no extra wiring is needed.

## Behavior — Acceptance Criteria

### Shared — refresh signal + hooks
- **AC-1** — `useRefresh().refresh()` increments `useRefreshSignal()` by 1 each call and
  sets `refreshing` true; `refreshing` returns false once every in-flight fetch has
  called `end()` (counter back to 0), and is force-cleared by the safety timeout if
  nothing responds. (Test with fake timers.)
- **AC-2** — `usePlaceReading` re-fetches when the refresh signal bumps: with a fake
  `AirQualitySource` counting `getCurrentReading` calls, one mount = 1 call; after
  `refresh()` = 2 calls; an unrelated re-render with an unchanged signal = still 2
  (no churn). Same for `usePlaceDetail`/`getDetail`.
- **AC-3** — a signal-triggered refetch participates in the in-flight counter
  (`begin`/`end` called once each), but the initial mount fetch does NOT (so
  `refreshing` is false during first load, true only during a user refresh).

### Feature — Miejsca row age
- **AC-4** — `PlaceRow` with a reading renders `formatFreshness(reading.measuredAt, now)`
  (freeze `now`); a row with no reading (`brak danych`) renders no age line.

### Manual (sim — journal + evidence/18)
- **AC-5** — Pull down on Teraz → spinner shows, data re-fetches; if GIOŚ has a newer
  hour the number/age update, else the age correctly stays. Screenshot → evidence/18.
- **AC-6** — Pull down on Miejsca → all rows re-fetch; each row shows its data age.
- **AC-7** — After a Teraz refresh, the (already-built, once the native gate lands)
  widget snapshot is republished — deferred to widget verification; note here for traceability.

## Non-goals (YAGNI)
- **Auto/periodic background refresh** — manual pull only (background needs BGTask; deferred).
- **App-fetch-time label** ("zaktualizowano: teraz") — the honest data-age (`measuredAt`)
  is kept; no second timestamp (per design decision).
- **Per-row independent spinners** on Miejsca — one list-level `RefreshControl`.

## Verification
- **AC-1..3** `src/shared/refresh/__tests__/` + `src/shared/place/__tests__/` (fake source
  call-counts + fake timers). **AC-4** `src/features/miejsca/__tests__/PlaceRow` (frozen now).
- **AC-5..7** manual on the sim, journal `docs/harness/18-refresh.md` + evidence/18.

## Open questions (for the critic)
1. **`refreshing` lifecycle** — is the in-flight-counter + safety-timeout the right model,
   or simpler to tie the spinner to just the ACTIVE place's refetch (accurate on Teraz,
   proxy on Miejsca) as originally floated? Which is less code and less error-prone?
2. **Coupling** — the fetch hooks calling `begin()/end()` on the RefreshProvider couples
   `usePlaceReading` to refresh. Acceptable, or should the counter live elsewhere?
3. **Double-refresh / spam** — should `refresh()` be a no-op while `refreshing` is true
   (debounce), or always bump? (Lean: ignore while refreshing.)
4. **`stale` after refresh failure** — pull-to-refresh on a failing network keeps the last
   reading and flips to `stale`; is the row's age line then misleading (shows old age as if
   fresh)? Should a `stale` row mark the age? (Lean: keep showing the real age — it IS that old.)
