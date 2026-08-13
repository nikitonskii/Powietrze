# Review 8 — UstawieniaScreen (compose + wire)

SPEC: ✅
QUALITY: CHANGES

## Verified clean

- **AC-17**: Header `Ustawienia` (32/600/`colors.text.primary`) + four group
  labels in exact order LOKALIZACJA, POWIADOMIENIA, WIDŻET I WYGLĄD, DANE —
  matches brief and test.
- **AC-18**: Every row's Polish copy present verbatim; byte-checked the two
  risky glyphs directly in `UstawieniaScreen.tsx`: `22:00 – 07:00` uses
  `E2 80 93` (U+2013 EN DASH) and `µg/m³` uses `C2 B5` (U+00B5 MICRO SIGN,
  matching `src/core/settings`'s `Scale` literal type) — not corrupted
  ASCII-hyphen/µ lookalikes. `Automatyczna` row (`widget`) has no `›`
  chevron — just `value="Automatyczna"`. Footer two lines,
  `colors.text.footer`, 11.5px, centered.
- **AC-19/20**: `toggle-alert` → `set('alert', v)`; `seg-precision-Dokładna`
  → `set('precision', v)`. Both read `Settings` keys that exist verbatim in
  `src/core/settings/index.ts` (no typo'd keys); `set<K>` signature in
  `src/shared/settings/index.tsx` confirms `set(key, value)` persists via
  `store.save(next)` on every change.
- **AC-21**: `wkrotce-<key>` present (via `soon` prop) for loc, precision,
  alert, threshold, quiet, morning, widget, scale; absent for source/refresh
  (no `soon` prop passed on those two `SettingRow`s) — exactly matches the
  brief's Wkrótce column.
- **AC-22**: `Toggle`'s track style sets `justifyContent: value ? 'flex-end'
  : 'flex-start'`, and `value={settings.alert}` is read live from context —
  confirms the flatten-style assertion in the test is meaningful, not
  incidental.
- **Row spec table**: all 10 rows checked one-by-one against
  `UstawieniaScreen.tsx` — shape (horizontal/stacked), control, wired
  `set()` key, and Wkrótce flag all match the brief's table exactly.
- **testID conventions**: `setting-<key>` (View testID in both `SettingRow`
  and the local `StackedRow`), `toggle-<key>`, `seg-<key>` +
  `seg-<key>-<option>` (confirmed in `src/shared/ui/SegmentedControl.tsx:22`
  — `testID ? \`${testID}-${opt}\` : undefined`), `slider-threshold`. All
  correct.
- **No hex/rgba in `src/features/**`**: grepped both new files — only
  `colors.*` token references; the `rgba(...)` literals live in
  `src/shared/tokens/index.ts` (lint-exempt location) which defines
  `colors.text.footer` etc.
- **Layering**: `UstawieniaScreen.tsx`/`SettingRow.tsx` import only from
  `shared/ui/*`, `shared/tokens`, `shared/settings`, and each other
  (feature-internal) — no `data`, no cross-feature imports.
- **File sizes**: `wc -l` confirms 165 (`UstawieniaScreen.tsx`), 51
  (`SettingRow.tsx`), 117 (test), 128 (`AppNavigator.test.tsx`) — all ≤200,
  matches the report.
- **No new dependency**: diff stat touches only the 4 listed files;
  `package.json` untouched.
- **App.tsx untouched**: confirmed via diff stat — no `App.tsx` entry. Real
  `SettingsProvider` wiring correctly deferred to Task 9.

## Findings

### Important — `UstawieniaScreen()` function body far exceeds the ≤40-line budget
`src/features/ustawienia/UstawieniaScreen.tsx:38-144` — the component
function is ~107 lines (return statement alone is ~104 lines), well past
the CLAUDE.md/brief "functions ≤40 lines" constraint. This isn't lint-
enforced (no `max-lines-per-function` rule in `.eslintrc.js`), which is
presumably how it slipped through, but it's a real, repeatedly-checked
project convention: reviews 1, 2, 4, 5, 6, 7 in this same milestone all
explicitly counted and confirmed function-line compliance (e.g.
review-5-verdict.md: "file is 68 lines... well under 40"). The report's
"Deviations" section doesn't mention this at all, only the
`AppNavigator.test.tsx` fix.
- Concrete fix: extract each `SettingsGroup` block into its own small
  component (e.g. `LokalizacjaGroup`, `PowiadomieniaGroup`,
  `WidgetGroup`/`WygladGroup`, `DaneGroup`), each taking `settings`/`set` as
  props, mirroring the `SettingRow`/`StackedRow` extraction already done.
  That would bring the top-level `UstawieniaScreen()` body down to ~15-20
  lines (four group components + header + footer) and each group component
  to well under 40.
- Not spec-blocking (all AC-17..22 assertions pass and are correct), but it
  is a real deviation from an explicit, previously-enforced project rule
  and should be fixed before merge for consistency with the rest of the
  milestone's review discipline.

### Minor — style duplication between `SettingRow.tsx` and the local `StackedRow`
`src/features/ustawienia/SettingRow.tsx:87-95` (`titleLine`/`title`/`soon`
styles) and `src/features/ustawienia/UstawieniaScreen.tsx:151-158` (same
three style keys, same literal values) are duplicated verbatim across two
files. Functionally harmless and the brief explicitly permitted inlining
`StackedRow` to stay under 200 lines/file, so this is a minor,
non-blocking nit — worth a one-line comment or shared style constant if
touched again, not worth a required fix now.

No real bugs found: no wrong `set` key, no control reading the wrong
settings field, no missing testID, no row in the wrong group, no static
value standing in for a control that should be wired.

## AppNavigator.test.tsx change — ruling

**This is a legitimate test-harness fix, not a weakening of AC-10.** The
diff only adds a `GestureHandlerRootView` wrapper and a
`SettingsProvider store={settingsStore}` (a fake in-memory store mirroring
the pre-existing `emptyStore` pattern for `FavoritesProvider`) around
`renderNav()`'s tree — required because `AppNavigator` now mounts the real
`UstawieniaScreen`, whose `precision`/`scale` `SegmentedControl`s and
`threshold` `ThresholdSlider` need `useSettings()` context, and
`ThresholdSlider`'s `GestureDetector` needs a `GestureHandlerRootView`
ancestor to not throw. The `AC-10` test body itself
(`src/app/__tests__/AppNavigator.test.tsx:66-74`) is byte-identical to
before: same tab presses, same `findByTestId('screen-miejsca')` /
`findByTestId('screen-ustawienia')` assertions, same
`queryByText('TWOJA LOKALIZACJA')` negative check — no assertion was
loosened, removed, or given a wider tolerance. `App.tsx` itself was not
touched in this diff (confirmed via `git diff --stat`), so the real app
still lacks a `SettingsProvider` and correctly remains Task 9's scope.

verdict written
