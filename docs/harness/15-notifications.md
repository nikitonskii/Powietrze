# Journal 15 — M-notifications (foreground slice: permission + daily 07:30 summary)

**Spec:** `docs/specs/015-notifications.md` (AC-1..6) · **ADR:** `docs/decisions/013-notifications-notifee.md`
**Branch:** `feature/m-notifications` (off `feature/m-settings-wired`/PR #13; chain #3→…→#13 precede) · **PR:** #14
**Built:** 2026-08-15, subagent-driven headless slice + native gate run with the human. **New dependency:** `@notifee/react-native` 9.1.8 (ADR-013 — the only approved native dep, notifications only).

## What shipped
The last four POWIADOMIENIA rows were all "Wkrótce". This slice makes **Poranne podsumowanie** live: toggling it requests iOS notification permission and, if granted, schedules a **daily 07:30 local notification** ("Poranny raport"); toggling off cancels it; denying permission reverts the toggle. The other three rows (Alert smogowy, Próg alertu, Godziny ciszy) stay "Wkrótce" — they need background monitoring (BGTaskScheduler), deferred to the smog-alert slice.

## Design decisions (from the critique)
- **Quiet hours DEFERRED (critic B1).** In a foreground-only slice the single notification fires at a fixed 07:30, which is never inside 22:00–07:00 — so quiet-hours wiring would be inert (constitution: no dead code / speculative abstractions). `isQuietHour` is not landed here; it ships with the alert slice that actually consumes it. `Godziny ciszy` stays "Wkrótce".
- **Permission denial reverts the toggle (B2).** On `morning===true` the provider requests permission every time (idempotent via the fixed notification id — iOS returns the cached authorization silently); DENIED → `set('morning', false)` (persisted) and no schedule.
- **Generic content, fixed at schedule time.** A local scheduled notification's body can't show live air or the city (no data/active-place access in the adapter) — that needs the deferred background fetch. v1 body is generic ("Sprawdź dziś jakość powietrza").
- **`Notifier` seam.** Pure interface in `core/notifications`, @notifee adapter in `data/notifications`, provider in `shared/notifications`. Features never import @notifee; tests use a fake `Notifier` / the mocked module.
- **Idempotent fixed id (`powietrze-morning`)** so re-scheduling REPLACES rather than duplicating, and cold-launch hydration (false→true) schedules exactly once.

## Native gate (run with the human)
- `npm i @notifee/react-native@9.1.8` + `pod install` (RNNotifee 9.1.8 linked) + native rebuild for the iPhone 16 Pro sim.
- **Hand-rolled @notifee jest mock** in `jest.setup.js` — the shipped `/jest` mock hides behind an ESM exports subpath our CJS transform can't load (same failure mode as `@react-native-async-storage`). Mock surface: the default client (`requestPermission`/`createChannel`/`createTriggerNotification`/`cancelTriggerNotification`) + the `AuthorizationStatus`/`TriggerType`/`RepeatFrequency`/`AndroidImportance` enums.

## Process notes
- **Split build (user choice "headless parts now, pause at install"):** Tasks 1 (core) + 4 (provider) landed and unit-tested first (PR #14 opened as draft); Tasks 2/3/5 + App wiring + the rebuild ran together at the native gate so the sim permission prompt has a human.
- **Reusable gotcha:** a native module whose jest mock ships behind an ESM `/jest` subpath won't load under a CJS transform — hand-roll a small mock (this is now the third: async-storage, safe-area-context, notifee). And don't un-tag a settings toggle until the code behind it is mounted — an inert live-looking control is worse than an honest "Wkrótce".

## AC coverage
Gate: 54 suites / 193 tests · lint 0 errors · typecheck clean · `src/core` 100%.
- **AC-1** (MORNING_TIME literal) ✓ · **AC-2** (nextMorningTimestamp both branches + strict-before boundary + future) ✓ (core).
- **AC-3** (adapter: DAILY TimestampTrigger @ next 07:30, fixed id, custom time, cancel, permission mapping, channel) ✓ (6 tests, @notifee mocked).
- **AC-4** (provider: granted→schedule, denied→revert, off→cancel, cold-launch schedules once) ✓.
- **AC-5** (Ustawienia: `wkrotce-morning` absent; alert/threshold/quiet present) ✓.
- **AC-6 (manual):** on the sim — enabling Poranne podsumowanie triggers the iOS permission prompt; grant → scheduled; deny → toggle reverts. PENDING human (not headlessly drivable).

<!-- MANUAL EVIDENCE (append after sim): docs/harness/evidence/15/. -->

## Open question (verify at AC-6)
notifee iOS `RepeatFrequency.DAILY` may drift ~1h across DST for a fixed-interval repeat. Acceptable for a morning summary; if it turns out interval- (not calendar-) based and the drift is unacceptable, revisit with a calendar trigger.

## Deferred (non-blocking, fast-follows)
- **Smog-alert slice** — Alert smogowy + Próg alertu + Godziny ciszy (quiet hours becomes live here), needs BGTaskScheduler background monitoring; may warrant its own ADR.
- **Live/city morning content** — needs the deferred background fetch.
- WidgetKit (the removed widget row).
