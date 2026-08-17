# Smog alert (foreground slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Fire a local smog notification on a rising CAQI-index crossing of `threshold` (deduped per place, honoring quiet hours + the `alert` toggle), evaluated on each ready reading while the app runs.

**Architecture:** Pure `core/alert` state machine → a `notifySmog` method on the `Notifier` seam (@notifee `displayNotification`, already installed) → a `SmogAlertProvider` (mirrors `NotificationsProvider`) that threads per-place `wasAbove` and fires. `alert` default flips to opt-in. Foreground path fully headless; background (BGTaskScheduler) deferred.

**Tech Stack:** TS strict, RN 0.86, Jest + @testing-library/react-native (async render/renderHook — await). No new dependency (@notifee already installed).

## Global Constraints
- No new dependency. · TS strict / no `any`. · `core` pure, 100% coverage. · files ≤200 / functions ≤40. · imports one-way (features→shared→core, data→core; features never import data). · behavior tests cite AC IDs.
- Spec `docs/specs/019-smog-alert.md` authoritative. Copy is the approved design string `"Ogranicz długie i intensywne aktywności na zewnątrz."` (design/README.md:74). Quiet window fixed 22:00–07:00.

---

### Task 1: Core alert logic (`src/core/alert/index.ts`)

**Files:** Create `src/core/alert/index.ts`; Test `src/core/alert/__tests__/decision.test.ts`.

**Interfaces — Produces:** `QUIET_START_HOUR`, `QUIET_END_HOUR`, `isQuietHour(now)`, `SmogInput`, `SmogDecision`, `smogAlertDecision(prev, input)`.

- [ ] **Step 1: Failing tests (AC-1, AC-2, AC-2b)** — `isQuietHour` boundaries (22:00/23:30/00:00/06:59 true; 07:00/12:00/21:59 false, frozen `now`); the full `smogAlertDecision` table (rising→{true,true}; staying→{false,true}; drop→{false,false}; re-cross→fires; alert off→{false,false}; quiet+above→{false,prev}; index===threshold above); AC-2b composed (cross begins in quiet → {false,false} through quiet → fires once on first non-quiet eval while above).
- [ ] **Step 2: Run, verify fail** — `npx jest src/core/alert`.
- [ ] **Step 3: Implement**:

```ts
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 7;

export function isQuietHour(now: Date): boolean {
  const h = now.getHours();
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

export interface SmogInput {
  index: number;
  threshold: number;
  alertOn: boolean;
  now: Date;
}
export interface SmogDecision {
  fire: boolean;
  wasAbove: boolean;
}

export function smogAlertDecision(
  prev: { wasAbove: boolean },
  input: SmogInput,
): SmogDecision {
  if (!input.alertOn) return { fire: false, wasAbove: false };
  if (isQuietHour(input.now)) return { fire: false, wasAbove: prev.wasAbove };
  const above = input.index >= input.threshold;
  return { fire: above && !prev.wasAbove, wasAbove: above };
}
```

- [ ] **Step 4: Run tests** green.
- [ ] **Step 5: Full gate** (`npm run typecheck && npm run lint && npm test`) green, `src/core` 100%. Commit: `feat(core): smog alert decision + quiet hours (AC-1, AC-2)`.

---

### Task 2: Notifier.notifySmog + @notifee adapter + mock + fake

**Files:** Modify `src/core/notifications/index.ts` (add `notifySmog` to `Notifier`); `src/data/notifications/index.ts` (impl); `jest.setup.js` (mock); `src/shared/notifications/__tests__/NotificationsProvider.test.tsx` (`fakeNotifier` gains `notifySmog`); Test `src/data/notifications/__tests__/` (extend).

**Interfaces — Consumes:** nothing new. **Produces:** `Notifier.notifySmog(index)`.

- [ ] **Step 1: Failing test (AC-3)** — `createNotifeeNotifier().notifySmog(42)` calls `notifee.createChannel` then `notifee.displayNotification` with `body` === the approved copy and the index in the title-or-body per spec; the other methods unchanged.
- [ ] **Step 2: Run, verify fail**.
- [ ] **Step 3: Implement**
  - `core/notifications`: add `notifySmog(index: number): Promise<void>;` to `Notifier`.
  - `jest.setup.js`: add `displayNotification: jest.fn(async () => undefined)` to the @notifee default mock.
  - `data/notifications`: implement `notifySmog` — `await notifee.createChannel({ id: SMOG_CHANNEL, name: 'Alert smogowy', importance: AndroidImportance.DEFAULT }); await notifee.displayNotification({ title: 'Alert smogowy', body: 'Ogranicz długie i intensywne aktywności na zewnątrz.', android: { channelId: SMOG_CHANNEL } });` (index available for future richer copy; keep approved body).
  - `NotificationsProvider.test.tsx`: add `notifySmog: jest.fn()` to `fakeNotifier` so it still satisfies `Notifier` (S1 — else typecheck reds).
- [ ] **Step 4: Run tests** — `npm test` green (typecheck must pass — all Notifier doubles complete).
- [ ] **Step 5: Full gate** green. Commit: `feat(notifications): Notifier.notifySmog via @notifee displayNotification (AC-3)`.

