import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import pokeapi from '../api/pokeapi';
import { devWarn } from '../logger';
import { syncOfflineFavorites } from '../offlineFavorites';

const STORAGE_KEY = 'pokedex:favorites';

function readStoredIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

// Favorite Pokemon, persisted by id in localStorage and kept in sync across tabs.
//
// Favorite data lives here, separate from whatever generation is being browsed:
// ids are resolved from `loadedPokemons` when possible, and fetched otherwise,
// so the Favorites view works no matter which generation is loaded.
function useFavorites(loadedPokemons) {
  const [ids, setIds] = useState(readStoredIds);
  // id -> Pokemon, for favorites that aren't in `loadedPokemons`
  const [fetched, setFetched] = useState({});
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
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) setIds(readStoredIds());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadedById = useMemo(() => new Map(loadedPokemons.map((p) => [p.id, p])), [loadedPokemons]);
  const lookup = useCallback((id) => fetched[id] || loadedById.get(id), [fetched, loadedById]);

  const missingIds = ids.filter((id) => !lookup(id));
  const missingKey = missingIds.join(',');

  useEffect(() => {
    if (!missingKey) return;
    let ignore = false;
    setFailed(false);
    const idsToFetch = missingKey.split(',');
    Promise.allSettled(idsToFetch.map((id) => pokeapi.get(`/pokemon/${id}`))).then((results) => {
      if (ignore) return;
      const loaded = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') loaded[r.value.data.id] = r.value.data;
      });
      setFetched((prev) => ({ ...prev, ...loaded }));
      if (results.some((r) => r.status === 'rejected')) {
        devWarn('Could not load some favorite Pokemon');
        setFailed(true);
      }
    });
    return () => {
      ignore = true;
    };
  }, [missingKey, retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  const isFavorite = useCallback((id) => ids.includes(id), [ids]);

  const add = useCallback((pokemon) => {
    setIds((prev) => (prev.includes(pokemon.id) ? prev : [...prev, pokemon.id]));
    setFetched((prev) => ({ ...prev, [pokemon.id]: pokemon }));
  }, []);

  const remove = useCallback((pokemon) => {
    setIds((prev) => prev.filter((id) => id !== pokemon.id));
  }, []);

  // Resolved favorites in Pokedex order
  const favorites = useMemo(
    () =>
      ids
        .map(lookup)
        .filter(Boolean)
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
