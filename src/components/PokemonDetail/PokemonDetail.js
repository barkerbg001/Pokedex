import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import '../../styles/modal.css';
import './PokemonDetail.css';
import { getTypeColor } from '../../constants';
import pokeapi from '../../api/pokeapi';

// Build the list of sprite variants PokeAPI provides for a Pokemon,
// skipping any that are missing (mock data only has front_default).
function getSpriteVariants(sprites) {
  if (!sprites) return [];
  const candidates = [
    { label: 'Default', url: sprites.front_default },
    { label: 'Shiny', url: sprites.front_shiny },
    { label: 'Back', url: sprites.back_default },
    { label: 'Back Shiny', url: sprites.back_shiny },
    { label: 'Official Art', url: sprites.other?.['official-artwork']?.front_default },
    { label: 'Official Art Shiny', url: sprites.other?.['official-artwork']?.front_shiny },
    { label: 'Home', url: sprites.other?.home?.front_default },
    { label: 'Home Shiny', url: sprites.other?.home?.front_shiny },
  ];
  return candidates.filter((c) => !!c.url);
}

// Turn a variety name like "giratina-origin" into a short label like "Origin",
// stripping the shared species name prefix (e.g. "giratina-").
function getFormLabel(varietyName, speciesName) {
  if (varietyName === speciesName) return 'Default';
  const prefix = `${speciesName}-`;
  const suffix = varietyName.startsWith(prefix) ? varietyName.slice(prefix.length) : varietyName;
  return suffix
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PokemonDetail({ pokemon, onClose }) {
  const [displayedPokemon, setDisplayedPokemon] = useState(pokemon);
  const [forms, setForms] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [evolution, setEvolution] = useState([]);
  const [evolutionLoading, setEvolutionLoading] = useState(true);
  const [typeEffectiveness, setTypeEffectiveness] = useState({});
  const [effectivenessLoading, setEffectivenessLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const spriteVariants = getSpriteVariants(displayedPokemon.sprites);
  const [activeSprite, setActiveSprite] = useState(
    displayedPokemon.sprites.front_default || spriteVariants[0]?.url
  );

  // Switching to a newly-selected Pokemon from the grid resets which form is shown
  useEffect(() => {
    setDisplayedPokemon(pokemon);
  }, [pokemon]);

  // Reset the selected sprite whenever the displayed Pokemon (or form) changes
  useEffect(() => {
    setActiveSprite(
      displayedPokemon.sprites.front_default || getSpriteVariants(displayedPokemon.sprites)[0]?.url
    );
  }, [displayedPokemon]);

  // Evolution chain and alternate forms are tied to the species, which is shared
  // across all forms of a Pokemon - so this only needs to run once per species.
  useEffect(() => {
    async function fetchSpeciesData() {
      setEvolutionLoading(true);
      try {
        // Pokedex.js already replaces `species` with the fully-expanded species
        // resource (for generation grouping) - that object has no self `.url`,
        // so only fetch by URL when species is still just a bare {name, url} ref.
        const species = pokemon.species.evolution_chain
          ? pokemon.species
          : (await pokeapi.get(pokemon.species.url)).data;

        const evoRes = await pokeapi.get(species.evolution_chain.url);
        const chainList = [];
        function traverse(node, stage = 1) {
          chainList.push({ name: node.species.name, stage });
          node.evolves_to.forEach((n) => traverse(n, stage + 1));
        }
        traverse(evoRes.data.chain);
        setEvolution(chainList);

        const varieties = (species.varieties || []).map((v) => ({
          name: v.pokemon.name,
          url: v.pokemon.url,
          isDefault: v.is_default,
          label: getFormLabel(v.pokemon.name, species.name),
        }));
        setForms(varieties);
      } catch {
        console.log('Could not load evolution/forms data');
        setEvolution([]);
        setForms([]);
      } finally {
        setEvolutionLoading(false);
      }
    }
    fetchSpeciesData();
  }, [pokemon]);

  // Type effectiveness depends on the *displayed* form's types, since alternate
  // forms (e.g. Rotom's appliance forms) can have different types than the default.
  useEffect(() => {
    async function fetchEffectiveness() {
      setEffectivenessLoading(true);
      try {
        const rel = { weak: new Set(), resistant: new Set(), immune: new Set() };
        for (const t of displayedPokemon.types) {
          const typeData = await pokeapi.get(t.type.url);
          typeData.data.damage_relations.double_damage_from.forEach((x) => rel.weak.add(x.name));
          typeData.data.damage_relations.half_damage_from.forEach((x) => rel.resistant.add(x.name));
          typeData.data.damage_relations.no_damage_from.forEach((x) => rel.immune.add(x.name));
        }
        setTypeEffectiveness({
          weak: Array.from(rel.weak),
          resistant: Array.from(rel.resistant),
          immune: Array.from(rel.immune),
        });
      } catch {
        console.log('Could not load type effectiveness data');
        setTypeEffectiveness({ weak: [], resistant: [], immune: [] });
      } finally {
        setEffectivenessLoading(false);
      }
    }
    fetchEffectiveness();
  }, [displayedPokemon]);

  const handleFormSelect = async (form) => {
    if (form.name === displayedPokemon.name || formLoading) return;
    setFormLoading(true);
    try {
      const res = await pokeapi.get(form.url);
      setDisplayedPokemon({ ...res.data, species: pokemon.species });
    } catch {
      console.log('Could not load that form, keeping current view');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatColor = (stat) => {
    if (stat >= 100) return '#4CAF50';
    if (stat >= 70) return '#8BC34A';
    if (stat >= 50) return '#FFC107';
    return '#FF5722';
  };

  const calculateTotalStats = () => {
    return displayedPokemon.stats.reduce((total, stat) => total + stat.base_stat, 0);
  };

  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal') {
      onClose();
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="close-button" onClick={onClose} aria-label="Close">
          <FiX />
        </button>

        <div className="detail-header">
          <div className="header-content">
            <h2 className="pokemon-name">{displayedPokemon.name.replace('-', ' ')}</h2>
            <span className="pokemon-id">#{String(displayedPokemon.id).padStart(3, '0')}</span>
          </div>
          <div className="pokemon-types">
            {displayedPokemon.types.map((t) => (
              <span
                key={t.type.name}
                className="type-badge"
                style={{ backgroundColor: getTypeColor(t.type.name) }}
              >
                {t.type.name}
              </span>
            ))}
          </div>
        </div>

        <div className="detail-body">
          <div className="pokemon-image-container">
            <img className="pokemon-image" src={activeSprite} alt={displayedPokemon.name} />
            <div className="total-stats">Total: {calculateTotalStats()}</div>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
            <button
              className={`tab ${activeTab === 'abilities' ? 'active' : ''}`}
              onClick={() => setActiveTab('abilities')}
            >
              Abilities
            </button>
            <button
              className={`tab ${activeTab === 'evolution' ? 'active' : ''}`}
              onClick={() => setActiveTab('evolution')}
            >
              Evolution
            </button>
            <button
              className={`tab ${activeTab === 'moves' ? 'active' : ''}`}
              onClick={() => setActiveTab('moves')}
            >
              Moves
            </button>
            <button
              className={`tab ${activeTab === 'effectiveness' ? 'active' : ''}`}
              onClick={() => setActiveTab('effectiveness')}
            >
              Effectiveness
            </button>
            {spriteVariants.length > 1 && (
              <button
                className={`tab ${activeTab === 'sprites' ? 'active' : ''}`}
                onClick={() => setActiveTab('sprites')}
              >
                Sprites
              </button>
            )}
            {forms.length > 1 && (
              <button
                className={`tab ${activeTab === 'forms' ? 'active' : ''}`}
                onClick={() => setActiveTab('forms')}
              >
                Forms
              </button>
            )}
          </div>

          <div className="tab-content">
            {activeTab === 'stats' && (
              <div className="stats-section">
                {displayedPokemon.stats.map((s) => (
                  <div key={s.stat.name} className="stat-row">
                    <span className="stat-name">{s.stat.name.replace('-', ' ')}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar"
                        style={{
                          width: `${Math.min((s.base_stat / 255) * 100, 100)}%`,
                          backgroundColor: getStatColor(s.base_stat),
                        }}
                      ></div>
                    </div>
                    <span className="stat-value">{s.base_stat}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'abilities' && (
              <div className="abilities-section">
                {displayedPokemon.abilities.map((a) => (
                  <div key={a.ability.name} className="ability-item">
                    <span className="ability-name">{a.ability.name.replace('-', ' ')}</span>
                    {a.is_hidden && <span className="hidden-badge">Hidden</span>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'evolution' && (
              <div className="evolution-section">
                {evolutionLoading ? (
                  <div className="loading-spinner">Loading evolution chain...</div>
                ) : evolution.length > 0 ? (
                  <div className="evolution-chain">
                    {evolution.map((e, index) => (
                      <React.Fragment key={e.name}>
                        <div className="evolution-stage">
                          <div className="evolution-name">{e.name}</div>
                          <div className="evolution-stage-label">Stage {e.stage}</div>
                        </div>
                        {index < evolution.length - 1 && <div className="evolution-arrow">→</div>}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="no-evolution">Could not load evolution data.</div>
                )}
              </div>
            )}

            {activeTab === 'moves' && (
              <div className="moves-section">
                <div className="moves-list">
                  {displayedPokemon.moves.slice(0, 20).map((m) => (
                    <div key={m.move.name} className="move-item">
                      <span className="move-name">{m.move.name.replace('-', ' ')}</span>
                      <span className="move-learn-method">
                        {m.version_group_details[0].move_learn_method.name.replace('-', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
                {displayedPokemon.moves.length > 20 && (
                  <div className="moves-note">
                    Showing first 20 of {displayedPokemon.moves.length} moves
                  </div>
                )}
              </div>
            )}

            {activeTab === 'effectiveness' && (
              <div className="effectiveness-section">
                {effectivenessLoading ? (
                  <div className="loading-spinner">Loading type effectiveness...</div>
                ) : !typeEffectiveness.weak?.length &&
                  !typeEffectiveness.resistant?.length &&
                  !typeEffectiveness.immune?.length ? (
                  <div className="no-evolution">Could not load type effectiveness data.</div>
                ) : (
                  <>
                    {typeEffectiveness.weak && typeEffectiveness.weak.length > 0 && (
                      <div className="effectiveness-group">
                        <h4 className="effectiveness-title weak">Weak Against (2x damage)</h4>
                        <div className="type-pills">
                          {typeEffectiveness.weak.map((type) => (
                            <span
                              key={type}
                              className="type-pill"
                              style={{ backgroundColor: getTypeColor(type) }}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {typeEffectiveness.resistant && typeEffectiveness.resistant.length > 0 && (
                      <div className="effectiveness-group">
                        <h4 className="effectiveness-title resistant">
                          Resistant To (0.5x damage)
                        </h4>
                        <div className="type-pills">
                          {typeEffectiveness.resistant.map((type) => (
                            <span
                              key={type}
                              className="type-pill"
                              style={{ backgroundColor: getTypeColor(type) }}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {typeEffectiveness.immune && typeEffectiveness.immune.length > 0 && (
                      <div className="effectiveness-group">
                        <h4 className="effectiveness-title immune">Immune To (0x damage)</h4>
                        <div className="type-pills">
                          {typeEffectiveness.immune.map((type) => (
                            <span
                              key={type}
                              className="type-pill"
                              style={{ backgroundColor: getTypeColor(type) }}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'sprites' && (
              <div className="sprites-section">
                <div className="sprite-grid">
                  {spriteVariants.map((variant) => (
                    <button
                      key={variant.label}
                      type="button"
                      className={`sprite-card ${activeSprite === variant.url ? 'active' : ''}`}
                      onClick={() => setActiveSprite(variant.url)}
                      aria-pressed={activeSprite === variant.url}
                    >
                      <img src={variant.url} alt={`${displayedPokemon.name} - ${variant.label}`} />
                      <span>{variant.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'forms' && (
              <div className="forms-section">
                {formLoading && <div className="loading-spinner">Loading form...</div>}
                <div className="form-grid">
                  {forms.map((form) => (
                    <button
                      key={form.name}
                      type="button"
                      className={`form-card ${displayedPokemon.name === form.name ? 'active' : ''}`}
                      onClick={() => handleFormSelect(form)}
                      disabled={formLoading}
                      aria-pressed={displayedPokemon.name === form.name}
                    >
                      <span className="form-label">{form.label}</span>
                      {form.isDefault && <span className="form-default-badge">Default</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PokemonDetail;
