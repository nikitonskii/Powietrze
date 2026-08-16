# Task 4 review — settings default + un-tag Ustawienia rows

## Verdict 1: SPEC — PASS

- AC-5 satisfied: `wkrotce-alert` / `wkrotce-threshold` / `wkrotce-quiet` are all absent.
  `src/features/ustawienia/UstawieniaScreen.tsx:96-110` drops `soon` on all three
  POWIADOMIENIA rows (`ToggleRow keyName="alert"`, `StackedRow keyName="threshold"`,
  `SettingRow keyName="quiet"`). Test at
  `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx:92-108` (AC-5) asserts
  `wkrotce-*` is `null` for the full row set including `alert`, `threshold`, `quiet` — a real,
  non-vacuous assertion (queryByTestId, not getByTestId, correctly used for absence).
- `DEFAULT_SETTINGS.alert === false`: `src/core/settings/index.ts:18`, pinned by
  `src/core/settings/__tests__/settings.test.ts:11-27` (AC-1 literal fixture, updated) and a new
  explicit `settings.test.ts:22-24` (AC-5) `expect(DEFAULT_SETTINGS.alert).toBe(false)`.
- `mergeSettings` missing-alert → false: `settings.test.ts:52-54`
  (`mergeSettings({}).alert` → `false`) and `mergeSettings({ alert: 'yes' })` (bad type) now
  correctly asserted to fall back to `false` (`settings.test.ts:58`, was `true` pre-diff) — this
  exercises the real fallback path (`bool()` helper in `src/core/settings/index.ts:59`), not just
  restating the default object.
- All new/changed assertions cite AC IDs correctly (AC-1, AC-5, AC-4 in settings.test.ts; AC-5,
  AC-19 in UstawieniaScreen.test.tsx). No renamed-but-unchanged test masking a behavior gap.

## Verdict 2: QUALITY — APPROVE

- TS strict / no `any`: none introduced. `npx tsc --noEmit` clean.
- No hard-coded hex/design values added by this diff (only prop/default value changes + test
  literals).
- File sizes: `UstawieniaScreen.tsx` 189 lines, `core/settings/index.ts` 75, both test files well
  under 200/40 limits.
- `npm run lint` (eslint over `src/core/settings` + `src/features/ustawienia`): clean (only
  pre-existing, unrelated `boundaries` plugin config warnings, not diff-related).
- Full `npm test`: **62 suites passed / 62 total, 243 tests passed / 243 total**, 0 failed, 0
  skipped.

## Fallout scan (default flip `true → false`)

- Grepped `alert: true`, `alert:true`, `alert === true`, `DEFAULT_SETTINGS` across `src`. All
  other suites that care about `alert` set it explicitly per-test (e.g.
  `src/shared/alert/__tests__/crossing.test.tsx`, `perPlace.test.tsx` use inline
  `{ alert: true/false, threshold: 50 }` fixtures unrelated to `DEFAULT_SETTINGS`;
  `src/shared/notifications/__tests__/NotificationsProvider.test.tsx` spreads
  `{ ...DEFAULT_SETTINGS, morning: true }` and doesn't touch `alert`;
  `src/data/settings/__tests__/store.test.ts:10` already had its own local `alert: false`
  fixture). No suite was found relying implicitly on `DEFAULT_SETTINGS.alert === true`. Confirmed
  by the full green run above — no collateral failures.
- `AC-19` toggle-persistence test (`UstawieniaScreen.test.tsx:78-83`) correctly updated: default
  is now `false`, so pressing `toggle-alert` flips saved `alert` to `true` (was asserting `false`
  pre-diff, matching the old `true` default) — the invert logic itself is unchanged, only the
  starting state, so the test still meaningfully exercises the toggle.
- `keyName`/`testID` audit: `toggle-alert`, `setting-threshold` (via `StackedRow`'s
  `setting-${keyName}`), `slider-threshold`, `setting-quiet` all preserved — no row lost its
  identifiers, only the `soon` prop was dropped.

## Findings

**Critical:** none.

**Important:** none.

**Minor:**
- `src/features/ustawienia/SettingRow.tsx:8,15,24-28` and
  `src/features/ustawienia/UstawieniaScreen.tsx:18,26,36,48,53,60-64` — after this diff, no
  caller anywhere in the codebase passes `soon` (grepped; only the prop declarations and the
  conditional-render branches remain). The `soon` prop and its "Wkrótce" badge rendering are now
  fully dead code (unreachable in production, since alert/threshold/quiet were the last three
  `soon` rows — the widget row was already removed in a prior spec). CLAUDE.md forbids dead code.
  This is plausibly out of Task 4's literal scope ("drop soon on rows", not "remove soon
  plumbing"), and low-risk since it's inert, but should be swept in a follow-up task rather than
  left indefinitely — flagging so it isn't forgotten, not blocking this task.

## Summary

Task 4 is complete, correctly scoped, and matches both spec AC-5 and the plan's Task 4 steps.
The default flip is centralized in `DEFAULT_SETTINGS` and consistently threaded through
`mergeSettings`; no other suite assumed the old `alert: true` default. Full gate is green.

**Test counts:** 62 test suites passed / 62 total; 243 tests passed / 243 total; 0 failed, 0
skipped.

**SPEC:** PASS  **QUALITY:** APPROVE
