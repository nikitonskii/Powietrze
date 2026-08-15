# Task 6 — Ustawienia: ToggleRow soon? + drop tags on loc/precision/scale + remove widget row

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-settings-wired`.

## Global Constraints
TS strict, no `any`; no-hex features; files ≤200/funcs ≤40; tests cite AC IDs; FULL suite green.

## Change — `src/features/ustawienia/UstawieniaScreen.tsx`
Read the file first. Currently `ToggleRow` HARDCODES `soon` (passed to every toggle row: loc, alert, morning). `StackedRow` already takes a `soon?` prop (used by precision, threshold, scale). Do:
1. Add a `soon?: boolean` prop to `ToggleRow`; render its `wkrotce-<key>` tag only when `soon` is true (default false).
2. Row-by-row:
   - `loc` (ToggleRow): pass NO `soon` (now live).
   - `alert` (ToggleRow): pass `soon` (KEEP the tag — notifications milestone).
   - `morning` (ToggleRow): pass `soon` (KEEP).
   - `precision` (StackedRow): remove `soon` (now live).
   - `threshold` (StackedRow): KEEP `soon`.
   - `scale` (StackedRow): remove `soon` (now live).
   - `quiet` (SettingRow, static "Godziny ciszy"): KEEP `soon`.
   - `widget` (SettingRow "Stacja widżetu"): DELETE this row entirely.
   - `source`/`refresh` (DANE): unchanged (no soon).
Net after: `wkrotce-` tags present only on alert, threshold, quiet, morning; absent on loc, precision, scale; the widget row gone.

## Step 1: update/failing tests — `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`
Read the file. Rewrite the spec-009 AC-18 (widget copy) and AC-21 (wkrotce enumeration) assertions to match:
- Remove any assertion expecting `Stacja widżetu` / `Automatyczna` (row deleted) — assert `queryByTestId('setting-widget')` is null and `queryByText('Stacja widżetu')` is null.
- Rewrite the wkrotce enumeration: PRESENT `wkrotce-alert`, `wkrotce-threshold`, `wkrotce-quiet`, `wkrotce-morning`; ABSENT `wkrotce-loc`, `wkrotce-precision`, `wkrotce-scale`, `wkrotce-widget`.
- Keep all other assertions (section labels, remaining rows, toggle/segment interactions) intact.
Add/keep an AC-8 test capturing the above.

## Step 2: run → fail. Step 3: implement. Step 4: gate
`npx jest UstawieniaScreen`, then FULL `npm test`, `npm run lint`, `npm run typecheck` — all green.

## Step 5: commit
`git add src/features/ustawienia && git commit -m "feat(ustawienia): make loc/precision/scale live, hide widget row (AC-8, spec 014)"`

## Report → `.superpowers/sdd/2026-08-15-m-settings-wired/task-6-report.md`; confirm alert/threshold/quiet/morning still tagged, loc/precision/scale untagged, widget gone. Final message: status, SHA, one-line test summary, concerns.
Note: git/npm "Operation not permitted" → retry sandbox disabled.
