import { FiGrid, FiLayers, FiStar, FiFilter, FiSettings } from 'react-icons/fi';
import './BottomNav.css';

// "generation-iv" -> "Gen IV"
function getShortGenerationLabel(generation) {
  if (!generation) return 'Generation';
  const numeral = generation.name.split('-')[1];
  return numeral ? `Gen ${numeral.toUpperCase()}` : generation.displayName;
}

// Mobile-only replacement for the sidebar Menu (hidden on desktop via CSS)
function BottomNav({
  currentGeneration,
  view,
  filterCount,
  onBrowse,
  onOpenGenerations,
  onSelectFavorites,
  onOpenFilter,
  onSelectSettings,
}) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <button
        type="button"
        className={`bottom-nav-item ${view === 'browse' ? 'active' : ''}`}
        onClick={onBrowse}
        aria-current={view === 'browse' ? 'page' : undefined}
      >
        <FiGrid />
        <span>Browse</span>
      </button>
      <button
        type="button"
        className="bottom-nav-item"
        onClick={onOpenGenerations}
        aria-haspopup="dialog"
      >
        <FiLayers />
        <span>{getShortGenerationLabel(currentGeneration)}</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${view === 'favorites' ? 'active' : ''}`}
        onClick={onSelectFavorites}
        aria-current={view === 'favorites' ? 'page' : undefined}
      >
        <FiStar />
        <span>Favorites</span>
      </button>
      <button
        type="button"
        className="bottom-nav-item"
        onClick={onOpenFilter}
        aria-haspopup="dialog"
        aria-label={filterCount > 0 ? `Filter (${filterCount} active)` : 'Filter'}
      >
        <span className="bottom-nav-icon">
          <FiFilter />
          {filterCount > 0 && <span className="bottom-nav-badge">{filterCount}</span>}
        </span>
        <span>Filter</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${view === 'settings' ? 'active' : ''}`}
        onClick={onSelectSettings}
        aria-current={view === 'settings' ? 'page' : undefined}
      >
        <FiSettings />
        <span>Settings</span>
      </button>
    </nav>
  );
}

export default BottomNav;
