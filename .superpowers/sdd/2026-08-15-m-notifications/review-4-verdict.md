# Review — Task 4 (NotificationsProvider), spec 015 AC-4

**SPEC:** ✅
**QUALITY:** APPROVE

## Spec checklist

- **Effect deps `[morning, notifier]`, `set` excluded:** confirmed. `src/shared/settings/index.tsx` recreates `set` inside a `useMemo` keyed on `[settings, store]` — it is a fresh closure on every settings change, so it is genuinely unstable and including it would make the effect re-fire (and re-request/re-schedule) on every render where settings changes for unrelated reasons. The `eslint-disable-next-line react-hooks/exhaustive-deps` carries an inline justification (`-- keyed on morning; \`set\` intentionally excluded (not referentially stable)`), which is accurate and specific, not a blanket suppression.
- **`active` unmount guard:** present, wraps the `granted`/`else` branch inside `requestPermission().then(...)`; `cancelMorning()` (sync branch, no continuation) doesn't need one.
- **Branch behavior:** `morning===true` → `requestPermission()` → granted → `scheduleMorning()`; denied → `set('morning', false)`, no `scheduleMorning()` call. `morning===false` → `cancelMorning()`. All match the diff verbatim against the brief's prescribed implementation.
- **Loop safety:** confirmed no infinite loop. Denied path calls `set('morning', false)`; `settings.morning` flips true→false; effect deps change so the effect reruns, but the `morning===false` branch only calls `cancelMorning()` — it never touches `requestPermission`/`scheduleMorning` again, so there is no second `set` call and no re-trigger. Traced through `SettingsProvider`: `set` synchronously updates state and calls `store.save`, no re-entrant loop there either.
- **Cold-launch hydration:** confirmed genuinely exercised, not just an initial `true`. `SettingsProvider` always seeds `useState(DEFAULT_SETTINGS)` (`morning:false`) and hydrates asynchronously via `store.load().then(...)` in a `useEffect` — so *every* test in this file (not just test 4) goes through a false→true (or false→false) transition on mount, since child effects run before the async load resolves. Test 4 asserts `calls.filter(c => c === 'sched')).toHaveLength(1)`, i.e., exactly one schedule despite the two effect runs (initial `morning:false` no-op cancel, then the hydrated `morning:true` run) — this is the idempotency AC-4 requires and it is genuinely tested, not assumed.
- **Provider does not import `@notifee` and is not wired into `App.tsx`:** confirmed. `grep -rn "notifee" src/` shows only two doc-comments in `src/core/notifications/index.ts` (no actual import anywhere); `App.tsx` has zero references to `NotificationsProvider` or `notifee`. The native gate is correctly left deferred.
- **Tests are genuine:** yes. They use the real `SettingsProvider` with a fake `SettingsStore` (per-test-controlled `load`/`save`) and a fake `Notifier` that records call order into a plain array, then assert on order/absence (`toEqual`, `not.toContain`) and on the persisted revert (`saved.at(-1)?.morning === false`). Nothing is tautological or over-mocked.

## Deviation from brief (test 1 assertion)

The brief's literal test-1 snippet asserts `n.calls` strictly equals `['req', 'sched']`; the implementation changed this to `n.calls.filter(c => c !== 'cancel')).toEqual(['req', 'sched'])`, with an inline comment. This is correct and necessary, not a cover-up: because `SettingsProvider` always mounts at `DEFAULT_SETTINGS` (`morning:false`) before hydrating, test 1's `morning:true` fixture also goes through an initial false-mount effect run (`cancelMorning()`) before hydration flips it true — the exact same harmless leading no-op the brief already tolerates in test 4. The strict-equality brief snippet would have been flaky/wrong given `SettingsProvider`'s actual (and correct) hydration behavior. The fix is consistent with the tolerant style already used in tests 2–4 and does not weaken what AC-4 requires (request→schedule order is still asserted).

## Quality

- No `any` anywhere in the diff — notably the implementation improves on the brief's own snippet, which used `(n as any).calls`; the actual test file types `fakeNotifier` as `Notifier & { calls: string[] }` and needs no casts.
- `src/shared/notifications/index.tsx`: 34 lines, well under 200; the component body is ~20 lines, under the 40-line function cap.
- Layering: `shared/notifications` imports `core/notifications` (shared→core, allowed) and `shared/settings` (shared→shared, allowed per `.eslintrc.js` boundaries config: `{ from: shared, allow: to: [shared, core] }`). No `@notifee` import. Correct.
- Report's claims (4/4, full 187 green, lint 0 errors, tsc clean) were not re-run per instructions; the diff and static analysis are consistent with those claims (no obvious lint/type issues spotted).
- The pre-existing `act()` console warning noted in the report is plausible as pre-existing (async `store.load().then(setSettings)` outside of an explicit `act()` wrap is a known RNTL/React 18 pattern issue unrelated to this diff) and is not treated as a regression here, per review scope.

## Findings

None blocking.

- **Minor** (`src/shared/notifications/index.tsx`, the `.then` callback and the `else` branch): `notifier.requestPermission()` and `notifier.cancelMorning()` calls have no `.catch`/rejection handling. If a real `Notifier` adapter's promise rejects (e.g., OS permission API throws), this becomes an unhandled promise rejection. Not exercised by AC-4's tests (the fake notifier never rejects) and not required by the brief, but worth a follow-up note for whoever wires the real `@notifee` adapter in the deferred native-gate task.

## Loop-safety ruling

No infinite loop: the denied path's `set('morning', false)` transition is a one-way true→false flip that the effect's `morning===false` branch resolves with only `cancelMorning()` — it never re-enters the `requestPermission`/`set` path, so the effect settles after exactly one rerun.

verdict written
