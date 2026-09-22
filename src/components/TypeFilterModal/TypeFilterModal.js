import { FiX } from 'react-icons/fi';
import { typeColors } from '../../constants';
import '../../styles/modal.css';
import './TypeFilterModal.css';

function TypeFilterModal({ types, selectedTypes, onToggleType, onClear, onClose }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div className="modal-content type-filter-content">
        <button className="close-button" onClick={onClose} aria-label="Close">
          <FiX />
        </button>

        <div className="type-filter-header">
          <h2>Filter by Type</h2>
          {selectedTypes.length > 0 && (
            <button className="clear-filters-btn" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>

        <div className="type-filter-body">
          <div className="type-filter-grid">
            {types.map((t) => {
              const active = selectedTypes.includes(t.name);
              const color = typeColors[t.name] || '#888';
              const translucent = `${color}22`; // append alpha for light tint
              return (
                <button
                  key={t.name}
                  className={`type-block vertical ${active ? 'active' : ''}`}
                  onClick={() => onToggleType(t.name)}
                  aria-pressed={active}
                  style={{ borderColor: color }}
                  title={`Filter by ${t.name}`}
                >
                  <div
                    className="type-swatch-outer"
                    style={{
                      backgroundColor: active ? color : translucent,
                      borderColor: color,
                      boxShadow: active ? `0 0 0 6px ${color}22` : 'none',
                    }}
                  >
                    <img
                      src={`/types/${t.name}.svg`}
                      alt={`${t.name} icon`}
                      className="type-icon"
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
      </div>
    </div>
  );
}

export default TypeFilterModal;
