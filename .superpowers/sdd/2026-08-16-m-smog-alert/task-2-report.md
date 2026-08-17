# Task 2 report — Notifier.notifySmog + @notifee adapter (AC-3)

## Files changed

- `src/core/notifications/index.ts` — added `notifySmog(index: number): Promise<void>;` to the `Notifier` interface.
- `jest.setup.js` — added `displayNotification: jest.fn(async () => undefined)` to the `@notifee/react-native` default-export mock, alongside `createChannel`/`createTriggerNotification`/`cancelTriggerNotification`.
- `src/data/notifications/index.ts` — implemented `notifySmog(index)` in `createNotifeeNotifier`:
  - added `const SMOG_CHANNEL = 'powietrze-smog';` (distinct from `MORNING_CHANNEL`).
  - `await notifee.createChannel({ id: SMOG_CHANNEL, name: 'Alert smogowy', importance: AndroidImportance.DEFAULT })` FIRST (mirrors the `scheduleMorning` channel-before-schedule pattern), then `await notifee.displayNotification({ title: 'Alert smogowy', body: 'Ogranicz długie i intensywne aktywności na zewnątrz.', android: { channelId: SMOG_CHANNEL } })`.
  - Body is the approved design copy verbatim (design/README.md:74) — not invented.
  - `index` param is prefixed `_index` (unused for now; commented as available for future richer copy). Confirmed this does not trigger `@typescript-eslint/no-unused-vars` (`npx eslint` clean on the file).
- `src/data/notifications/__tests__/notifier.test.ts` — extended with a new test (TDD, written before the implementation, verified failing, then implementation added and re-run green):
  - `AC-3: notifySmog creates the smog channel then displays the approved copy` — asserts `notifee.createChannel` called once with `{ id: 'powietrze-smog' }`, `notifee.displayNotification` called once with `body === 'Ogranicz długie i intensywne aktywności na zewnątrz.'` and `android.channelId === 'powietrze-smog'`, and that `createTriggerNotification`/`cancelTriggerNotification` are NOT touched by `notifySmog` (other Notifier methods unchanged).

## Notifier doubles updated (S1 guard)

Grepped `grep -rln "Notifier" --include="*.ts*" src` → exactly these files reference `Notifier`:
- `src/core/notifications/index.ts` (interface — modified, source of truth)
- `src/data/notifications/index.ts` (adapter — modified, implements it)
- `src/data/notifications/__tests__/notifier.test.ts` (adapter tests — extended)
- `src/shared/notifications/index.tsx` (consumer, unmodified — only calls existing methods)
- `src/shared/notifications/__tests__/NotificationsProvider.test.tsx` — the hand-rolled `fakeNotifier`, the ONLY other `Notifier`-typed double in the suite. Added `notifySmog: jest.fn()` to its returned object so it still satisfies the `Notifier` interface. No other Notifier fake exists.

## TDD evidence

1. Wrote the new `notifySmog` test in `notifier.test.ts` against the interface/mock changes only (before touching `src/data/notifications/index.ts`'s implementation) — confirmed it failed (`notifySmog is not a function` / `notifee.displayNotification` mock missing) by running `npx jest src/data/notifications` prior to implementing.
2. Implemented `notifySmog` in the adapter.
3. Re-ran — green.

## Gate results

- `npm run typecheck` → **PASS**, zero errors. All `Notifier` doubles (interface, adapter, `fakeNotifier`) are type-complete; no reds.
- `npm run lint` → **PASS**, 0 errors, 4 pre-existing warnings unrelated to this change (App.tsx inline style, gios/mappers.ts eslint-comments, HistoryChart.tsx inline style, Toggle.tsx inline style).
- `npm test -- --coverage` → **PASS**: `Test Suites: 60 passed, 60 total`, `Tests: 234 passed, 234 total`. No coverage-threshold failure. `src/core/*` all at 100% statements/branches/functions/lines, including `src/core/notifications` at 100%.
  - Note: the sandboxed shell initially failed to *write* the coverage report file (`EPERM` on `coverage/coverage-final.json`) — this is a sandbox filesystem-write restriction on the `coverage/` output dir, not a test failure; all 234 tests still ran and passed even in that run. Re-ran with the sandbox override to get the coverage summary table; identical pass counts, no threshold failures, `coverage/` is gitignored so nothing new is staged from it.

## Deviations from the plan

None. Implementation matches spec 019 §Design "Notifier seam" / "Data — @notifee adapter" and plan Task 2 Step 3 exactly: channel-before-display order, distinct `powietrze-smog` channel id, approved body copy verbatim, `index` reserved for future use per the plan's inline comment guidance.

## Commit

`feat(notifications): Notifier.notifySmog via @notifee displayNotification (AC-3)`
