import { FiSettings } from 'react-icons/fi';
import './Menu.css';

function Menu({
  generations,
  selectedGeneration,
  onSelectGeneration,
  settingsActive,
  onSelectSettings,
}) {
  return (
    <nav className="menu" aria-label="Main">
      <div className="menu-scroll">
        <h1 className="menu-title">Pokédex</h1>
        <h3 className="sidebar-title">Generations</h3>
        <ul className="generation-list">
          {generations.map((gen) => (
            <li key={gen.name}>
              <button
                type="button"
                className={`generation-item ${
                  !settingsActive && selectedGeneration === gen.name ? 'active' : ''
                }`}
                onClick={() => onSelectGeneration(gen.name)}
                aria-pressed={!settingsActive && selectedGeneration === gen.name}
              >
                <span className="generation-item-name">{gen.displayName}</span>
                {gen.speciesList.length > 0 && (
                  <span className="generation-item-count">{gen.speciesList.length}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={`menu-settings-item ${settingsActive ? 'active' : ''}`}
        onClick={onSelectSettings}
        aria-pressed={settingsActive}
      >
        <FiSettings />
        <span>Settings</span>
      </button>
    </nav>
  );
}

export default Menu;
