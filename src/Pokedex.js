import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './Pokedex.css';
import PokemonDetail from './PokemonDetail';

function Pokedex() {
  const [pokemons, setPokemons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('');
  const [abilityQuery, setAbilityQuery] = useState('');
  const [minAttack, setMinAttack] = useState(0);
  const [types, setTypes] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef(null);

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
        const genRes = await axios.get('https://pokeapi.co/api/v2/generation?limit=100');
        setGenerations(genRes.data.results);
      } catch (e) {
        console.log('Using mock filter data');
        // Mock filter data when API is not available
        setTypes([
          { name: 'fire' },
          { name: 'water' },
          { name: 'grass' },
          { name: 'poison' }
        ]);
        setGenerations([
          { name: 'generation-i' },
          { name: 'generation-ii' }
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

  function handleSearchChange(event) {
    setSearchQuery(event.target.value.toLowerCase());
  }

  const filteredPokemons = pokemons
    .filter(pokemon => pokemon.name.includes(searchQuery))
    .filter(pokemon =>
      selectedType ? pokemon.types.some(t => t.type.name === selectedType) : true
    )
    .filter(pokemon =>
      selectedGeneration
        ? pokemon.species.generation.name === selectedGeneration
        : true
    )
    .filter(pokemon =>
      abilityQuery
        ? pokemon.abilities.some(a =>
            a.ability.name.toLowerCase().includes(abilityQuery)
          )
        : true
    )
    .filter(pokemon => {
      const attack = pokemon.stats.find(s => s.stat.name === 'attack');
      return attack ? attack.base_stat >= minAttack : true;
    });



  return (
    <div className="pokedex">
      <input
        type="text"
        placeholder="Search Pokémon"
        className="search-input"
        onChange={handleSearchChange}
      />
      <div className="filters">
        <select onChange={e => setSelectedType(e.target.value)} value={selectedType}>
          <option value="">All Types</option>
          {types.map(t => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          onChange={e => setSelectedGeneration(e.target.value)}
          value={selectedGeneration}
        >
          <option value="">All Generations</option>
          {generations.map(g => (
            <option key={g.name} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Ability"
          value={abilityQuery}
          onChange={e => setAbilityQuery(e.target.value.toLowerCase())}
        />
        <input
          type="number"
          placeholder="Min Attack"
          value={minAttack}
          onChange={e => setMinAttack(Number(e.target.value))}
        />
      </div>
      <div className="pokemon-grid">
        {filteredPokemons.map(pokemon => (
          <div
            key={pokemon.id}
            className="pokemon-card"
            onClick={() => setSelectedPokemon(pokemon)}
          >
            <img
              src={pokemon.sprites.front_default}
              alt={pokemon.name}
              loading="lazy"
            />
            <p>{pokemon.name}</p>
          </div>
        ))}
      </div>
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
