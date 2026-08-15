# SDD ledger — spec: docs/specs/015-notifications.md (foreground slice)
Branch: feature/m-notifications (off m-settings-wired tip / PR #13; chain #3→…→#13 precede)
BASE: 01474a6
Critic: SHIP-WITH-FIXES → B1 (defer quiet-hours: slice=permission+morning only) + B2/S1-S6 folded in.
Build split (user chose "headless parts now, pause at native install"):
- HEADLESS (do now, unit-tested): Task 1 core (nextMorningTimestamp/MORNING_TIME/Notifier iface); Task 4 NotificationsProvider (fake Notifier).
- NATIVE GATE (paused for human): Task 2 install @notifee + pod + rebuild + jest mock; Task 3 adapter (needs @notifee for tsc); App.tsx wiring of the provider; Task 5 untag `morning` in Ustawienia (defer so we don't ship an inert live-looking toggle before the provider is mounted); Task 6 native run + manual AC-6.
Load-bearing: quiet-hours DEFERRED (no isQuietHour here); permission denied→revert toggle; idempotent fixed-id schedule; nextMorningTimestamp future-only; Notifier seam (features never import @notifee).

Tasks:
- Task 1: complete — ebe0421, 2 tests, full 183, core 100%. Self-reviewed: nextMorningTimestamp strict-before + local wall-clock, pure, Notifier iface — clean.
- Task 4: complete — 8002c22, 4 tests (full 187), lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE; loop-safe (deny→cancel, no re-request), cold-launch schedules once. Not wired into App (native gate). HEADLESS SLICE DONE.
- Task 2: complete — @notifee/react-native 9.1.8 installed + `pod install` (RNNotifee 9.1.8 linked in Podfile.lock) + hand-rolled @notifee jest mock in jest.setup.js (default client + AuthorizationStatus/TriggerType/RepeatFrequency/AndroidImportance enums). Commit 5dac733.
- Task 3: complete — createNotifeeNotifier adapter (src/data/notifications) + 6 tests (AC-3): DAILY TimestampTrigger @ nextMorningTimestamp(now), fixed id 'powietrze-morning' (replace not duplicate), createChannel before schedule, permission AUTHORIZED/PROVISIONAL→true DENIED→false. Commit 5dac733.
- App wiring: complete — NotificationsProvider(notifier=createNotifeeNotifier()) mounted under SettingsProvider in App.tsx. Commit 5dac733.
- Task 5: complete — untagged `morning` row (AC-5); updated spec-014 test (morning now absent from wkrotce set; alert/threshold/quiet still present). Commit 5dac733.
- Gate after native gate: 54 suites / 193 tests green, lint 0 errors, tsc clean, core 100%.
- Task 6 (manual AC-6): native rebuild done with @notifee; PENDING human on sim — toggle Poranne podsumowanie → iOS permission prompt; grant→scheduled; deny→toggle reverts. (Verify iOS DAILY repeat calendar- vs interval-based re: DST — open question from spec.)
