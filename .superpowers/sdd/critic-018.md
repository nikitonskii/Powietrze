# Critic — Spec 018: Pull-to-refresh + freshness on Teraz/Miejsca

**VERDICT: REWORK** (close to SHIP-WITH-FIXES if the recommended model is adopted;
the current design section describes the counter model, which carries a genuine
correctness gap and unaddressed test breakage.)

Mode: escalated to ADVERSARIAL after finding 2 blocking issues + a systemic
test-migration omission.

## Overall assessment
The feature is small, valuable, and the fan-out-via-global-signal instinct is
correct for the multi-row Miejsca case. But the **crux the spec asks about — the
`refreshing` lifecycle — is specified with the more complex and more fragile of
the two candidate models (the in-flight counter)**. As written it has a
timeout/counter desync hazard, couples `usePlaceReading`/`usePlaceDetail` to the
RefreshProvider in a way that breaks the entire existing test suite with no
migration plan, and leans on an eslint-disable that would start hiding real deps.
The simpler "tie the spinner to the ACTIVE place + timeout" model (Open Q1's
alternative) removes all three problems and is strictly less code.

## Pre-commitment predictions vs findings
Predicted before reading source: (1) counter would underflow against the safety
timeout; (2) coupling fetch hooks to the provider would break standalone hook
tests; (3) adding a context value to effect deps would risk churn if not a
primitive; (4) the mount-vs-signal ref would misfire on the first bump; (5) row
age on stale rows would be argued as "misleading".
Found: (1) CONFIRMED (B1). (2) CONFIRMED and worse than expected — 8 test files
(B2). (3) `signal` is a number so value-stable — churn is fine; the real churn
risk is begin/end identity (S1). (4) ref logic is defensible; balances correctly
(not a bug, see analysis). (5) age on stale is actually honest, not misleading —
the lean is right (Q4).

---

## BLOCKING

### B1 — Counter + safety-timeout desync / underflow (Design §"`refreshing` lifecycle")
`refreshing = count > 0`, and `refresh()` "arms a safety timeout that force-clears
`refreshing`". "Force-clears" is undefined against the counter. If the timeout
zeroes `count` while N fetches are still outstanding, each late `end()` in its
`finally` drives `count` negative. Next `refresh()` -> `begin()` brings it to e.g.
0, so `refreshing` reads **false** and the spinner never shows — permanently, since
the underflow persists for the process lifetime. Combined with the Q3 lean
(*ignore refresh() while refreshing*), a stuck-true variant instead locks the user
out of refreshing entirely.
Evidence: spec lines 30-34 (`refreshing = count > 0` + "force-clears `refreshing`")
give no rule for `end()` arriving after a timeout.
Fix (preferred): drop the counter (see Recommendation Q1). If kept: make the
timeout epoch-based — stamp each `refresh()` with a generation id, tag begin/end
with it, and ignore end() from a generation the timeout already closed; clamp
`count` at >= 0 defensively.

### B2 — Coupling breaks every existing hook/screen test with no migration plan (Design §"Fetch hooks"; Open Q2)
`usePlaceReading`/`usePlaceDetail` will call `useRefreshSignal()` (+ `useRefresh()`
for begin/end). This repo's contexts THROW when unwrapped (`useSourceForPlace`
PlaceSourceContext.tsx:22-26, `useActivePlace` ActivePlaceContext.tsx:57-60), so a
RefreshProvider would become mandatory for those hooks. **8 test files render these
hooks and none wrap a RefreshProvider**: `usePlaceReading.test.tsx`,
`usePlaceDetail.test.tsx`, `PlaceRow.test.tsx`, `ActivePlaceContext.test.tsx`,
`MiejscaScreen.test.tsx`, `TerazScreen.test.tsx`, `TerazScreen.nearest.test.tsx`,
`AppNavigator.test.tsx`. The suite goes red — violating DoD #2 ("all green") and
the 100% coverage rule. The spec never mentions test migration.
Evidence: `grep` shows 0 RefreshProvider references in src; 8 files listed above
render the affected components.
Fix: make `useRefreshSignal()` return `0` and begin/end no-op when unwrapped
(keeps the fetch hooks unit-testable standalone), OR enumerate all 8 wrappers to
update. The recommended model (Q1) removes begin/end from these hooks entirely,
shrinking this to "add a default-0 signal", which needs no test changes because a
value-stable 0 never refires the effect.

---

## SHOULD-FIX

### S1 — eslint-disable will silently hide begin/end/ref deps (code usePlaceReading.ts:34, usePlaceDetail.ts:24)
Adding `signal` (a number) to the deps array is churn-safe — value equality means
no extra refetch. But `eslint-disable-next-line react-hooks/exhaustive-deps`
disables ALL missing-dep warnings on that effect. If `begin`/`end`/`lastSignalRef`
are referenced-but-unlisted, a genuinely stale closure would no longer be flagged.
begin/end MUST be `useCallback`-stable (ref-based, empty deps) in the provider, and
the disable comment must be updated to enumerate exactly what is excluded and why.

### S2 — AC-3 asserts non-observable internals (spec lines 74-76)
AC-3 asserts "`begin`/`end` called once each" but neither is public API. Restate in
terms of the observable `refreshing`: false throughout the initial pending load;
flips true only after `refresh()`, back to false once the (fake, counted) fetch
settles. Otherwise the test must reach into provider internals.

