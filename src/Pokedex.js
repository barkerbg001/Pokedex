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

  const loadPokemons = useCallback(async () => {
    if (!hasMore) return;
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
  }, [offset, hasMore]);

  useEffect(() => {
    loadPokemons();
  }, []);

  useEffect(() => {
    async function loadFilters() {
      try {
        const typeRes = await axios.get('https://pokeapi.co/api/v2/type?limit=100');
        setTypes(typeRes.data.results);
        const genRes = await axios.get('https://pokeapi.co/api/v2/generation?limit=100');
        setGenerations(genRes.data.results);
      } catch (e) {
        console.error(e);
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
