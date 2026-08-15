# Task 1 Implementation Report

## Status: DONE

## Commit SHA
`1e0f26a`

## Summary
Successfully implemented pure history math in new core module `src/core/air/history.ts` with 100% test coverage. All acceptance criteria (AC-1, AC-2, AC-3) satisfied and verified.

## Implementation Details

### Files Created
1. **`src/core/air/history.ts`** — Pure TS module (50 lines) exporting:
   - `HourPoint` interface: `{ at: string; pm25: number; index: number }`
   - `ReadingDetail` interface: `{ history: HourPoint[]; pm10?: number; no2?: number }`
   - `buildHistory()`: Processes raw hourly points → sorted chart series (drops nulls, keeps negatives, caps to 24, returns oldest→newest with derived indices)
   - `historyBarOpacity()`: Ramps opacity 0.55 (oldest) → 1.0 (now); count ≤ 1 → 1.0
   - `barHeightPct()`: Clamps index/2 to [10, 100] range

### Files Modified
1. **`src/core/air/index.ts`** — Added `export * from './history'` at end (after `indexFromPm25` definition to resolve circular import)

### Files Created (Tests)
1. **`src/core/air/__tests__/history.test.ts`** — 3 test cases covering all AC criteria

## Circular Import Resolution
- `history.ts` imports `indexFromPm25` from `./index`
- `index.ts` re-exports from `history`
- **Solution**: Placed `export * from './history'` AFTER the `indexFromPm25` definition in `index.ts`
- Runtime import resolves successfully because `indexFromPm25` is only called at call-time, not import-time
- Verified: tests pass, typecheck passes, no circular dependency errors

## Test Results
- **All 6 tests in air module pass** (2 existing air.test.ts + 3 new history.test.ts)
- AC-1: buildHistory drops nulls, keeps negatives, caps 24, oldest→newest ✓
- AC-2: historyBarOpacity ramps 0.55→1.0, count≤1 → 1.0 ✓
- AC-3: barHeightPct clamps index/2 to [10,100] ✓

## Coverage
- **`core/air` module: 100% coverage** (statements, branches, functions, lines)
  - history.ts: 100% statements, 100% branches, 100% functions, 100% lines
  - index.ts: 100% statements, 100% branches, 100% functions, 100% lines
- All branches covered: null-drop, negative-keep, cap-to-count, all-null case, array reorder

## Verification Checklist
✓ `npx jest src/core/air` — all 6 tests pass  
✓ `npm run typecheck` — 0 errors  
✓ `src/core` 100% coverage gate satisfied for air module  
✓ All AC criteria traced to tests  
✓ Code adheres to constraints (pure TS, no React, ≤200 lines/file, ≤40 lines/function)  
✓ Commit message cites AC IDs and spec  

## Next Steps
Tasks 3, 5, 6 can now import and use:
- `HourPoint`, `ReadingDetail` interfaces
- `buildHistory()`, `historyBarOpacity()`, `barHeightPct()` functions