### S3 — AC-7 is unverifiable this milestone (spec lines 86-87)
AC-7 depends on "the already-built, once the native gate lands widget snapshot" and
is "deferred to widget verification". An AC that cannot be checked now will fail the
verifier's AC-audit. Demote AC-7 to a traceability NOTE, not a numbered AC.

### S4 — Widget goal overstated (Goal lines 10-12; Design §Widget)
`WidgetSyncProvider` republishes only on identity change (widget/index.tsx:33-35).
An identical re-fetch (GIOS hour unchanged) produces the same identity -> NO
republish. Verify-only is the right call, but reword the goal to "republishes when
the data actually changes," not on every pull.

### S5 — Miejsca gesture/interaction + location refetch unverified (Design §Screens; AC-6)
The Miejsca `RefreshControl` sits on the outer ScrollView while the favorites list
runs inner Reanimated Pan drag (`activateAfterLongPress(250)`,
`activeOffsetY([-10,10])`, DraggableFavorites.tsx:58-75) plus horizontal
swipe-to-delete. These likely coexist (pull-to-refresh is native top-scroll; drag
needs a long-press) but must be manually confirmed under AC-6, not assumed.
Separately, a refresh re-runs `usePlaceReading(LOCATION_PLACE)` on BOTH Teraz and
the Miejsca location row -> the `nearest` source re-runs geolocation twice
(App.tsx:30-32); note latency / permission behavior in the journal.

---

## What's missing
- No statement of what clears `refreshing` for `usePlaceDetail`'s refetch (detail
  also gets `signal` in deps but its completion is untracked in the counter model).
- No test asserting a **stale-with-reading** row still renders a (grown) age — the
  interesting Q4 case; AC-4 only covers ready + brak-danych.
- No `App.tsx` provider-order test / note that RefreshProvider must sit ABOVE
  ActivePlaceProvider AND PlaceSourceProvider (spec says so at line 51-52 but there
  is no AC guarding it; a wrong order silently breaks fan-out).
- No debounce/timeout interaction spelled out (see B1): if Q3 debounce is adopted,
  the timeout is the ONLY escape hatch and must be proven robust.
- Miejsca is described as "ScrollView/FlatList" (line 50) — it is a ScrollView
  (MiejscaScreen.tsx:39). Pin the wording; RefreshControl wiring differs slightly.

## Ambiguity risks
- `"distinguish a signal-triggered run from a mount/place-change run via a useRef of
  the last seen signal"` -> Interp A: update the ref synchronously in the effect body
  on detecting a signal run. Interp B: update it in the finally after the fetch.
  Under B, a placeKey change mid-fetch re-enters with `signal === ref` still stale
  and can double-count. Pick A explicitly. (Under the recommended model this ref
  disappears entirely — mount never sets `refreshing` true, so clearing on
  completion is idempotent and needs no distinction.)
- `"force-clears refreshing"` (line 33) -> see B1; two incompatible readings.

## Multi-perspective notes
- **Executor:** Can build AC-1/2/4 from the spec. Will get stuck on AC-1's
  timeout+counter clearing semantics (B1) and on why 8 suites suddenly throw (B2)
  — both need answers before coding.
- **Stakeholder:** Solves the stated problem (pull -> refetch both screens + row
  age). Success criteria are mostly measurable; AC-7 is a vanity/deferred metric
  (S3).
- **Skeptic:** The counter exists ONLY to know when the fan-out finishes. That
  knowledge isn't worth a per-hook coupling + an underflow-prone counter when a
  coarse RefreshControl spinner tied to the active place + an 8s cap is
  indistinguishable to the user. The rejected alternative (Q1) is the stronger
  design and the spec hand-waves its rejection.

---

## Firm recommendations on the 4 open questions
**Q1 (lifecycle model): Adopt the active-place-tied model; DROP the counter.**
`refresh()` = bump `signal` + set `refreshing = true` + arm an 8s safety timeout.
`ActivePlaceProvider`'s `usePlaceReading(active)` clears `refreshing` when its
signal-triggered fetch settles (in a `finally`; mount completion is a harmless
no-op because `refreshing` starts false — no ref/first-bump gymnastics needed).
Miejsca rows refetch purely via the `signal` dep; their individual completion is
not tracked (the timeout bounds the worst case). Result: no counter, no underflow
(kills B1), no begin/end in `usePlaceReading`/`PlaceRow` (kills most of B2), less
code, and the existing eslint-disable stays exactly as-is (only a value-stable
`signal` is added). This is the YAGNI-correct answer and the one to build.

**Q2 (coupling): Resolved by Q1.** Only `ActivePlaceContext` depends on refresh
completion. Keep `useRefreshSignal()` returning `0` when unwrapped so `PlaceRow`
and both fetch hooks remain testable without a RefreshProvider (no test migration).

**Q3 (double-refresh): Debounce — ignore `refresh()` while `refreshing`.** Lean is
right; simplest UX. Safe ONLY because Q1's timeout guarantees `refreshing` cannot
stick. Add an AC: a second `refresh()` while `refreshing` is a no-op (signal
unchanged).

**Q4 (stale age): Keep showing the real age; it IS that old — honest, not
misleading.** Lean is right. Make it explicit that the age renders for
stale-with-reading rows and add a test for it (currently missing).

## What would upgrade the verdict
Rewrite Design §"`refreshing` lifecycle" and §"Fetch hooks" around the Q1 model;
add the default-0 unwrapped-signal behavior; convert AC-3 to observe `refreshing`;
demote AC-7 to a note; add the provider-order AC and the stale-age test. With those,
this is SHIP-WITH-FIXES -> SHIP.
