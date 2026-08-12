# Journal 09 — M-ustawienia (settings screen)

**Spec:** `docs/specs/009-ustawienia.md` (24 ACs) · **Plan:** `docs/superpowers/plans/2026-08-12-m-ustawienia.md`
**Branch:** `feature/m-ustawienia` (off the gestures tip; PR chain #3→#4→#5→#6→#7 precede) · **Base→HEAD:** `09d83e3`→`4ad8c08`
**Built:** 2026-08-12, subagent-driven (9 code tasks + 1 native/manual), per-task review after each, final whole-branch review.

## What shipped
The full design-mock settings screen (design README §3), rendered 1:1 with four grouped sections:
- **LOKALIZACJA** — Użyj mojej lokalizacji (toggle) · Dokładność (Przybliżona/Dokładna segmented)
- **POWIADOMIENIA** — Alert smogowy (toggle) · Próg alertu (custom slider 25–200) · Godziny ciszy (static) · Poranne podsumowanie/07:30 (toggle)
- **WIDŻET I WYGLĄD** — Stacja widżetu (static) · Skala indeksu (CAQI/US AQI/µg/m³ segmented)
- **DANE** — Źródło (GIOŚ) · Częstotliwość odświeżania (15 min) · footer

Every control is **live + persisted** via a new `SettingsStore` (AsyncStorage `powietrze.settings.v1`), mirroring the favorites stack: pure seam in `core/settings`, adapter in `data/settings`, `useSettings()` context in `shared/settings`, wired at `App.tsx`. No control yet drives app behavior (alerts/widgets/multi-scale don't exist), so rows whose value isn't a current fact carry an honest **"Wkrótce"** tag. `@react-native-community/slider` was avoided — the threshold slider is custom on the already-shipped gesture-handler + reanimated + linear-gradient stack, so **no new dependency, no ADR**.

## Architecture
`core/settings` (pure) ← `data/settings` (AsyncStorage) ← `shared/settings` (context) + `shared/ui` (Toggle, SegmentedControl, ThresholdSlider, SettingsGroup) ← `features/ustawienia` (UstawieniaScreen + SettingRow) ← `App.tsx`. New tokens: `text.faint/footer/muted`, `control.trackOff/segBg/segActive/divider`.

## Process notes / catch-class findings
- **Critic (pre-plan), spec 009:** SHIP-WITH-FIXES — 2 blockers + 6 should-fix + 5 nits, all folded in before planning. B1: `clampThreshold` non-finite contract contradicted its own AC → aligned (NaN→100, ±Inf clamp). B2: the slider had no viable jest test path → extracted pure `thresholdFromRatio`/`ratioFromThreshold` into core (headless-testable) and deferred the physical drag to a manual AC. S1: honesty rule made to cover *every* row (tag the two invented-value placeholder rows too; drop the dead `›` chevron). S3: added an App.tsx-wiring AC so tests can't be green while the app crashes.
- **Task 5 (slider) reviewer, Important:** knob position was clamped only on the low end → rendered ~11px off-track at high thresholds. Fixed by clamping both ends. Not caught by jest (no real layout width in jsdom) — a real defect the review caught before the manual pass would've.
- **Task 8 (screen) reviewer, Important:** `UstawieniaScreen()` body hit ~107 lines (>40-line rule; no lint rule enforces function length). Fixed by extracting per-group components (`LokalizacjaGroup` etc.) + a `ToggleRow` helper — body down to 20 lines. Reminder that the ≤40 function rule needs human/agent eyes, not just lint.
- **Task 8 also caught a regression:** AppNavigator now mounts the live UstawieniaScreen, so `AppNavigator.test` needed SettingsProvider + GestureHandlerRootView added (test-only; AC-10 assertions unchanged) — the "full suite must stay green" gate surfaced it.
- **Reusable gotchas:** (1) a settings context must use the FUNCTIONAL-updater `set(prev=>…)` form, else rapid successive `set` calls clobber (AC-12 guards it). (2) Testing async hydration under RNTL v14: a synchronously-resolving fake store hydrates before `renderHook` returns, so a pre-hydration assertion is vacuous — use a manually-deferred `load()` promise resolved under `act` to observe the real pre→post transition. (3) ThresholdSlider tests must wrap in `GestureHandlerRootView` (GestureDetector needs it); jest can't drive the pan → manual AC.

## AC coverage
**Verifier (independent test run, not report-trust): 23/24 VERIFIED · 1 manual-pending (AC-24) · 0 FAILED.**
Gate: Test Suites 40/40 · Tests 133/133 · lint 0 errors (4 pre-existing warnings) · typecheck clean · `src/core` coverage 100/100/100/100 (threshold met).
- **AC-1..23:** VERIFIED — each traced to a passing test the verifier ran itself; AC-1 (default table) and AC-18 (Polish copy) confirmed genuine literal fixtures.
- **AC-24 (manual):** PARTIAL — visual fidelity VERIFIED on-device; physical drag motion still human-only.
  - **On-device screenshot** (iPhone 16 Pro, iOS 18.3, this branch running via Metro): `docs/harness/evidence/09/ustawienia-sim-lower.png` (POWIADOMIENIA + WIDŻET I WYGLĄD + DANE + footer).
  - **Verified from the device render:** all rows/copy/glyphs match the spec (`22:00 – 07:00` en-dash, `µg/m³`, `Automatyczna` with the `›` chevron correctly dropped); every "Wkrótce" tag on the right rows and none on Źródło/Częstotliwość; segmented shows CAQI active; the DANE footer both lines. The tab bar shows the Teraz tab in its dimmed live air-color (green) while Ustawienia is focused (PR #7 confirmed live too).
  - **Slider:** observed at a **persisted non-default value 76** — knob at the matching ratio (≈(76−25)/175 = 0.29) and the number tinted by the air ramp (orange). Consistent with a working, persisted custom slider.
  - **Not done by the agent:** the physical drag/toggle/segment taps were not agent-driven — `idb` is not installed and `osascript` UI automation is accessibility-blocked in this environment, so taps/drags can't be issued headlessly (same constraint documented for M-loc/gestures). The non-default 76 was set by a human hand. Remaining human confirmation: drag the knob end-to-end and watch value + track recolor smoothly within [25,200] (the interactive half of AC-24). Top-of-screen groups (Ustawienia header + LOKALIZACJA) not captured this session — the app can't be scrolled headlessly and relaunch resets to the Teraz tab.

## Deferred (fast-follow, non-blocking — final review ruled ship-as-is)
- SettingsGroup test doesn't assert the divider-count invariant (divider has no testID) — add `testID={`divider-${i}`}` + count assertion next time it's touched.
- `UstawieniaScreen.tsx` at 198 lines (near the 200 cap) — put any new row in a new group component, not this file.
- Wiring settings to real behavior (alerts, morning briefing, quiet-hours, widget config, scale conversion, gating geolocation on `loc`) — each its own future milestone.
