import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './Pokedex.css';

function Pokedex() {
  const [pokemons, setPokemons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    setPokemons(prev => [...prev, ...results.map(r => r.data)]);
  }, [offset, hasMore]);

  useEffect(() => {
    loadPokemons();
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



  return (
    <div className="pokedex">
      <input
        type="text"
        placeholder="Search Pokémon"
        className="search-input"
        onChange={handleSearchChange} // We will define this function next
      />
      <div className="pokemon-grid">
        {pokemons
          .filter(pokemon => pokemon.name.includes(searchQuery))
          .map(pokemon => (
            <div key={pokemon.id} className="pokemon-card">
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
    </div>
  );
}

export default Pokedex;
