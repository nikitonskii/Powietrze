# Task 1 — Core history math (`core/air/history.ts`)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-teraz-detail`.

## Global Constraints
- `src/core` is PURE (zero React). TS strict; no `any` without inline justification. Files ≤200, functions ≤40. Test names cite AC IDs. `src/core` 100% coverage gate.

## Produces (Tasks 3/5/6 import these)
`HourPoint`, `ReadingDetail`, `buildHistory`, `historyBarOpacity`, `barHeightPct`.

## Files
- Create: `src/core/air/history.ts`
- Modify: `src/core/air/index.ts` (re-export)
- Test: `src/core/air/__tests__/history.test.ts`

## Step 1: Write the failing tests (`src/core/air/__tests__/history.test.ts`)
```ts
import { buildHistory, historyBarOpacity, barHeightPct } from '../history';
import { indexFromPm25 } from '..';

test('AC-1: buildHistory drops nulls, keeps negatives, caps 24, oldest→newest', () => {
  const pts = Array.from({ length: 30 }, (_, i) => ({
    at: `2026-08-11 ${String(i % 24).padStart(2, '0')}:00:00`,
    value: i,
  }));
  const h = buildHistory(pts);
  expect(h).toHaveLength(24);
  expect(h[0].at <= h[h.length - 1].at).toBe(true);
  expect(buildHistory([{ at: 'a', value: null }, { at: 'b', value: 5 }])).toEqual([
    { at: 'b', pm25: 5, index: indexFromPm25(5) },
  ]);
  expect(buildHistory([{ at: 'x', value: -3 }])).toEqual([
    { at: 'x', pm25: -3, index: indexFromPm25(-3) },
  ]);
  expect(buildHistory([{ at: 'x', value: null }])).toEqual([]);
  expect(
    buildHistory(
      [{ at: 'a', value: 1 }, { at: 'b', value: 2 }, { at: 'c', value: 3 }],
      2,
    ).map(p => p.pm25),
  ).toEqual([2, 3]);
});

test('AC-2: historyBarOpacity ramps 0.55→1.0, count<=1 → 1.0', () => {
  expect(historyBarOpacity(0, 24)).toBe(0.55);
  expect(historyBarOpacity(23, 24)).toBe(1);
  expect(historyBarOpacity(0, 1)).toBe(1);
  expect(historyBarOpacity(1, 3)).toBeCloseTo(0.55 + 0.45 * 0.5, 10);
});

test('AC-3: barHeightPct clamps index/2 to [10,100]', () => {
  expect(barHeightPct(0)).toBe(10);
  expect(barHeightPct(20)).toBe(10);
  expect(barHeightPct(40)).toBe(20);
  expect(barHeightPct(200)).toBe(100);
  expect(barHeightPct(300)).toBe(100);
});
```

## Step 2: Run to verify fail
`npx jest src/core/air` → FAIL.

## Step 3: Implement (`src/core/air/history.ts`)
```ts
import { indexFromPm25 } from './index';

export interface HourPoint { at: string; pm25: number; index: number }
export interface ReadingDetail { history: HourPoint[]; pm10?: number; no2?: number }

// Raw hourly points → chart series: drop nulls (negatives kept — rare GIOŚ
// artifacts, clamped harmlessly downstream), sort by `at` newest-first, take
// `count`, return oldest→newest, each with its derived index.
export function buildHistory(
  points: { at: string; value: number | null }[],
  count = 24,
): HourPoint[] {
  return points
    .filter((p): p is { at: string; value: number } => p.value !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, count)
    .reverse()
    .map(p => ({ at: p.at, pm25: p.value, index: indexFromPm25(p.value) }));
}

// Bar opacity ramps 0.55 (oldest) → 1.0 (now). count <= 1 → 1.0 (no 0/0 NaN).
export function historyBarOpacity(i: number, count: number): number {
  if (count <= 1) return 1;
  return 0.55 + 0.45 * (i / (count - 1));
}

// Bar height as % of the track: clamp(index/2, 10, 100) (design bar formula).
export function barHeightPct(index: number): number {
  return Math.min(100, Math.max(10, index / 2));
}
```
Then add to `src/core/air/index.ts`: `export * from './history';`.
IMPORTANT — circular import: `history.ts` imports `indexFromPm25` from `./index`, and `index.ts` re-exports `history`. If `tsc`/jest complains or `indexFromPm25` is `undefined` at runtime, import it from the specific module that DEFINES it instead of the barrel (read `src/core/air/index.ts` to find where `indexFromPm25` is defined — likely inline in index.ts; if so, the `export * from './history'` line must come AFTER the `indexFromPm25` definition, and the runtime circular ref resolves because `indexFromPm25` is only called at call-time, not import-time — verify tests pass).

## Step 4: Verify pass + gate
`npx jest src/core/air` PASS. `npm run typecheck` 0. Confirm `src/core` coverage 100% (all buildHistory branches covered: null-drop, negative-keep, cap, all-null, reorder).

## Step 5: Commit
`git add src/core/air && git commit -m "feat(core): history math — buildHistory/opacity/height (AC-1..3, spec 012)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-teraz-detail/task-1-report.md` BEFORE your final message. Note any circular-import handling. Final message: status, commit SHA, one-line test summary, concerns.

Note: if a git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
