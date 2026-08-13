# Task 7 — Settings context (SettingsProvider / useSettings)

Work in worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints
- TypeScript strict; `any` forbidden without inline justification.
- Files ≤ 200 lines, functions ≤ 40. Test names cite AC IDs.
- Layering: `src/shared` may import `src/core`. No new dependency.

## Consumes (already committed, Task 1)
`Settings`, `SettingsStore`, `DEFAULT_SETTINGS` from `src/core/settings`.

## Produces
- `SettingsProvider({ store, children })` and `useSettings(): SettingsApi` from `src/shared/settings/index.ts`.
- `SettingsApi = { settings: Settings; set: <K extends keyof Settings>(key: K, value: Settings[K]) => void }`.
Consumed by Tasks 8 (screen) and 9 (App.tsx).

## Files
- Create: `src/shared/settings/index.ts`
- Test: `src/shared/settings/__tests__/context.test.tsx`

## Design notes (mirror `src/shared/place/FavoritesContext.tsx` exactly)
- Load from the injected store on mount via `useEffect` (with an `on` guard against setState-after-unmount).
- `set` MUST use the FUNCTIONAL updater form: `setSettings(prev => { const next = {...prev, [key]: val}; store.save(next); return next; })`. This is what makes successive `set` calls compose (AC-12). Do NOT capture `settings` from closure.
- `useSettings` outside a provider throws `'useSettings: wrap the tree in <SettingsProvider>'`.

## Step 1: Write the failing tests (`src/shared/settings/__tests__/context.test.tsx`)
```tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from '..';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../../core/settings';

const fakeStore = (initial: Settings = DEFAULT_SETTINGS) => {
  const saved: Settings[] = [];
  const store: SettingsStore = {
    load: async () => initial,
    save: async s => {
      saved.push(s);
    },
  };
  return { store, saved };
};
const wrap = (store: SettingsStore) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <SettingsProvider store={store}>{children}</SettingsProvider>;
  };

test('AC-10: starts at DEFAULT_SETTINGS then hydrates from store', async () => {
  const { store } = fakeStore({ ...DEFAULT_SETTINGS, alert: false });
  const { result } = renderHook(() => useSettings(), { wrapper: wrap(store) });
  expect(result.current.settings).toEqual(DEFAULT_SETTINGS); // pre-hydration
  await waitFor(() => expect(result.current.settings.alert).toBe(false)); // hydrated
});

test('AC-11: set updates state and persists the full settings', async () => {
  const { store, saved } = fakeStore();
  const { result } = renderHook(() => useSettings(), { wrapper: wrap(store) });
  await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));
  act(() => result.current.set('alert', false));
  expect(result.current.settings.alert).toBe(false);
  await waitFor(() => expect(saved.at(-1)).toEqual({ ...DEFAULT_SETTINGS, alert: false }));
});

test('AC-12: successive set calls compose (functional updater)', async () => {
  const { store, saved } = fakeStore();
  const { result } = renderHook(() => useSettings(), { wrapper: wrap(store) });
  await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));
  act(() => {
    result.current.set('alert', false);
    result.current.set('morning', true);
  });
  expect(result.current.settings.alert).toBe(false);
  expect(result.current.settings.morning).toBe(true);
  await waitFor(() =>
    expect(saved.at(-1)).toEqual({ ...DEFAULT_SETTINGS, alert: false, morning: true }),
  );
});
```

## Step 2: Run to verify fail
`npx jest src/shared/settings` → FAIL.

## Step 3: Implement (`src/shared/settings/index.ts`)
```tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../core/settings';

export interface SettingsApi {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const Ctx = createContext<SettingsApi | null>(null);

export function SettingsProvider({ store, children }: { store: SettingsStore; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    let on = true;
    store.load().then(s => on && setSettings(s));
    return () => {
      on = false;
    };
  }, [store]);

  const value = useMemo<SettingsApi>(
    () => ({
      settings,
      set: (key, val) =>
        setSettings(prev => {
          const next = { ...prev, [key]: val };
          store.save(next);
          return next;
        }),
    }),
    [settings, store],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings: wrap the tree in <SettingsProvider>');
  return v;
}
```

## Step 4: Verify pass + gate
`npx jest src/shared/settings` → PASS (3/3). `npm run typecheck` → 0. `npm run lint` → 0.

## Step 5: Commit
`git add src/shared/settings && git commit -m "feat(shared): settings context, functional-updater persistence (AC-10..12)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-7-report.md` BEFORE your final message. Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
