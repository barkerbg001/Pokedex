import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import './Pokedex.css';
import PokemonDetail from '../PokemonDetail/PokemonDetail';
import Menu from '../Menu/Menu';
import Settings from '../Settings/Settings';
import TypeFilterModal from '../TypeFilterModal/TypeFilterModal';
import pokeapi from '../../api/pokeapi';

// Merge two Pokemon arrays, keeping the newest entry for any duplicate id
function mergeUniqueById(prev, incoming) {
  const map = new Map(prev.map((p) => [p.id, p]));
  incoming.forEach((p) => map.set(p.id, p));
  return Array.from(map.values());
}

function Pokedex({ themePreference, appliedTheme, onSetTheme }) {
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pokemons, setPokemons] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [generations, setGenerations] = useState([]);
  const [generationsError, setGenerationsError] = useState(null);
  const [selectedGeneration, setSelectedGeneration] = useState(null);
  const [genOffset, setGenOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [batchError, setBatchError] = useState(null);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const loader = useRef(null);
  const isFetchingRef = useRef(false);
  const pokemonsRef = useRef([]);
  const selectedGenerationRef = useRef(null);
  const generationCacheRef = useRef({});
  const [allNames, setAllNames] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('pokedex:favorites');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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
          const region = gen.main_region?.name;
          const displayName = region
            ? `${englishName} (${region.charAt(0).toUpperCase()}${region.slice(1)})`
            : englishName;
          return {
            id: gen.id,
            name: gen.name,
            displayName,
            speciesList: gen.pokemon_species.map((s) => ({ name: s.name, url: s.url })),
          };
        })
        .sort((a, b) => a.id - b.id);
      setGenerations(list);
      setSelectedGeneration((prev) => prev || list[0]?.name || null);
    } catch {
      setGenerations([]);
      setGenerationsError('Could not load Pokémon generations from PokéAPI.');
    }
  }, []);

  useEffect(() => {
    loadGenerations();
  }, [loadGenerations]);

  useEffect(() => {
    selectedGenerationRef.current = selectedGeneration;
  }, [selectedGeneration]);

  const loadGenerationBatch = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || !selectedGeneration) return;
    const generation = generations.find((g) => g.name === selectedGeneration);
    if (!generation) return;

    isFetchingRef.current = true;
    const generationBeingLoaded = selectedGeneration;
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
      setBatchError('Could not load Pokémon for this generation from PokéAPI.');
      setHasMore(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [hasMore, selectedGeneration, generations, genOffset]);

  useEffect(() => {
    loadGenerationBatch();
  }, [loadGenerationBatch]);

  const handleSelectGeneration = (genName) => {
    if (!genName || isFetchingRef.current) return;
    setShowSettings(false);
    if (genName === selectedGeneration) return;

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

  const retryLoadGeneration = () => {
    delete generationCacheRef.current[selectedGeneration];
    setBatchError(null);
    setPokemons([]);
    setGenOffset(0);
    setHasMore(true);
  };

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
        console.log('Could not load full Pokemon name index; search limited to loaded results');
      }
    }
    loadAllNames();
  }, []);

  // When the user searches, fetch full data for any matching Pokemon that
  // haven't been loaded yet, regardless of which generation is selected.
  useEffect(() => {
    const query = (searchQuery || '').trim();
    if (!query || allNames.length === 0) return;

    const timeout = setTimeout(async () => {
      const matches = allNames.filter((p) => p.name.includes(query)).slice(0, 20);
      const loadedNames = new Set(pokemonsRef.current.map((p) => p.name));
      const missing = matches.filter((m) => !loadedNames.has(m.name));
      if (missing.length === 0) return;

      setSearchLoading(true);
      try {
        const results = await Promise.all(missing.map((m) => pokeapi.get(m.url)));
        const withSpecies = await Promise.all(results.map((r) => pokeapi.get(r.data.species.url)));
        const fetched = results.map((r, i) => ({ ...r.data, species: withSpecies[i].data }));
        setPokemons((prev) => mergeUniqueById(prev, fetched));
      } catch {
        console.log('Search lookup failed, showing loaded results only');
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery, allNames]);

  // Resolve any favorited Pokemon that aren't part of the currently selected
  // generation's loaded batch, so the favorites strip works regardless of
  // which generation you're browsing.
  useEffect(() => {
    async function resolveMissingFavorites() {
      const loadedIds = new Set(pokemonsRef.current.map((p) => p.id));
      const missingIds = favorites.filter((id) => !loadedIds.has(id));
      if (missingIds.length === 0) return;

      try {
        const results = await Promise.all(missingIds.map((id) => pokeapi.get(`/pokemon/${id}`)));
        const withSpecies = await Promise.all(results.map((r) => pokeapi.get(r.data.species.url)));
        const fetched = results.map((r, i) => ({ ...r.data, species: withSpecies[i].data }));
        setPokemons((prev) => mergeUniqueById(prev, fetched));
      } catch {
        console.log('Could not resolve some favorited Pokemon');
      }
    }
    resolveMissingFavorites();
  }, [favorites]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const typeRes = await pokeapi.get('/type?limit=100');
        setTypes(typeRes.data.results);
      } catch {
        console.log('Could not load type filter list');
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadGenerationBatch();
      }
    });

    const current = loader.current;
    if (current) {
      observer.observe(current);
    }
    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [loadGenerationBatch]);

  const toggleFavorite = (pokemonId) => {
    setFavorites((prev) => {
      const next = prev.includes(pokemonId)
        ? prev.filter((id) => id !== pokemonId)
        : [...prev, pokemonId];
      try {
        localStorage.setItem('pokedex:favorites', JSON.stringify(next));
      } catch {
        // localStorage may be unavailable (e.g. private browsing, quota exceeded); ignore
      }
      return next;
    });
  };

  const filteredPokemons = pokemons
    .filter((pokemon) => pokemon.name.includes(searchQuery || ''))
    .filter((pokemon) =>
      selectedTypes.length === 0
        ? true
        : pokemon.types.some((t) => selectedTypes.includes(t.type.name))
    );

  const hasActiveFilters = selectedTypes.length > 0;
  const currentGeneration = generations.find((g) => g.name === selectedGeneration);

  if (generationsError && generations.length === 0) {
    return (
      <div className="pokedex-error-page">
        <h1>404</h1>
        <p>{generationsError}</p>
        <button type="button" onClick={loadGenerations}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="pokedex">
      <Menu
        generations={generations}
        selectedGeneration={selectedGeneration}
        onSelectGeneration={handleSelectGeneration}
        settingsActive={showSettings}
        onSelectSettings={() => setShowSettings(true)}
      />

      <div className="pokedex-content">
        {showSettings ? (
          <Settings
            themePreference={themePreference}
            appliedTheme={appliedTheme}
            onSetTheme={onSetTheme}
          />
        ) : (
          <>
            <h2 className="page-title">
              {currentGeneration ? currentGeneration.displayName : 'Pokédex'}
            </h2>

            {/* Search */}
            <div className="search-section">
              <input
                type="text"
                placeholder="Search Pokémon by name..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              />
            </div>

            {/* Results count */}
            <div className="results-info">
              <p>Showing {filteredPokemons.length} Pokémon</p>
              {searchLoading && (
                <p className="search-loading">Searching PokéAPI for more matches…</p>
              )}
            </div>

            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="favorites-section">
                <h3>Favorites</h3>
                <div className="favorites-list">
                  {favorites.map((fid) => {
                    const p = pokemons.find((x) => x.id === fid);
                    if (!p) return null;
                    return (
                      <div
                        key={`fav-${fid}`}
                        className="favorite-chip"
                        onClick={() => setSelectedPokemon(p)}
                      >
                        <img src={p.sprites.front_default} alt={p.name} />
                        <span>{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pokemon-grid">
              {filteredPokemons.map((pokemon) => (
                <div key={pokemon.id} className="pokemon-card">
                  <div className="card-top">
                    <img
                      src={pokemon.sprites.front_default}
                      alt={pokemon.name}
                      loading="lazy"
                      onClick={() => setSelectedPokemon(pokemon)}
                    />
                    <button
                      className={`fav-btn ${favorites.includes(pokemon.id) ? 'active' : ''}`}
                      onClick={() => toggleFavorite(pokemon.id)}
                      aria-pressed={favorites.includes(pokemon.id)}
                      title={favorites.includes(pokemon.id) ? 'Unfavorite' : 'Add to favorites'}
                    >
                      {favorites.includes(pokemon.id) ? <FaStar /> : <FaRegStar />}
                    </button>
                  </div>
                  <span className="pokemon-card-id" onClick={() => setSelectedPokemon(pokemon)}>
                    #{String(pokemon.id).padStart(4, '0')}
                  </span>
                  <p onClick={() => setSelectedPokemon(pokemon)}>{pokemon.name}</p>
                </div>
              ))}
            </div>

            {filteredPokemons.length === 0 && !hasMore && !searchLoading && !batchError && (
              <div className="no-results">No Pokémon match your filters.</div>
            )}

            {batchError && (
              <div className="pokedex-error-inline">
                <h3>404</h3>
                <p>{batchError}</p>
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
            {selectedPokemon && (
              <PokemonDetail pokemon={selectedPokemon} onClose={() => setSelectedPokemon(null)} />
            )}

            <button
              type="button"
              className="fab-button"
              onClick={() => setShowTypeFilter(true)}
              aria-label="Filter by type"
            >
              <FiFilter />
              {hasActiveFilters && <span className="fab-badge">{selectedTypes.length}</span>}
            </button>

            {showTypeFilter && (
              <TypeFilterModal
                types={types}
                selectedTypes={selectedTypes}
                onToggleType={toggleTypeFilter}
                onClear={clearAllFilters}
                onClose={() => setShowTypeFilter(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Pokedex;
