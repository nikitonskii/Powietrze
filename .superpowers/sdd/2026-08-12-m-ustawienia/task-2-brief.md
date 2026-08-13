# Task 2 — AsyncStorage settings store

This is your requirements, with the exact code to use verbatim. Work in the worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints (bind every task)
- TypeScript strict; `any` forbidden without an inline justification comment.
- Files ≤ 200 lines, functions ≤ 40 lines. Test names cite AC IDs.
- Layering: `src/data` may import `src/core`, never React features. No new dependency.
- AsyncStorage key (verbatim): `powietrze.settings.v1`.

## Consumes (already implemented in Task 1, committed)
From `src/core/settings`: `SettingsStore`, `Settings`, `DEFAULT_SETTINGS`, `mergeSettings`.

## Produces
`createAsyncStorageSettingsStore(): SettingsStore` — consumed later by App.tsx (Task 9).

## Files
- Create: `src/data/settings/index.ts`
- Test: `src/data/settings/__tests__/store.test.ts`

## Context
The AsyncStorage jest mock is hand-rolled in `jest.setup.js` (in-memory Map with getItem/setItem/removeItem/clear). The favorites adapter `src/data/favorites/index.ts` is the pattern to mirror exactly (try/catch load → default, swallow save errors with `__DEV__` warn).

## TDD steps

### Step 1: Write the failing tests (`src/data/settings/__tests__/store.test.ts`)

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStorageSettingsStore } from '..';
import { DEFAULT_SETTINGS, type Settings } from '../../../core/settings';

const KEY = 'powietrze.settings.v1';
beforeEach(() => AsyncStorage.clear());

const custom: Settings = {
  loc: false,
  alert: false,
  morning: true,
  precision: 'Dokładna',
  scale: 'µg/m³',
  threshold: 150,
};

test('AC-5: save then load round-trips exactly', async () => {
  const store = createAsyncStorageSettingsStore();
  await store.save(custom);
  expect(await store.load()).toEqual(custom);
});

test('AC-6: load with nothing stored → DEFAULT_SETTINGS', async () => {
  expect(await createAsyncStorageSettingsStore().load()).toEqual(DEFAULT_SETTINGS);
});

test('AC-7: load with corrupt JSON → DEFAULT_SETTINGS, no throw', async () => {
  await AsyncStorage.setItem(KEY, 'not json');
  expect(await createAsyncStorageSettingsStore().load()).toEqual(DEFAULT_SETTINGS);
});

test('AC-8: load with a partial/old shape → merged with defaults', async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify({ alert: false }));
  const loaded = await createAsyncStorageSettingsStore().load();
  expect(loaded).toEqual({ ...DEFAULT_SETTINGS, alert: false });
});

test('AC-9: save swallows a setItem rejection (never throws)', async () => {
  const spy = jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('disk full'));
  await expect(
    createAsyncStorageSettingsStore().save(custom),
  ).resolves.toBeUndefined();
  spy.mockRestore();
});
```

### Step 2: Run to verify fail
`npx jest src/data/settings` → FAIL (module not found).

### Step 3: Implement (`src/data/settings/index.ts`)

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type SettingsStore,
} from '../../core/settings';

const KEY = 'powietrze.settings.v1';

// Persists settings as one JSON blob. Never throws: missing/corrupt loads as
// DEFAULT_SETTINGS (via mergeSettings); a failed save is swallowed (dev-logged).
export function createAsyncStorageSettingsStore(): SettingsStore {
  return {
    async load() {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return mergeSettings(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },
    async save(settings) {
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(settings));
      } catch (e) {
        if (__DEV__) console.warn('[settings] save failed:', e);
      }
    },
  };
}
```

### Step 4: Verify pass + gate
`npx jest src/data/settings` → all PASS. `npm run typecheck` → 0 errors. `npm run lint` → 0 errors.

### Step 5: Commit
`git add src/data/settings && git commit -m "feat(data): AsyncStorage settings store (AC-5..9)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-2-report.md` BEFORE your final message. Final message: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry that command with the sandbox disabled.
