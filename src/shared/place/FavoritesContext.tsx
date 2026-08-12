import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Station } from '../../core/geo';
import {
  addFavorite,
  moveItem,
  removeFavorite,
  type FavoritesStore,
} from '../../core/places';

type FavoritesValue = {
  favorites: Station[];
  add: (s: Station) => void;
  remove: (id: number) => void;
  reorder: (from: number, to: number) => void;
};

const Ctx = createContext<FavoritesValue | null>(null);

// Loads favorites from the injected store on mount; add/remove persist on change.
export function FavoritesProvider({
  store,
  children,
}: {
  store: FavoritesStore;
  children: ReactNode;
}) {
  const [favorites, setFavorites] = useState<Station[]>([]);
  useEffect(() => {
    let on = true;
    store.load().then(list => on && setFavorites(list));
    return () => {
      on = false;
    };
  }, [store]);

  const value = useMemo<FavoritesValue>(
    () => ({
      favorites,
      add: s =>
        setFavorites(prev => {
          const next = addFavorite(prev, s);
          if (next !== prev) store.save(next); // same ref on no-op → no save
          return next;
        }),
      remove: id =>
        setFavorites(prev => {
          const next = removeFavorite(prev, id);
          store.save(next);
          return next;
        }),
      reorder: (from, to) =>
        setFavorites(prev => {
          const next = moveItem(prev, from, to);
          if (next !== prev) store.save(next); // same ref on no-op → no save
          return next;
        }),
    }),
    [favorites, store],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites(): FavoritesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFavorites: wrap the tree in <FavoritesProvider>');
  return v;
}
