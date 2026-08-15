# Spec 015: Notifications — permission + morning summary + quiet hours (foreground slice)

**Status:** draft
**Milestone:** M-notifications (foreground slice) · **Dependency:** ADR-013 (@notifee/react-native)
**Sources:** `design/README.md` §3 (POWIADOMIENIA: Alert smogowy, Próg alertu, Godziny ciszy 22:00–07:00, Poranne podsumowanie 07:30); `design/Powietrze.dc.html` lines 199–219

## Scope
Wire the notification settings that work with LOCAL scheduling (no background
monitoring): request permission, schedule a daily **morning summary** at 07:30
when `Poranne podsumowanie` is on, and honor **Godziny ciszy** (22:00–07:00) in
the scheduling. Removes the `morning` and `quiet` "Wkrótce" tags.

The **smog alert** (`Alert smogowy` + `Próg alertu`) needs background monitoring
(BGTaskScheduler) and stays "Wkrótce" — a deferred follow-up slice.

## Non-goals
- Smog alert / threshold monitoring (background) — deferred; those rows stay tagged.
- Live-data morning content — a local scheduled notification's body is fixed at
  schedule time, so v1 content is generic (live content needs the background fetch).
- Android specifics (channels beyond the minimum) — iOS-first; the adapter creates
  a default channel for cross-platform safety but the target is iOS.
- Editing quiet-hours times — the design shows a fixed `22:00 – 07:00`; kept fixed.

## Public API

### `src/core/notifications/index.ts` (new — pure)
```ts
export interface QuietHours { start: string; end: string } // 'HH:MM', may span midnight
export const QUIET_HOURS: QuietHours; // { start: '22:00', end: '07:00' } (design)
export const MORNING_TIME = '07:30';

// True when `at` (a Date) falls within the quiet-hours window, correctly handling
// an overnight range (start > end): 22:00–07:00 covers 23:00 AND 03:00, not 12:00.
export function isQuietHour(at: Date, q?: QuietHours): boolean;

// The seam features/settings use; the @notifee adapter implements it (data layer),
// a fake in tests. Never import @notifee outside the adapter.
export interface Notifier {
  requestPermission(): Promise<boolean>;      // true if granted
  scheduleMorning(time?: string): Promise<void>; // daily repeating local notif at HH:MM
  cancelMorning(): Promise<void>;
}
```

### `src/data/notifications/index.ts` (new)
```ts
// @notifee adapter implementing Notifier. scheduleMorning builds a daily repeating
// TimestampTrigger at the next HH:MM; a fixed notification id so re-scheduling
// replaces (not duplicates); generic content ("Poranny raport — sprawdź jakość
// powietrza"). cancelMorning cancels that id. requestPermission → notifee.requestPermission().
export function createNotifeeNotifier(): Notifier;
```

### `src/shared/notifications/` (context/hook)
```ts
// Provides the Notifier; on mount + whenever settings.morning changes, calls
// scheduleMorning()/cancelMorning() (requesting permission the first time morning
// is enabled). Quiet hours: scheduleMorning is a no-op-schedule if 07:30 ∈ quiet
// (it isn't for the default range, but the check is applied for correctness and
// re-used by the later alert slice).
export function NotificationsProvider(props: { notifier: Notifier; children: React.ReactNode }): JSX.Element;
```
App.tsx constructs `createNotifeeNotifier()` once and mounts the provider.

### Ustawienia wiring
- `morning` (Poranne podsumowanie): drop `soon`; toggling it enables/disables the
  daily 07:30 notification (via the provider).
- `quiet` (Godziny ciszy): drop `soon` — the value is honored by scheduling.
- `alert` + `threshold`: KEEP `soon` (deferred background slice).

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `QUIET_HOURS` deep-equals `{ start: '22:00', end: '07:00' }`;
  `MORNING_TIME === '07:30'` (literal fixtures, per the design).
- **AC-2** — `isQuietHour` handles the overnight window: at 23:00 → true; 03:00 →
  true; 22:00 → true (inclusive start); 07:00 → false (exclusive end); 07:30 →
  false; 12:00 → false. (Given a same-day range too, e.g. `{start:'08:00',
  end:'10:00'}`: 09:00 → true, 07:00 → false.)

### Data (adapter)
- **AC-3** — `createNotifeeNotifier().scheduleMorning()` calls notifee to create a
  DAILY repeating trigger at 07:30 with a FIXED notification id (re-scheduling
  replaces, never duplicates); `cancelMorning()` cancels that id;
  `requestPermission()` maps notifee's authorization status → boolean. (Verified
  against a mocked `@notifee/react-native`.)

### Integration
- **AC-4** — `NotificationsProvider`: when `settings.morning` becomes true it
  requests permission (first time) and calls `scheduleMorning`; when it becomes
  false it calls `cancelMorning`. Keyed on `settings.morning` (no redundant
  re-schedules on unrelated renders).
- **AC-5** — `UstawieniaScreen`: `morning` and `quiet` rows show NO `Wkrótce`
  tag; `alert` and `threshold` still show `Wkrótce`.

### Manual
- **AC-6** — *(journal)* On the sim: enabling Poranne podsumowanie triggers the
  iOS permission prompt; granting it schedules the 07:30 notification (verify via
  a near-future test time or notifee's scheduled-notifications list). Screenshot
  the permission prompt + the settings state → evidence/15.

## Resolved ambiguities
- **Local-only, foreground slice** — morning summary is a local repeating
  notification; smog alert (needs background air checks) is deferred with its rows
  still tagged. Quiet hours is wired + honored now (mainly matters once the alert
  lands, but the setting becomes real, not "Wkrótce").
- **Generic morning content** — fixed at schedule time; live air needs background.
- **Fixed notification id** so toggling/re-scheduling replaces rather than stacks.
- **@notifee behind a `Notifier` seam** (core interface + data adapter) — features
  never import @notifee; tests use a fake Notifier; the adapter is tested against
  a mocked @notifee.
- **isQuietHour overnight logic** — start>end means the window wraps midnight;
  `at ∈ [start,24:00) ∪ [00:00,end)`. Inclusive start, exclusive end.

## Verification
- **AC-1..2** (core): `src/core/notifications/__tests__/` (AC-1 literal fixture;
  AC-2 covers overnight + same-day + boundaries — 100% core coverage).
- **AC-3** (adapter): `src/data/notifications/__tests__/` with `@notifee/react-native`
  mocked (jest mock in jest.setup.js, like async-storage) — assert the daily
  trigger config, fixed id, cancel, permission mapping.
- **AC-4** (provider): `renderHook`/render with a fake `Notifier` + fake settings
  store toggling `morning`; assert schedule/cancel/permission calls.
- **AC-5** (Ustawienia): assert `wkrotce-morning`/`wkrotce-quiet` absent,
  `wkrotce-alert`/`wkrotce-threshold` present.
- **AC-6** (manual): sim permission prompt + scheduled notification, in the journal.

## Build note (native — needs a human/sim step)
Task order: (1) core (AC-1..2), (2) install @notifee + `pod install` + native
rebuild + jest mock, (3) adapter (AC-3), (4) provider + App wiring (AC-4),
(5) Ustawienia (AC-5), (6) native run + manual AC-6 + journal. Step 2 is the
interactive native gate (pod install, rebuild, permission prompt) — do it with a
human present; the rest is headless-testable.
