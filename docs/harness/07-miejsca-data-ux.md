# Harness journal 07 — Miejsca data/feedback UX

**Milestone:** M-miejsca-polish A · **Spec:** `docs/specs/007-miejsca-data-ux.md` · **Plan:** `docs/superpowers/plans/2026-08-12-m-miejsca-data-ux.md` · **Branch:** `feature/m-miejsca-data-ux` (stacked on `feature/m-miejsca` / PR #4)

## What the app gained
Three fixes from live user feedback (added places showed no value; `+` gave no feedback; the bare "—" read as broken):
1. **Live index in search results** — results now reuse `PlaceRow`, so each shows its
   live index (or "brak danych"), letting you see which stations actually have data
   before adding. Results are **capped at 8** and the query is **debounced (300 ms)**,
   so only the shown rows fetch and only after you pause typing.
2. **`+` → green `✓`** — a `SaveButton` flips the instant a station is saved (driven by
   `hasFavorite`); already-saved stations show `✓` from the start.
3. **"brak danych"** — everywhere a station has no current reading (data-less like
   Al. Niepodległości, or broken like Kondratowicza whose sensors endpoint 400s), rows
   show a small dim "brak danych" instead of a bare "—".

Root-cause note: the original "no data" was **not a bug** — 5 of 10 Warszawa stations
have fresh PM2.5, but search showed them by list order with no hint, so the user picked
two data-less ones. This milestone makes data availability visible at add-time.

## What the harness gained
- A generic `useDebouncedValue` hook in `src/shared/hooks`.
- `PlaceRow` generalized: `onDelete?` → a `trailing` slot (✕ for favorites, `+`/`✓` for
  results) + a `testID`, and a total tri-state index (loading→nothing, ready→index,
  stale→"brak danych") that reads `status`, not just `reading`.

## Layers introduced / changed
- `src/shared/hooks/useDebouncedValue.ts` (new).
- `src/shared/tokens`: `colors.success = '#34c759'` (borrowed from the design's toggle-on green).
- `src/features/miejsca`: `SaveButton` (new), `constants.ts` (`MAX_VISIBLE_RESULTS`),
  `PlaceRow` refactor, `MiejscaScreen` (debounced/capped live results).

## Mid-build corrections (critic, pre-build)
The `critic` returned NEEDS-REVISION and caught four real gaps before code:
1. AC 007-4 had dropped spec-006's "tap result → preview + navigate" coverage, and the
   refactored result row had no `testID` → restored `result-<id>` + a preview assertion.
2. `PlaceRow` must read `status` (not infer failure from `reading === undefined`, which
   also matches loading) → pinned the total tri-state rule.
3. The **core cost claim** ("only ≤8 fetch, not 30") had zero coverage → added a
   counting-source assertion proving exactly `MAX_VISIBLE_RESULTS` reads.
4. Manual AC must verify `+` flips without navigating (RNTL can't catch responder
   bubbling); `useDebouncedValue` reset-on-change + unmount-cleanup pinned; `✓` green
   noted as borrowed. It also confirmed the `onDelete→trailing` blast radius was exactly
   two test files (no hidden third importer — the M-miejsca "missed Hero.test" lesson held).

## Whole-branch review (post-build)
Verifier: PASS (all 6 ACs). Reviewer: CHANGES-REQUESTED (two test-quality findings;
architecture/boundaries/sizes/dead-code all clean) → both addressed:
1. **PlaceRow AC 007-2 didn't pin loading-vs-stale** — it only checked settled
   end-states, so a regression to inferring failure from `reading === undefined`
   (ignoring `status`) wouldn't be caught. → added a pending-promise test asserting the
   index slot shows **neither** the index nor "brak danych" while `status === 'loading'`.
2. **"overlapping act()" warnings** in the search tests (8 concurrent result fetches
   racing `waitFor`). → restructured to settle all fetches in one `waitFor` gate before
   interacting; **"overlapping act()" is now 0**.
   *Accepted residual:* plain "not wrapped in act(…)" warnings still surface from the
   real-timer debounce (`setTimeout`) firing outside `act` and the fetch-in-effect
   cascade. They don't fail any test and are a *test*-console artifact (the DoD's
   "no simulator warnings" doesn't cover them). Fully removing them needs fake timers,
   which the spec forbids for these tests (fake timers deadlock `waitFor`). Candidate
   future test-infra fix: a test-only debounce-delay override. Documented, not chased.

## Known limitations (deferred)
- **Gestures (swipe-to-delete + drag reorder)** → spec 008 (needs
  `react-native-gesture-handler`; reorder via custom Reanimated + gesture-handler).
- No refresh/caching (each row still fetches once on mount).
- A station with no PM2.5 still just reads "brak danych" (no scan-outward).

## Manual evidence (AC 007-6)
JS-only change — reloaded on the existing sim build (no native rebuild). Metro bundle
confirmed to contain the new code ("brak danych", `SaveButton`, `useDebouncedValue`).
- **Boot with the new JS** (`ac-007-6-boot-new-js.png`): the app relaunches cleanly on
  the new bundle; Teraz renders live (Kraków fallback because the device's nearest
  station has no fresh PM2.5 now — the expected `__DEV__` fallback log, not a defect).
- **The interactive Miejsca walkthrough** (search → live indices + "brak danych" → `+`→`✓`
  → favorite shows its value) needs UI taps that can't be driven headlessly (no
  `idb`/accessibility). That logic is covered by automated **AC 007-2/3/4**; the new JS
  is live on the sim, so the walkthrough is available to the human on the Miejsca tab.

## Retro — corrections became rules
_(placeholder — filled at merge, step 10)_
