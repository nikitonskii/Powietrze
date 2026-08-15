# Spec 015: Notifications — permission + daily morning summary (foreground slice)

**Status:** draft
**Milestone:** M-notifications (foreground slice) · **Dependency:** ADR-013 (@notifee/react-native)
**Sources:** `design/README.md` §3 (POWIADOMIENIA: Poranne podsumowanie 07:30); `design/Powietrze.dc.html` lines 216–219

## Scope
Request notification permission and schedule a daily **morning summary** at 07:30
when `Poranne podsumowanie` is on (cancel when off). Removes only the `morning`
"Wkrótce" tag.

## Non-goals
- **Quiet hours (`Godziny ciszy`)** — DEFERRED. In a foreground-only slice the
  single notification fires at a fixed 07:30, which is never inside 22:00–07:00,
  so quiet hours would be inert wiring (constitution: no dead code / speculative
  abstractions). It ships with the smog-alert slice, where it actually suppresses
  something. `Godziny ciszy` stays "Wkrótce" this slice; `isQuietHour` is NOT
  landed here (it belongs with the alert slice that consumes it).
- **Smog alert / threshold** (`Alert smogowy` / `Próg alertu`) — needs background
  monitoring (BGTaskScheduler); deferred; those rows stay "Wkrótce".
- **Live-data morning content** — a local scheduled notification's body is fixed
  at schedule time (no active-place/data access in the adapter); v1 content is
  generic. Live content needs the deferred background fetch.

## Public API

### `src/core/notifications/index.ts` (new — pure)
```ts
export const MORNING_TIME = '07:30'; // design

// The epoch-ms of the NEXT occurrence of HH:MM in local wall-clock time: today
// if `now` is strictly before it, otherwise tomorrow (notifee TimestampTrigger
// requires a FUTURE timestamp). `now` is injected for tests.
export function nextMorningTimestamp(now: Date, time?: string): number; // time defaults to MORNING_TIME

// The seam features/settings use; the @notifee adapter implements it (data layer),
// a fake in tests. Never import @notifee outside the adapter.
export interface Notifier {
  requestPermission(): Promise<boolean>;         // true iff granted
  scheduleMorning(time?: string): Promise<void>; // daily repeating local notif at HH:MM (defaults MORNING_TIME)
  cancelMorning(): Promise<void>;
}
```

### `src/data/notifications/index.ts` (new)
```ts
// @notifee adapter implementing Notifier. `createNotifeeNotifier(now?: () => Date)`
// (injectable clock for tests, defaults to `() => new Date()`).
//   scheduleMorning: createTriggerNotification with a TimestampTrigger at
//     nextMorningTimestamp(now(), time), RepeatFrequency.DAILY, a FIXED id
//     (MORNING_ID) so re-scheduling replaces (never duplicates); generic body.
//   cancelMorning: cancelTriggerNotification(MORNING_ID).
//   requestPermission: notifee.requestPermission() → map AuthorizationStatus
//     (AUTHORIZED|PROVISIONAL → true, else false).
// Creates a default Android channel on init (cross-platform safety; iOS ignores).
export function createNotifeeNotifier(now?: () => Date): Notifier;
```

### `src/shared/notifications/` (provider)
```ts
// Reads settings.morning + settings.set (to revert on denial). On morning===true:
// requestPermission(); if granted → scheduleMorning(); if denied → set('morning', false)
// (persisted revert) and do NOT schedule. On morning===false: cancelMorning().
// Idempotent (fixed id) so cold-launch hydration (false→true) schedules exactly
// once; keyed on settings.morning. Requires a SettingsProvider ancestor.
export function NotificationsProvider(props: { notifier: Notifier; children: React.ReactNode }): JSX.Element;
```
`App.tsx` composition root: `<SettingsProvider>` → `<NotificationsProvider notifier={createNotifeeNotifier()}>` → rest of the tree (must be a descendant of SettingsProvider).

### Ustawienia wiring
- `morning` (Poranne podsumowanie): drop `soon`; toggling it drives the provider
  (permission → schedule / revert-on-deny / cancel).
- `alert`, `threshold`, `quiet`: KEEP `soon` (deferred).

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `MORNING_TIME === '07:30'` (literal fixture, per design).
- **AC-2** — `nextMorningTimestamp` (frozen `now`, local wall-clock): if `now` is
  before 07:30 today → today 07:30:00.000 local; if `now` is 07:30 or later →
  tomorrow 07:30:00.000 local. Pin both branches (e.g. now=06:00 → today; now=08:00
  → tomorrow; now=exactly 07:30:00 → tomorrow, i.e. strict "before"). Assert the
  resulting Date's local H/M/S and that it is a future timestamp `> now`.

