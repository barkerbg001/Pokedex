import { FiCheck } from 'react-icons/fi';
import { typeColors } from '../../constants';
import Modal from '../Modal/Modal';
import useGridNavigation from '../../hooks/useGridNavigation';
import './TypeFilterModal.css';

function TypeFilterModal({ types, selectedTypes, onToggleType, onClear, onClose }) {
  const gridNav = useGridNavigation(types.length);

  return (
    <Modal label="Filter by type" className="type-filter-content" onClose={onClose}>
      <div className="type-filter-header" data-sheet-drag>
        <h2>Filter by Type</h2>
        {selectedTypes.length > 0 && (
          <button className="clear-filters-btn" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      <div className="type-filter-body">
        <div
          ref={gridNav.containerRef}
          className="type-filter-grid"
          onFocus={gridNav.onFocus}
          onKeyDown={gridNav.onKeyDown}
        >
          {types.map((t, index) => {
            const active = selectedTypes.includes(t.name);
            const color = typeColors[t.name] || '#888';
            return (
              <button
                key={t.name}
                className={`type-block vertical ${active ? 'active' : ''}`}
                data-grid-focus
                tabIndex={gridNav.getTabIndex(index)}
                onClick={() => onToggleType(t.name)}
                aria-pressed={active}
                style={{ borderColor: color }}
                title={`Filter by ${t.name}`}
              >
                {/* Non-color cue for the selected state */}
                {active && <FiCheck className="type-check" aria-hidden="true" />}
                <div
                  className="type-swatch-outer"
                  style={{ backgroundColor: color, borderColor: color }}
                >
                  <img
                    src={`/types/${t.name}.svg`}
                    alt={`${t.name} icon`}
                    className="type-icon"
                    width={24}
                    height={24}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span className="type-label">{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export default TypeFilterModal;
