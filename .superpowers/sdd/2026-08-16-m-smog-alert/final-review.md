# Final whole-branch review — M-smog-alert (foreground slice)

**Branch:** `feature/m-smog-alert` off `feature/m-refresh`
**Spec:** `docs/specs/019-smog-alert.md` · **Constitution:** `CLAUDE.md`
**Reviewer pass:** fresh context, read-only. Per-task reviews already passed; this is the cross-cutting sweep.

## Verdict: APPROVE-WITH-NITS

One Minor nit (now-dead `soon`/`Wkrótce` affordance). No Critical/Important findings. All gates green, all ACs traced to real behavior tests, `src/core` 100%.

---

## Gate results (ran locally)

| Gate | Result |
|------|--------|
| `npm test` | **62 suites / 243 tests passed**, 0 failed, 0 skipped |
| `npm run typecheck` | **0 errors** (exit 0) |
| `npm run lint` | **0 errors**, 4 warnings — all pre-existing, none in alert code (App.tsx inline-style, gios/mappers unused-disable, HistoryChart + Toggle inline-style) |
| `src/core` coverage | **100% stmts / 100% branch / 100% funcs / 100% lines** (air, alert, geo, notifications, places, settings all 100%) |

Note: running `jest --coverage` writing to `coverage/` hits an EPERM under the sandbox (report-file write only) — the test run itself still completes 243/243. Core coverage confirmed via a redirected `--coverageDirectory`.

---

## Stage 1 — Spec compliance (all ACs traced)

- **AC-1** `isQuietHour` boundaries — `core/alert/__tests__/decision.test.ts:4` (22:00/23:30/00:00/06:59 true; 07:00/12:00/21:59 false). Matches impl `h >= 22 || h < 7`.
- **AC-2** `smogAlertDecision` precedence table (off→quiet→normal), rising edge, staying-above, drop, re-cross, `index===threshold` — `decision.test.ts:18-88`. Real table, distinct expectations, no tautology.
- **AC-2b** composed quiet-cross fires once when quiet ends, `wasAbove` threaded — `decision.test.ts:93`.
- **AC-3** `notifySmog` → `createChannel` then `displayNotification` with approved body + channelId; other Notifier methods untouched — `data/notifications/__tests__/notifier.test.ts:73`. Body asserted literally against design string.
- **AC-4** provider: fires once on rising crossing (`crossing.test.tsx:16`), not below/off/quiet/`!ready` (`:27/:41/:55/:70`), stale not evaluated + no `wasAbove` corruption (`:93`), staying-above no re-fire + re-cross re-fires (`:134`), per-place dedup incl. switch-away-and-back (`perPlace.test.tsx:7`), toggle→requestPermission→deny reverts persisted (`permission.test.tsx:8`). Behavior tests driving the real provider through a real Settings/ActivePlace/Refresh tree — not mocks of the unit under test.
- **AC-5** all three `wkrotce-alert/threshold/quiet` absent (plus the rest) — `UstawieniaScreen.test.tsx:92`. Existing tag test updated: default `alert` now false (`settings.test.ts` diff).
- **AC-6** manual (sim) — out of scope, not flagged.

Default flip `alert: true→false` (M2) is in `core/settings/index.ts:19` with tests updated (`settings.test.ts`: DEFAULT literal, `mergeSettings({}).alert===false`, `{alert:'yes'}→false`). Solves the right problem: no unprompted launch permission dialog.

---

## Stage 2 — Cross-cutting correctness (end-to-end trace)

Signal → active reading → decision → per-place dedup → notify, traced through `SmogAlertProvider` (`src/shared/alert/index.tsx`):

- **Ready-only gate (S4):** effect guards `status !== 'ready' || !reading` (`:57`). A `stale` reading (carries prior value) is skipped, so it cannot mis-drive `wasAbove`. Confirmed by the 3-fetch stale test (ready@80 fires → refresh rejects→stale, no re-eval → refresh ready@80 again, still no re-fire). **No stale-eval bug.**
- **Per-place dedup (S2):** `useRef<Map<placeKey,boolean>>`, `placeKeyFor` = `location` | `station:{id}` (`:10`, `:59-65`). Map persists for provider lifetime; keyed reads/writes are isolated per place. **No cross-place leakage** — switch A→B→A (A still above) does not re-fire A.
- **No double-fire:** rising edge only (`fire = above && !prev.wasAbove` in core). Refetch with a new `reading` object while staying above → `prev.wasAbove` true → `fire:false`. Re-run on `alert`/`threshold` change with an unchanged reading likewise cannot double-fire (still above ⇒ no rising edge).
- **Missed re-fire:** drop-below resets `wasAbove:false`, next crossing re-fires — covered by `crossing.test.tsx:134` and the core re-cross case.
- **Quiet-freeze holds integrated:** quiet returns `{fire:false, wasAbove:prev}` — freezes rather than resets, so a crossing begun at 06:59 fires on the first non-quiet evaluation. `clock()` is sampled at fire-time inside the effect, so the injected/real clock is always current. (Foreground-slice caveat, already in spec non-goals: if air stays bad and no new reading arrives, the frozen crossing waits for the next fetch — expected for v1; the 15-min refresh re-evaluates.)
- **alert-off reset:** core returns `{false,false}` on `!alertOn`, re-arming on re-enable. Effect also has `alert` in deps so a toggle re-evaluates.

