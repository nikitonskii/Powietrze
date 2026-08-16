# Task 3 report: SmogAlertProvider + App wiring

**Commits:**
- `87694d2` — `feat(alert): SmogAlertProvider — per-place threshold-crossing alerts (AC-4)`
- `f0e1659` — `fix(alert): split SmogAlertProvider test + cover stale-not-evaluated (S4) (review)`
  (addresses the CHANGES-NEEDED review below; see "Review-fix update" at the
  bottom of this report for what changed and why.)

## Files

- Created `src/shared/alert/index.tsx` (69 lines) — `SmogAlertProvider`, plus two
  small extracted pieces to keep the component under the 40-line function budget:
  - `placeKeyFor(place: ActivePlace): string` — pure helper, same expression as
    `usePlaceReading.ts` (`active.kind === 'location' ? 'location' : \`station:${active.station.id}\``).
  - `useAlertPermission(alert, notifier, set)` — permission effect extracted out
    of the component body (mirrors `NotificationsProvider`'s morning-toggle effect).
  - `SmogAlertProvider` itself is 33 lines (measured `awk` over the function body).
- Created `src/shared/alert/__tests__/SmogAlertProvider.test.tsx` (365 lines) — 8
  tests, all citing AC-4.
- Modified `App.tsx` — imported `SmogAlertProvider`, mounted it inside
  `ActivePlaceProvider` (which is itself inside `SettingsProvider`/
  `NotificationsProvider`), wrapping `WidgetSyncProvider`/`SafeAreaProvider`/
  `AppNavigator`. Reused the existing module-level `notifier` (`createNotifeeNotifier()`)
  already built for `NotificationsProvider` — no new instance. No existing provider
  was dropped or reordered; the only change is inserting one new layer.

## Exact App.tsx placement

```tsx
<NotificationsProvider notifier={notifier}>
  <ActivePlaceProvider defaultStation={KRAKOW_STATION}>
    <SmogAlertProvider notifier={notifier}>
      <WidgetSyncProvider sync={widgetSync}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" />
          <AppNavigator />
        </SafeAreaProvider>
      </WidgetSyncProvider>
    </SmogAlertProvider>
  </ActivePlaceProvider>
</NotificationsProvider>
```

## placeKey expression used

Identical to `usePlaceReading.ts`:

```ts
place.kind === 'location' ? 'location' : `station:${place.station.id}`
```

Extracted as `placeKeyFor(active)` inside `src/shared/alert/index.tsx` (not shared
with `usePlaceReading.ts` — the plan asked to derive it "the same way", not to
factor out a cross-module helper; `usePlaceReading` keys its `useEffect` on this
same string, so both stay in sync by construction, with a comment noting the
duplication is deliberate).

## Design notes / deviations from the literal recipe

- **Effect dependency arrays follow the plan literally**: permission effect keyed
  on `[alert, notifier]` (mirroring `NotificationsProvider`'s `[morning, notifier]`
  exactly, including its `set`-excluded eslint-disable justification); fire effect
  keyed on `[status, reading, alert, threshold]` per the plan's explicit recipe,
  with `active`/`notifier`/`clock` excluded and justified via
  `eslint-disable-next-line react-hooks/exhaustive-deps` (same pattern as
  `usePlaceReading.ts`'s `placeKey`-not-`place` exclusion) — `active` is read at
  fire-time from the latest render's closure, which is safe because a place
  switch only triggers `notifySmog` evaluation once the new `reading` for that
  place has actually settled (see test discussion below), by which point the
  component has already re-rendered with the new `active`.
- **Decomposition beyond the plan's inline recipe**: the plan's Task 3 code
  sketch, written as one block, is ~47 lines as a single function body — over
  CLAUDE.md's "functions ≤ 40 lines" rule. Extracted `placeKeyFor` (pure) and
  `useAlertPermission` (a private hook, not exported) to bring
  `SmogAlertProvider` to 33 lines. No new public API surface — same
  `{ notifier, now?, children }` signature as specified.
- No other deviation: same dedup Map (`useRef(new Map<string, boolean>())`), same
  `now = props.now ?? (() => new Date())` default, same `smogAlertDecision` call
  shape, same `status !== 'ready' || !reading` early return.

## Test list (all cite AC-4, `src/shared/alert/__tests__/SmogAlertProvider.test.tsx`)

1. `AC-4: fires notifySmog once on a rising crossing`
2. `AC-4: does not fire below threshold`
3. `AC-4: does not fire when alert is off`
4. `AC-4: does not fire during quiet hours` (injected `now` inside 22:00–07:00)
5. `AC-4: does not fire while status is not ready (pending fetch)`
6. `AC-4: staying above threshold on refetch does not re-fire; dropping below
   then re-crossing fires again` — drives real refetches via `RefreshProvider` +
   a `refresh` button, mutating the fake source's returned index between presses.
7. `AC-4 (S2): per-place dedup — switching away and back does not re-fire; a
   distinct place fires on its own` — place A (≥thr) fires once; switch to B
   (≥thr) fires again for B; switch back to A (still ≥thr) does **not** re-fire.
8. `AC-4: toggling alert on requests permission; denied reverts the setting`

Harness: copied the `store`/`SettingsProvider` wiring from `NotificationsProvider.test.tsx`
and the `PlaceSourceProvider`/`ActivePlaceProvider` wiring from
`ActivePlaceContext.test.tsx`; `fakeNotifier` extends the existing pattern with a
`notifySmog: jest.fn()`. `render()` is awaited everywhere a query result is
destructured immediately (v14 async render), and interactions use
`fireEvent.press(...)` (not `.props.onPress()`, which resolves to a non-function
on some host-node shapes in this RNTL version) wrapped in `act(async () => ...)`.

### Bugs found and fixed while writing the tests (both in the test harness, not production code)

- `DEFAULT_SETTINGS.loc` is `true`. `ActivePlaceProvider` synchronously mounts
  with `active = LOCATION_PLACE` (since `SettingsProvider` starts at
  `DEFAULT_SETTINGS` before its async `store.load()` resolves), then flips to
  `defaultStation` only after hydration. Any test that supplies a station-keyed
  fake source and expects the *station* reading needs `loc: false` in its seeded
  settings, else the initial transient `location` placeKey reading (index 0 in
  my fixed sources) is what gets evaluated, or — worse, if the fake source
  ignores `place.kind` — the transient `location` fetch and the settled
  `station` fetch both cross the threshold and double-fire. Fixed by adding
  `loc: false` to every test's settings and making all fake sources key off
  `place.kind` (location → 0, safely below any test threshold).

## Gate results

- `npm run typecheck` → clean, no errors.
- `npm run lint` → 0 errors, 4 pre-existing warnings unrelated to this change
  (`App.tsx` inline style, `HistoryChart.tsx`, `Toggle.tsx`, `mappers.ts` unused
  eslint-disable) — none touch files from this task.
- `npm test` (`jest`, full suite) → 61 suites / 242 tests passed.
- `npx jest --coverage` → same 61/242 passing, exit code 0 (no coverage-threshold
  failure; `src/core` untouched by this task and still enforced at 100%). Note:
  the coverage HTML/JSON report failed to *write* under the sandbox
  (`EPERM` on `coverage/coverage-final.json`), but this is a sandbox
  filesystem-permission artifact, not a test/coverage failure — Jest's own exit
  code was 0 and the threshold gate is evaluated before/independent of the report
  write. `coverage/` is gitignored.

## Concerns / follow-ups (informational, not blocking)

- Test 6 (staying-above / re-cross) relies on `RefreshProvider`'s `refresh()` to
  force a real refetch for the *same* place — this is the only way to get a new
  `reading` object for an unchanged `placeKey` given `usePlaceReading`'s
  placeKey/signal-keyed effect. This matches real app behavior (pull-to-refresh)
  but does not exercise a periodic/background poll path, which is explicitly
  out of scope (spec 019 non-goals: closed-app/background alerts deferred).
- Per spec's "Open Qs" (already accepted in spec 019): the per-place dedup Map
  is in-memory only — a restart while still above threshold can re-fire once.
  Not addressed here; out of scope for Task 3.

---

## Review-fix update (commit `f0e1659`)

Review verdict on the first pass was **CHANGES-NEEDED**: (1) the test file was
365 lines, over CLAUDE.md's ≤200 rule; (2) spec 019 §S4's "stale reading must
not be evaluated / must not corrupt `wasAbove`" had no dedicated test — the
only ready-gate test covered `loading` (no retained value), not `stale` (which
*does* carry a retained value and is the actually-risky case S4 calls out);
(3) a minor inaccurate eslint-disable comment; (4) two optional cleanups.
All four addressed:

### 1. Test file split (365 → 4 files, all ≤200 lines)

- **`src/shared/alert/__tests__/harness.tsx`** (174 lines, NOT a test file) —
  extracted every shared fixture: `store`, `fakeNotifier`, `station`/`stationA`/
  `stationB`, `reading`, `DAY`/`NIGHT`, `fixedSource`, plus render-tree helper
  components (`AlertControls` — exposes `status`/`refreshing`/a `refresh`
  button for deterministic waits; `AlertToggle`; `PlacePicker`) and a
  `renderAlert(opts)` function that wires
  `PlaceSourceProvider → SettingsProvider → ActivePlaceProvider →
  SmogAlertProvider` (optionally under `RefreshProvider`) from a small options
  object, cutting per-test boilerplate from ~20 lines to ~5.
  - **Gotcha:** Jest's default `testMatch` (`**/__tests__/**/*.[jt]s?(x)`)
    treats *every* file under a `__tests__/` folder as its own suite —
    `harness.tsx` failed with "must contain at least one test." No other file
    in the repo breaks the `*.test.ts(x)` naming convention, so I tightened
    `jest.config.js`'s `testMatch` to `['**/__tests__/**/*.test.[jt]s?(x)']` —
    a no-op for every existing spec file, and now the standard way to host a
    shared test-only helper module next to the specs that use it.
- **`src/shared/alert/__tests__/crossing.test.tsx`** (175 lines, 7 tests) —
  rising crossing fires once; below threshold; alert off; quiet hours;
  ready-gate on `loading`; **NEW** ready-gate on `stale` (S4, see below);
  staying-above no-refire / drop+re-cross refire.
- **`src/shared/alert/__tests__/perPlace.test.tsx`** (33 lines, 1 test) — the
  S2 per-place dedup case, unchanged in substance.
- **`src/shared/alert/__tests__/permission.test.tsx`** (27 lines, 1 test) —
  the toggle-on/deny-revert case, unchanged in substance.
- Old combined `SmogAlertProvider.test.tsx` deleted.

### 2. New S4 test — stale reading is NOT evaluated and does not corrupt `wasAbove`

`crossing.test.tsx`: `AC-4 (S4): a stale reading (retains prior value) is NOT
evaluated and does not corrupt wasAbove`. Drives a real `loading→ready→stale→
ready` sequence via `RefreshProvider`'s `refresh()` against a station-keyed
fake source that: 1st call → resolves `{index:80}` (≥ threshold 50, fires,
`wasAbove=true`); 2nd call (after pressing refresh) → **rejects**, so
`usePlaceReading` yields `{status:'stale', reading:{index:80}}` (the prior
value retained, per its own `.catch` fallback) — asserts `notifySmog` is
still only called **once** (the stale reading, though it carries a value ≥
threshold, must not be re-evaluated); 3rd call (refresh again) → resolves
`{index:80}` again, still ready and still above threshold — asserts
`notifySmog` is **still** only called once. That third assertion is the part
that actually proves S4's "must not mis-drive `wasAbove`" clause: if the
stale evaluation had incorrectly reset the per-place `wasAbove` (e.g. by not
early-returning and treating the stale value as a normal read), this final
still-above `ready` reading would wrongly look like a fresh rising edge and
re-fire. It doesn't, because `SmogAlertProvider`'s fire effect's first line
(`if (status !== 'ready' || !reading) return;`) skips the map entirely for
`stale`. Waits are deterministic on `status` transitioning to `'stale'` then
back to `'ready'` (via the new `AlertControls` probe), not timers.

### 3. Corrected `index.tsx:67` eslint-disable comment

Old comment claimed `notifier`/`clock` were excluded because they're "stable
references" — false for `clock` (`now ?? (() => new Date())` allocates a
fresh closure every render). New comment: excluded because `active`/
`notifier`/`clock` are only **read** when the effect fires, not used as
reactive triggers — `active` reflects the current place at fire-time,
`notifier` is a stable app-level instance, and `clock`, despite being a fresh
closure per render, always samples "now" at invocation regardless of which
render created it, so its identity doesn't matter.

### 4. Optional cleanups — one applied, one reverted

- Replaced most `await new Promise(r => setTimeout(r, 0))` negative-assertion
  flushes with deterministic waits: `AlertControls` renders `status` and
  `refreshing` as text nodes, so tests wait on `getByTestId('status')` /
  `getByTestId('refreshing')` reaching a specific value instead of a blind
  timer. One raw flush remains implicit only in the sense that
  `act(async () => { fireEvent.press(...) })` itself flushes microtasks
  (`perPlace.test.tsx`'s "switch back to A" step) — there's no unique
  observable state transition to wait on there (status stays `'ready'`
  throughout), so an explicit `waitFor` would just be `toBeTruthy()` noise;
  left as a direct assertion after the `act` call, matching the instruction's
  "if it doesn't complicate."
- **Reverted** the lazy `useRef` Map init
  (`useRef<Map<...>>(); ref.current ??= new Map()`) — it fails
  `tsc --noEmit` (`TS2554: Expected 1 arguments, but got 0`; React's `useRef`
  overload resolution picks the argument-requiring overload when an explicit
  type argument is supplied with zero call arguments). Per the instruction's
  own "skip if it risks the tests" clause, kept the original
  `useRef(new Map<string, boolean>())`.

### Gate (re-run after all fixes)

- `npm run typecheck` → clean, no errors.
- `npm run lint` → 0 errors, same 4 pre-existing unrelated warnings as before.
- `npm test` (full suite) → 62 suites / 242 tests passed (suite count +1 net:
  −1 old combined file, +3 split files, harness.tsx no longer double-counted
  as a suite after the `testMatch` fix).
- `npx jest --coverage` → exit code 0, no coverage-threshold failure;
  `src/core` untouched, still 100%. `src/shared/alert/__tests__/harness.tsx`
  stays excluded from coverage collection regardless (existing
  `collectCoverageFrom: ['!src/**/__tests__/**', ...]`).
- `npx jest src/shared/alert --verbose` → 9/9 tests passed individually
  (7 crossing + 1 per-place + 1 permission).
