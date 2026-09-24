import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import pokeapi from '../api/pokeapi';
import { devWarn } from '../logger';
import { syncOfflineFavorites } from '../offlineFavorites';
import type { Pokemon } from '../types/pokeapi';

const STORAGE_KEY = 'pokedex:favorites';

function readStoredIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

// Favorite Pokemon, persisted by id in localStorage and kept in sync across tabs.
//
// Favorite data lives here, separate from whatever generation is being browsed:
// ids are resolved from `loadedPokemons` when possible, and fetched otherwise,
// so the Favorites view works no matter which generation is loaded.
function useFavorites(loadedPokemons: Pokemon[]) {
  const [ids, setIds] = useState(readStoredIds);
  // id -> Pokemon, for favorites that aren't in `loadedPokemons`
  const [fetched, setFetched] = useState<Record<number, Pokemon>>({});
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // localStorage may be unavailable (e.g. private browsing, quota exceeded); ignore
    }
  }, [ids]);

  // Pick up changes made in another tab
  useEffect(() => {
    const handleStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY) setIds(readStoredIds());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadedById = useMemo(
    () => new Map(loadedPokemons.map((p) => [p.id, p])),
    [loadedPokemons]
  );
  const lookup = useCallback(
    (id: number): Pokemon | undefined => fetched[id] || loadedById.get(id),
    [fetched, loadedById]
  );

  const missingIds = ids.filter((id) => !lookup(id));
  const missingKey = missingIds.join(',');

  useEffect(() => {
    if (!missingKey) return;
    let ignore = false;
    setFailed(false);
    const idsToFetch = missingKey.split(',');
    Promise.allSettled(idsToFetch.map((id) => pokeapi.get<Pokemon>(`/pokemon/${id}`))).then(
      (results) => {
        if (ignore) return;
        const loaded: Record<number, Pokemon> = {};
        results.forEach((r) => {
          if (r.status === 'fulfilled') loaded[r.value.data.id] = r.value.data;
        });
        setFetched((prev) => ({ ...prev, ...loaded }));
        if (results.some((r) => r.status === 'rejected')) {
          devWarn('Could not load some favorite Pokemon');
          setFailed(true);
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, [missingKey, retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  const isFavorite = useCallback((id: number) => ids.includes(id), [ids]);

  const add = useCallback((pokemon: Pokemon) => {
    setIds((prev) => (prev.includes(pokemon.id) ? prev : [...prev, pokemon.id]));
    setFetched((prev) => ({ ...prev, [pokemon.id]: pokemon }));
  }, []);

  const remove = useCallback((pokemon: Pokemon) => {
    setIds((prev) => prev.filter((id) => id !== pokemon.id));
  }, []);

  // Resolved favorites in Pokedex order
  const favorites = useMemo(
    () =>
      ids
        .map(lookup)
        .filter((p): p is Pokemon => Boolean(p))
        .sort((a, b) => a.id - b.id),
    [ids, lookup]
  );

  // Keep everything favorites need cached for offline use. Runs once every
  // favorite is resolved (so none is mistaken for removed), and only when the
  // set of favorites changes, after a short pause to batch quick changes.
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);
  const allResolved = missingIds.length === 0;
  const idsKey = [...ids].sort((a, b) => a - b).join(',');
  useEffect(() => {
    if (!allResolved) return;
    const timeout = setTimeout(() => {
      syncOfflineFavorites(favoritesRef.current).catch(() => {
        devWarn('Could not update offline copies of favorites');
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [idsKey, allResolved]);

  return {
    count: ids.length,
    favorites,
    // Favorites still being fetched (0 once loaded, or if loading failed)
    pendingCount: failed ? 0 : missingIds.length,
    failedCount: failed ? missingIds.length : 0,
    retry,
    isFavorite,
    add,
    remove,
  };
}

export default useFavorites;