### Effect dependency hygiene
Deps `[status, reading, alert, threshold]` with an `eslint-disable exhaustive-deps` excluding `active`, `notifier`, `clock`. The exclusions are correct and documented inline: `active` reflects the current place at fire-time (place changes always arrive with a new `status`/`reading` transition), `notifier` is an app-level stable instance, `clock` is a fresh closure sampling "now" at invocation. No stale-closure firing bug — verified by the per-place and quiet tests. `useAlertPermission` deps `[alert, notifier]` (excludes non-stable `set`): deny→`set('alert',false)` flips `alert`, which re-runs the effect with `alert===false` (no request) — **no request loop**.

### Architecture / constitution
- **Import direction one-way:** `shared/alert` → `core/{alert,notifications,places}` + sibling `shared/{place,settings,refresh}`; `data/notifications` → `core/notifications` only. No feature→data, no core→outward, no cross-feature. Clean.
- **`core` purity:** `core/alert` is pure TS, zero React, 100% covered.
- **File/function sizes:** `shared/alert/index.tsx` 71 lines, `core/alert` 28, `data/notifications` 79 — all ≤200; functions ≤40.
- **No `any`:** none introduced (the only eslint-disables are exhaustive-deps, justified).
- **No hard-coded hex/copy:** notification body is the approved design string (`design/README.md:74`), asserted literally in AC-3. Titles reuse in-app labels. No colors in new code.
- **App.tsx wiring:** `SmogAlertProvider` sits under both `ActivePlaceProvider` and `SettingsProvider` (`App.tsx:59-62`), reusing the single `notifier` instance; no existing provider dropped or reordered incorrectly.

### Permission duplication (asked)
`SmogAlertProvider.useAlertPermission` and `NotificationsProvider` both request permission + revert their own toggle on deny. **Acceptable, not a finding.** They own disjoint settings (`alert` vs `morning`), no shared mutable state, no ordering hazard; iOS coalesces the OS prompt. Spec explicitly accepted per-toggle ownership (Open Q1: "no shared helper — only 2 consumers"). With both defaults false, launch never prompts unprompted (M2 goal met). Extracting a shared helper for two call-sites would be premature.

### Test integrity
Not tautologies: core table has distinct per-row expectations; provider suite drives the real provider through real Settings/ActivePlace/Refresh providers with a fake `Notifier` + injected clock + fake source, asserting call counts/args and negative cases (below/off/quiet/loading/stale). `harness.tsx` is a shared fixture module — `jest.config.js` `testMatch` was narrowed to `*.test.` so it is not discovered as a suite (verified: 62 suites, no harness suite). The `fakeNotifier` doubles in both the alert harness and `NotificationsProvider.test.tsx` gained `notifySmog` (S1) so typecheck stays green.

---

## Findings

### Minor

**[Minor] Dead `soon`/`Wkrótce` affordance — zero callers after this branch un-tagged the last three rows.**
This branch removed `soon` from `alert`/`threshold`/`quiet`, and `morning`/`loc`/etc. never used it, so **no call site passes `soon` any more**. The prop, its render branch, and the `wkrotce-*` testIDs are now unreachable code.
- `src/features/ustawienia/SettingRow.tsx:8,15` (`soon` param + type), `:24-28` (`{soon && <Text testID={\`wkrotce-${keyName}\`}…>Wkrótce</Text>}`), `:41` (`rowHeaderStyles.soon` style).
- `src/features/ustawienia/UstawieniaScreen.tsx:18,26,36` (`ToggleRow` `soon` param/type + `soon={soon}` pass-through), `:48,53,60-64` (`StackedRow` `soon` param/type + render branch).

**Recommendation: REMOVE.** CLAUDE.md is explicit — "No dead code, no speculative abstractions." There is no roadmap referencing a future "Wkrótce" row; the feature that owned the last callers is exactly this change, so the cleanup belongs here. Removal is safe: AC-5 (`UstawieniaScreen.test.tsx:92`) only asserts the `wkrotce-*` testIDs are **absent**, which still holds after deletion — **no test changes required, gates stay green**. (A reviewer could defend keeping it as a tiny, tested-by-absence affordance, but the constitution leans remove; hence Minor, non-blocking.)

### Positive observations
- Precedence (off→quiet→normal) lives in one pure, fully-tested core function; the provider is a thin effect over it — exactly the core/shared split the constitution wants.
- Quiet-hours **freeze** (not reset) is a subtle correctness choice, and it is explicitly tested both at the core level (AC-2b) and reasoned about for the integrated path.
- The stale-reading test is genuinely adversarial: it proves a `stale` re-eval can't corrupt `wasAbove` and cause a spurious re-fire — a real bug class, not a happy-path check.
- Per-place dedup keyed identically to `usePlaceReading` (documented as deliberately in-sync) avoids a subtle key-mismatch class of bug.
- `alert` default flip is defended by tests on DEFAULT, `mergeSettings`, and the wrong-type coercion path.

---

## Non-findings (checked, no action)
- Foreground-only evaluation / in-memory Map reset on restart (possible one re-fire while above) — documented spec Open Q2; out of scope for this slice.
- 4 lint warnings — all pre-existing, none in touched files.
- `notifySmog(_index)` ignores `index` — intentional; body fixed to approved copy, `index` reserved for future richer copy (commented).
