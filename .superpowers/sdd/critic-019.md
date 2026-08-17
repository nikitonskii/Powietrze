# Critique — Spec 019: Smog alert (foreground slice)

**Verdict: SHIP-WITH-FIXES** — the core state machine is genuinely correct and the
scope is honest (real consumer now, background deferred). But one spec-vs-codebase
factual error corrupts the primary AC, and several ripple/testability gaps must be
closed before this is plannable. Mode: escalated to ADVERSARIAL after B1 + 4 should-fix.

## Pre-commitment predictions vs findings
- Hysteresis double/never-fire bug → **did not materialize**. The `wasAbove` state
  machine is correct across every enumerated transition (traced below).
- Unit mismatch (index vs threshold) → **did not materialize**. Both are CAQI index;
  `Reading.index` (core/air/index.ts:4) and `threshold` [25,200] share the domain
  (design/README.md:96). Verified clean.
- Dedup ref reset/spam on place-change → **CONFIRMED** (S2).
- AC-5 targeting wrong test → **CONFIRMED and worse** (B1: false claim about current state).
- Permission double-prompt race → benign; real issue is the interface ripple (S1).

---

## State-machine trace (smogAlertDecision) — VERIFIED CORRECT
Precedence as specified: alert-off → quiet → normal. Rules:
`off->{false,false}`, `quiet->{false,prev}`, else `fire = index>=thr && !prev.wasAbove; next = index>=thr`.

- Rising edge (prev F, >=thr): {true, T} OK
- Staying above (prev T): {false, T} OK
- Dropping below (prev T, <thr): {false, F} OK
- Re-cross after drop (prev F, >=thr): fires again OK
- Alert off: {false, F} -> re-enable re-arms OK
- Quiet + above, prev F (crossing began in quiet): {false, F}; quiet ends still above -> fires once OK
- Quiet + above, prev T (fired before quiet, stays into quiet): {false, T}; quiet ends -> no re-fire OK (no double-fire)
- index === threshold: counts as above (>=) OK
- isQuietHour h>=22||h<7: 06:59 T / 07:00 F / 21:59 F / 22:00 T OK (AC-1 boundaries correct)

