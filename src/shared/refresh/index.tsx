import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const SAFETY_MS = 8000;

type RefreshApi = {
  refresh: () => void;
  refreshing: boolean;
  settleActive: () => void;
};
const SignalCtx = createContext<number>(0);
const ApiCtx = createContext<RefreshApi>({
  refresh: () => {},
  refreshing: false,
  settleActive: () => {},
});

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [signal, setSignal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    refreshingRef.current = false;
    setRefreshing(false);
  }, []);

  const refresh = useCallback(() => {
    if (refreshingRef.current) return; // debounce while refreshing
    refreshingRef.current = true;
    setRefreshing(true);
    setSignal(s => s + 1);
    timer.current = setTimeout(clear, SAFETY_MS); // safety: never stick
  }, [clear]);

  const settleActive = useCallback(() => {
    if (refreshingRef.current) clear();
  }, [clear]);

  // Cancel a pending safety timeout if the provider ever unmounts.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo<RefreshApi>(
    () => ({ refresh, refreshing, settleActive }),
    [refresh, refreshing, settleActive],
  );
  return (
    <SignalCtx.Provider value={signal}>
      <ApiCtx.Provider value={api}>{children}</ApiCtx.Provider>
    </SignalCtx.Provider>
  );
}

export function useRefreshSignal(): number {
  return useContext(SignalCtx);
}
export function useRefresh(): RefreshApi {
  return useContext(ApiCtx);
}
