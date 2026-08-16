# Spec 019: Smog alert — threshold crossing + quiet hours (foreground slice)

**Status:** implemented (AC-1..5 automated + verified); AC-6 pending sim. Journal: `docs/harness/19-smog-alert.md`
**Milestone:** M-smog-alert (foreground slice) · **Depends on:** @notifee (ADR-013, already installed) · spec 015 (Notifier seam)
**Sources:** `design/README.md` §3 POWIADOMIENIA + advice copy (line 74); the deferred quiet-hours from spec 015 (critic B1) lands here.
**Critic:** SHIP-WITH-FIXES — B1 + S1–S4 + M1–M4 folded in. `.superpowers/sdd/critic-019.md`.

## Scope
Give the persisted `alert` (bool) + `threshold` (CAQI index, [25,200]) settings a consumer, and
honor a fixed quiet-hours window: when a fetched reading's **CAQI index ≥ threshold**, `alert` is
on, and it's **not** quiet hours (22:00–07:00 local), fire a local smog notification — **deduped
per place** (once per rising crossing, not on every reading while air stays bad). Un-tags the
`alert`, `threshold`, and `quiet` rows (all three currently show "Wkrótce"). **`alert` default
changes `true → false`** (opt-in; see M2 below) so the feature never prompts for notifications
unprompted at launch.

## Non-goals
- **Closed-app / background alerts** — needs BGTaskScheduler; DEFERRED (v1 evaluates each reading
  fetched while the app runs). The same `smogAlertDecision` evaluator runs in the background once
  the gate lands.
- **User-configurable quiet hours** — fixed 22:00–07:00 (no new Settings field / picker).
- **Per-pollutant thresholds / forecast** — single CAQI-index threshold only.

## Design

