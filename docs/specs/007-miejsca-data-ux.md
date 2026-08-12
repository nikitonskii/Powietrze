# Spec 007: Miejsca data/feedback UX

**Status:** draft
**Milestone:** M-miejsca-polish A (data + feedback; gestures → spec 008)
**Sources:** `design/README.md` §"Screens/Views → 2. Miejsca" (search results with an
index chip + `+` to save; live values); `docs/specs/006-miejsca.md` (the `PlaceRow`,
`usePlaceReading`, `useFavorites`, `searchStations` this builds on); user feedback
(2026-08-12): added places showed no value, `+` gave no feedback, the bare "—" read as
broken.

## Scope

Three focused fixes to the Miejsca screen, no new dependencies:
1. **Live index in search results** — each visible result shows its live index (or
   "brak danych"), so the user can see which stations actually have current data
   *before* adding. Results are **capped** and the query is **debounced**.
2. **`+` → success indicator** — the save control shows `+` when a station is not yet a
   favorite and flips to a green `✓` the instant it is saved.
3. **Legible "brak danych"** — everywhere a reading fails (a data-less station like
   Al. Niepodległości, or a broken one like Kondratowicza whose sensors endpoint 400s),
   rows show a small dim **"brak danych"** instead of a bare "—".

## Non-goals

- **Swipe-to-delete, drag reorder** → spec 008 (needs `react-native-gesture-handler`).
- **Refresh / caching** of readings → later; each row still fetches once on mount.
- **Scanning outward to the nearest station that *has* PM2.5** — out of scope; a
  data-less favorite simply reads "brak danych". (Location mode keeps its Kraków fallback.)
- **Showing live values for ALL 30 search matches** — only the visible cap (~8) fetch.

## Public API

`src/shared/hooks/useDebouncedValue.ts` (new; generic, no place/data coupling):
```ts
export function useDebouncedValue<T>(value: T, delayMs: number): T;
// Returns the latest value, but only after `value` has been stable for delayMs.
```

`src/shared/tokens` — add `colors.success = '#34c759'` (the design's toggle-on green).

`src/features/miejsca/constants.ts` (new): `export const MAX_VISIBLE_RESULTS = 8;`

`src/features/miejsca/PlaceRow.tsx` (**refactor** — replaces `onDelete?` with a slot):
```ts
export function PlaceRow(props: {
  place: ActivePlace;
  title: string;
  subtitle: string;
  onPress: () => void;
  trailing?: React.ReactNode; // right-side control: the ✕ for favorites, +/✓ for results
}): JSX.Element;
```
The index slot renders: the live index when a reading resolved; a small dim
**"brak danych"** when the reading failed (status `stale`, no reading); nothing while
still `loading`.

`src/features/miejsca/SaveButton.tsx` (new):
```ts
export function SaveButton(props: { station: Station }): JSX.Element;
// Reads useFavorites(); shows '+' (accent, testID `save-<id>`) when not a favorite,
// or '✓' (colors.success, testID `saved-<id>`, non-interactive) when already saved.
// Pressing '+' calls add(station) → the row is now a favorite → re-renders as '✓'.
```

`src/features/miejsca/MiejscaScreen.tsx` (changed): debounces the query
(`useDebouncedValue(query, 300)`), caps results to `MAX_VISIBLE_RESULTS`, renders each
**result via `PlaceRow`** (so it shows a live index) with `trailing={<SaveButton station={s} />}`,
and each **favorite via `PlaceRow`** with a `trailing` delete control (a `Pressable`
with the ✕, testID `delete-<city>` — unchanged from spec 006).

## Behavior — Acceptance Criteria

- **AC 007-1** — `useDebouncedValue(value, delayMs)` (jest fake timers): returns the
  initial value immediately; after `value` changes it keeps returning the OLD value until
  `delayMs` has elapsed, then returns the new one; a change before `delayMs` elapses
  resets the timer (only the latest value is emitted). Pins: initial → immediate;
  `advanceTimersByTime(delayMs - 1)` → still old; `+1` more → new.
- **AC 007-2** — `PlaceRow` (RNTL, fake `sourceForPlace`): a resolving source renders the
  live index and the `trailing` node; a **rejecting** source renders **"brak danych"**
  (not "—") in the index slot; tapping the row fires `onPress`.
- **AC 007-3** — `SaveButton` (RNTL, `FavoritesProvider` + fake store): for a station NOT
  in favorites, renders `+` (testID `save-<id>`); pressing it calls the store's `save`
  and the button flips to `✓` (testID `saved-<id>`). For a station ALREADY in favorites,
  renders `✓` from the start and pressing it does nothing (no extra save).
- **AC 007-4** — `MiejscaScreen` search (RNTL, real `useDebouncedValue`, fake source):
  entering a query that matches **> 8** stations (synthetic `StationsProvider` list)
  renders **at most `MAX_VISIBLE_RESULTS` (8)** result rows after the debounce settles
  (`await waitFor`), each showing a live index and a `SaveButton`; a result whose source
  **rejects** shows "brak danych". Pressing a result's `save-<id>` adds it (store `save`
  called) and its control becomes `saved-<id>`.
