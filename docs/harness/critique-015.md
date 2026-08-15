# Critique — Spec 015: Notifications (foreground slice)

**Verdict: SHIP-WITH-FIXES** — the bones are right (clean `Notifier` seam mirroring
`SettingsStore`/`FavoritesStore`, correct `isQuietHour` arithmetic, disciplined scope,
morning-default-OFF). But two blockers change what AC-5 should even claim and leave a
mid-build decision unspecified. Resolve the blockers + should-fixes before planning.

Reviewer mode: escalated to ADVERSARIAL (2 blockers + a systemic "inert wiring" pattern).
Scope reviewed against the settled context (smog-alert deferral NOT relitigated).

---

## Pre-commitment predictions vs. findings
Predicted: (1) overnight boundary math wrong/ambiguous, (2) hand-waved "next 07:30" +
daily-repeat semantics, (3) missing denied-permission AC + revert behavior, (4) quiet
hours inert/dead wiring, (5) hydration/re-mount double-schedule race.
Actual: (1) arithmetic is CORRECT (credit below); the *formula/local-time* is
under-stated. (2), (3), (4), (5) all confirmed as real findings.

---

## Blockers (must resolve before a plan)

### B1 — Quiet-hours "honoring" is inert; AC-5 removes "Wkrótce" from a do-nothing setting
Spec line 59-60: `scheduleMorning is a no-op-schedule if 07:30 ∈ quiet (it isn't for
the default range, but the check is applied ... re-used by the later alert slice)`.
The only notification this slice ships fires at a FIXED `07:30`; the quiet window is a
FIXED `22:00–07:00`; `07:30 ∉ 22:00–07:00` is provably always false. So the guard inside
`scheduleMorning` can never fire, and `isQuietHour` has no live consumer in the shipping
slice. That is exactly what CLAUDE.md forbids: *"No dead code, no speculative
abstractions"* — and the spec even names the justification as a future slice
(`re-used by the later alert slice`), which is the definition of a speculative abstraction.
On top of that, AC-5 (line 93-94) drops the `Wkrótce` tag from `Godziny ciszy`, telling
the user the setting is live when nothing observable changes.
- Confidence: HIGH. Why it matters: ships constitution-forbidden inert wiring and makes
  AC-5 misleading — the whole point of the pre-plan gate is to catch this before it's built.
- Fix: keep `quiet` tagged `Wkrótce` until the alert slice, and drop the inert guard from
  this slice. If you want the pure logic landed early, keep `isQuietHour` in `core` WITH its
  AC-2 tests as a standalone utility, but do NOT wire an unreachable call site and do NOT
  claim quiet hours are "honored" in Scope (line 10-11) / Resolved-ambiguities (line 106).
  Net: this slice = permission + morning summary only; `quiet` moves with the alert slice.

### B2 — No denied-permission behavior; forces a mid-build decision
AC-4 (line 89-92) requests permission when `morning` becomes true, then calls
`scheduleMorning`. There is NO AC for the denied branch. `requestPermission(): Promise<boolean>`
(line 39) returns `false`, but the spec never says what happens next: does the `morning`
toggle revert to off (and re-persist), stay on with a silently-ineffective schedule, or
surface an alert / deep-link to Settings? `scheduleMorning` is apparently still called
regardless (line 90 sequences request→schedule unconditionally). Executor cannot build
AC-4 without inventing this.
- Confidence: HIGH. Why it matters: a spec gap that forces the executor to guess UX +
  persisted-state semantics — the exact failure the gate exists to prevent. Realistic worst
  case (deny → toggle stays on, notification never appears, silent user confusion) is not
  data loss, but it is unspecified persisted-state behavior.
- Fix: add AC: on `requestPermission() === false`, revert `morning` to `false` (persisted)
  and do NOT call `scheduleMorning`; optionally note a future "open iOS Settings" affordance.
  Add the denied case to AC-4's verification (fake Notifier returns false → assert no
  schedule + toggle reverts).

---

## Should-fix

