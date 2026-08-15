# Task 1 Report: core/notifications (MORNING_TIME, nextMorningTimestamp, Notifier)

## Status: COMPLETE

### Commit
- SHA: `ebe0421`
- Message: `feat(core): notifications timing + Notifier seam (AC-1,2, spec 015)`

### Implementation Summary
Created pure core notifications seam with:
1. **MORNING_TIME constant**: `'07:30'` (AC-1)
2. **nextMorningTimestamp function**: Calculates epoch-ms of next HH:MM occurrence in local wall-clock time, today if before time, else tomorrow (AC-2)
3. **Notifier interface**: Seam for features/settings to call; @notifee adapter will implement, not imported in core

### Tests
- AC-1: MORNING_TIME is 07:30 ✓
- AC-2: nextMorningTimestamp with multiple cases (before time today, after time today → tomorrow, exactly at time → tomorrow) ✓

### Gates
- `npx jest src/core/notifications`: 2 passed, 0 failed
- `npm run typecheck`: 0 errors
- Full test suite: 183 passed, no coverage threshold violations
- Core notifications module: 100% coverage (statements, branches, functions, lines)

### Files Created
- `src/core/notifications/index.ts` (21 lines)
- `src/core/notifications/__tests__/notifications.test.ts` (18 lines)

### Architecture Notes
- Pure TS implementation, no React or @notifee imports
- Time calculation uses injected `now` Date for testability
- Notifier interface is a seam for the data layer adapter
- Function uses strict `<` comparison (not `<=`) for time check, so exactly 07:30 advances to next day
