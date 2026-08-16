# Task 3 review — SmogAlertProvider + App.tsx wiring

**SPEC:** ✅ — AC-4 behavior is correctly implemented and the 8 tests in
`src/shared/alert/__tests__/SmogAlertProvider.test.tsx` are real behavior
tests (fake `Notifier`, injected `now` clock, fake place/settings harness),
asserting `notifySmog` call counts + args, each named `AC-4: ...`. Verified
by tracing the code (not by trusting the implementer):
- placeKey expression (`index.tsx:8-9`) is byte-identical to
  `usePlaceReading.ts:23-24` (`'location'` | `` `station:${id}` ``).
- Per-place dedup: `Map<placeKey, wasAbove>` correctly retains A's
  `wasAbove` across A→B→A (transient re-render keeps stale `status`/
  `reading` refs from A until B's fetch resolves, so the fire effect
  doesn't misfire on the mismatched transient); a distinct B gets its own
  key and fires independently. Confirmed via code trace, not just tests.
- `ready`-only guard (`index.tsx:63`, `status !== 'ready' || !reading`)
  correctly excludes both `loading` and `stale`.
- Permission deny-revert (`index.tsx:17-35`) mirrors
  `NotificationsProvider` (`src/shared/notifications/index.tsx`) exactly
  in shape/eslint-disable justification.
- App.tsx: `SmogAlertProvider` is nested inside both `ActivePlaceProvider`
  and `SettingsProvider` (App.tsx:56-64); no existing provider dropped or
  reordered; `notifier` instance reused from the one built for
  `NotificationsProvider` (App.tsx:37,60,62), per spec's "reuse if
  convenient."

One traceability gap (see Important #2 below): the spec's S4 clause
explicitly calls out that a **stale reading which carries a value** must
not be evaluated — only the no-value "loading" not-ready case is tested,
not the more subtle stale-with-a-value case. The guard code is correct by
inspection, but per DoD #1 ("every AC ... traceable to a test") this
sub-case isn't covered.

**QUALITY:** CHANGES-NEEDED — two Important findings below (file-size
violation of CLAUDE.md's ≤200-line cap; missing stale-specific test);
everything else is clean.

## Findings

### Important
1. **File size** — `src/shared/alert/__tests__/SmogAlertProvider.test.tsx`
   is 365 lines, violating CLAUDE.md's "Keep files ≤ 200 lines... decompose
   instead." Nearly 2x the largest sibling test file in this codebase
   (`src/shared/place/__tests__/ActivePlaceContext.test.tsx` at 201 lines).
   Should split by concern (e.g. a shared render-harness module +
   crossing/ready-gate tests, per-place dedup tests, permission test) —
   the file has at least 3 distinct fixture setups (`fixedSource`,
   `pendingSource`, refresh-driven `source`) that are natural seams.
2. **Missing AC-4/S4 test for "stale carries a value"** — spec 019 §S4:
   "a `stale` reading, though it carries a value, is NOT evaluated — it
   must not mis-drive `wasAbove`." The only not-ready test
   (`SmogAlertProvider.test.tsx:187-207`, "does not fire while status is
   not ready (pending fetch)") covers `loading` (no value yet), not the
   reject→`stale`-with-a-carried-value transition that S4 specifically
   flags as the hazard (a naive `reading &&` guard without the `status`
   check could pass the loading test but still misfire/mis-drive
   `wasAbove` on a stale value). Guard code (`index.tsx:63`) is correct by
   inspection, but this specific spec clause is untested.

### Minor
1. **Negative-assertion timing heuristic** — 6 tests
   (`SmogAlertProvider.test.tsx:162,181,205,236,284,331`) prove "did not
   fire" via `await new Promise(r => setTimeout(r, 0))` rather than a
   deterministic flush. This idiom has no precedent elsewhere in the repo
   (`grep` across `src/**/__tests__/*.test.tsx` finds it only in this new
   file) and is inherently more flake-prone than the `waitFor`-based
   positive assertions used everywhere else in the same file.
2. **Inaccurate eslint-disable comment** — `index.tsx:69` says `clock`
   is excluded from deps because it's a "stable reference," but
   `clock = now ?? (() => new Date())` (`index.tsx:56`) allocates a fresh
   closure every render whenever `now` is omitted — i.e. in the real
   App.tsx usage. Harmless (not a dep, no bug), but the comment's claim is
   wrong and could mislead a future reader auditing the disable.
3. `useRef(new Map())` (`index.tsx:57`) re-evaluates `new Map()` every
   render (React keeps only the first); harmless/cheap and matches common
   idiom, but a lazy initializer (`useRef<Map<...>>(); ref.current ??= new
   Map()`) would be more correct. Nit only.

### Clean (no findings)
- Imports one-way: `src/shared/alert/index.tsx` only imports from
  `../place`, `../settings` (shared) and `../../core/{places,notifications,
  alert}` (core) — no data/feature imports.
- No `any` anywhere in the diff.
- `index.tsx` is 71 lines; longest function (`SmogAlertProvider` body) is
  well under 40 lines.
- `App.tsx` wiring correct (see SPEC section above).

## Verification run myself
- `npm test`: **61 suites / 242 tests, all green** (0 failed, 0 skipped).
- `npx jest src/shared/alert` in isolation: **1 suite / 8 tests, all
  green**, 0 act-warnings from this file (the act-related console.error
  noise in the full run originates from `usePlaceReading.ts`/other
  pre-existing suites, not this diff — confirmed by running the alert
  suite alone and grepping for 0 occurrences of "not configured to
  support act").
- `npx tsc --noEmit`: clean, exit 0.
- `npx eslint src/shared/alert App.tsx`: 0 errors; 1 pre-existing warning
  (`App.tsx:54`, inline style on `GestureHandlerRootView`, unrelated to
  this diff, not introduced by it).

## Verdicts
**SPEC:** ✅
**QUALITY:** CHANGES-NEEDED (Important #1 file size, Important #2 missing
stale-value test — both should be fixed before merge; Minor items are
optional polish)
