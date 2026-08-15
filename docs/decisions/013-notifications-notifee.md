# ADR-013: Local notifications via @notifee/react-native

**Status:** accepted · **Date:** 2026-08-15 · **Milestone:** M-notifications (foreground slice)

## Context
The Ustawienia POWIADOMIENIA section needs real notifications: a daily morning
summary ("Poranny raport", 07:30), quiet hours (22:00–07:00), and later a smog
alert when air exceeds a threshold. Bare RN 0.86, New Architecture, no Expo. RN
core has no notifications API (the old `PushNotificationIOS` moved to a community
package). A native dependency is unavoidable — the user explicitly accepted one
for this feature (otherwise the standing "no new libraries" rule holds).

This ADR covers the FOREGROUND slice: permission flow + local scheduled morning
summary + quiet-hours honoring. The smog alert needs background monitoring
(BGTaskScheduler) and is deferred to a follow-up (may warrant its own ADR).

## Decision
Use **`@notifee/react-native`** for local notifications: permission request,
trigger-based scheduling (daily repeating `TimestampTrigger`/`RepeatFrequency.DAILY`),
channels, and foreground/background display. New-Architecture compatible.

## Alternatives considered
- **@react-native-community/push-notification-ios** — lighter, iOS-only local
  notifications, but weaker scheduling (no rich repeating triggers/channels), less
  actively maintained. Rejected — @notifee is the modern, local-first standard.
- **expo-notifications** — capable, but pulls `expo-modules-core` into a bare
  (non-Expo) app — a heavier footprint than the feature warrants. Rejected.
- **react-native-push-notification** — older community lib, maintenance concerns
  on New Arch. Rejected.
- **@notifee/react-native** — local-first, actively maintained, precise scheduling
  + permissions, New-Arch support. Chosen.

## Consequences
- One native dependency + `pod install` + a **native rebuild** (and the iOS
  notification **permission prompt** — an interactive step needing a human/sim).
- Jest: mock `@notifee/react-native` (it ships a `/jest` mock; if it doesn't load
  under our CJS transform, hand-roll a small mock like the async-storage one).
- The scheduling logic is testable in pure `core` (quiet-hours, next-trigger math);
  the @notifee calls sit behind a data-layer adapter (a seam interface in core),
  so features never import @notifee directly.
- **Morning-summary content is fixed at schedule time** (a local notification) —
  it cannot show live air (or the city, which the adapter can't access) without a
  background fetch, so v1 content is generic ("Poranny raport — sprawdź dziś
  jakość powietrza"). Live/city content + the threshold smog alert both require
  the deferred BGTaskScheduler work.
- iOS `Info.plist`/entitlements as @notifee's setup docs require (local
  notifications need no special entitlement; background monitoring later will).
