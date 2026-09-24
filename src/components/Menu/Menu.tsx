import type { IconType } from 'react-icons';
import { FiHelpCircle, FiSettings, FiStar } from 'react-icons/fi';
import GenerationList from '../GenerationList/GenerationList';
import type { AppView, Generation } from '../../types/pokeapi';
import './Menu.css';

type MenuItemProps = {
  icon: IconType;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
};

// A sidebar link styled like a generation row, with its icon in the numeral's place
function MenuItem({ icon: Icon, label, count, active, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      className={`menu-item ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="menu-item-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="menu-item-label">{label}</span>
      {count !== undefined && count > 0 && <span className="menu-item-count">{count}</span>}
    </button>
  );
}

type Props = {
  generations: Generation[];
  selectedGeneration: string | null;
  onSelectGeneration: (name: string) => void;
  view: AppView;
  favoritesCount: number;
  onSelectFavorites: () => void;
  onSelectQuiz: () => void;
  onSelectSettings: () => void;
};

function Menu({
  generations,
  selectedGeneration,
  onSelectGeneration,
  view,
  favoritesCount,
  onSelectFavorites,
  onSelectQuiz,
  onSelectSettings,
}: Props) {
  return (
    <nav className="menu" aria-label="Main">
      <div className="menu-scroll">
        <div className="menu-brand">
          <span className="menu-logo" aria-hidden="true" />
          <h1 className="menu-title">Pokédex</h1>
        </div>

        <h3 className="sidebar-title">Generations</h3>
        <GenerationList
          generations={generations}
          selectedGeneration={view === 'browse' ? selectedGeneration : null}
          onSelectGeneration={onSelectGeneration}
        />

        <h3 className="sidebar-title">Your Pokédex</h3>
        <div className="menu-group">
          <MenuItem
            icon={FiStar}
            label="Favorites"
            count={favoritesCount}
            active={view === 'favorites'}
            onClick={onSelectFavorites}
          />
          <MenuItem
            icon={FiHelpCircle}
            label="Who’s That Pokémon?"
            active={view === 'quiz'}
            onClick={onSelectQuiz}
          />
        </div>
      </div>

      <div className="menu-footer">
        <MenuItem
          icon={FiSettings}
          label="Settings"
          active={view === 'settings'}
          onClick={onSelectSettings}
        />
      </div>
    </nav>
  );
}

export default Menu;
