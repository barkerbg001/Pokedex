import React, { useState, useEffect, useRef } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { FiShare2 } from 'react-icons/fi';
import Modal from '../Modal/Modal';
import './PokemonDetail.css';
import { getTypeColor, getTypeTextColor } from '../../constants';
import pokeapi from '../../api/pokeapi';
import { devWarn } from '../../logger';

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

// Prefer the high-res official artwork for the hero image; the 96px
// front_default sprite looks blurry when scaled up.
function getDefaultSprite(sprites) {
  return (
    sprites.other?.['official-artwork']?.front_default ||
    sprites.front_default ||
    getSpriteVariants(sprites)[0]?.url
  );
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

function PokemonDetail({ pokemon, isFavorite, onToggleFavorite, onShare, onClose }) {
  const [displayedPokemon, setDisplayedPokemon] = useState(pokemon);
  const [forms, setForms] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [evolution, setEvolution] = useState([]);
  const [evolutionLoading, setEvolutionLoading] = useState(true);
  const [typeEffectiveness, setTypeEffectiveness] = useState({});
  const [effectivenessLoading, setEffectivenessLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const spriteVariants = getSpriteVariants(displayedPokemon.sprites);
  const [activeSprite, setActiveSprite] = useState(getDefaultSprite(displayedPokemon.sprites));

  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'abilities', label: 'Abilities' },
    { id: 'evolution', label: 'Evolution' },
    { id: 'moves', label: 'Moves' },
    { id: 'effectiveness', label: 'Effectiveness' },
    spriteVariants.length > 1 && { id: 'sprites', label: 'Sprites' },
    forms.length > 1 && { id: 'forms', label: 'Forms' },
  ].filter(Boolean);

  // Fade whichever edge of the tab row has more tabs scrolled out of view,
  // so tabs past the sheet's edge (Effectiveness, Sprites, Forms) are discoverable
  const tabsRef = useRef(null);
  const [tabFade, setTabFade] = useState({ left: false, right: false });
  const tabCount = tabs.length;
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
      setTabFade((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [tabCount]);

  // Switching to a newly-selected Pokemon from the grid resets which form is shown
  useEffect(() => {
    setDisplayedPokemon(pokemon);
  }, [pokemon]);

  // Reset the selected sprite whenever the displayed Pokemon (or form) changes
  useEffect(() => {
    setActiveSprite(getDefaultSprite(displayedPokemon.sprites));
  }, [displayedPokemon]);

  // Evolution chain and alternate forms are tied to the species, which is shared
  // across all forms of a Pokemon - so this only needs to run once per species.
  // Each fetch effect ignores its results once superseded (a different Pokemon or
  // form was picked mid-fetch, or the sheet closed), so a slow response can't
  // overwrite newer data. Requests aren't aborted: pokeapi shares in-flight
  // requests between callers and caches the results, so they aren't wasted.
  useEffect(() => {
    let ignore = false;
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
        if (ignore) return;
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
        if (ignore) return;
        devWarn('Could not load evolution/forms data');
        setEvolution([]);
        setForms([]);
      } finally {
        if (!ignore) setEvolutionLoading(false);
      }
    }
    fetchSpeciesData();
    return () => {
      ignore = true;
    };
  }, [pokemon]);

  // Type effectiveness depends on the *displayed* form's types, since alternate
  // forms (e.g. Rotom's appliance forms) can have different types than the default.
  useEffect(() => {
    let ignore = false;
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
        if (ignore) return;
        setTypeEffectiveness({
          weak: Array.from(rel.weak),
          resistant: Array.from(rel.resistant),
          immune: Array.from(rel.immune),
        });
      } catch {
        if (ignore) return;
        devWarn('Could not load type effectiveness data');
        setTypeEffectiveness({ weak: [], resistant: [], immune: [] });
      } finally {
        if (!ignore) setEffectivenessLoading(false);
      }
    }
    fetchEffectiveness();
    return () => {
      ignore = true;
    };
  }, [displayedPokemon]);

  // Latest `pokemon` prop, so a form fetch can tell if a different Pokemon was
  // opened while it was in flight
  const pokemonRef = useRef(pokemon);
  useEffect(() => {
    pokemonRef.current = pokemon;
  }, [pokemon]);

  const handleFormSelect = async (form) => {
    if (form.name === displayedPokemon.name || formLoading) return;
    setFormLoading(true);
    try {
      const res = await pokeapi.get(form.url);
      if (pokemonRef.current !== pokemon) return;
      setDisplayedPokemon({ ...res.data, species: pokemon.species });
    } catch {
      devWarn('Could not load that form, keeping current view');
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

  return (
    <Modal label={displayedPokemon.name} className="pokemon-detail-sheet" onClose={onClose}>
      <div className="detail-header" data-sheet-drag>
        <div className="pokemon-image-container" aria-hidden="true">
          {/* Decorative background art; the name/id are the accessible label
              (crossOrigin lets the service worker cache sprites, see PokemonGrid) */}
          <img className="pokemon-image" src={activeSprite} crossOrigin="anonymous" alt="" />
        </div>
        <div className="header-top">
          <div className="detail-title">
            <h2 className="pokemon-name">{displayedPokemon.name.replaceAll('-', ' ')}</h2>
            <span className="pokemon-id">#{String(displayedPokemon.id).padStart(3, '0')}</span>
          </div>
        </div>
        <div className="pokemon-types">
          {displayedPokemon.types.map((t) => (
            <span
              key={t.type.name}
              className="type-badge"
              style={{
                backgroundColor: getTypeColor(t.type.name),
                color: getTypeTextColor(t.type.name),
              }}
            >
              {t.type.name}
            </span>
          ))}
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-quick-actions">
          {/* Favorites the Pokemon itself, whichever form is being shown */}
          <button
            type="button"
            className={`detail-action-btn ${isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={`Favorite ${pokemon.name}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? <FaStar /> : <FaRegStar />}
          </button>
          <button
            type="button"
            className="detail-action-btn"
            onClick={onShare}
            aria-label={`Share ${pokemon.name}`}
            title="Share"
          >
            <FiShare2 />
          </button>
        </div>

        <div
          className={`tabs-wrapper ${tabFade.left ? 'fade-left' : ''} ${
            tabFade.right ? 'fade-right' : ''
          }`}
        >
          <div ref={tabsRef} className="tabs">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`tab ${activeTab === id ? 'active' : ''}`}
                onClick={(e) => {
                  setActiveTab(id);
                  e.currentTarget.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                    behavior: 'smooth',
                  });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'stats' && (
            <div className="stats-section">
              <div className="stat-row-total">
                <span className="stat-name">Total</span>
                <span className="stat-value">{calculateTotalStats()}</span>
              </div>
              {displayedPokemon.stats.map((s) => (
                <div key={s.stat.name} className="stat-row">
                  <span className="stat-name">{s.stat.name.replaceAll('-', ' ')}</span>
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
                  <span className="ability-name">{a.ability.name.replaceAll('-', ' ')}</span>
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
                    <span className="move-name">{m.move.name.replaceAll('-', ' ')}</span>
                    {m.version_group_details[0] && (
                      <span className="move-learn-method">
                        {m.version_group_details[0].move_learn_method.name.replaceAll('-', ' ')}
                      </span>
                    )}
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
                            style={{
                              backgroundColor: getTypeColor(type),
                              color: getTypeTextColor(type),
                            }}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {typeEffectiveness.resistant && typeEffectiveness.resistant.length > 0 && (
                    <div className="effectiveness-group">
                      <h4 className="effectiveness-title resistant">Resistant To (0.5x damage)</h4>
                      <div className="type-pills">
                        {typeEffectiveness.resistant.map((type) => (
                          <span
                            key={type}
                            className="type-pill"
                            style={{
                              backgroundColor: getTypeColor(type),
                              color: getTypeTextColor(type),
                            }}
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
                            style={{
                              backgroundColor: getTypeColor(type),
                              color: getTypeTextColor(type),
                            }}
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
                    <img
                      src={variant.url}
                      crossOrigin="anonymous"
                      alt={`${displayedPokemon.name} - ${variant.label}`}
                    />
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
    </Modal>
  );
}

export default PokemonDetail;
