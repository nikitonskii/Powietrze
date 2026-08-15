# Task 1 Review — Core Display Math (US-AQI + display/format/scaleLabel)

## Verdict Summary
SPEC: ✅
QUALITY: APPROVE

## Detailed Review

### AC-1: usAqiFromPm25 — Literal Fixture + Full Band Coverage
**Status: PASS**

- **Table verification**: US_AQI_BANDS matches spec 014 exactly (all 7 bands, discontinuous boundaries at 0.1 µg/m³ gaps).
- **Gap truncation**: `Math.floor(pm25 * 10) / 10` correctly truncates to 0.1 µg/m³ per EPA convention.
- **Non-finite handling**: `!Number.isFinite(pm25) || pm25 <= 0` returns 0 ✓
- **Clamping**: Values ≥500.4 return 500 ✓
- **Interpolation algorithm**: Correct piecewise-linear formula with `Math.round`.

**Spot-check arithmetic (3 bands)**:
- Band 1 (0–12): 12.05→truncate 12.0→(50-0)/(12-0)×(12-0)+0=50 ✓
- Band 4 (55.5–150.4): 100→(200-151)/(150.4-55.5)×(100-55.5)+151≈174 ✓
- Band 7 (350.5–500.4): 400→(500-401)/(500.4-350.5)×(400-350.5)+401≈434 ✓

**All 7 bands exercised**:
- Band 1: [0], [9], [12], [12.05], [-1] ✓
- Band 2: [12.1], [35.4] ✓
- Band 3: [45], [55.4] ✓
- Band 4: [100], [150.4] ✓
- Band 5: [150.5], [250.4] ✓
- Band 6: [300], [350.4] ✓
- Band 7: [400], [500.4], [600] ✓
- Edge: [NaN] ✓

**Literal fixture**: Test pins the complete EPA table; not derived or circular. ✓

### AC-2: formatConcentration
**Status: PASS**

- Non-finite → `'—'` (U+2014 em-dash) ✓
- `'Dokładna'` → `toFixed(1)` (13.0 for 13, 13.1 for 13.1) ✓
- `'Przybliżona'` → `Math.round` (13.1→13, 12.5→13) ✓

### AC-3: displayValue
**Status: PASS**

- `'US AQI'` → `String(usAqiFromPm25(pm25))` ✓
- `'µg/m³'` → `formatConcentration(pm25, precision)` ✓
- `'CAQI'` (default) → `String(index)` ✓

### AC-4b: scaleLabel
**Status: PASS**

- `'CAQI'` → `''` (empty) ✓
- `'US AQI'` → `'US AQI'` ✓
- `'µg/m³'` → `'µg/m³'` ✓

### Constraints Verification

| Constraint | Status | Evidence |
|---|---|---|
| Core PURE (no React) | ✅ | No React imports; only TS/JS stdlib |
| Type imports type-only | ✅ | `import type { Scale, Precision } from '../settings'` — no cycle |
| No `any` | ✅ | Strict typed; no any in diff |
| Files ≤200 lines | ✅ | index.ts now 76 lines total |
| Functions ≤40 lines | ✅ | usAqiFromPm25 (6), formatConcentration (3), displayValue (4), scaleLabel (2) |
| Test names cite ACs | ✅ | All 4 tests named AC-1, AC-2, AC-3, AC-4b |
| Glyphs exact | ✅ | µ=U+00B5, —=U+2014, Przybliżona/Dokładna Polish transcribed |
| 100% core coverage | ✅ | All 7 bands exercised; full-suite gate passed (171 tests) |

### Code Quality
- **Readability**: Comment blocks explain EPA discontinuity and truncation strategy.
- **Correctness**: Matches spec 014 public API exactly.
- **No dead code**: Every function is exported and tested.
- **Test coverage**: 31 assertions across 4 focused test cases.

## Findings
None. Implementation is clean and comprehensive.

---

**Verdict**: Task 1 is ready to merge. All ACs satisfied, all gates green, no quality issues.
