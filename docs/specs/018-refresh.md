# Spec 018: Pull-to-refresh + freshness on Teraz/Miejsca

**Status:** draft
**Milestone:** M-refresh · **No new dependency** (RN `RefreshControl` is on board)
**Sources:** existing `usePlaceReading`/`usePlaceDetail` fetch model; `formatFreshness` (`src/core/air`); spec 004 (refresh deferred there)
**Critic:** REWORK → resolved. Adopted the active-place-tied lifecycle (dropped the in-flight counter — B1 underflow); `useRefreshSignal()` defaults to `0` unwrapped so no existing test breaks (B2). S1–S5 folded. `.superpowers/sdd/critic-018.md`.

## Goal
Let the user pull down on Teraz and Miejsca to re-fetch live GIOŚ data, and show
the data's age ("1 godz temu") on Miejsca rows too (Teraz already shows it). A
refresh re-publishes the widget snapshot **when the data actually changes** (via the
existing `WidgetSyncProvider`, which republishes on identity change) — no extra
widget wiring.

## Design

### A global refresh signal (`src/shared/refresh/`)
```ts
export function RefreshProvider(props: { children: React.ReactNode }): JSX.Element;
// The fetch hooks consume ONLY this. Returns 0 when no provider is mounted, so
// usePlaceReading/usePlaceDetail stay unit-testable standalone and a value-stable
// 0 never refires their effect (no existing test needs a RefreshProvider). (B2)
export function useRefreshSignal(): number;
// The screens (+ ActivePlaceProvider) consume this.
export function useRefresh(): {
  refresh: () => void;          // bump signal + start the spinner (debounced)
  refreshing: boolean;
  settleActive: () => void;     // ActivePlaceProvider calls this when the active reading settles
};
```
Lifecycle (no counter — the crux, per critic Q1):
- `refresh()`: if `refreshing` already true → **no-op** (debounce, Q3). Else bump
  `signal` (a number) by 1, set `refreshing = true`, and arm an **8s safety timeout**
  that force-sets `refreshing = false` (the only way it can stick).
- `settleActive()`: if `refreshing`, set it false and cancel the timeout. Clearing
  when not refreshing is a harmless no-op (so the initial mount / place-change
  settle, which happens while `refreshing` is false, does nothing).
- `refreshing` is thus tied to the ACTIVE place's refetch (accurate on Teraz); the
  Miejsca rows refetch purely via the `signal` dep and their individual completion
  is not tracked — the 8s timeout bounds the worst case (accepted; see AC-6).
- `settleActive`/`refresh` are `useCallback`-stable (ref-based state), safe as effect deps.

### Fetch hooks (`src/shared/place/usePlaceReading.ts`, `usePlaceDetail.ts`)
- Add `const signal = useRefreshSignal();` and include `signal` in the effect deps
  (`[sourceForPlace, placeKey, signal]`). A bump re-runs the effect → refetch. That
  is the ONLY change — **no `begin/end`, no coupling to `useRefresh`** (kills B2).
- The existing `eslint-disable-next-line react-hooks/exhaustive-deps` stays as-is
  (it still intentionally excludes only the `place` object identity; `signal` is now
  listed). (S1)
- Behavior otherwise unchanged: success → `ready`; rejection → `stale` keeping the
  last reading; detail rejection → `undefined`.

### `ActivePlaceProvider` (`src/shared/place/ActivePlaceContext.tsx`)
- Consume `useRefresh()`; in an effect keyed on the active `state` (the `ReadingState`
  object, which gets a new reference every settle — ready or stale), call
  `settleActive()`. This clears `refreshing` when the active place's (signal-triggered)
  refetch completes. Mount/place-change settles are harmless no-ops (refreshing false).
- Requires `RefreshProvider` ABOVE `ActivePlaceProvider` (see App.tsx).

### Screens
- **Teraz** (`TerazScreen`, a `ScrollView`): `refreshControl={<RefreshControl
  refreshing={refreshing} onRefresh={refresh} tintColor={…} />}` from `useRefresh()`,
  dark-theme tint.
- **Miejsca** (`MiejscaScreen`, a `ScrollView` — confirmed, not FlatList): same
  `RefreshControl` on the outer ScrollView.
- **`App.tsx`**: mount `<RefreshProvider>` ABOVE `PlaceSourceProvider` AND
  `ActivePlaceProvider` and the navigator, so the active place and all rows share one signal.