- **AC 007-5** — `MiejscaScreen` favorites branch still works after the `PlaceRow`
  refactor (regression, must stay green): the pinned "Twoja lokalizacja" row + empty
  hint (spec 006 AC 006-8), a favorite row's ✕ (`delete-<city>`) removing + persisting,
  and deleting one favorite NOT refetching the others (the spec-006 bug guard) all hold.
- **AC 007-6** *(manual)* — On the simulator: search "Warsz" → results show live indices,
  with data-less stations reading "brak danych"; tap `+` on a station with data → it
  flips to `✓` and appears in the favorites list with its live value. *(Screenshots;
  interactive taps are offered to the human — same headless-tap limit as prior milestones.)*

## Resolved ambiguities

- **Search results reuse `PlaceRow`** (so they show a live index) rather than the
  spec-006 name-only custom row. `PlaceRow`'s `onDelete?` becomes a general `trailing`
  slot; favorites pass a delete ✕, results pass a `SaveButton`.
- **Debounce + cap bound the API cost**: only the ≤ 8 visible result rows fetch, and only
  after the query is stable for 300 ms. `searchStations` already caps its match list at
  `MAX_RESULTS` (30); the screen slices to `MAX_VISIBLE_RESULTS` (8) for display/fetch.
- **"brak danych" vs "—"**: a resolved-but-empty reading (station has no fresh PM2.5, or
  its endpoint errors) shows "brak danych"; the loading interval shows nothing (brief).
  This replaces the bare "—" everywhere `PlaceRow` is used (location row, favorites, results).
- **`✓` is terminal in the search list** — once saved, the control is a non-interactive
  `✓`; removal happens from the favorites list (the ✕), matching the design ("`+` adds if
  not already present").
- **The refetch-churn fix from spec 006 still holds** — result and favorite rows are keyed
  by station id and `usePlaceReading` keys on the primitive `placeKey`, so debounced
  re-renders don't refire fetches for unchanged rows.

## Risks & config

- **No new dependencies** (pure JS + the existing Reanimated/Skia stack untouched).
- **Boundaries**: `useDebouncedValue` is a generic hook in `src/shared/hooks` (shared →
  core only; it imports only React). `SaveButton`/`PlaceRow` stay in `src/features/miejsca`
  and consume `src/shared/place` contexts (no `data` import).
- **File-size rule**: `MiejscaScreen` stays ≤ 200 lines (the result/favorite rows already
  factor through `PlaceRow`; `SaveButton` and the delete control are their own units).
- **Test regressions**: the `PlaceRow` `onDelete → trailing` refactor touches
  `PlaceRow.test.tsx` and `MiejscaScreen.test.tsx` (spec-006 AC 006-8/9) — both must be
  updated and stay green (see AC 007-5).

## Verification

- **AC 007-1** — `src/shared/hooks/__tests__/useDebouncedValue.test.ts` (fake timers).
- **AC 007-2** — `src/features/miejsca/__tests__/PlaceRow.test.tsx`.
- **AC 007-3** — `src/features/miejsca/__tests__/SaveButton.test.tsx`.
- **AC 007-4, AC 007-5** — `src/features/miejsca/__tests__/MiejscaScreen.test.tsx`.
- **AC 007-6** — recorded manual evidence: simulator screenshots (`docs/harness/evidence/07/`).