---

### Task 3: SmogAlertProvider + App wiring (`src/shared/alert`)

**Files:** Create `src/shared/alert/index.tsx`; Test `src/shared/alert/__tests__/SmogAlertProvider.test.tsx`; Modify `App.tsx`.

**Interfaces — Consumes:** `smogAlertDecision`, `Notifier` (core); `useActivePlace`, `useSettings` (shared). **Produces:** `SmogAlertProvider({ notifier, now?, children })`.

- [ ] **Step 1: Failing test (AC-4)** — fake `Notifier` + injected `now` + the active-place/settings harness (copy the `NotificationsProvider` + `ActivePlaceContext` test wiring). Assert: fires `notifySmog(index)` once on a rising crossing; NOT while staying above; NOT below threshold / alert off / quiet hours (via injected `now`) / `status !== 'ready'`; re-fires after dropping below; **per-place** — place A(≥thr) fires, switch to B and back to A (still ≥thr) does NOT re-fire A, a distinct B(≥thr) fires; toggling `alert` on → `requestPermission`, denied → `set('alert', false)`. Cite AC-4.
- [ ] **Step 2: Run, verify fail**.
- [ ] **Step 3: Implement** `SmogAlertProvider`:
  - Read `useActivePlace()` → `{ active, status, reading }`; derive `placeKey` the same way `usePlaceReading` does (`active.kind === 'location' ? 'location' : \`station:${active.station.id}\``). Read `useSettings()` → `{ settings: { alert, threshold }, set }`.
  - Permission effect keyed on `settings.alert` (mirror `NotificationsProvider`): `if (alert) requestPermission().then(g => { if (!g) set('alert', false); })` (deny-revert; `active` unmount guard; eslint-disable justified as in NotificationsProvider).
  - Fire effect keyed on `[status, reading, settings.alert, settings.threshold]`: if `status !== 'ready' || !reading` return; `const map = mapRef.current; const prev = map.get(placeKey) ?? false; const d = smogAlertDecision({ wasAbove: prev }, { index: reading.index, threshold: settings.threshold, alertOn: settings.alert, now: now() }); map.set(placeKey, d.wasAbove); if (d.fire) notifier.notifySmog(reading.index);` where `mapRef = useRef(new Map<string, boolean>())` and `now = props.now ?? (() => new Date())`.
  - Return `<>{children}</>`.
  - `App.tsx`: mount `<SmogAlertProvider notifier={notifier}>` under `ActivePlaceProvider` + `SettingsProvider` (reuse the `notifier` instance already built for NotificationsProvider, or a fresh `createNotifeeNotifier()`).
- [ ] **Step 4: Run tests** green.
- [ ] **Step 5: Full gate** green. Commit: `feat(alert): SmogAlertProvider — per-place threshold-crossing alerts (AC-4)`.

---

### Task 4: Settings default + un-tag Ustawienia rows

**Files:** Modify `src/core/settings/index.ts` (`DEFAULT_SETTINGS.alert`); `src/features/ustawienia/UstawieniaScreen.tsx` (drop `soon` ×3); update `src/core/settings/__tests__/*` + `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`.

- [ ] **Step 1: Update failing tests (AC-5 + default)** — settings test: `DEFAULT_SETTINGS.alert === false`; `mergeSettings({})` / missing → `alert: false`. Ustawienia tag test: move `alert`, `threshold`, `quiet` all to the ABSENT (`queryByTestId('wkrotce-*')` null) list; the present set is now empty.
- [ ] **Step 2: Run, verify fail** (the old default/tag assertions red).
- [ ] **Step 3: Implement** — `DEFAULT_SETTINGS.alert: false`; drop `soon` on the `alert`, `threshold`, `quiet` rows in `UstawieniaScreen.tsx`.
- [ ] **Step 4: Fix fallout** — any other suite asserting `alert: true` default (grep `alert: true`, `DEFAULT_SETTINGS`).
- [ ] **Step 5: Full gate** green, `src/core` 100%. Commit: `feat(ustawienia): un-tag alert/threshold/quiet; alert default opt-in (AC-5)`.

---

### Task 5: Manual sim (AC-6) + journal
- [ ] Enable Alert smogowy → permission prompt; low threshold → reading ≥ threshold fires once; staying above no re-fire; 22:00–07:00 suppresses. Screenshot → evidence/19.
- [ ] Journal `docs/harness/19-smog-alert.md` + spec status.

---

## Self-review
- **Spec coverage:** AC-1/2/2b→T1; AC-3→T2; AC-4→T3; AC-5→T4; AC-6→T5. All covered.
- **Type consistency:** `Notifier.notifySmog` (T2) implemented by adapter + fake + provider-test fake; `smogAlertDecision`/`SmogInput` (T1) consumed by T3.
- **S1 guard:** T2 updates every `Notifier` double so typecheck stays green. **S2:** per-place Map in T3. **M2:** default flip in T4 (App-mounted provider from T3 is inert in tests; the flip lands before any manual run).
- **No placeholders:** code inline; approved copy pinned.
