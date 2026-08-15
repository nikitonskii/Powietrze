# Final review — M-settings-wired (spec 014, AC-1..9)

**Verdict: APPROVE-WITH-NITS**

Base `56abe49` → HEAD `bb3e2ea` (6 commits). Re-ran the full suite with
coverage scoped to `src/core` (`jest --coverage`): **51 suites / 181 tests
passed, `src/core` 100% stmts/branch/func/lines**; `npm run lint` → 0 errors /
4 pre-existing warnings (App.tsx, mappers.ts, HistoryChart.tsx, Toggle.tsx —
none touched by this branch); `npx tsc --noEmit` → clean. The gate claims in
the task reports are confirmed independently here, not just trusted (note:
Task 1's own report flagged a sandbox EPERM writing `coverage-final.json` —
same class of issue I hit writing this file — so its 100%-coverage claim was
unverified at the time; I confirmed it for real with a fresh full-suite run).

## Critical
None.

## Important
None.

## Minor

1. **`src/features/teraz/Hero.tsx:11` + `src/features/teraz/TerazScreen.tsx:30`
   — dead field.** The `Place.index` field is still declared in `Hero`'s
   `Place` interface and still populated by `TerazScreen`
   (`index: reading.index`), but `Hero` no longer reads `place.index`
   anywhere in its body — it was replaced by the pre-formatted `value: string`
   prop in this change (see the Hero.tsx diff: `String(place.index)` →
   `{value}`). `Hero.test.tsx` even keeps passing `place={{ ...PLACE, index:
   20 }}` in several cases, propagating the now-unused field into tests too.
   Harmless today but it's leftover state that invites confusion (a reader
   will assume `index` drives something). Fix: drop `index` from `Place` (and
   from the object `TerazScreen` builds) unless a near-future task needs it.

