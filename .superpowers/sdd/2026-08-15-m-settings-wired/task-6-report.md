# Task 6 report — Ustawienia: loc/precision/scale live, widget row removed

Status: DONE
Commit: bb3e2ea — "feat(ustawienia): make loc/precision/scale live, hide widget row (AC-8, spec 014)"

## What changed

`src/features/ustawienia/UstawieniaScreen.tsx`
- `ToggleRow` no longer hardcodes `soon`; it now takes an optional `soon?: boolean`
  prop and forwards it to `SettingRow` (default: no tag).
- `loc` (ToggleRow): no `soon` prop passed → live, no "Wkrótce" tag.
- `alert` (ToggleRow): `soon` passed → tag kept.
- `morning` (ToggleRow): `soon` passed → tag kept.
- `precision` (StackedRow): `soon` prop removed → live, no tag.
- `threshold` (StackedRow): `soon` kept, unchanged.
- `scale` (StackedRow): `soon` prop removed → live, no tag.
- `quiet` (SettingRow, static): `soon` kept, unchanged.
- `widget` (SettingRow "Stacja widżetu" / "Automatyczna"): row deleted entirely
  from `WygladGroup`.
- `source` / `refresh` (DANE group): unchanged.

`src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`
- AC-18: dropped `'Stacja widżetu'` / `'Automatyczna'` from the expected-copy
  list; added explicit `queryByText('Stacja widżetu')`,
  `queryByText('Automatyczna')`, and `queryByTestId('setting-widget')` all
  asserting `null`.
- AC-21 (now labeled AC-8/AC-21): rewrote the "Wkrótce" enumeration —
  present-tag assertion loop covers only `alert`, `threshold`, `quiet`,
  `morning`; a second loop asserts `wkrotce-<key>` is `null` for `loc`,
  `precision`, `scale`, `widget`, `source`, `refresh`.
- Followed TDD: ran the rewritten tests against the old implementation first
  (2 failures, as expected — widget row + loc's forced tag), then implemented
  and reran to green.

## Verification (confirmed)

- Tagged (`wkrotce-<key>` present): `alert`, `threshold`, `quiet`, `morning`.
- Untagged (`wkrotce-<key>` absent): `loc`, `precision`, `scale`. `widget` key
  doesn't exist at all (row removed, `setting-widget` and `wkrotce-widget`
  both absent). `source`/`refresh` also confirmed untagged (pre-existing).
- Widget row fully gone: no `setting-widget` testID, no "Stacja widżetu" /
  "Automatyczna" text anywhere in the render tree.

## Gate results

- `npx jest UstawieniaScreen`: 6/6 passed.
- `npm test` (full suite): 51 suites / 181 tests passed. (Some pre-existing
  React `act()` console warnings from `usePlaceReading` — unrelated to this
  change, not new.)
- `npm run lint`: 0 errors, 4 pre-existing warnings (inline-style /
  eslint-comments in `App.tsx`, `mappers.ts`, `HistoryChart.tsx`,
  `Toggle.tsx`) — none touched by this task.
- `npm run typecheck`: clean, no errors.
- No `any`, no hex literals introduced.

## Concerns

None. No sandbox permission issues encountered — all git/npm commands ran
normally.