### Data (adapter, @notifee mocked)
- **AC-3** — `createNotifeeNotifier(() => FIXED_NOW).scheduleMorning()` calls
  `createTriggerNotification` with a `TimestampTrigger` whose `timestamp ===
  nextMorningTimestamp(FIXED_NOW)`, `repeatFrequency === RepeatFrequency.DAILY`,
  and the FIXED notification id; `cancelMorning()` calls
  `cancelTriggerNotification(id)`; `requestPermission()` maps
  `AuthorizationStatus.AUTHORIZED`/`PROVISIONAL` → true, `DENIED` → false.

### Integration
- **AC-4** — `NotificationsProvider` (fake `Notifier` + fake settings store):
  - `morning:true` + permission granted → `requestPermission` then `scheduleMorning`
    called once; `settings.morning` stays true.
  - `morning:true` + permission DENIED → `scheduleMorning` NOT called and
    `set('morning', false)` is called (persisted revert).
  - `morning:false` → `cancelMorning` called.
  - Cold-launch hydration (store loads `morning:true` after the default `false`) →
    schedules exactly ONCE (idempotent; no duplicate from the false→true transition).
- **AC-5** — `UstawieniaScreen`: `morning` row shows NO `Wkrótce` tag
  (`wkrotce-morning` absent); `alert`, `threshold`, and `quiet` STILL show
  `Wkrótce`. **This edits the existing spec-014 test that asserted `wkrotce-morning`
  present — update that present/absent split (only `morning` moves to absent).**

### Manual
- **AC-6** — *(journal)* On the sim: enabling Poranne podsumowanie triggers the iOS
  permission prompt; granting → the morning notification is scheduled (verify via
  a near-future MORNING_TIME override or notifee's scheduled list); denying →
  the toggle reverts to off. Screenshot the prompt + settings → evidence/15.

## Resolved ambiguities
- **Morning-only slice** — quiet hours deferred (B1: inert here). This slice's
  user-visible win is solely the daily 07:30 summary; only `morning` becomes live.
- **Permission story (B2/S1):** on every `morning===true` (including cold-launch
  hydration) the provider requests permission then schedules — idempotent via the
  fixed id, so no "asked-once" flag is needed and no duplicate schedule results.
  iOS returns the cached authorization silently on repeats. DENIED → revert the
  toggle to off (persisted) and don't schedule.
- **Next-occurrence (S2):** `nextMorningTimestamp` returns today's 07:30 only if
  `now` is strictly before it, else tomorrow's — notifee's TimestampTrigger
  requires a future time. Local wall-clock components.
- **@notifee jest mock (S3):** hand-rolled in `jest.setup.js` (the shipped `/jest`
  mock hides behind an ESM exports-subpath our CJS transform can't load — same as
  async-storage). Mock surface: `createTriggerNotification`,
  `cancelTriggerNotification`, `requestPermission`, `createChannel`, and the enums
  `AuthorizationStatus`, `TriggerType`, `RepeatFrequency`.
- **Generic content, no city** — the adapter has no active-place access; body is
  generic (e.g. `"Poranny raport — sprawdź dziś jakość powietrza"`). (ADR-013's
  `{city}` mention is superseded — live/city content is the deferred slice.)
- **`Notifier` seam** — core interface, data adapter, shared provider; features
  never import @notifee; tests use a fake Notifier / mocked @notifee.
- **DST:** `RepeatFrequency.DAILY` may drift ~1h across DST transitions for a
  fixed-interval repeat; acceptable for a morning summary. If notifee's iOS repeat
  turns out interval-based and the drift is unacceptable, revisit with a calendar
  trigger — verify during the build (Open question).

## Verification
- **AC-1..2** (core): `src/core/notifications/__tests__/` (AC-1 literal; AC-2 both
  branches + boundary with a frozen `now`; 100% core coverage).
- **AC-3** (adapter): `src/data/notifications/__tests__/` with `@notifee/react-native`
  hand-mocked; assert trigger config (timestamp/DAILY/fixed id), cancel, permission
  mapping, channel creation.
- **AC-4** (provider): `renderHook`/render with a fake `Notifier` + fake settings
  store — the granted, denied-revert, cancel, and cold-launch-hydration paths.
- **AC-5** (Ustawienia): assert `wkrotce-morning` absent; `wkrotce-alert/threshold/
  quiet` present; update the existing spec-014 assertion accordingly.
- **AC-6** (manual): sim permission prompt + scheduled notification + deny-revert, journal.

## Build note (native — needs a human/sim step)
Task order: (1) core (AC-1..2); (2) install `@notifee/react-native` + `pod install`
+ native rebuild + hand-rolled jest mock; (3) adapter (AC-3); (4) provider + App
wiring (AC-4); (5) Ustawienia (AC-5); (6) native run + manual AC-6 + journal.
**Step 2 is the interactive native gate** (pod install, rebuild, permission prompt) —
run with a human present; steps 1,3,4,5 are headless-testable (with the jest mock).
Also verify in the build whether notifee's iOS DAILY repeat is calendar- or
interval-based (DST question above) before relying on `RepeatFrequency.DAILY`.
