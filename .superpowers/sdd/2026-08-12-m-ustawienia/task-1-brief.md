# Task 1 — Core settings model

This is your requirements, with the exact values to use verbatim. Implement in the worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints (bind every task)
- TypeScript strict; `any` forbidden without an inline justification comment.
- Files ≤ 200 lines, functions ≤ 40 lines.
- Behavior tests, names cite AC IDs: `test('AC-1: …')`.
- Layering: `src/core` is PURE — zero React/React-Native imports.
- No new dependency.
- Exact glyphs — copy, never retype: `Przybliżona`, `Dokładna`, `µg/m³` (µ = U+00B5 MICRO SIGN, ³ = U+00B3). These come from the spec/plan text below; do not substitute lookalikes.
- Default settings literal (verbatim): `{ loc: true, alert: true, morning: false, precision: 'Przybliżona', scale: 'CAQI', threshold: 100 }`.

## Files
- Create: `src/core/settings/index.ts`
- Test: `src/core/settings/__tests__/settings.test.ts`

## Produces (later tasks import these — keep names exact)
`Settings`, `Precision`, `Scale`, `DEFAULT_SETTINGS`, `THRESHOLD_MIN`, `THRESHOLD_MAX`, `clampThreshold`, `thresholdFromRatio`, `ratioFromThreshold`, `mergeSettings`, `SettingsStore`.

## TDD steps

### Step 1: Write the failing tests (`src/core/settings/__tests__/settings.test.ts`)

```ts
import {
  DEFAULT_SETTINGS,
  clampThreshold,
  thresholdFromRatio,
  ratioFromThreshold,
  mergeSettings,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
} from '..';

test('AC-1: DEFAULT_SETTINGS pins the design default state (literal fixture)', () => {
  expect(DEFAULT_SETTINGS).toEqual({
    loc: true,
    alert: true,
    morning: false,
    precision: 'Przybliżona',
    scale: 'CAQI',
    threshold: 100,
  });
});

test('AC-2: clampThreshold rounds and clamps, NaN→default, ±Infinity clamp', () => {
  expect(clampThreshold(10)).toBe(25);
  expect(clampThreshold(500)).toBe(200);
  expect(clampThreshold(100)).toBe(100);
  expect(clampThreshold(37.6)).toBe(38);
  expect(clampThreshold(25)).toBe(25);
  expect(clampThreshold(200)).toBe(200);
  expect(clampThreshold(NaN)).toBe(100);
  expect(clampThreshold(Infinity)).toBe(200);
  expect(clampThreshold(-Infinity)).toBe(25);
});

test('AC-3: slider math is pure, clamped, rounded, round-trips', () => {
  expect(thresholdFromRatio(0)).toBe(25);
  expect(thresholdFromRatio(1)).toBe(200);
  expect(thresholdFromRatio(0.5)).toBe(113);
  expect(thresholdFromRatio(-0.2)).toBe(25);
  expect(thresholdFromRatio(1.5)).toBe(200);
  expect(ratioFromThreshold(25)).toBe(0);
  expect(ratioFromThreshold(200)).toBe(1);
  for (let t = THRESHOLD_MIN; t <= THRESHOLD_MAX; t++) {
    expect(thresholdFromRatio(ratioFromThreshold(t))).toBe(t);
  }
});

test('AC-4: mergeSettings fills defaults, validates types/enums, clamps, drops unknowns', () => {
  expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings({ alert: false }).alert).toBe(false);
  expect(mergeSettings({ alert: false }).loc).toBe(true);
  expect(mergeSettings({ alert: 'yes' }).alert).toBe(true);
  expect(mergeSettings({ scale: 'ZZZ' }).scale).toBe('CAQI');
  expect(mergeSettings({ threshold: 5000 }).threshold).toBe(200);
  expect((mergeSettings({ nope: 1 }) as Record<string, unknown>).nope).toBeUndefined();
  expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings(42)).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings('x')).toEqual(DEFAULT_SETTINGS);
});
```

### Step 2: Run to verify they fail
`npx jest src/core/settings` → FAIL (module not found).

### Step 3: Implement (`src/core/settings/index.ts`)

```ts
export type Precision = 'Przybliżona' | 'Dokładna';
export type Scale = 'CAQI' | 'US AQI' | 'µg/m³';

export interface Settings {
  loc: boolean;
  alert: boolean;
  morning: boolean;
  precision: Precision;
  scale: Scale;
  threshold: number;
}

export const THRESHOLD_MIN = 25;
export const THRESHOLD_MAX = 200;

export const DEFAULT_SETTINGS: Settings = {
  loc: true,
  alert: true,
  morning: false,
  precision: 'Przybliżona',
  scale: 'CAQI',
  threshold: 100,
};

const PRECISIONS: readonly Precision[] = ['Przybliżona', 'Dokładna'];
const SCALES: readonly Scale[] = ['CAQI', 'US AQI', 'µg/m³'];

// Round to an int and clamp into [25,200]. NaN → default; ±Infinity clamp.
export function clampThreshold(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_SETTINGS.threshold;
  const rounded = Math.round(n);
  return Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, rounded));
}

const SPAN = THRESHOLD_MAX - THRESHOLD_MIN;

// ratio (knob position [0,1]) → clamped, rounded integer threshold.
export function thresholdFromRatio(ratio: number): number {
  return clampThreshold(THRESHOLD_MIN + ratio * SPAN);
}

// inverse → clamped [0,1].
export function ratioFromThreshold(threshold: number): number {
  return (clampThreshold(threshold) - THRESHOLD_MIN) / SPAN;
}

// Persistence seam — a fake in tests, an AsyncStorage adapter in the app.
export interface SettingsStore {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

// Hydrate arbitrary stored JSON into a valid Settings: fill missing keys from
// DEFAULT, replace wrong-typed / invalid-enum values, clamp threshold, drop
// unknown keys. Any non-object → DEFAULT.
export function mergeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    loc: bool(r.loc, DEFAULT_SETTINGS.loc),
    alert: bool(r.alert, DEFAULT_SETTINGS.alert),
    morning: bool(r.morning, DEFAULT_SETTINGS.morning),
    precision: PRECISIONS.includes(r.precision as Precision)
      ? (r.precision as Precision)
      : DEFAULT_SETTINGS.precision,
    scale: SCALES.includes(r.scale as Scale)
      ? (r.scale as Scale)
      : DEFAULT_SETTINGS.scale,
    threshold:
      typeof r.threshold === 'number'
        ? clampThreshold(r.threshold)
        : DEFAULT_SETTINGS.threshold,
  };
}
```

### Step 4: Verify pass + gate
`npx jest src/core/settings` → all PASS. Then `npm run typecheck` (0 errors). `src/core` has a 100% coverage gate — this file must be fully covered (the tests above do so).

### Step 5: Commit
`git add src/core/settings && git commit -m "feat(core): settings model — defaults, clamp, slider math, merge (AC-1..4)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-1-report.md` BEFORE your final message: what you did, the commit SHA, test results (suite/count), typecheck result, and any concerns/deviations. In your final message return only: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), commit SHA, one-line test summary, concerns.