### S1 — "the first time morning is enabled" is not implementable from a boolean transition; cold-launch hydration fires it every launch
Spec line 58-59 / AC-4 request permission "the first time morning is enabled", keyed on
`settings.morning`. `SettingsProvider` starts at `DEFAULT_SETTINGS` (`morning:false`,
core/settings line 20) then hydrates async from the store (shared/settings line 31-37).
So on every cold launch with stored `morning:true`, the provider observes a `false→true`
transition — indistinguishable from a user toggle — exactly the loc-reset race in
`ActivePlaceContext.tsx:43-46`. A boolean-keyed effect has no memory of "first time", so
"first time" as written cannot be honored; permission will be re-requested each launch
(iOS returns the cached status silently, so not user-visible, but the spec's contract is
false). AC-4's verification (line 121-122) only toggles a fake store — it never exercises
the hydration `false→true` path.
- Fix: specify the intended semantics. Simplest: on `morning===true` always
  `requestPermission()` then `scheduleMorning()` (idempotent via fixed id); drop the
  unimplementable "first time" wording. Add an AC covering cold-launch hydration
  (store loads `morning:true` → one schedule, no duplicate). If a real "asked-once" flag is
  wanted, it must be persisted in Settings and specified.

### S2 — AC-3 under-specifies the next-07:30 computation (past timestamp throws)
Data note (line 47-50) says "TimestampTrigger at the next HH:MM", but AC-3 (line 82-86)
only asserts "a DAILY repeating trigger at 07:30". notifee's `TimestampTrigger` requires a
FUTURE timestamp; passing today-07:30 after 07:30 has passed throws / rejects. The
"if now ≥ 07:30 today → schedule tomorrow" math is mandatory and must be pinned + tested.
- Fix: state the rule in AC-3 and test both branches (now < 07:30 → today; now ≥ 07:30 →
  tomorrow) with an injected/frozen clock, asserting the computed trigger timestamp and
  `RepeatFrequency.DAILY`.

### S3 — Pre-commit to a hand-rolled @notifee jest mock; enumerate the surface
AC-3 (line 84-86) + Verification (line 118-120) say "mocked `@notifee/react-native`
(jest mock in jest.setup.js, like async-storage)", and the ADR hedges "it ships a `/jest`
mock; if it doesn't load under our CJS transform, hand-roll". This repo's own precedent
settles it: `jest.setup.js:36-57` documents that async-storage's shipped v3 `/jest` mock
"hides behind an ESM `/jest` exports subpath that Jest's CJS transform can't load", so they
hand-rolled a stub. @notifee ships the same `/jest`-subpath shape → it will almost certainly
need the same treatment. Leaving it conditional invites a mid-build stall.
- Fix: commit the spec to a hand-rolled mock in `jest.setup.js`, and enumerate the surface
  AC-3 needs so it is verifiable headlessly: `createTriggerNotification`,
  `cancelNotification` (or `cancelTriggerNotification`), `requestPermission`,
  `AuthorizationStatus` enum, `TriggerType`, `RepeatFrequency`, and `createChannel`
  (Android-safety, non-goal line 20-21). AC-3 should assert against these.

### S4 — NotificationsProvider placement not specified; must be inside SettingsProvider
The provider reads `settings.morning` via `useSettings` (shared/settings line 54-57 throws
if no ancestor `SettingsProvider`). Spec line 63 only says "App.tsx constructs
`createNotifeeNotifier()` once and mounts the provider" — no placement. In `App.tsx:50-57`
`SettingsProvider` wraps the tree; `NotificationsProvider` MUST be a descendant or the
app crashes on mount.
- Fix: specify the exact wiring: `<SettingsProvider>` → `<NotificationsProvider notifier=…>`
  → rest. Add it to the App.tsx composition-root note.

### S5 — AC-5 will break the existing "AC-8/AC-21" test; call out the edit
`src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx:92-95` currently asserts
`wkrotce-morning` AND `wkrotce-quiet` are PRESENT. AC-5 removes those tags, so that
existing (passing) test will fail. The spec's AC-5 verification (line 123-124) describes a
new assertion but never flags that the existing test must be edited — a guaranteed
regression the executor must handle. (Under B1, `quiet` stays tagged and only `morning`
moves present→absent; either way the existing test changes.)
- Fix: AC-5 must explicitly state it updates `UstawieniaScreen.test.tsx:92` (the
  present/absent lists) and reconcile with B1.

### S6 — isQuietHour spec gaps: same-day formula, local-time basis, start==end
AC-2 arithmetic is correct (verified below), but: (a) the only stated formula
(line 113 / API comment line 32-33) is the overnight case `[start,24:00) ∪ [00:00,end)`;
the same-day case (`start<end` → `[start,end)`) exists only as one example (line 78-79),
not as a rule. (b) The spec never says the comparison uses the LOCAL wall-clock
hours/minutes of `at` (`getHours`/`getMinutes`), which is what avoids a UTC mistake and is
DST-safe (wall-clock minutes, not elapsed time). (c) `start==end` is undefined
(empty window vs. all-day). Low real risk since QUIET_HOURS is fixed, but `isQuietHour` is
sold as reusable for the alert slice.
- Fix: state both branches as formulas, state "local-time components of `at`", and define
  `start==end` (recommend: empty window → always false). Add a same-day boundary test.