### Core — pure alert logic (`src/core/alert/index.ts`, new)
```ts
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 7;
export function isQuietHour(now: Date): boolean; // local hour >= 22 || < 7

// Pure crossing decision. `prev.wasAbove` = whether the previous evaluated reading (FOR THIS PLACE)
// was at/above threshold. Returns whether to fire AND the next wasAbove. Precedence off → quiet → normal:
//   - alert off   → { fire:false, wasAbove:false }   (reset so re-enabling re-arms)
//   - quiet hours → { fire:false, wasAbove:prev.wasAbove } (suppress + FREEZE, so a crossing that
//                   began at e.g. 06:59 fires once quiet ends)
//   - else        → fire = index >= threshold && !prev.wasAbove (rising edge);
//                   next wasAbove = index >= threshold.
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
**S1 — every `Notifier` double must add `notifySmog`:** the real adapter `createNotifeeNotifier`
(`src/data/notifications/index.ts`) AND the hand-rolled `fakeNotifier` in
`src/shared/notifications/__tests__/NotificationsProvider.test.tsx` (else typecheck reds). Any new
test fake implements it too.

### Data — @notifee adapter (`src/data/notifications`)
`notifySmog(index)`: `createChannel` first (M3, mirrors `scheduleMorning`), then
`notifee.displayNotification({ title: 'Alert smogowy', body: '<approved copy>', android:{ channelId }})`.
**M4 — body is the approved design string** `"Ogranicz długie i intensywne aktywności na zewnątrz."`
(`design/README.md:74`), not invented copy. `displayNotification` is core @notifee (already
installed) — **no new native gate**. Add `displayNotification` to the @notifee jest mock
(`jest.setup.js`).

### Shared — SmogAlertProvider (`src/shared/alert/index.tsx`, new)
```ts
export function SmogAlertProvider(props: {
  notifier: Notifier;
  now?: () => Date;                    // S3: injectable clock (defaults () => new Date()) for the quiet test
  children: React.ReactNode;
}): JSX.Element;
```
- Reads the active place + reading via `useActivePlace` (its `placeKey`/`status`/`reading`) and
  `alert`/`threshold` + `set` via `useSettings`.
- **S4 — only `status === 'ready'`** readings are evaluated (a `stale` reading, though it carries a
  value, is NOT evaluated — it must not mis-drive `wasAbove`).
- **S2 — per-place dedup:** a `useRef<Map<string, boolean>>` keyed by `placeKey` (`location` |
  `station:{id}`). Each ready reading: `const prev = map.get(placeKey) ?? false;` compute
  `smogAlertDecision(prev, {...})`; `map.set(placeKey, next.wasAbove)`; on `fire` → `notifier.notifySmog(reading.index)`.
- **Permission (mirrors NotificationsProvider):** on `alert === true` (mount + toggle) →
  `requestPermission()`; denied → `set('alert', false)` (persisted revert). With `alert` default
  **false** (M2), a launch prompt only ever appears right after the user enables the toggle — never
  unprompted.
- Mounted under ActivePlace + Settings in `App.tsx`, `notifier={createNotifeeNotifier()}` (reuse the same instance if convenient).

### Core settings — `alert` default (`src/core/settings/index.ts`)
**M2 — `DEFAULT_SETTINGS.alert: true → false`** (opt-in, consistent with `morning: false`; avoids an
unprompted first-launch permission dialog). Update `mergeSettings`/DEFAULT tests that assert the default.

### Ustawienia (`src/features/ustawienia/UstawieniaScreen.tsx`)
Drop `soon` on **all three**: `alert` (Alert smogowy), `threshold` (Próg alertu), `quiet`
(Godziny ciszy, shows the fixed 22:00–07:00 the alert honors). (B1)

### Native gate (deferred)
BGTaskScheduler wakes the app → runs the same `smogAlertDecision` against a background fetch →
fires `notifySmog` when closed. Needs persisted per-place last-alerted state (vs the in-memory Map)
+ background plumbing.

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `isQuietHour`: true at 22:00, 23:30, 00:00, 06:59; false at 07:00, 12:00, 21:59.
- **AC-2** — `smogAlertDecision` table: rising edge → `{true,true}`; staying above → `{false,true}`;
  dropping below → `{false,false}`; re-cross after drop → fires again; alert off → `{false,false}`
  regardless of index; quiet + above → `{false,prev}`; `index === threshold` counts as above.
- **AC-2b (M1)** — composed: a crossing that begins during quiet (prev `false`) stays `{false,false}`
  through quiet, then fires exactly once on the first non-quiet evaluation while still above.

### Data (adapter, @notifee mocked)
- **AC-3** — `notifySmog(index)` calls `createChannel` then `notifee.displayNotification` with the
  approved body + the channel id; the other Notifier methods (requestPermission mapping, morning) unchanged.

### Integration
- **AC-4** — `SmogAlertProvider` (fake `Notifier` + injected `now` + fake active place/settings):
  fires `notifySmog(index)` once on a rising crossing; NOT while staying above; NOT below threshold,
  when `alert` off, during quiet hours (injected `now`), or while `status !== 'ready'` (loading/stale);
  re-fires on a new crossing after dropping below. **Per-place (S2):** place A above fires; switching
  to place B and back to A (still above) does NOT re-fire A; a distinct place B above fires on its own.
  Toggling `alert` on → `requestPermission`; denied → `set('alert', false)`.

### Ustawienia
- **AC-5 (B1)** — `alert`, `threshold`, `quiet` rows show NO `Wkrótce` (`wkrotce-alert/threshold/quiet`
  all absent). **Update the existing spec-014/018 tag test:** move all three from the present list to
  the absent list (nothing should remain in the "present Wkrótce" set).

### Manual
- **AC-6** — *(journal)* sim: enable Alert smogowy → permission prompt; set a low threshold, trigger a
  reading ≥ threshold → smog notification fires once; staying above doesn't re-fire; 22:00–07:00
  suppresses. Screenshot → evidence/19.

## Verification
- **AC-1/2/2b** core `src/core/alert/__tests__/` (100% core).
- **AC-3** `src/data/notifications/__tests__/` (add `displayNotification` to the mock).
- **AC-4** `src/shared/alert/__tests__/` (fake Notifier + injected clock + fake active place/settings;
  drive place switches for the per-place dedup case).
- **AC-5** `src/features/ustawienia/__tests__/UstawieniaScreen` (all three tags absent).
- **AC-6** manual, journal `docs/harness/19-smog-alert.md` + evidence/19.

## Resolved (critic)
- **B1** alert is currently `soon` — AC-5 un-tags all three. **S1** `notifySmog` added to the adapter +
  the `fakeNotifier` + jest mock. **S2** per-place dedup via a `Map<placeKey,boolean>`. **S3** injectable
  `now`. **S4** only `ready` evaluated. **M1** composed quiet-cross AC-2b. **M2** `alert` default → false +
  morning-mirrored permission (no launch prompt). **M3** channel-before-display. **M4** approved copy.
- Open Qs: (1) per-toggle permission ownership kept (no shared helper — only 2 consumers). (2) in-memory
  per-place Map dedup accepted for the foreground slice (one re-fire possible after app restart while
  above — documented). (3) quiet-freeze kept (fires once quiet ends).