The "quiet freezes wasAbove so a crossing that began in quiet fires when quiet ends"
claim **is** what the specified code produces. Open Q3's freeze behavior is the right
call — do NOT reset on quiet (you'd drop an alert that crossed at 06:59). Keep it.
Gap: the *composed* sequence isn't pinned as a test (M1).

---

## BLOCKING

### B1 — Spec falsely claims `alert` is already un-tagged; AC-5 omits un-tagging it
- Evidence: spec line 66 `"alert (Alert smogowy): already un-tagged; now drives the provider."`
  is **false**. `UstawieniaScreen.tsx:99` renders `alert` with `soon`. The existing
  AC-5 test asserts `wkrotce-alert` is *present* (`UstawieniaScreen.test.tsx:94`,
  loop `['alert','threshold','quiet']`). AC-5 (spec line 86) only says un-tag
  `threshold` and `quiet` — it never mentions `alert`.
- Confidence: HIGH.
- Why it matters: Scope line 8 says this slice makes `alert` "act." Followed literally,
  the executor ships a **live, functioning "Alert smogowy" toggle still badged "Wkrótce"**
  (self-contradictory UI), and writes/leaves an AC-5 test whose present/absent split
  contradicts the requirement. The primary traceable AC is wrong.
- Realist check: detection is immediate (visual + the very test being edited), no data/security
  impact — but the deliverable is incorrect as written, so it gates planning.
- Fix: (a) correct spec line 66 to state `alert` is currently `soon`-tagged; (b) extend AC-5
  to un-tag **alert, threshold, quiet** (drop `soon` on `UstawieniaScreen.tsx:99,104,111`);
  (c) update the AC-5 test to move `alert` into the *absent* list.

---

## SHOULD-FIX

### S1 — Adding `notifySmog` to `Notifier` breaks the existing fake (typecheck gate red)
- Evidence: spec line 38-44 adds `notifySmog` to the `Notifier` interface. The existing
  `fakeNotifier` in `NotificationsProvider.test.tsx:17-32` implements only
  requestPermission/scheduleMorning/cancelMorning. Under TS strict / no-`any` (DoD gate #2),
  that object literal becomes an incomplete `Notifier` -> typecheck failure. Grep confirms it
  is the one hand-rolled fake; the data adapter and its test use the real `createNotifeeNotifier`.
- Confidence: HIGH.
- Fix: enumerate in the spec that `notifySmog` must be added to every `Notifier` double —
  specifically `NotificationsProvider.test.tsx`'s `fakeNotifier` — and to the real adapter
  `createNotifeeNotifier` (data/notifications/index.ts). Keeping `notifySmog` on the single
  `Notifier` seam is the right call (one @notifee adapter); a separate seam would fragment.

### S2 — Single global `wasAboveRef` conflates places -> re-fire + missed-alert (Open Q2)
- Evidence: spec line 53-58 — provider "reads the active reading (`useActivePlace`)" and threads
  one ref. `useActivePlace` swaps the reading on both refresh AND place switch
  (ActivePlaceContext.tsx:58-61). With one ref: Place A(>=thr) fires (ref=T) -> switch to
  B(<thr) resets ref=F -> switch back to A(>=thr) **fires again** for the same ongoing episode.
  Conversely A(>=thr, ref=T) -> switch to B(>=thr): prev.wasAbove=T -> **B never alerts** though it
  is a distinct place above threshold.
- Confidence: HIGH on mechanism; the "which is desired" is a product call the spec must make.
- Fix: specify per-place dedup — key the ref by `placeKey` (`usePlaceReading.ts:20-21` already
  derives it: `location` | `station:{id}`) via a `Map<string,boolean>`, OR explicitly document
  that dedup is global-by-design. This is a **foreground** bug independent of Open Q2's
  restart-persistence question; resolve it regardless of the background decision.

### S3 — Provider has no clock seam, but AC-4 requires a quiet-hours test
- Evidence: provider signature (spec line 60) is `{notifier, children}` — no `now`. Quiet lives in
  `smogAlertDecision(now)`, invoked by the provider, so the provider supplies the clock. AC-4
  (line 83) requires "does NOT fire during quiet hours." Without an injectable clock the test is
  nondeterministic. The morning path solved the analogous problem by injecting `now` into the
  adapter (data/notifications/index.ts:24).
- Confidence: MEDIUM (a test *could* use `jest.setSystemTime`, so there is a workaround).
- Fix: add `now?: () => Date` to `SmogAlertProvider` props (mirror the adapter), or state in AC-4
  that quiet is tested via fake system time.

### S4 — `'stale'` reading handling unspecified
- Evidence: `ReadingState` is `loading|ready|stale` and **stale carries a `reading`**
  (usePlaceReading.ts:7-10,30-31). Spec says "on each ready reading" and AC-4 covers
  "loading/no reading," but never says whether a `stale` reading (present but from a failed
  refetch) is evaluated. Evaluating stale could mis-drive `wasAbove`.
- Confidence: MEDIUM.
- Fix: specify `status === 'ready'` only; add an AC that `stale` does not evaluate/fire.

---

## MINOR
- **M1** — AC-2 pins only the single-step quiet result `{false, prev}`. The value-carrying
  behavior (cross-in-quiet -> quiet-ends -> fires *once*) is a 2-call composition and deserves its
  own explicit core test (directly answers Open Q3).
- **M2** — `DEFAULT_SETTINGS.alert = true` (core/settings/index.ts:19). Mirroring the morning
  provider's cold-launch behavior (NotificationsProvider AC-4 "hydration schedules once"),
  `SmogAlertProvider` will call `requestPermission()` on **first launch, unprompted**, and may fire
  a smog notification on the first foreground reading if Kraków index >= 100 (default threshold).
  iOS prefers in-context prompting. Document/confirm this is intended.
- **M3** — Adapter snippet (spec line 47-51) shows only `android:{channelId}` in the payload but
  Android requires the channel to exist first. Ensure `notifySmog` calls `notifee.createChannel`
  before `displayNotification` (as scheduleMorning does, data/notifications/index.ts:38-42). Prose
  says "creates a channel"; make it explicit in the adapter contract.
- **M4** — Body copy `"Indeks CAQI ${index} — ogranicz aktywność na zewnątrz."` is invented.
  CLAUDE.md makes `design/` the source of truth for copy; the approved string is
  `"Ogranicz długie i intensywne aktywności na zewnątrz."` (design/README.md:74,
  design/Powietrze.dc.html:396). Reuse approved copy or flag new copy for approval.

---

## @notifee `displayNotification` claim — VERIFIED
Correct: `displayNotification` is core @notifee (same already-installed module as
createTriggerNotification), no new native gate. Android channel required (matches morning
pattern). The mock (jest.setup.js:76-93) has requestPermission/createChannel/
createTriggerNotification/cancelTriggerNotification but **not** displayNotification — the spec
correctly calls out adding it; AC-3 would fail otherwise.

## Layering — CLEAN
`core/alert` pure (Date only, zero React/data). `SmogAlertProvider` in `shared/alert` reads
`useActivePlace` + `useSettings` (both shared) and imports `Notifier`/`smogAlertDecision` from
core. No features->data, no reverse import, no cross-feature import. Import direction holds.

## Multi-perspective
- **Executor**: Will hit S1 (typecheck) and S3 (how to test quiet) with no guidance; B1 forces a
  choice the spec got factually wrong. Provider needs the clock + per-place decisions spelled out.
- **Stakeholder**: Solves the stated problem (gives alert/threshold a consumer). But M2 means the
  behavior ships ON by default with an unprompted permission dialog — a product decision.
- **Skeptic**: Strongest argument against — this builds a foreground-only evaluator whose value is
  limited until the background gate lands. Rebuttal holds: the evaluator is reused verbatim in
  background, foreground has a real consumer today, the pure core is the durable asset. Not
  speculative. YAGNI respected (fixed quiet window, single threshold, no picker).

## Open-question recommendations (firm)
1. **Permission duplication** -> Acceptable per-toggle ownership for this slice. Do NOT extract a
   helper yet (only 2 consumers — YAGNI). Concurrent requestPermission on mount is benign: iOS
   shows the OS dialog at most once; both toggles reverting on denial is correct. Revisit only if a
   3rd consumer appears.
2. **Dedup persistence (in-memory ref)** -> Acceptable for the foreground slice; a single re-fire
   after restart-while-above is tolerable and honestly documented. BUT this does NOT excuse S2 —
   the place-change conflation is a live foreground bug; key the ref by `placeKey` now.
3. **Quiet-freeze semantics** -> Keep the freeze (fires once quiet ends). Resetting would silently
   drop a crossing that began at 06:59. Add the explicit composed test (M1).

## Self-audit
All B/S findings HIGH/MEDIUM with file:line or backtick evidence; none refutable with hidden
context. No PREFERENCE items promoted. Realist check: no downgrades warranted (no data/security/
financial impact anywhere; B1 kept blocking because it corrupts the primary AC as written, though
detection is immediate).
