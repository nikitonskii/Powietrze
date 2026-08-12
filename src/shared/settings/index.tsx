import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../core/settings';

export interface SettingsApi {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const Ctx = createContext<SettingsApi | null>(null);

// Loads settings from the injected store on mount; set persists on change.
export function SettingsProvider({
  store,
  children,
}: {
  store: SettingsStore;
  children: ReactNode;
}) {
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
