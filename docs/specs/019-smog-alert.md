# Spec 019: Smog alert — threshold crossing + quiet hours (foreground slice)

**Status:** draft
**Milestone:** M-smog-alert (foreground slice) · **Depends on:** @notifee (ADR-013, already installed) · spec 015 (Notifier seam)
**Sources:** `design/README.md` §3 POWIADOMIENIA (Alert smogowy / Próg alertu / Godziny ciszy); the deferred quiet-hours from spec 015 (critic B1) lands here.

## Scope
Give the persisted `alert` (bool) + `threshold` (CAQI index, [25,200], default 100) settings a consumer, and honor a fixed quiet-hours window: when a fetched reading's **CAQI index ≥ threshold**, `alert` is on, and it's **not** quiet hours (22:00–07:00 local), fire a local smog notification — **deduped** to fire once per crossing (rising edge), not on every reading while air stays bad. Un-tags the `threshold` and `quiet` rows. `alert` toggle is already wired (currently a no-op); this makes it act.

## Non-goals
- **Closed-app / background alerts** — needs BGTaskScheduler; DEFERRED to the native gate (v1 fires only while the app is running, evaluating each fetched reading). Documented; the same evaluator runs in the background once the gate lands.
- **User-configurable quiet hours** — fixed 22:00–07:00 this slice (no new Settings field / picker). Configurable window is a fast-follow.
- **Per-pollutant thresholds / smog forecast** — the single CAQI-index threshold only.

## Design

### Core — pure alert logic (`src/core/alert/index.ts`, new)
```ts
// Fixed quiet window (local wall-clock), overnight: [22:00, 07:00).
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 7;
export function isQuietHour(now: Date): boolean; // h >= 22 || h < 7

// Pure crossing decision. `wasAbove` = whether the previous evaluated reading was
// at/above threshold (threaded by the caller via a ref). Returns whether to fire
// AND the next `wasAbove`. Rules:
//   - alert off        → { fire:false, wasAbove:false }  (reset so re-enabling re-arms)
//   - quiet hours      → { fire:false, wasAbove:prev }   (suppress + freeze state)
//   - else fire iff (index >= threshold) AND NOT prev.wasAbove (rising edge);
//     next wasAbove = (index >= threshold).
export interface SmogInput { index: number; threshold: number; alertOn: boolean; now: Date }
export interface SmogDecision { fire: boolean; wasAbove: boolean }
export function smogAlertDecision(prev: { wasAbove: boolean }, input: SmogInput): SmogDecision;
```

### Core — extend the Notifier seam (`src/core/notifications/index.ts`)
```ts
export interface Notifier {
  requestPermission(): Promise<boolean>;
  scheduleMorning(time?: string): Promise<void>;
  cancelMorning(): Promise<void>;
  notifySmog(index: number): Promise<void>;   // NEW: immediate local smog notification
}
```

### Data — @notifee adapter (`src/data/notifications`)
`notifySmog(index)` → `notifee.displayNotification({ title: 'Alert smogowy', body:
\`Indeks CAQI ${index} — ogranicz aktywność na zewnątrz.\`, android: { channelId }})`.
Uses `displayNotification` (immediate) — **no new native gate**: @notifee is already
installed. Creates a smog Android channel (iOS ignores). Add `displayNotification` to
the hand-rolled @notifee jest mock.

### Shared — SmogAlertProvider (`src/shared/alert/index.tsx`, new)
Reads the active reading (`useActivePlace`) + settings (`alert`, `threshold`) +
`set`. On each ready reading, computes `smogAlertDecision(wasAboveRef, {...})`,
updates the ref, and on `fire` calls `notifier.notifySmog(reading.index)`. When
`alert` flips on: `requestPermission()`; denied → `set('alert', false)` (persisted
revert, mirrors NotificationsProvider). Mounted under ActivePlace + Settings in `App.tsx`.
```ts
export function SmogAlertProvider(props: { notifier: Notifier; children: React.ReactNode }): JSX.Element;
```

