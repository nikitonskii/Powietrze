# Review 5 verdict — ActivePlaceProvider default station + loc reset (AC-6, spec 014)

SPEC: ✅
QUALITY: APPROVE

## Findings

Clean — no Critical or Important findings.

### Minor (non-blocking)
- `src/shared/place/ActivePlaceContext.tsx:39-46`: the reset `useEffect` always
  fires once on mount, calling `setActive(target)` with a freshly-allocated
  object that is value-equal (not reference-equal) to the `useState(() =>
  target)` initializer's value. This causes one extra re-render immediately
  after mount (new `active` reference → `usePlaceReading`/`usePlaceDetail`
  recompute, `useMemo` value recomputes) even though nothing observable
  changes, since `placeKey` (a primitive) is unchanged. Harmless — matches the
  brief's explicit design and the spec's own note that "the effect cannot and
  need not distinguish hydration from a user toggle" — but worth knowing if a
  future perf pass looks at unnecessary renders.
- Brief/AC-6 test coverage doesn't add a case for `defaultStation` prop
  identity changing at runtime (e.g. App swapping stations) — not a real
  scenario today (`KRAKOW_STATION` is a stable module constant in App.tsx), so
  not a gap worth blocking on.

## Verification performed
- Read `docs/specs/014-settings-wired.md` AC-6 and confirmed the brief's
  `defaultStation?: Station` (optional) is a deliberate, documented deviation
  from the spec's API-section phrasing ("gains `defaultStation: Station`") —
  the brief explicitly calls this out to keep bare `<ActivePlaceProvider>`
  consumers (AppNavigator/Teraz/Miejsca tests) working; spec's AC-6 body itself
  only requires the *behavior* (loc:true→LOCATION_PLACE, loc:false→station),
  which optional-with-fallback satisfies. Not a defect.
- Confirmed `target` computation and reset effect deps exactly match the
  brief: `target = defaultStation ? defaultPlace(settings.loc, defaultStation)
  : LOCATION_PLACE`; `useState(() => target)`; effect deps `[settings.loc,
  defaultStation]` (NOT `target`), with an inline-commented
  `eslint-disable-next-line react-hooks/exhaustive-deps` — consistent with the
  existing justified-disable pattern already used in `usePlaceReading.ts` and
  `usePlaceDetail.ts` in this codebase.
- Traced `usePlaceReading`/`usePlaceDetail`: both key their fetch effects on a
  derived primitive `placeKey` (`'location'` or `station:${id}`), not on the
  `place` object identity — so the reset effect producing a new `active`
  object reference each time is safe; downstream effects only refire when
  `placeKey` actually changes value (correct refetch-on-real-change, no loop,
  no thrash).
- Confirmed `KRAKOW_STATION` (`src/data/gios/constants.ts`) is a module-level
  `const`, so `defaultStation` has a stable reference across `App.tsx`
  re-renders (e.g. when `stations` state updates) — the reset effect won't
  spuriously refire on unrelated App re-renders.
- Confirmed the pre-existing "AC 006-6: defaults to location" test is
  unchanged in assertion, only gains a `SettingsProvider` wrapper (default
  store, no `defaultStation`) — behavior identical to before (always
  `LOCATION_PLACE`).
- Grepped all `ActivePlaceProvider` render sites in test files
  (`AppNavigator.test.tsx` both helpers, `TerazScreen.test.tsx`,
  `TerazScreen.nearest.test.tsx`, `MiejscaScreen.test.tsx` x3,
  `ActivePlaceContext.test.tsx` x4): every one has `SettingsProvider` as an
  ancestor of `ActivePlaceProvider` (not nested inside it), and none of the
  four *consumer* suites (AppNavigator/Teraz/Miejsca) pass `defaultStation`,
  so they all still get plain `LOCATION_PLACE` behavior — no regression risk
  from the new prop.
- Confirmed the "unplanned fix" to `AppNavigator.test.tsx` is real and
  necessary: prior to this diff it nested `<SettingsProvider>` *inside*
  `<ActivePlaceProvider>` in both render helpers, which would throw
  (`useSettings: wrap the tree in <SettingsProvider>`) now that
  `ActivePlaceProvider` calls `useSettings()`. The diff swaps the nesting
  order to match the already-correct pattern in the other three consumer
  suites. Scope is appropriately minimal (nesting swap only, no assertion
  changes).
- `git show --stat 2e6d13e` matches `review-5.diff` exactly — diff reviewed is
  the actual committed change, not a stale artifact.
- File sizes: `ActivePlaceContext.tsx` 61 lines, `App.tsx` 65 lines — both well
  under the 200-line limit; the provider function itself is ~24 lines, under
  the 40-line function limit.
- No `any`, no unjustified `@ts-ignore`/`@ts-expect-error`. The one
  `eslint-disable` is inline-commented and consistent with existing codebase
  convention.
- Layering: `App.tsx` (composition root) importing `KRAKOW_STATION` from
  `src/data/gios` is allowed per the brief and existing precedent (App already
  imports data/gios); `src/shared/place` importing `useSettings` from
  `../settings` (shared→shared, sibling) does not violate
  features→shared→core direction.
- Did not re-run tests/lint/typecheck per instructions; relied on the report's
  claimed full 181-pass / 0-lint-error / clean-typecheck results, cross-checked
  against the diff content for plausibility (test additions are straightforward
  React Testing Library patterns already used elsewhere in this file).

## Reset-effect ruling
Loop-safe and clobber-safe: deps are `[settings.loc, defaultStation]` only
(never the freshly-allocated `target`), `defaultStation` is a stable
module-level constant in production, and both downstream data hooks
(`usePlaceReading`, `usePlaceDetail`) key their own effects on a derived
primitive `placeKey` rather than object identity — so the effect cannot loop
and the harmless mount-time re-fire (value-equal `target`, no real place
change) clobbers nothing since there's no synchronous competing `setActive`
call anywhere in the tree at mount.

verdict written
