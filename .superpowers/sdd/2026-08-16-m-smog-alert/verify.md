# Verification audit — spec 019 (smog alert)

Worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
Branch: `feature/m-smog-alert`
Spec: `docs/specs/019-smog-alert.md`
Date: 2026-08-16

## Per-AC table

| AC | Verdict | Evidence |
|----|---------|----------|
| AC-1 | VERIFIED | `src/core/alert/__tests__/decision.test.ts:4` `test('AC-1: isQuietHour — true at 22:00, 23:30, 00:00, 06:59; false at 07:00, 12:00, 21:59')` — asserts all 7 boundary points exactly as spec text requires. Ran, passed. |
| AC-2 | VERIFIED | `src/core/alert/__tests__/decision.test.ts:18-89` `describe('AC-2: smogAlertDecision')` — 7 sub-tests cover the full table: rising→`{true,true}`, staying above→`{false,true}`, dropping below→`{false,false}`, re-cross after drop→fires again, alert-off→`{false,false}` (incl. wasAbove reset), quiet+above→`{false,prev}` (both prev=true and prev=false branches), `index===threshold`→above. All assertions are exact `.toEqual` object matches, not tautologies. Ran, passed (7/7). |
| AC-2b | VERIFIED | `src/core/alert/__tests__/decision.test.ts:93` `test('AC-2b: crossing that begins during quiet hours fires once when quiet ends')` — 4-step composed sequence (below+quiet → cross+quiet(frozen false) → quiet-ends+above(fires once) → next reading(no re-fire)), matches spec composed-scenario text precisely. Ran, passed. |
| AC-3 | VERIFIED | `src/data/notifications/__tests__/notifier.test.ts:73` `test('AC-3: notifySmog creates the smog channel then displays the approved copy')` — asserts `createChannel` called with `id: 'powietrze-smog'`, then `displayNotification` called once with body `'Ogranicz długie i intensywne aktywności na zewnątrz.'` (matches `design/README.md:74` exactly) and `android.channelId === 'powietrze-smog'`; also asserts `createTriggerNotification`/`cancelTriggerNotification` untouched (other Notifier methods unaffected). Ran, passed (all 7 AC-3 tests in file, including pre-existing scheduleMorning/requestPermission/cancelMorning ones, unchanged). |
| AC-4 | VERIFIED | Split across 3 files per spec's stated organization: `src/shared/alert/__tests__/crossing.test.tsx` (rising crossing fires once; not below threshold; not when alert off; not during quiet [NIGHT clock]; S4 not-ready/loading; S4 stale-not-evaluated does-not-corrupt-wasAbove; staying-above no re-fire + drop + re-cross fires again), `perPlace.test.tsx` (S2: place A fires, switch to B fires B, switch back to A does NOT re-fire A), `permission.test.tsx` (toggle alert on → `requestPermission` called; denial → persisted `set('alert', false)` verified via a real `save` spy). All 9 AC-4 tests ran and passed; each asserts on `n.notifySmog` call counts/args or persisted settings, not just component-mount smoke tests. |
| AC-5 | VERIFIED | Two-part: (a) `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx:92` `test('AC-5: no Wkrótce tags remain — alert, threshold, quiet are now live like morning')` — loops over all 10 setting rows including `alert`/`threshold`/`quiet` and asserts `queryByTestId('wkrotce-<k>')` is null for every one (i.e., explicitly re-checks the ones spec says must move from present→absent, not just checks a subset). (b) `src/core/settings/__tests__/settings.test.ts:22` `test('AC-5: DEFAULT_SETTINGS.alert defaults to opt-in false...')` plus the AC-1 literal-fixture test (`DEFAULT_SETTINGS` full object incl. `alert: false`) plus AC-4's `mergeSettings({}).alert === false` / `mergeSettings({ alert: 'yes' }).alert === false` — covers both `DEFAULT_SETTINGS.alert === false` and `mergeSettings` default. Ran, passed. |
| AC-6 | PENDING-MANUAL | Spec requires journal `docs/harness/19-smog-alert.md` + `evidence/19` screenshot. Neither exists in the worktree (`ls` returned "No such file or directory" for both). No recorded evidence — absence noted per instructions, not attempted. |

## Additional checks performed

**S1 (every Notifier double implements `notifySmog`):** confirmed present in all three
doubles — `src/data/notifications/index.ts` (real adapter), `src/shared/alert/__tests__/harness.tsx`
(`fakeNotifier`, used by AC-4 suite), and `src/shared/notifications/__tests__/NotificationsProvider.test.tsx:31`
(`notifySmog: jest.fn()`). Typecheck is clean (see below), which would fail if any double were missing
the method given the `Notifier` interface now requires it.