---

## Nits
- **Content copy mismatch:** ADR-013 line 44 `"…w {city}"` vs spec line 49-50
  `"Poranny raport — sprawdź jakość powietrza"` (no city). The data-layer adapter has no
  access to active-place state, so the no-city version is the buildable one. Reconcile — drop
  `{city}` from the ADR or move it to the deferred live-content slice.
- **`scheduleMorning(time?)` default:** spec never says `time` defaults to `MORNING_TIME`.
  State it (data→core import is allowed, per data/settings importing core/settings).
- **Android channel untested:** non-goal line 20-21 says the adapter creates a default
  channel; AC-3 doesn't assert it. Add or explicitly waive.
- **DST drift:** a fixed-interval DAILY repeat can drift ~1h vs. wall clock across DST
  transitions (see Open Questions). Tolerable for a morning summary; worth a one-line note.

---

## What's missing (gaps / unhandled)
- Denied-permission AC (B2).
- Cold-launch hydration `false→true` schedule/permission AC (S1).
- Next-occurrence (today vs tomorrow) AC (S2).
- Explicit "this slice edits the existing AC-8/AC-21 test" note (S5).
- Provider placement in App.tsx (S4).
- What happens if the OS later revokes permission out-of-band (user turns it off in iOS
  Settings) — no re-check on foreground. Acceptable to defer, but say so.

## Ambiguity risks
- `"the first time morning is enabled"` → A: a persisted asked-once flag; B: fire on every
  false→true transition. Wrong pick (A without persistence) silently never asks; (B) is what
  the code will actually do. Risk: contract mismatch (S1).
- `"no-op-schedule if 07:30 ∈ quiet"` → A: skip scheduling entirely; B: schedule but mark
  suppressed. Moot in this slice (never true) → B1 says remove it.

## Multi-perspective notes
- **Executor:** will stall at the denied branch (B2), the next-07:30 math (S2), the jest
  mock (S3), and provider placement (S4) — each forces a question the spec should answer.
- **Stakeholder:** AC-5 advertises `Godziny ciszy` as live while it does nothing (B1) — a
  vanity change; the user-visible win this slice is solely the morning summary.
- **Skeptic:** strongest case against the design is that quiet-hours is being landed purely
  to serve a future slice — the constitution explicitly rejects that. Defer it and the slice
  gets smaller, honest, and fully live.

## Credit (verified, no change needed)
- AC-2 arithmetic is correct for `[start,24:00)∪[00:00,end)`, inclusive start / exclusive
  end: 23:00→T, 03:00→T, 22:00→T, 07:00→F, 07:30→F, 12:00→F; same-day 08:00–10:00:
  09:00→T, 07:00→F. All check out.
- Seam design (core interface, data adapter, shared provider) faithfully mirrors
  `SettingsStore`/`FavoritesStore` (core/settings line 48-51; data/settings; FavoritesContext).
- Morning default OFF (core/settings line 20) → nothing scheduled until enabled. Good.
- AC-1 literal fixture is a genuine M1-retro-rule guard (matches commit 64cb1c1).
- Fixed-notification-id replace-not-duplicate approach is sound for toggle/relaunch.

---

## Top 3 highest-leverage changes
1. **B1** — Cut inert quiet-hours from this slice (keep `quiet` tagged `Wkrótce`; land
   `isQuietHour` as pure tested core only, no wired call site). Removes a
   constitution-forbidden abstraction and stops AC-5 from lying.
2. **B2 + S1** — Specify the permission story end-to-end: denied → revert toggle + no
   schedule; on `true` always request+schedule (idempotent); add the cold-launch hydration AC.
3. **S2 + S3** — Pin the next-07:30 computation (today/tomorrow) with a frozen clock AND
   pre-commit to a hand-rolled @notifee mock with an enumerated surface, so AC-3 is
   headlessly verifiable and step 2's native gate isn't blocked by a mock that won't load.

---

## Open questions (unscored)
- Does notifee's iOS DAILY repeat use a fixed 24h interval (DST-drifting) or a calendar
  trigger (wall-clock-stable)? If the former and the ~1h twice-a-year drift is unacceptable,
  the adapter may need a calendar-based trigger — verify against notifee's iOS impl before
  the plan commits to `RepeatFrequency.DAILY`.
- Should the provider re-validate permission on app-foreground (user may revoke in iOS
  Settings)? Deferable, but decide explicitly.