### Ustawienia
- `threshold` (Próg alertu): drop `soon` — the slider already sets it; now it's honored.
- `quiet` (Godziny ciszy): drop `soon` — shows the fixed 22:00–07:00 window the alert honors.
- `alert` (Alert smogowy): already un-tagged; now drives the provider.

### Native gate (deferred, its own follow-up)
BGTaskScheduler wakes the app periodically → runs the same `smogAlertDecision`
evaluator against a background fetch → fires `notifySmog` when the app is closed.
Needs persisted last-alerted state (vs the in-memory ref) + the background plumbing.

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `isQuietHour`: true at 22:00, 23:30, 00:00, 06:59; false at 07:00, 12:00, 21:59 (pin the overnight boundaries with frozen `now`).
- **AC-2** — `smogAlertDecision` table: rising edge (prev.wasAbove=false, index≥threshold, alert on, not quiet) → `{fire:true, wasAbove:true}`; staying above (prev.wasAbove=true) → `{fire:false, wasAbove:true}`; dropping below → `{fire:false, wasAbove:false}`; re-crossing after a drop → fires again; alert off → `{fire:false, wasAbove:false}` regardless of index; quiet hours + above → `{fire:false, wasAbove:prev}` (frozen, so a crossing that began in quiet fires once quiet ends). Boundary `index === threshold` counts as above.

### Data (adapter, @notifee mocked)
- **AC-3** — `notifySmog(index)` calls `notifee.displayNotification` with the index in the body + a channel; `requestPermission` mapping unchanged; the other Notifier methods intact.

### Integration
- **AC-4** — `SmogAlertProvider` (fake `Notifier` + fake active reading/settings): fires `notifySmog(index)` once on a rising crossing; does NOT fire while staying above; does NOT fire below threshold, when `alert` off, or during quiet hours; re-fires on a new crossing after dropping below. Toggling `alert` on → `requestPermission`; denied → `set('alert', false)`; no fire while loading/no reading.

### Ustawienia
- **AC-5** — `threshold` and `quiet` rows show NO `Wkrótce` (`wkrotce-threshold`/`wkrotce-quiet` absent); update the existing spec-014/018 test's present/absent split accordingly.

### Manual
- **AC-6** — *(journal)* On the sim: set a low `threshold`, trigger a reading ≥ threshold (foreground) → smog notification fires once; staying above doesn't re-fire; toggling `alert` triggers the permission prompt; within 22:00–07:00 it's suppressed. Screenshot → evidence/19.

## Verification
- **AC-1/AC-2** core `src/core/alert/__tests__/` (100% core).
- **AC-3** `src/data/notifications/__tests__/` (@notifee mocked; add `displayNotification` to the mock).
- **AC-4** `src/shared/alert/__tests__/` (fake Notifier + fake active place/settings).
- **AC-5** `src/features/ustawienia/__tests__/UstawieniaScreen` (tag present/absent).
- **AC-6** manual on the sim, journal `docs/harness/19-smog-alert.md` + evidence/19.

## Build note
Fully headless-testable (foreground path uses the already-installed @notifee) — no
interactive native gate for v1 beyond the standard sim permission prompt (AC-6).
True background alerting (BGTaskScheduler) is a separate, later native gate.

## Open questions (for the critic)
1. **Permission duplication** — both `NotificationsProvider` (morning) and `SmogAlertProvider`
   (alert) request permission + deny-revert their toggle. Acceptable per-toggle ownership, or
   extract a shared permission helper?
2. **Dedup persistence** — v1 tracks `wasAbove` in an in-memory ref (resets on app restart →
   could re-fire once after a restart while still above). Acceptable for the foreground slice?
3. **Quiet-freeze semantics** — a crossing that begins during quiet fires once quiet ends
   (state frozen). Correct, or should quiet fully reset `wasAbove`?
