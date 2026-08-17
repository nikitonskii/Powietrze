# Review: task-2.diff — WidgetSyncProvider (AC-3)

## SPEC verdict: PASS

- src/shared/widget/index.tsx:16-37 implements exactly the AC-3 contract:
  reads useActivePlace() for {status, reading, detail} and useSettings()
  for settings.scale/settings.precision, builds the snapshot only when
  status === 'ready' && reading, and dedups on widgetSnapshotIdentity
  (full-snapshot JSON string, from Task 1) via a useRef.
- Traced against usePlaceReading/usePlaceDetail/ActivePlaceContext
  (src/shared/place/*): reading/detail are useState values with stable
  object identity across re-renders that don't refetch (fetch is keyed on
  a primitive placeKey, not object identity), and ActivePlaceProvider
  memoizes its context value on [active, state, detail]. So the effect's
  dependency array [status, reading, detail, settings.scale,
  settings.precision, sync] does NOT thrash on unrelated re-renders — it
  only re-runs when something in the chain actually changed, and even then
  the id === lastId.current ref-guard blocks a republish unless the
  identity string differs.
- Ran the 4 tests in src/shared/widget/__tests__/WidgetSyncProvider.test.tsx
  via npx jest src/shared/widget: 4/4 pass, all real behavior assertions
  (call COUNT via toHaveBeenCalledTimes + snapshot-argument equality via
  toHaveBeenCalledWith(buildWidgetSnapshot(...))/toHaveBeenLastCalledWith),
  not snapshot tests. render/rerender are awaited (RNTL v14 async root
  API) and waitFor is used to observe the async getCurrentReading
  resolution before asserting — correct harness usage.
  - "publishes once on first ready reading" — covers the not-ready->ready
    transition and the exact snapshot argument.
  - "unrelated re-render does not republish" — rerender with the same
    sync/source/settings references, no state change; count stays 1.
  - "changing scale republishes" — drives a real settings mutation via
    ScaleToggle/fireEvent.press, not a prop hack; asserts count becomes 2
    and the new snapshot content.
  - "no publish while not ready" — uses a getCurrentReading promise that
    never resolves, asserts zero calls (no waitFor, appropriately —
    nothing async completes to wait for).
  - Not covered by this diff's tests but claimed in the spec prose (place
    switch / measuredAt change): plausible given the general identity-key
    mechanism and usePlaceReading's refetch-on-placeKey-change behavior,
    but there is no test exercising an actual place switch or a same-place
    re-fetch with a new measuredAt — cannot verify beyond code reading;
    minor spec-coverage gap, not a correctness bug (the mechanism is
    identity-generic, not place-switch-specific, so it should work, but
    AC-3 explicitly calls out "place switch" and "new measuredAt" as
    republish triggers and the test file doesn't cover either).

## QUALITY verdict: APPROVE

- Imports: ../place (shared) and ../../core/widget (core) only — one-way,
  no data-fetching import in the UI provider (src/shared/widget/index.tsx:2-7).
- Dep array is complete and correct: [status, reading, detail,
  settings.scale, settings.precision, sync] covers every value read inside
  the effect body; no missing deps, no eslint-disable (cleaner than
  NotificationsProvider, which needs a disable comment only because it
  deliberately excludes the unstable set function — not applicable here
  since sync.publish is called, not a setter closed over stale state).
- Ref-dedup (src/shared/widget/index.tsx:24-34): reads lastId.current
  fresh on every effect run (refs are not subject to closure-staleness the
  way state can be), so no stale-closure bug. It compares by value
  (id === lastId.current, a string) rather than by object identity, so it
  correctly detects "no real change" even if reading/detail objects were
  re-created with equal content — a robust guard independent of the dep
  array's reference semantics.
- File is 38 lines, one function, single responsibility (publish glue) —
  well under the 200/40 limits.
- No any. <>{children}</> — pure passthrough, no extra DOM/wrapper.
- Comment (index.tsx:9-12) explicitly explains the mirrored shape vs.
  NotificationsProvider, matching the codebase's stated pattern.
- Confirmed via npx tsc --noEmit and npx eslint src/shared/widget — no
  errors on the new files (only pre-existing, unrelated boundaries-plugin
  config warnings).
- Minor/nit: buildWidgetSnapshot is recomputed on every effect run before
  the identity check can short-circuit (necessary, since the identity is
  derived from the snapshot) — not a bug, just notes the guard is post-hoc
  rather than pre-empting the (cheap, pure) build call.

## Findings (severity)
- Nit — src/shared/widget/index.tsx: AC-3's "place switch" and "new
  measuredAt" republish triggers are asserted by spec prose but not
  covered by an explicit test in this diff (only scale-change and
  initial-publish are exercised as "change" cases). Recommend a follow-up
  test, not a blocker — the mechanism (identity string over the full
  snapshot) is generic and already exercised structurally by the
  scale-change test taking the same code path.

## Verdict
SPEC: PASS  QUALITY: APPROVE
