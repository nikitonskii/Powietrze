# Task 1 — Skyline model (core/atmosphere additions)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-design-fidelity`.

## Global Constraints
- `src/core` is PURE (zero React imports). TS strict; no `any` without inline justification. Files ≤200, functions ≤40. Test names cite AC IDs. No new dependency. `src/core` has a 100% coverage gate.

## Files
- Modify: `src/core/atmosphere/index.ts` (APPEND exports — do not disturb existing `atmosphere()`/`particleOffset()`/constants; read the file first)
- Create: `src/core/atmosphere/__tests__/skyline.test.ts`

## Produces (Task 2 imports these)
`SKYLINE_PATH`, `SKYLINE_VIEWBOX`, `SKYLINE_TOP_RATIO`, `skyline(density)`, `skylineColor(density)`.

## Step 1: Write the failing tests (`src/core/atmosphere/__tests__/skyline.test.ts`)

```ts
import {
  SKYLINE_PATH,
  SKYLINE_VIEWBOX,
  SKYLINE_TOP_RATIO,
  skyline,
  skylineColor,
} from '..';

const EXPECTED_PATH =
  'M0,150 L0,96 L14,96 L14,74 L26,74 L26,96 L40,96 L40,58 L52,52 L64,58 L64,96 L78,96 L78,40 L86,34 L94,40 L94,96 L108,96 L108,70 L120,70 L120,50 L132,50 L132,96 L146,96 L146,64 L158,64 L158,82 L170,82 L170,44 L182,38 L194,44 L194,96 L206,96 L206,60 L218,60 L218,78 L230,78 L230,52 L242,52 L242,30 L250,24 L258,30 L258,96 L272,96 L272,68 L284,68 L284,48 L296,48 L296,96 L310,96 L310,58 L322,52 L334,58 L334,80 L348,80 L348,66 L360,66 L360,88 L376,88 L376,72 L389,72 L389,150 Z';

test('AC-1: skyline path/viewBox/top-ratio pinned to the design (literal fixture)', () => {
  expect(SKYLINE_PATH).toBe(EXPECTED_PATH);
  expect(SKYLINE_VIEWBOX).toEqual({ width: 389, height: 150 });
  expect(SKYLINE_TOP_RATIO).toBe(0.44);
});

test('AC-2: skyline(density) → blur + opacity', () => {
  expect(skyline(1)).toEqual({ blur: 7, opacity: 0.55 });
  expect(skyline(0.5)).toEqual({ blur: 3.5, opacity: 0.775 });
  expect(skyline(0.03)).toEqual({ blur: 0.21, opacity: 0.9865 });
});

test('AC-3: skylineColor(density) → rgba, alpha 2dp trailing-zero-stripped', () => {
  expect(skylineColor(1)).toBe('rgba(3,5,9,0.4)');
  expect(skylineColor(0.5)).toBe('rgba(3,5,9,0.56)');
  expect(skylineColor(0.03)).toBe('rgba(3,5,9,0.71)');
});
```

## Step 2: Run to verify fail
`npx jest src/core/atmosphere` → FAIL (exports missing).

## Step 3: Implement — APPEND to `src/core/atmosphere/index.ts`

```ts
// The design's generic city silhouette (Powietrze.dc.html:34), reused verbatim.
export const SKYLINE_PATH =
  'M0,150 L0,96 L14,96 L14,74 L26,74 L26,96 L40,96 L40,58 L52,52 L64,58 L64,96 L78,96 L78,40 L86,34 L94,40 L94,96 L108,96 L108,70 L120,70 L120,50 L132,50 L132,96 L146,96 L146,64 L158,64 L158,82 L170,82 L170,44 L182,38 L194,44 L194,96 L206,96 L206,60 L218,60 L218,78 L230,78 L230,52 L242,52 L242,30 L250,24 L258,30 L258,96 L272,96 L272,68 L284,68 L284,48 L296,48 L296,96 L310,96 L310,58 L322,52 L334,58 L334,80 L348,80 L348,66 L360,66 L360,88 L376,88 L376,72 L389,72 L389,150 Z';
export const SKYLINE_VIEWBOX = { width: 389, height: 150 } as const;
export const SKYLINE_TOP_RATIO = 0.44;

// density (scene.density 0.03..1) → skyline haze. blur ports the CSS px radius
// 1:1 to the Skia Blur sigma (M3 shadowBlur precedent); opacity = 1 - density*0.45.
export function skyline(density: number): { blur: number; opacity: number } {
  return { blur: density * 7, opacity: 1 - density * 0.45 };
}

// Fill rgba(3,5,9, 0.72 - density*0.32); alpha rounded to 2dp, trailing zeros
// stripped, so the string is stable (raw concat would emit 0.3999…). Built here
// to keep the rgba out of the no-hex-linted UI layer.
export function skylineColor(density: number): string {
  const alpha = parseFloat((0.72 - density * 0.32).toFixed(2));
  return `rgba(3,5,9,${alpha})`;
}
```

## Step 4: Verify pass + gate
`npx jest src/core/atmosphere` PASS. `npm run typecheck` 0. Confirm `src/core` coverage still 100% (these functions are fully covered by the tests).

## Step 5: Commit
`git add src/core/atmosphere && git commit -m "feat(core): skyline path + density haze math (AC-1..3, spec 010)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-design-fidelity/task-1-report.md` BEFORE your final message. Final message: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
