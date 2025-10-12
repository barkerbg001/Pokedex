import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './Pokedex.css';
import PokemonDetail from './PokemonDetail';

// Mock data for demonstration when API is not available
const mockPokemonData = [
  {
    id: 1,
    name: 'bulbasaur',
    sprites: {
      front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'
    },
    types: [
      { type: { name: 'grass', url: 'https://pokeapi.co/api/v2/type/12/' } },
      { type: { name: 'poison', url: 'https://pokeapi.co/api/v2/type/4/' } }
    ],
    stats: [
      { stat: { name: 'hp' }, base_stat: 45 },
      { stat: { name: 'attack' }, base_stat: 49 },
      { stat: { name: 'defense' }, base_stat: 49 },
      { stat: { name: 'special-attack' }, base_stat: 65 },
      { stat: { name: 'special-defense' }, base_stat: 65 },
      { stat: { name: 'speed' }, base_stat: 45 }
    ],
    abilities: [
      { ability: { name: 'overgrow' }, is_hidden: false },
      { ability: { name: 'chlorophyll' }, is_hidden: true }
    ],
    moves: [
      { move: { name: 'razor-wind' }, version_group_details: [{ move_learn_method: { name: 'level-up' } }] },
      { move: { name: 'swords-dance' }, version_group_details: [{ move_learn_method: { name: 'machine' } }] },
      { move: { name: 'cut' }, version_group_details: [{ move_learn_method: { name: 'machine' } }] }
    ],
    species: {
      url: 'https://pokeapi.co/api/v2/pokemon-species/1/',
      generation: { name: 'generation-i' }
    }
  },
  {
    id: 4,
    name: 'charmander',
    sprites: {
      front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png'
    },
    types: [
      { type: { name: 'fire', url: 'https://pokeapi.co/api/v2/type/10/' } }
    ],
    stats: [
      { stat: { name: 'hp' }, base_stat: 39 },
      { stat: { name: 'attack' }, base_stat: 52 },
      { stat: { name: 'defense' }, base_stat: 43 },
      { stat: { name: 'special-attack' }, base_stat: 60 },
      { stat: { name: 'special-defense' }, base_stat: 50 },
      { stat: { name: 'speed' }, base_stat: 65 }
    ],
    abilities: [
      { ability: { name: 'blaze' }, is_hidden: false },
      { ability: { name: 'solar-power' }, is_hidden: true }
    ],
    moves: [
      { move: { name: 'scratch' }, version_group_details: [{ move_learn_method: { name: 'level-up' } }] },
      { move: { name: 'growl' }, version_group_details: [{ move_learn_method: { name: 'level-up' } }] },
      { move: { name: 'ember' }, version_group_details: [{ move_learn_method: { name: 'level-up' } }] }
    ],
    species: {
      url: 'https://pokeapi.co/api/v2/pokemon-species/4/',
      generation: { name: 'generation-i' }
    }
  },
  {
    id: 7,
    name: 'squirtle',
    sprites: {
      front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png'
    },
    types: [
      { type: { name: 'water', url: 'https://pokeapi.co/api/v2/type/11/' } }
    ],
    stats: [
      { stat: { name: 'hp' }, base_stat: 44 },
      { stat: { name: 'attack' }, base_stat: 48 },
      { stat: { name: 'defense' }, base_stat: 65 },
      { stat: { name: 'special-attack' }, base_stat: 50 },
      { stat: { name: 'special-defense' }, base_stat: 64 },
      { stat: { name: 'speed' }, base_stat: 43 }
    ],
    abilities: [
      { ability: { name: 'torrent' }, is_hidden: false },
      { ability: { name: 'rain-dish' }, is_hidden: true }
    ],
    moves: [
      { move: { name: 'tackle' }, version_group_details: [{ move_learn_method: { name: 'level-up' } }] },
      { move: { name: 'tail-whip' }, version_group_details: [{ move_learn_method: { name: 'level-up' } }] },
      { move: { name: 'water-gun' }, version_group_details: [{ move_learn_method: { name: 'level-up' } }] }
    ],
    species: {
      url: 'https://pokeapi.co/api/v2/pokemon-species/7/',
      generation: { name: 'generation-i' }
    }
  }
];