### Miejsca row freshness (`src/features/miejsca/PlaceRow.tsx`)
- When a `reading` exists (including a `stale` row that still has a last reading),
  render the data age via `formatFreshness(reading.measuredAt, new Date())` (reuse the
  core helper the hero uses), subtle/dim, consistent with the row subtitle. A row with
  no reading (`brak danych`) renders no age line. (Q4: a stale row's age is honest — it
  IS that old — so it's shown, not hidden.)

### Widget (verify only — no new work)
A refetch that yields changed data → new snapshot identity → `WidgetSyncProvider`
republishes (spec 017). An identical re-fetch (same GIOŚ hour) → same identity → no
republish (correct). Confirm no extra wiring.

## Behavior — Acceptance Criteria

### Shared — refresh provider + hooks
- **AC-1** — `useRefresh()`: `refresh()` increments `useRefreshSignal()` by 1 and sets
  `refreshing` true; `settleActive()` sets it false and cancels the timeout; the 8s
  safety timeout force-clears `refreshing` if `settleActive` never comes; a second
  `refresh()` while `refreshing` is a **no-op** (signal unchanged — debounce). (Fake timers.)
- **AC-2** — `usePlaceReading` re-fetches when the signal bumps: fake `AirQualitySource`
  counting `getCurrentReading` — one mount = 1 call; wrapping in `RefreshProvider` and
  calling `refresh()` = 2 calls; an unrelated re-render (signal unchanged) = still 2.
  Same for `usePlaceDetail`/`getDetail`. **Unwrapped (no RefreshProvider) → `useRefreshSignal()`
  is `0`, hook still works, no refetch** (guards B2 — the existing suites stay green).
- **AC-3** — observable `refreshing` (NOT internals): false throughout the initial pending
  load; flips true only after `refresh()`; back to false once the active reading settles
  (drive a fake active reading to resolve, call `settleActive`) or the timeout fires.
- **AC-3b** — provider order: `ActivePlaceProvider` clears `refreshing` on active-reading
  settle only when nested under `RefreshProvider` (a small integration test asserting a
  refresh started, then the active fetch resolving, flips `refreshing` false).

### Feature — Miejsca row age
- **AC-4** — `PlaceRow` with a `ready` reading renders `formatFreshness(reading.measuredAt, now)`
  (freeze `now`); a `stale` row that still has a `reading` ALSO renders the age; a row with no
  reading (`brak danych`) renders no age line.

### Manual (sim — journal + evidence/18)
- **AC-5** — Pull down on Teraz → spinner shows, data re-fetches; if GIOŚ has a newer hour the
  number/age update, else the age correctly stays. Screenshot → evidence/18.
- **AC-6** — Pull down on Miejsca → all rows re-fetch and show their age. **Confirm the outer
  `RefreshControl` coexists with the inner Reanimated drag-reorder (`activateAfterLongPress`) and
  swipe-to-delete without conflict.** Note: a refresh re-runs the `location` place fetch on both
  Teraz and the Miejsca location row → geolocation runs again; note latency/permission behavior. (S5)

> **Note (not an AC):** once the widget native gate lands, a Teraz refresh that changes the data
> republishes the widget snapshot — verified under spec 017's manual ACs, not here. (S3)

## Non-goals (YAGNI)
- Auto/periodic background refresh (needs BGTask; deferred). · App-fetch-time label (kept the
  honest data-age only). · Per-row independent spinners on Miejsca (one list-level control).

## Verification
- **AC-1** `src/shared/refresh/__tests__/` (fake timers). **AC-2/AC-3/AC-3b**
  `src/shared/place/__tests__/` + refresh tests (fake source call-counts; the unwrapped-0 case
  guards the existing suites). **AC-4** `src/features/miejsca/__tests__/PlaceRow` (frozen now, ready + stale + brak-danych).
- **AC-5..6** manual on the sim, journal `docs/harness/18-refresh.md` + evidence/18.

## Resolved (critic)
- **B1** counter dropped → no underflow; `refreshing` is a plain boolean tied to the active
  settle + 8s timeout. **B2** `useRefreshSignal()` defaults to `0` unwrapped + no begin/end in the
  hooks → the 8 existing hook/screen suites need no migration. **S1** eslint-disable unchanged
  (only a value-stable `signal` added). **S2** AC-3 restated on observable `refreshing`. **S3**
  AC-7 demoted to a note. **S4** goal reworded ("when the data changes"). **S5** AC-6 covers the
  gesture coexistence + double-geolocation note. Q3 debounce (AC-1), Q4 stale-age shown (AC-4),
  Miejsca pinned as ScrollView.
