import type { Generation } from '../../types/pokeapi';
import './GenerationList.css';

// "generation-iv" -> "IV"
function getNumeral(generation: Generation) {
  return generation.name.split('-')[1]?.toUpperCase() || null;
}

type Props = {
  generations: Generation[];
  selectedGeneration: string | null;
  onSelectGeneration: (name: string) => void;
};

// Each row is "[IV] Sinnoh  107": a compact form that fits on one line, with
// the full "Generation IV (Sinnoh)" name as its accessible name
function GenerationList({ generations, selectedGeneration, onSelectGeneration }: Props) {
  return (
    <ul className="generation-list">
      {generations.map((gen) => {
        const numeral = gen.region && getNumeral(gen);
        const count = gen.speciesList.length;
        return (
          <li key={gen.name}>
            <button
              type="button"
              className={`generation-item ${selectedGeneration === gen.name ? 'active' : ''}`}
              onClick={() => onSelectGeneration(gen.name)}
              aria-pressed={selectedGeneration === gen.name}
              aria-label={count > 0 ? `${gen.displayName}, ${count} Pokémon` : gen.displayName}
            >
              {numeral && (
                <span className="generation-item-numeral" aria-hidden="true">
                  {numeral}
                </span>
              )}
              <span className="generation-item-name">{numeral ? gen.region : gen.displayName}</span>
              {count > 0 && <span className="generation-item-count">{count}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default GenerationList;
