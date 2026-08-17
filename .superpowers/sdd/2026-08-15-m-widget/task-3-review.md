# Task 3 review — Data adapter + App wiring (AC-4)

## Verdict: SPEC OK

- src/data/widget/index.ts:17-26 - createNativeWidgetSync() reads
  NativeModules.WidgetSync once, typed as NativeWidgetSyncModule | undefined.
  publish() guards `if (!mod) return;` before `JSON.stringify(snapshot)` is
  ever called - matches AC-4's "no throw, incl. the JSON stringify guarded".
  Module-present path calls `mod.writeSnapshot(JSON.stringify(snapshot))` then
  `mod.reloadTimelines()`, in that order.
- src/data/widget/__tests__/nativeSync.test.ts:23-33 - both AC-4 branches are
  tested: absent -> publish doesn't throw; present -> fakes assert
  writeSnapshot called with JSON.stringify(SNAP) then reloadTimelines
  called. afterEach deletes nativeModules.WidgetSync so state doesn't leak
  between the two tests; verified green (`npx jest src/data/widget` -> 2/2 pass).
- App.tsx:58-64 (read directly, matches diff) - WidgetSyncProvider is
  mounted as a child of ActivePlaceProvider (line 58) and, since
  ActivePlaceProvider itself nests inside SettingsProvider (line 56), also
  a descendant of SettingsProvider. Confirmed against src/shared/widget/index.tsx:21-22,
  which actually calls useActivePlace() and useSettings() - the placement
  requirement is real, not just asserted in the report. App.test.tsx still
  renders green with the new provider mounted.

## Verdict: QUALITY APPROVE

- No `any` anywhere in the diff. src/data/widget/index.ts:7-10 declares a
  real NativeWidgetSyncModule interface and casts NativeModules.WidgetSync
  to `NativeWidgetSyncModule | undefined` - a single justified narrowing, not
  a blanket any. The test file narrows NativeModules via
  `type NativeModulesRecord = Record<string, unknown>` (one cast site) instead
  of any at each call site - consistent with CLAUDE.md's "any is forbidden
  unless justified" and arguably cleaner than the plan's sketch.
- Import direction: src/data/widget/index.ts imports only NativeModules
  from react-native and types (WidgetSync, WidgetSnapshot) from
  ../../core/widget - data -> core, no shared/features imports. App.tsx is
  the composition root, so its imports from src/data/widget and
  src/shared/widget are the expected, allowed exception. `npm run lint`
  (which runs the boundaries/element-types layering rule) reports 0 errors.
- Size: src/data/widget/index.ts is 26 lines, one function
  (createNativeWidgetSync, ~9 lines of body) - well under the 200/40 limits.
  Single responsibility (adapts the native module to the WidgetSync seam).
- No-op guard genuinely prevents a crash: mod is undefined when
  NativeModules.WidgetSync is absent (verified - no native module exists yet,
  per the report's own "Native gate note"); the `if (!mod) return;` short-circuits
  before either native call, so publish() is a true no-op with no throw and no
  wasted JSON.stringify.
- Test isolation: afterEach resets nativeModules.WidgetSync; the first test
  also defensively deletes it in its own body (belt-and-suspenders, not
  order-dependent). Minor nit: the inline `delete nativeModules.WidgetSync;` at
  the top of the first test (nativeSync.test.ts:24) is redundant given the
  afterEach already guarantees a clean slate before every test - harmless
  duplication, not worth a fix cycle.
- `npm run typecheck` clean; `npm run lint` 0 errors / 4 pre-existing warnings
  in unrelated files (confirmed by re-running lint - none of the 4 touch
  src/data/widget or the App.tsx lines this diff changed).

## Findings

- Nit - src/data/widget/__tests__/nativeSync.test.ts:24 redundant
  `delete nativeModules.WidgetSync;` inside the first test body, already
  covered by the afterEach. Cosmetic only.
- No Critical or Important findings.

## Verdict summary
1. SPEC: OK (both AC-4 branches implemented + tested; App.tsx wiring correct)
2. QUALITY: APPROVE
