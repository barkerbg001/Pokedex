import './GenerationList.css';

function GenerationList({ generations, selectedGeneration, onSelectGeneration }) {
  return (
    <ul className="generation-list">
      {generations.map((gen) => (
        <li key={gen.name}>
          <button
            type="button"
            className={`generation-item ${selectedGeneration === gen.name ? 'active' : ''}`}
            onClick={() => onSelectGeneration(gen.name)}
            aria-pressed={selectedGeneration === gen.name}
          >
            <span className="generation-item-name">{gen.displayName}</span>
            {gen.speciesList.length > 0 && (
              <span className="generation-item-count">{gen.speciesList.length}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default GenerationList;
