import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaRegStar } from 'react-icons/fa';
import { FiFilter, FiX } from 'react-icons/fi';
import './Pokedex.css';
import PokemonDetail from '../PokemonDetail/PokemonDetail';
import Menu from '../Menu/Menu';
import BottomNav from '../BottomNav/BottomNav';
import GenerationSheet from '../GenerationList/GenerationSheet';
import Settings from '../Settings/Settings';
import TypeFilterModal from '../TypeFilterModal/TypeFilterModal';
import PokemonGrid from '../PokemonGrid/PokemonGrid';
import Toast from '../Toast/Toast';
import WhosThatPokemon from '../WhosThatPokemon/WhosThatPokemon';
import pokeapi from '../../api/pokeapi';
import { typeColors } from '../../constants';
import useFavorites from '../../hooks/useFavorites';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import useHistoryLocation, { buildUrl } from '../../hooks/useHistoryLocation';
import { devWarn } from '../../logger';
import { vibrate } from '../../haptics';

// Merge two Pokemon arrays, keeping the newest entry for any duplicate id
function mergeUniqueById(prev, incoming) {
  const map = new Map(prev.map((p) => [p.id, p]));
  incoming.forEach((p) => map.set(p.id, p));
  return Array.from(map.values());
}

function Pokedex({ themePreference, appliedTheme, onSetTheme, install, swUpdate }) {
  // Where the user is (screen, generation, open Pokémon, open sheet) lives in
  // browser history, so back/forward, reloads and shared links work; these
  // states mirror the current history entry (see applyLocation below)
  const handleLocationChangeRef = useRef(null);
  const appHistory = useHistoryLocation((location) => handleLocationChangeRef.current(location));
  // Which screen is showing: 'browse' (a generation), 'favorites', 'quiz' or
  // 'settings'
  const [view, setView] = useState(appHistory.initial.view);
  // The open detail sheet's Pokémon: its name (from the URL) and, once found or
  // fetched, its data
  const [detailName, setDetailName] = useState(appHistory.initial.pokemon);
  const [detailPokemon, setDetailPokemon] = useState(null);
  // The open sheet, if any: 'filter' or 'generations'
  const [sheet, setSheet] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pokemons, setPokemons] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [types, setTypes] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [generationsError, setGenerationsError] = useState(null);
  const [selectedGeneration, setSelectedGeneration] = useState(null);
  const [genOffset, setGenOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [batchError, setBatchError] = useState(null);
  const loader = useRef(null);
  const searchInputRef = useRef(null);
  // Sits just above the sticky search bar; once it scrolls out of view the bar
  // is stuck to the top and gets a background (see .search-section.stuck)
  const searchSentinelRef = useRef(null);
  const [searchStuck, setSearchStuck] = useState(false);
  // Name of the generation whose batch is currently in flight, if any
  const fetchingGenerationRef = useRef(null);
  const pokemonsRef = useRef([]);
  const selectedGenerationRef = useRef(null);
  const generationCacheRef = useRef({});
  const [allNames, setAllNames] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const favorites = useFavorites(pokemons);
  const online = useOnlineStatus();
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = (message, action, { duration } = {}) =>
    setToast({ id: Date.now(), message, action, duration });

  // Tell the user once a new version has installed and is ready to switch to.
  // Longer-lived than a typical toast: easy to miss, and (unlike "Added to
  // Favorites") there's no other way to notice it until the next visit.
  useEffect(() => {
    if (!swUpdate?.updateAvailable) return;
    showToast(
      'A new version is available',
      { label: 'Reload', onClick: swUpdate.reload },
      { duration: 20000 }
    );
    // Only re-run if it wasn't available before; showToast/swUpdate.reload
    // are new on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swUpdate?.updateAvailable]);

  const toggleFavorite = (pokemon) => {
    vibrate();
    if (favorites.isFavorite(pokemon.id)) {
      favorites.remove(pokemon);
      showToast(`Removed ${pokemon.name} from Favorites`, {
        label: 'Undo',
        onClick: () => favorites.add(pokemon),
      });
    } else {
      favorites.add(pokemon);
      showToast(`Added ${pokemon.name} to Favorites`);
    }
  };

  // Share a link that opens this Pokémon (see useHistoryLocation), using the
  // system share sheet where available and copying the link otherwise
  const sharePokemon = async (pokemon) => {
    const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const url = `${window.location.origin}${buildUrl({ view: 'browse', pokemon: pokemon.name })}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} · Pokédex`, text: `${name} in the Pokédex`, url });
        return;
      } catch (error) {
        // Cancelled by the user; anything else falls back to copying
        if (error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Link to ${pokemon.name} copied`);
    } catch {
      showToast('Couldn’t copy the link');
    }
  };

  const toggleTypeFilter = (typeName) => {
    setSelectedTypes((prev) =>
      prev.includes(typeName) ? prev.filter((t) => t !== typeName) : [...prev, typeName]
    );
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
  };

  // Load the list of generations once, each with its own species list (used to
  // drive the sidebar and to load Pokemon one generation at a time instead of
  // sequentially across the whole Pokedex).
  const loadGenerations = useCallback(async () => {
    setGenerationsError(null);
    try {
      const listRes = await pokeapi.get('/generation?limit=100');
      const details = await Promise.all(listRes.data.results.map((g) => pokeapi.get(g.url)));
      const list = details
        .map(({ data: gen }) => {
          const englishName = gen.names.find((n) => n.language.name === 'en')?.name || gen.name;
          const regionName = gen.main_region?.name;
          const region = regionName && regionName.charAt(0).toUpperCase() + regionName.slice(1);
          const displayName = region ? `${englishName} (${region})` : englishName;
          return {
            id: gen.id,
            name: gen.name,
            displayName,
            region,
            speciesList: gen.pokemon_species.map((s) => ({ name: s.name, url: s.url })),
          };
        })
        .sort((a, b) => a.id - b.id);
      setGenerations(list);
      // Start on the generation from the URL, if it's a real one
      const requested = list.find((g) => g.name === appHistory.initial.gen);
      setSelectedGeneration((prev) => prev || requested?.name || list[0]?.name || null);
    } catch {
      setGenerations([]);
      setGenerationsError('Could not load Pokémon generations from PokéAPI.');
    }
    // appHistory.initial never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadGenerations();
  }, [loadGenerations]);

  useEffect(() => {
    selectedGenerationRef.current = selectedGeneration;
  }, [selectedGeneration]);

  const loadGenerationBatch = useCallback(async () => {
    if (fetchingGenerationRef.current === selectedGeneration || !hasMore || !selectedGeneration)
      return;
    const generation = generations.find((g) => g.name === selectedGeneration);
    if (!generation) return;

    const generationBeingLoaded = selectedGeneration;
    fetchingGenerationRef.current = generationBeingLoaded;
    const batchSize = 30;
    const batch = generation.speciesList.slice(genOffset, genOffset + batchSize);

    try {
      if (batch.length === 0) {
        setHasMore(false);
        return;
      }

      const speciesResults = await Promise.all(batch.map((s) => pokeapi.get(s.url)));
      const pokemonResults = await Promise.all(
        speciesResults.map((r) => {
          const defaultVariety = r.data.varieties.find((v) => v.is_default) || r.data.varieties[0];
          return pokeapi.get(defaultVariety.pokemon.url);
        })
      );
      const fetched = pokemonResults.map((r, i) => ({
        ...r.data,
        species: speciesResults[i].data,
      }));

      // The user may have switched generations while this batch was in flight
      if (generationBeingLoaded !== selectedGenerationRef.current) return;

      setBatchError(null);
      setGenOffset((prev) => prev + batchSize);
      setHasMore(genOffset + batchSize < generation.speciesList.length);
      setPokemons((prev) => mergeUniqueById(prev, fetched));
    } catch {
      if (generationBeingLoaded !== selectedGenerationRef.current) return;
      setBatchError('Could not load Pokémon for this generation from PokéAPI.');
      setHasMore(false);
    } finally {
      // Only clear the flag if a newer generation's batch hasn't taken over
      if (fetchingGenerationRef.current === generationBeingLoaded) {
        fetchingGenerationRef.current = null;
      }
    }
  }, [hasMore, selectedGeneration, generations, genOffset]);

  // Switch the list to a generation, restoring it from the cache if it was
  // loaded before
  const showGeneration = (genName) => {
    if (!genName || genName === selectedGeneration) return;

    if (selectedGeneration) {
      generationCacheRef.current[selectedGeneration] = {
        pokemons: pokemonsRef.current,
        genOffset,
        hasMore,
      };
    }

    const cached = generationCacheRef.current[genName];
    setSelectedGeneration(genName);
    setBatchError(null);
    if (cached) {
      setPokemons(cached.pokemons);
      setGenOffset(cached.genOffset);
      setHasMore(cached.hasMore);
    } else {
      setPokemons([]);
      setGenOffset(0);
      setHasMore(true);
    }
  };

  // Make the app match a history entry (on back/forward, or after navigating)
  const applyLocation = (location, { keepSheet = false } = {}) => {
    setView(location.view);
    const gen = generations.some((g) => g.name === location.gen)
      ? location.gen
      : generations[0]?.name;
    showGeneration(gen);
    setDetailName(location.pokemon);
    // A sheet that led somewhere closes itself with its exit animation
    if (!keepSheet) setSheet(location.sheet);
  };
  handleLocationChangeRef.current = applyLocation;

  const go = (changes, options) => applyLocation(appHistory.navigate(changes, options), options);

  const selectView = (nextView) => {
    if (nextView === view) {
      // Tapping the current screen again jumps back to the top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    go({ view: nextView, pokemon: null });
  };

  const handleSelectGeneration = (genName) => {
    if (genName === selectedGeneration && view === 'browse') return;
    go({ view: 'browse', gen: genName, pokemon: null }, { keepSheet: true });
  };

  const openSheet = (name) => go({ sheet: name });
  const closeSheet = (name) => {
    if (!appHistory.closeOverlay('sheet', name)) setSheet(null);
  };

  const openPokemon = (pokemon) => {
    setDetailPokemon(pokemon);
    go({ pokemon: pokemon.name });
  };
  const closePokemon = () => {
    if (!appHistory.closeOverlay('pokemon', detailName)) setDetailName(null);
  };

  // Find the data for the Pokémon in the URL: already loaded, or fetched (for
  // a shared link or a reload)
  const knownPokemon = [...pokemons, ...favorites.favorites];
  const knownDetail =
    detailPokemon?.name === detailName
      ? detailPokemon
      : knownPokemon.find((p) => p.name === detailName || String(p.id) === detailName);
  useEffect(() => {
    if (!detailName || knownDetail) return;
    let ignore = false;
    pokeapi
      .get(`/pokemon/${detailName}`)
      .then(({ data }) => {
        if (ignore) return;
        setDetailPokemon(data);
        // e.g. ?pokemon=25 becomes ?pokemon=pikachu
        if (data.name !== detailName) {
          setDetailName(data.name);
          appHistory.navigate({ pokemon: data.name }, { replace: true });
        }
      })
      .catch(() => {
        if (ignore) return;
        showToast(`Couldn’t find a Pokémon called “${detailName}”`);
        appHistory.navigate({ pokemon: null }, { replace: true });
        setDetailName(null);
      });
    return () => {
      ignore = true;
    };
    // Only when the requested Pokémon changes or turns out to be unknown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailName, Boolean(knownDetail)]);

  // The manifest's "Search" shortcut opens the app with ?action=search
  useEffect(() => {
    if (appHistory.initial.action === 'search') searchInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carry on from the batch that failed; everything loaded so far stays
  const retryLoadGeneration = () => {
    setBatchError(null);
    setHasMore(true);
  };

  // Retry whatever failed as soon as the connection comes back
  const wasOnlineRef = useRef(online);
  const retryFavorites = favorites.retry;
  const hasFailedFavorites = favorites.failedCount > 0;
  useEffect(() => {
    const cameBackOnline = online && !wasOnlineRef.current;
    wasOnlineRef.current = online;
    if (!cameBackOnline) return;
    if (generationsError) loadGenerations();
    if (batchError) {
      setBatchError(null);
      setHasMore(true);
    }
    if (hasFailedFavorites) retryFavorites();
  }, [online, generationsError, loadGenerations, batchError, hasFailedFavorites, retryFavorites]);

  // Keep a ref in sync so other effects can read current pokemons
  // without re-running every time the list changes.
  useEffect(() => {
    pokemonsRef.current = pokemons;
  }, [pokemons]);

  // Load a lightweight name/url index of every Pokemon once, so search can
  // find matches beyond whatever's currently loaded for the selected generation.
  useEffect(() => {
    async function loadAllNames() {
      try {
        const res = await pokeapi.get('/pokemon?limit=100000');
        setAllNames(res.data.results);
      } catch {
        devWarn('Could not load full Pokemon name index; search limited to loaded results');
      }
    }
    loadAllNames();
  }, []);

  // When the user searches, fetch full data for any matching Pokemon that
  // haven't been loaded yet, regardless of which generation is selected.
  useEffect(() => {
    const query = (searchQuery || '').trim();
    if (!query || allNames.length === 0) return;

    // Set on cleanup, so an outdated search (the query changed) doesn't touch state
    let ignore = false;
    const timeout = setTimeout(async () => {
      const matches = allNames.filter((p) => p.name.includes(query)).slice(0, 20);
      const loadedNames = new Set(pokemonsRef.current.map((p) => p.name));
      const missing = matches.filter((m) => !loadedNames.has(m.name));
      if (missing.length === 0) return;

      setSearchLoading(true);
      try {
        const results = await Promise.all(missing.map((m) => pokeapi.get(m.url)));
        const withSpecies = await Promise.all(results.map((r) => pokeapi.get(r.data.species.url)));
        if (ignore) return;
        const fetched = results.map((r, i) => ({ ...r.data, species: withSpecies[i].data }));
        setPokemons((prev) => mergeUniqueById(prev, fetched));
      } catch {
        if (!ignore) devWarn('Search lookup failed, showing loaded results only');
      } finally {
        if (!ignore) setSearchLoading(false);
      }
    }, 350);

    return () => {
      ignore = true;
      clearTimeout(timeout);
      // The next run turns this back on if it starts a lookup of its own
      setSearchLoading(false);
    };
  }, [searchQuery, allNames]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const typeRes = await pokeapi.get('/type?limit=100');
        // Drop pseudo-types (stellar, unknown, shadow) that no Pokémon can have
        setTypes(typeRes.data.results.filter((t) => t.name in typeColors));
      } catch {
        devWarn('Could not load type filter list');
      }
    }
    loadFilters();
  }, []);

  // The sole driver of batch loading. It's recreated whenever loadGenerationBatch
  // changes (new generation, next offset, retry), and a new observer reports the
  // loader's current visibility straight away - so it keeps loading only while
  // the loader is on screen, and stops once the grid fills the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadGenerationBatch();
        }
      },
      // Start the next batch a little before the loader scrolls into view
      { rootMargin: '300px 0px' }
    );

    const current = loader.current;
    if (current) {
      observer.observe(current);
    }
    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
    // `view` too: coming back to Browse from Favorites or Settings renders a
    // new loader element, which needs observing
  }, [loadGenerationBatch, view]);

  // The search bar only exists on Browse and Favorites, so re-observe on view change
  useEffect(() => {
    const sentinel = searchSentinelRef.current;
    if (!sentinel) {
      setSearchStuck(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setSearchStuck(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [view]);

  // Search and type filters apply to both Browse and Favorites
  const applyFilters = (list) =>
    list
      .filter((pokemon) => pokemon.name.includes(searchQuery || ''))
      .filter((pokemon) =>
        selectedTypes.length === 0
          ? true
          : pokemon.types.some((t) => selectedTypes.includes(t.type.name))
      );
  const filteredPokemons = applyFilters(pokemons);
  const filteredFavorites = applyFilters(favorites.favorites);

  const hasActiveFilters = selectedTypes.length > 0;
  const currentGeneration = generations.find((g) => g.name === selectedGeneration);

  if (generationsError && generations.length === 0) {
    return (
      <div className="pokedex-error-page">
        {online ? (
          <>
            <h1>404</h1>
            <p>{generationsError}</p>
          </>
        ) : (
          <>
            <h1 className="pokedex-error-title-text">You’re offline</h1>
            <p>
              The Pokédex hasn’t been saved on this device yet. Connect once and it’ll work offline
              after that. It will load as soon as you’re back online.
            </p>
          </>
        )}
        <button type="button" onClick={loadGenerations}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="pokedex">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Menu
        generations={generations}
        selectedGeneration={selectedGeneration}
        onSelectGeneration={handleSelectGeneration}
        view={view}
        favoritesCount={favorites.count}
        onSelectFavorites={() => selectView('favorites')}
        onSelectQuiz={() => selectView('quiz')}
        onSelectSettings={() => selectView('settings')}
      />

      <BottomNav
        currentGeneration={currentGeneration}
        view={view}
        onBrowse={() => selectView('browse')}
        onOpenGenerations={() => openSheet('generations')}
        onSelectFavorites={() => selectView('favorites')}
        onSelectQuiz={() => selectView('quiz')}
        onSelectSettings={() => selectView('settings')}
      />

      {sheet === 'generations' && (
        <GenerationSheet
          generations={generations}
          selectedGeneration={selectedGeneration}
          onSelectGeneration={handleSelectGeneration}
          onClose={() => closeSheet('generations')}
        />
      )}

      <main id="main-content" className="pokedex-content" tabIndex={-1}>
        {view === 'settings' ? (
          <Settings
            themePreference={themePreference}
            appliedTheme={appliedTheme}
            onSetTheme={onSetTheme}
            install={install}
          />
        ) : view === 'quiz' ? (
          <WhosThatPokemon generations={generations} onOpenPokemon={openPokemon} />
        ) : (
          <>
            <h2 className="page-title">
              {view === 'favorites'
                ? 'Favorites'
                : currentGeneration
                  ? currentGeneration.displayName
                  : 'Pokédex'}
            </h2>

            {!online && (
              <p className="offline-notice" role="status">
                You’re offline. Showing Pokémon saved on this device.
              </p>
            )}

            {/* Search, which sticks to the top of the screen while scrolling */}
            <div ref={searchSentinelRef} className="search-sentinel" aria-hidden="true" />
            <form
              role="search"
              className={`search-section ${searchStuck ? 'stuck' : ''}`}
              onSubmit={(e) => {
                // Results already update as you type; Enter just dismisses the keyboard
                e.preventDefault();
                searchInputRef.current?.blur();
              }}
            >
              <input
                ref={searchInputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={
                  view === 'favorites' ? 'Search your favorites...' : 'Search Pokémon by name...'
                }
                aria-label={view === 'favorites' ? 'Search favorites' : 'Search Pokémon by name'}
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                >
                  <FiX />
                </button>
              )}
            </form>

            {view === 'favorites' ? (
              <>
                {favorites.count > 0 && (
                  <div className="results-info">
                    <p>
                      {filteredFavorites.length === favorites.favorites.length
                        ? `${favorites.count} favorite${favorites.count === 1 ? '' : 's'}`
                        : `Showing ${filteredFavorites.length} of ${favorites.count} favorites`}
                    </p>
                  </div>
                )}

                <PokemonGrid
                  pokemons={filteredFavorites}
                  isFavorite={favorites.isFavorite}
                  onToggleFavorite={toggleFavorite}
                  onOpen={openPokemon}
                />

                {favorites.count === 0 && (
                  <div className="empty-state">
                    <FaRegStar className="empty-state-icon" aria-hidden="true" />
                    <h3>No favorites yet</h3>
                    <p>
                      Tap the <FaRegStar aria-hidden="true" className="inline-icon" /> star on any
                      Pokémon to save it here.
                    </p>
                    <button type="button" onClick={() => selectView('browse')}>
                      Browse Pokémon
                    </button>
                  </div>
                )}

                {favorites.pendingCount > 0 && <div className="loading">Loading favorites…</div>}

                {favorites.failedCount > 0 && (
                  <div className="pokedex-error-inline">
                    <p>
                      {online
                        ? `Couldn’t load ${favorites.failedCount} favorite${
                            favorites.failedCount === 1 ? '' : 's'
                          } from PokéAPI.`
                        : `${favorites.failedCount} favorite${
                            favorites.failedCount === 1 ? ' isn’t' : 's aren’t'
                          } saved on this device yet and will load when you’re back online.`}
                    </p>
                    <button type="button" onClick={favorites.retry}>
                      Try Again
                    </button>
                  </div>
                )}

                {favorites.count > 0 &&
                  favorites.pendingCount === 0 &&
                  filteredFavorites.length === 0 &&
                  favorites.favorites.length > 0 && (
                    <div className="no-results">No favorites match your search or filters.</div>
                  )}
              </>
            ) : (
              <>
                {/* Results count */}
                <div className="results-info">
                  <p>Showing {filteredPokemons.length} Pokémon</p>
                  {searchLoading && (
                    <p className="search-loading">Searching PokéAPI for more matches…</p>
                  )}
                </div>

                <PokemonGrid
                  pokemons={filteredPokemons}
                  isFavorite={favorites.isFavorite}
                  onToggleFavorite={toggleFavorite}
                  onOpen={openPokemon}
                />

                {filteredPokemons.length === 0 && !hasMore && !searchLoading && !batchError && (
                  <div className="no-results">No Pokémon match your filters.</div>
                )}

                {batchError && (
                  <div className="pokedex-error-inline">
                    {online ? (
                      <>
                        <h3>404</h3>
                        <p>{batchError}</p>
                      </>
                    ) : (
                      <>
                        <h3>You’re offline</h3>
                        <p>More Pokémon will load when you’re back online.</p>
                      </>
                    )}
                    <button type="button" onClick={retryLoadGeneration}>
                      Try Again
                    </button>
                  </div>
                )}

                {hasMore && !batchError && (
                  <div ref={loader} className="loading">
                    Loading...
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              className="fab-button"
              onClick={() => openSheet('filter')}
              aria-label="Filter by type"
            >
              <FiFilter />
              {hasActiveFilters && <span className="fab-badge">{selectedTypes.length}</span>}
            </button>

            {sheet === 'filter' && (
              <TypeFilterModal
                types={types}
                selectedTypes={selectedTypes}
                onToggleType={toggleTypeFilter}
                onClear={clearAllFilters}
                onClose={() => closeSheet('filter')}
              />
            )}
          </>
        )}
      </main>

      {detailName && knownDetail && (
        <PokemonDetail
          pokemon={knownDetail}
          isFavorite={favorites.isFavorite(knownDetail.id)}
          onToggleFavorite={() => toggleFavorite(knownDetail)}
          onShare={() => sharePokemon(knownDetail)}
          onClose={closePokemon}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default Pokedex;