2. **`src/core/air/index.ts:33-35` — import not at top of file.**
   `import type { Scale, Precision } from '../settings';` was appended after
   `export * from './history';` (line 33) rather than grouped with the file's
   other imports at the top (line 1). Cosmetic only (TS/ESLint pass either
   way, `import/first` isn't enforced here) but inconsistent with the rest of
   the codebase's style; a one-line move would tidy it.

3. **`src/shared/place/ActivePlaceContext.tsx:39-46` — one harmless extra
   re-render on mount** (already flagged and accepted in Task 5's review and
   in `progress.md`). The reset `useEffect` always fires once on mount,
   calling `setActive(target)` with a value-equal-but-not-reference-equal
   object versus the `useState(() => target)` initializer, so `active`
   changes reference and downstream `usePlaceReading`/`usePlaceDetail`/
   `useMemo` recompute once for nothing observable. **Triage: ship as-is.**
   `usePlaceReading`/`usePlaceDetail` key their fetch effects on the derived
   primitive `placeKey` (`'location'` or `station:${id}`), not on `active`'s
   object identity (confirmed by reading `usePlaceReading.ts:19-35`), so this
   causes zero extra network calls — only one extra render pass, which is the
   documented, accepted cost of "hydration may fire the reset once" per the
   spec's own AC-6 note. Not worth a task for.

4. **`src/shared/place/ActivePlaceContext.tsx:46` — effect deps include
   `defaultStation`, not "keyed ONLY on `settings.loc`" as spec 014's Wiring
   section states verbatim.** In practice this is safe (`KRAKOW_STATION` is a
   module-level constant in `App.tsx`, so its reference never changes across
   renders — confirmed by grep), and Task 5's reviewer explicitly accepted
   this as a deliberate, documented deviation. Flagging only because the spec
   text and the shipped code diverge in wording; if `defaultStation` is ever
   passed as a non-stable literal by a future caller, the effect would refire
   on every render of that caller (though still not loop, since `setActive`
   with a changed reference doesn't retrigger this effect — only its own
   deps changing would). No action needed now.

## Cross-cutting checks (per review brief)

1. **CLAUDE.md compliance.** Layering intact: `core/air`, `core/places` stay
   pure (zero React imports, verified by reading both files in full); `data`
   imports (`KRAKOW_STATION`) only touched in `App.tsx` (composition root);
   no cross-feature imports found (`teraz`/`miejsca`/`ustawienia` do not
   import each other; both import only `shared`/`core`). File sizes: largest
   touched file is `UstawieniaScreen.tsx` at 196 lines (under 200, but worth
   watching — it's the closest to the ceiling in this diff). No function
   observed over ~25 lines. No `any` introduced anywhere in the diff (grepped
   `: any`, `<any>`, `as any` — zero hits). No hard-coded hex/design values
   introduced in non-test files (grepped `#[0-9a-fA-F]{3,8}` — zero hits;
   `Hero.tsx`'s `${scene.key}88` alpha-suffix pattern is pre-existing, not
   part of this diff). Test names all cite AC IDs.

2. **Scale/precision consistency.** `TerazScreen` (hero) and `PlaceRow`
   (Miejsca rows) both compute the displayed number via the *same*
   `displayValue(index, pm25, settings.scale, settings.precision)` from
   `core/air` — verified by reading both call sites
   (`TerazScreen.tsx:32-37`, `PlaceRow.tsx:62-67`). Color/band on both stay
   `scene(index).key`/`scene(index).band`, never scale-dependent — verified
   in both files. `PollutantTiles` (PM10/NO₂) and the hero's `PM2.5 · …`
   sub-line both format via `formatConcentration(v, precision)` — no raw
   `Math.round`/`toFixed` bypasses found anywhere in the touched files.
   `MiejscaScreen.tsx` itself was not modified and doesn't render a
   number independently of `PlaceRow` (grepped `reading.index`/`reading.pm25`
   in that file — zero hits). Consistent end-to-end.

3. **Test fallout.** Read every changed test file's diff in full
   (`ActivePlaceContext`, `UstawieniaScreen`, `Hero`, `PlaceRow`,
   `MiejscaScreen`, `FavoriteRow`, `TerazScreen` + `.nearest`,
   `PollutantTiles`, `AppNavigator`). All changes are additive assertions or
   provider-wiring fixes (adding `SettingsProvider`, reordering
   `SettingsProvider`/`ActivePlaceProvider` nesting in `AppNavigator.test.tsx`
   to match the pattern already correct elsewhere); none narrow or remove an
   existing assertion. The rewritten spec-009 AC-18/AC-21 assertions in
   `UstawieniaScreen.test.tsx` are genuine and stricter than before (added
   `queryByTestId('setting-widget')` / `queryByText(...)` → `null` checks, an
   explicit tagged-vs-untagged split) — not weakened.

4. **US-AQI correctness.** `usAqiFromPm25` truncates via
   `Math.floor(pm25 * 10) / 10` before the band lookup, matching the spec's
   EPA-truncation requirement; non-finite/`≤0` → 0 short-circuits before the
   band search, so no path reaches `US_AQI_BANDS.find(...)!` with a value that
   could return `undefined` (the non-null assertion is safe given the
   `c >= 500.4` guard above it and bands covering `[0, 500.4]`). AC-1's
   fixture pins every band boundary + the 12.05 gap case; independently
   re-verified the arithmetic for a few rows by hand (e.g. `12.05→50`,
   `35.4→100`, `150.5→201`) — matches. `TerazScreen → displayValue →
   usAqiFromPm25` path traced end-to-end, no intermediate rounding/NaN risk.

5. **loc-reset effect.** Loop-safe: effect deps `[settings.loc,
   defaultStation]`, never the freshly-computed `target` object (would loop).
   No unwanted refetch: `usePlaceReading` keys its fetch effect on `placeKey`
   (a primitive derived from `station.id`/`'location'`), so a same-station
   reset doesn't refetch — see Minor #3 for the one-render (no-refetch) cost,
   which is accepted.

6. **Dead code / duplication.** One real finding — `place.index` (Minor #1)
   above. No other dead code, no duplicated scale/precision logic (both
   `TerazScreen` and `PlaceRow` call the same core `displayValue`/
   `formatConcentration` rather than reimplementing), no speculative
   abstraction introduced (`US_AQI_BANDS` table and `defaultPlace` are both
   scoped exactly to what AC-1/AC-4 require, nothing extra).

## AC-1..9 coverage sanity

| AC | Covered by | Status |
|----|-----------|--------|
| AC-1 (usAqiFromPm25) | `core/air/__tests__/scale.test.ts` — 19-case literal fixture, full table + gap + clamp + non-finite | done |
| AC-2 (formatConcentration) | same file | done |
| AC-3 (displayValue) | same file | done |
| AC-4 (defaultPlace) | `core/places/__tests__/defaultPlace.test.ts` | done |
| AC-4b (scaleLabel) | `core/air/__tests__/scale.test.ts` | done |
| AC-5 (hero + PlaceRow number, color stays CAQI) | `TerazScreen.test.tsx` (µg/m³, US AQI cases), `PlaceRow.test.tsx` | done |
| AC-5b (scale caption, hidden pm25Label) | `Hero.test.tsx` (new µg/m³ case), `TerazScreen.test.tsx` | done |
| AC-6 (ActivePlaceProvider default + reset) | `ActivePlaceContext.test.tsx` — 3 new cases (loc off, loc on, runtime toggle) | done |
| AC-7 (PollutantTiles precision) | `PollutantTiles.test.tsx` — Dokładna/Przybliżona cases | done |
| AC-8 (Ustawienia tags/widget removal) | `UstawieniaScreen.test.tsx` AC-18 + AC-8/21 | done |
| AC-9 (manual sim) | **deferred to Task 7** per plan — not yet evidenced | pending, expected (out of scope for the 6 code tasks) |

## Deferred-Minor triage (Task 5: mount re-render)

**Ship as-is.** The effect firing once on mount only changes `active`'s
object *reference*, not `placeKey`'s *value*, so `usePlaceReading`/
`usePlaceDetail` do not refetch — confirmed by reading `usePlaceReading.ts`
(effect keyed on `[sourceForPlace, placeKey]`, `placeKey` a derived
primitive). Cost is one extra render pass immediately after mount, which
matches the spec's own accepted note that hydration "fires the reset once...
benign." Not worth a fix-up task; revisit only if a future perf pass flags
unnecessary renders as a real problem.

## Findings summary

- Critical: 0
- Important: 0
- Minor: 4 (dead `Place.index` field; import placement nit; accepted mount
  re-render; effect-deps wording deviates from spec text but is safe)

**Verdict: APPROVE-WITH-NITS**
