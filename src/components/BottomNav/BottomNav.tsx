import { FiGrid, FiLayers, FiStar, FiHelpCircle, FiSettings } from 'react-icons/fi';
import type { AppView, Generation } from '../../types/pokeapi';
import './BottomNav.css';

// "generation-iv" -> "Gen IV"
function getShortGenerationLabel(generation: Generation | undefined) {
  if (!generation) return 'Generation';
  const numeral = generation.name.split('-')[1];
  return numeral ? `Gen ${numeral.toUpperCase()}` : generation.displayName;
}

type Props = {
  currentGeneration: Generation | undefined;
  view: AppView;
  onBrowse: () => void;
  onOpenGenerations: () => void;
  onSelectFavorites: () => void;
  onSelectQuiz: () => void;
  onSelectSettings: () => void;
};

// Mobile-only replacement for the sidebar Menu (hidden on desktop via CSS)
function BottomNav({
  currentGeneration,
  view,
  onBrowse,
  onOpenGenerations,
  onSelectFavorites,
  onSelectQuiz,
  onSelectSettings,
}: Props) {
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
        className={`bottom-nav-item ${view === 'quiz' ? 'active' : ''}`}
        onClick={onSelectQuiz}
        aria-current={view === 'quiz' ? 'page' : undefined}
        aria-label="Who’s That Pokémon?"
      >
        <FiHelpCircle />
        <span>Quiz</span>
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
