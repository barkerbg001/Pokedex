import { FaStar, FaRegStar } from 'react-icons/fa';
import useGridNavigation from '../../hooks/useGridNavigation';

// Grid of Pokemon cards with arrow-key navigation. Each card opens the Pokemon's
// details, and has a star button to add or remove it from favorites.
function PokemonGrid({ pokemons, isFavorite, onToggleFavorite, onOpen }) {
  const gridNav = useGridNavigation(pokemons.length);

  return (
    <div
      ref={gridNav.containerRef}
      className="pokemon-grid"
      onFocus={gridNav.onFocus}
      onKeyDown={gridNav.onKeyDown}
    >
      {pokemons.map((pokemon, index) => {
        const favorite = isFavorite(pokemon.id);
        return (
          <div key={pokemon.id} className="pokemon-card">
            {/* Covers the whole card (see .pokemon-card-open::after); shown last via CSS order */}
            <button
              type="button"
              className="pokemon-card-open"
              data-grid-focus
              tabIndex={gridNav.getTabIndex(index)}
              onClick={() => onOpen(pokemon)}
            >
              {pokemon.name}
            </button>
            <div className="card-top">
              {/* crossOrigin: a CORS response, unlike an opaque one, can be cached for offline use (see sw.js) */}
              <img
                src={pokemon.sprites.front_default}
                crossOrigin="anonymous"
                alt=""
                width={100}
                height={100}
                loading="lazy"
              />
              <button
                type="button"
                className={`fav-btn ${favorite ? 'active' : ''}`}
                tabIndex={gridNav.getTabIndex(index)}
                onClick={() => onToggleFavorite(pokemon)}
                aria-pressed={favorite}
                aria-label={`Favorite ${pokemon.name}`}
                title={favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {favorite ? <FaStar /> : <FaRegStar />}
              </button>
            </div>
            <span className="pokemon-card-id">#{String(pokemon.id).padStart(4, '0')}</span>
          </div>
        );
      })}
    </div>
  );
}

export default PokemonGrid;
