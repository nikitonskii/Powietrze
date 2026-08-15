# Review 3 verdict — Teraz: scale/precision drive the hero number + tiles

SPEC: ✅
QUALITY: APPROVE

## Findings

Clean. No Critical/Important/Minor findings.

## Detail

- **Hero.tsx**: big number renders `{value}` (was `{String(place.index)}`); color
  stays `scene.key` on the `<Text variant="index" color={scene.key} …>`; band
  stays `{scene.band}` in `scene.key`. `pm25Label` sub-line renders only when
  `pm25Label !== null` (`{pm25Label !== null ? <Text …>{pm25Label}</Text> : null}`).
  `scaleCaption` renders only when non-empty (`{scaleCaption ? … : null}`),
  placed right after `NumberGlow`/before the band per the brief. No hooks, no
  `useSettings` import — Hero stays pure. Matches spec AC-5/AC-5b exactly.
- **PollutantTiles.tsx**: `precision: Precision` (`../../core/settings`)
  threaded into `Tile`; `value === undefined ? '—' : formatConcentration(value, precision)`.
  Pure, no hooks. Matches AC-7.
- **TerazScreen.tsx**: reads `useSettings()`; `value = displayValue(reading.index,
  reading.pm25, settings.scale, settings.precision)`; `pm25Label` is `null` iff
  `scale === 'µg/m³'`, else the formatted PM2.5 sub-line; `scaleCaption =
  scaleLabel(settings.scale)`. All three passed to `Hero`; `precision`
  passed to `PollutantTiles`. Matches the brief's spec verbatim; verified
  against `docs/specs/014-settings-wired.md` AC-5/AC-5b/AC-7 text and the
  `displayValue`/`formatConcentration`/`scaleLabel`/`usAqiFromPm25`
  implementations in `src/core/air/index.ts` and `src/core/settings/index.ts`.
- **Tests**: `Hero.test.tsx` and `PollutantTiles.test.tsx` render the
  components directly with no provider — confirmed still pure. New AC-5b test
  in Hero covers the µg/m³-style render (concentration number, no PM2.5
  sub-line, caption shown). `TerazScreen.test.tsx` wraps every render in the
  real `SettingsProvider` + a fake store (mirrors spec-009 pattern); new
  `AC-5,5b` (µg/m³ → `'122.0'`, no PM2.5 line) and `AC-5,7` (US AQI →
  `String(usAqiFromPm25(122))`) tests pass real `fakeAirSource()` pm25=122
  through the real `displayValue`/`usAqiFromPm25`, both assert band stays
  `'Zły'` (i.e. `scene(reading.index).key`/`.band` unaffected by scale).
- **Quality**: no hex literals introduced (caption text uses
  `colors.text.dim` token); no `any`; `Hero.tsx` 81 lines, `TerazScreen.tsx`
  85 lines, `PollutantTiles.tsx` 72 lines — all ≤200, all functions ≤40 lines;
  layering intact (features → shared → core, no reverse/cross-feature
  imports); test names cite AC IDs.

## Regression

- Existing spec-002 Teraz tests (`'118'`, `'Zły'`, `'PM2.5 · 122 µg/m³'`,
  atmosphere, loading) are unchanged apart from adding the
  `<SettingsProvider store={settingsStore(s)}>` wrapper (default arg
  `DEFAULT_SETTINGS` → scale `'CAQI'`, precision `'Przybliżona'`); under
  those defaults `displayValue` returns `String(index)` and `pm25Label` is
  non-null, so all prior assertions hold unmodified. No regression risk.
- `AppNavigator.tsx` (production) does not itself wrap `SettingsProvider` —
  it's mounted once at the true app root in `App.tsx` (confirmed:
  `SettingsProvider` wraps `AppNavigator` there, spec-009 Task 9 wiring), so
  no production change was needed. The diff only adds a fake
  `SettingsProvider` wrapper to one previously-unwrapped test in
  `AppNavigator.test.tsx` (the "Teraz tab tint is the neutral accent while
  loading" case — the other tests in that file already had the wrapper) and
  to `TerazScreen.nearest.test.tsx`, both because `TerazScreen` now calls
  `useSettings()` and throws without a provider. This is an in-scope,
  correctly-targeted fix for fallout from the task, not scope creep.
- Full suite reported 51 suites / 177 tests green, lint 0 errors, typecheck
  clean; not re-run per instructions — the diff supports the claim (only
  additive `SettingsProvider` wrappers + new assertions, no weakened
  assertions found anywhere in the diff).

**Regression ruling: the spec-002 Teraz tests remain valid — only a
`SettingsProvider` wrapper was added under `DEFAULT_SETTINGS`, no assertion
was changed or weakened.**

verdict written
