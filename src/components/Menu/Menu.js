import { FiSettings, FiStar } from 'react-icons/fi';
import GenerationList from '../GenerationList/GenerationList';
import './Menu.css';

function Menu({
  generations,
  selectedGeneration,
  onSelectGeneration,
  view,
  favoritesCount,
  onSelectFavorites,
  onSelectSettings,
}) {
  return (
    <nav className="menu" aria-label="Main">
      <div className="menu-scroll">
        <h1 className="menu-title">Pokédex</h1>
        <button
          type="button"
          className={`menu-favorites-item ${view === 'favorites' ? 'active' : ''}`}
          onClick={onSelectFavorites}
          aria-current={view === 'favorites' ? 'page' : undefined}
        >
          <FiStar />
          <span>Favorites</span>
          {favoritesCount > 0 && <span className="menu-item-count">{favoritesCount}</span>}
        </button>
        <h3 className="sidebar-title">Generations</h3>
        <GenerationList
          generations={generations}
          selectedGeneration={view === 'browse' ? selectedGeneration : null}
          onSelectGeneration={onSelectGeneration}
        />
      </div>

      <button
        type="button"
        className={`menu-settings-item ${view === 'settings' ? 'active' : ''}`}
        onClick={onSelectSettings}
        aria-current={view === 'settings' ? 'page' : undefined}
      >
        <FiSettings />
        <span>Settings</span>
      </button>
    </nav>
  );
}

export default Menu;