function Pokedex({ searchQuery }) {
  const [pokemons, setPokemons] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [collapsedGenerations, setCollapsedGenerations] = useState({});
  const loader = useRef(null);
  const tagContainerRef = useRef(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('pokedex:favorites');
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  });

  const typeColors = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    electric: '#F8D030',
    grass: '#78C850',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC'
  };

  const generationNames = {
    'generation-i': 'Generation I (Kanto)',
    'generation-ii': 'Generation II (Johto)',
    'generation-iii': 'Generation III (Hoenn)',
    'generation-iv': 'Generation IV (Sinnoh)',
    'generation-v': 'Generation V (Unova)',
    'generation-vi': 'Generation VI (Kalos)',
    'generation-vii': 'Generation VII (Alola)',
    'generation-viii': 'Generation VIII (Galar)',
    'generation-ix': 'Generation IX (Paldea)'
  };

  const toggleTypeFilter = (typeName) => {
    setSelectedTypes(prev => 
      prev.includes(typeName) 
        ? prev.filter(t => t !== typeName)
        : [...prev, typeName]
    );
  };

  const toggleGeneration = (genName) => {
    setCollapsedGenerations(prev => ({
      ...prev,
      [genName]: !prev[genName]
    }));
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
  };

  const loadPokemons = useCallback(async () => {
    if (!hasMore) return;
    
    try {
      const limit = 30;
      const response = await axios.get(
        `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`
      );

      setOffset(prev => prev + limit);
      if (!response.data.next) {
        setHasMore(false);
      }

      const results = await Promise.all(
        response.data.results.map(pokemon => axios.get(pokemon.url))
      );
      const withSpecies = await Promise.all(
        results.map(r => axios.get(r.data.species.url))
      );
      setPokemons(prev => [
        ...prev,
        ...results.map((r, i) => ({ ...r.data, species: withSpecies[i].data })),
      ]);
    } catch (error) {
      console.log('API not available, using mock data for demonstration');
      // Use mock data when API is not available
      if (offset === 0) {
        setPokemons(mockPokemonData);
        setHasMore(false);
      }
    }
  }, [offset, hasMore]);

  useEffect(() => {
    loadPokemons();
  }, [loadPokemons]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const typeRes = await axios.get('https://pokeapi.co/api/v2/type?limit=100');
        setTypes(typeRes.data.results);
      } catch (e) {
        console.log('Using mock filter data');
        // Mock filter data when API is not available
        setTypes([
          { name: 'fire' },
          { name: 'water' },
          { name: 'grass' },
          { name: 'poison' }
        ]);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadPokemons();
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
  }, [loadPokemons]);

  // Manage horizontal scroll buttons visibility and state
  useEffect(() => {
    const el = tagContainerRef.current;
    if (!el) return;

    function check() {
      setShowScrollButtons(el.scrollWidth > el.clientWidth + 2);
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
    }

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener('scroll', check);
    window.addEventListener('resize', check);

    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [types]);

  const scrollByAmount = (dir = 'right') => {
    const el = tagContainerRef.current;
    if (!el) return;
    const amount = Math.floor(el.clientWidth * 0.6) * (dir === 'right' ? 1 : -1);
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const toggleFavorite = (pokemonId) => {
    setFavorites(prev => {
      const next = prev.includes(pokemonId) ? prev.filter(id => id !== pokemonId) : [...prev, pokemonId];
      try { localStorage.setItem('pokedex:favorites', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const filteredPokemons = pokemons
    .filter(pokemon => pokemon.name.includes(searchQuery || ''))
    .filter(pokemon =>
      selectedTypes.length === 0 
        ? true 
        : pokemon.types.some(t => selectedTypes.includes(t.type.name))
    );

  // Group Pokemon by generation
  const groupedByGeneration = filteredPokemons.reduce((acc, pokemon) => {
    const genName = pokemon.species?.generation?.name || 'unknown';
    if (!acc[genName]) {
      acc[genName] = [];
    }
    acc[genName].push(pokemon);
    return acc;
  }, {});

  // Sort generations in order
  const sortedGenerations = Object.keys(groupedByGeneration).sort((a, b) => {
    const order = ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 
                   'generation-v', 'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const hasActiveFilters = selectedTypes.length > 0;



  return (
    <div className="pokedex">
      {/* Type Filters */}
      <div className="filter-section compact-filters">
        <div className="filter-header compact">
          <div className="filter-controls">
            <div className="type-blocks-wrapper">
              {/* left intentionally empty to keep layout consistent */}
            </div>
          </div>
          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearAllFilters}>
              Clear
            </button>
          )}
        </div>

        {/* Compact type blocks: small colored swatch + label */}
        <div className="tag-scroll-wrapper">
          {showScrollButtons && (
            <button
              className={`scroll-btn left ${canScrollLeft ? '' : 'disabled'}`}
              onClick={() => scrollByAmount('left')}
              aria-hidden={!canScrollLeft}
            >
              ‹
            </button>
          )}

          <div ref={tagContainerRef} className="tag-container type-blocks">
            {types.map(t => {
            const active = selectedTypes.includes(t.name);
            const color = typeColors[t.name] || '#888';
            // create a faint translucent background for inactive swatches so white SVGs remain visible
            const translucent = `${color}22`; // append alpha for light tint
            return (
              <button
                key={t.name}
                className={`type-block vertical ${active ? 'active' : ''}`}
                onClick={() => toggleTypeFilter(t.name)}
                aria-pressed={active}
                style={{ borderColor: color }}
                title={`Filter by ${t.name}`}
              >
                <div
                  className="type-swatch-outer"
                  style={{
                    backgroundColor: active ? color : translucent,
                    borderColor: color,
                    boxShadow: active ? `0 0 0 6px ${color}22` : 'none'
                  }}
                >
                  <img
                    src={`/types/${t.name}.svg`}
                    alt={`${t.name} icon`}
                    className="type-icon"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <span className="type-label">{t.name}</span>
              </button>
            );
          })}
          </div>

          {showScrollButtons && (
            <button
              className={`scroll-btn right ${canScrollRight ? '' : 'disabled'}`}
              onClick={() => scrollByAmount('right')}
              aria-hidden={!canScrollRight}
            >
              ›
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        <p>Showing {filteredPokemons.length} Pokémon across {sortedGenerations.length} generations</p>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="favorites-section">
          <h3>Favorites</h3>
          <div className="favorites-list">
            {favorites.map(fid => {
              const p = pokemons.find(x => x.id === fid) || mockPokemonData.find(x => x.id === fid);
              if (!p) return null;
              return (
                <div key={`fav-${fid}`} className="favorite-chip" onClick={() => setSelectedPokemon(p)}>
                  <img src={p.sprites.front_default} alt={p.name} />
                  <span>{p.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped by Generation */}
      {sortedGenerations.map(genName => (
        <div key={genName} className="generation-group">
          <div className="generation-header" onClick={() => toggleGeneration(genName)}>
            <h2 className="generation-title">
              {generationNames[genName] || genName}
              <span className="pokemon-count">({groupedByGeneration[genName].length} Pokémon)</span>
            </h2>
            <button className="collapse-toggle" aria-label="Toggle generation">
              {collapsedGenerations[genName] ? '▼' : '▲'}
            </button>
          </div>
          
          {!collapsedGenerations[genName] && (
            <div className="pokemon-grid">
              {groupedByGeneration[genName].map(pokemon => (
                <div
                  key={pokemon.id}
                  className="pokemon-card"
                >
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
                      ★
                    </button>
                  </div>
                  <p onClick={() => setSelectedPokemon(pokemon)}>{pokemon.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {hasMore && <div ref={loader} className="loading">Loading...</div>}
      {selectedPokemon && (
        <PokemonDetail
          pokemon={selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
        />
      )}
    </div>
  );
}

export default Pokedex;