**smogAlertDecision / isQuietHour implementation** (`src/core/alert/index.ts`) matches the spec's
precedence exactly: alert-off → quiet → normal, with quiet freezing `prev.wasAbove` and `>=` for the
threshold comparison.

## Commands run

```
npx jest src/core/alert/__tests__/decision.test.ts src/data/notifications/__tests__/notifier.test.ts \
  src/shared/alert/__tests__/crossing.test.tsx src/shared/alert/__tests__/perPlace.test.tsx \
  src/shared/alert/__tests__/permission.test.tsx src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx \
  src/core/settings/__tests__/settings.test.ts --verbose
```
Result: 7 suites passed, 36 tests passed, 0 failed.

```
npm test -- --silent
```
Result:
```
Test Suites: 62 passed, 62 total
Tests:       243 passed, 243 total
Snapshots:   0 total
Time:        3.971 s, estimated 5 s
```

```
npm run typecheck
```
Result: `tsc --noEmit` — clean, no output, exit 0.

```
npm run lint
```
Result: `eslint .` — **0 errors, 4 warnings** (all pre-existing / unrelated to spec 019: `App.tsx` inline
style, `src/data/gios/mappers.ts` unused eslint-disable comment, `HistoryChart.tsx` inline style,
`Toggle.tsx` inline style). No lint issues touch `src/core/alert`, `src/data/notifications`,
`src/shared/alert`, `src/features/ustawienia`, or `src/core/settings`.

```
npx jest --coverage --silent   (dangerouslyDisableSandbox: true — sandbox blocked coverage/ dir write)
```
Result: exit 0, no "coverage threshold not met" failure. `src/core/` is 100% across statements/
branches/functions/lines for every subfolder, confirming the spec's "100% core" verification claim —
notably `core/alert` (new module): `100 | 100 | 100 | 100`.
```
core/air                |     100 |      100 |     100 |     100
core/alert              |     100 |      100 |     100 |     100
core/atmosphere         |     100 |      100 |     100 |     100
core/geo                |     100 |      100 |     100 |     100
core/notifications      |     100 |      100 |     100 |     100
core/places             |     100 |      100 |     100 |     100
core/scene              |     100 |      100 |     100 |     100
core/settings           |     100 |      100 |     100 |     100
core/widget             |     100 |      100 |     100 |     100
```

## AC → test file mapping

| AC | Test file | Test name(s) |
|----|-----------|---------------|
| AC-1 | `src/core/alert/__tests__/decision.test.ts` | `AC-1: isQuietHour — ...` |
| AC-2 | `src/core/alert/__tests__/decision.test.ts` | `describe('AC-2: smogAlertDecision')` (7 tests) |
| AC-2b | `src/core/alert/__tests__/decision.test.ts` | `AC-2b: crossing that begins during quiet hours fires once when quiet ends` |
| AC-3 | `src/data/notifications/__tests__/notifier.test.ts` | `AC-3: notifySmog creates the smog channel then displays the approved copy` (+6 other AC-3 tests for the rest of the adapter) |
| AC-4 | `src/shared/alert/__tests__/crossing.test.tsx` | 7 tests (rising fire, below-threshold, alert-off, quiet, S4 loading, S4 stale, staying/drop/re-cross) |
| AC-4 (S2) | `src/shared/alert/__tests__/perPlace.test.tsx` | `AC-4 (S2): per-place dedup — switching away and back does not re-fire; a distinct place fires on its own` |
| AC-4 (permission) | `src/shared/alert/__tests__/permission.test.tsx` | `AC-4: toggling alert on requests permission; denied reverts the setting` |
| AC-5 | `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx` | `AC-5: no Wkrótce tags remain — alert, threshold, quiet are now live like morning` |
| AC-5 (default) | `src/core/settings/__tests__/settings.test.ts` | `AC-5: DEFAULT_SETTINGS.alert defaults to opt-in false...` (+ AC-1/AC-4 tests in same file touching `alert` default) |
| AC-6 | none (manual) | Not found: `docs/harness/19-smog-alert.md`, `evidence/19` |

## Flags

No AC among AC-1..AC-5 has a trivially-passing or tautological test. Every test asserts either an
exact object/value match, a call-count + call-arg assertion on the fake `Notifier`, or a persisted
settings value — not just "component renders without throwing." AC-6 has zero evidence (expected;
reported PENDING-MANUAL per task instructions, not attempted).
