import React, { useState, useEffect, useRef, type MouseEvent } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { FiShare2 } from 'react-icons/fi';
import Modal from '../Modal/Modal';
import './PokemonDetail.css';
import { getTypeColor, getTypeTextColor } from '../../constants';
import pokeapi from '../../api/pokeapi';
import { devWarn } from '../../logger';
import type {
  Pokemon,
  PokemonSpecies,
  SpeciesRef,
  NamedAPIResource,
  TypeDamageRelations,
  ChainLink,
  PokemonSprites,
} from '../../types/pokeapi';

type SpriteVariant = { label: string; url: string };

/** Sprites shape with optional variants PokeAPI may omit. */
type DetailSprites = PokemonSprites & {
  front_shiny?: string | null;
  back_default?: string | null;
  back_shiny?: string | null;
  other?: PokemonSprites['other'] & {
    'official-artwork'?: {
      front_default?: string | null;
      front_shiny?: string | null;
    };
    home?: {
      front_default?: string | null;
      front_shiny?: string | null;
    };
  };
};

type MoveLearnDetail = {
  move_learn_method: NamedAPIResource;
};

type PokemonMoveDetail = {
  move: NamedAPIResource;
  version_group_details: MoveLearnDetail[];
};

type EffectivenessGroups = {
  four: string[];
  two: string[];
  half: string[];
  quarter: string[];
  zero: string[];
};

type EffectivenessKey = keyof EffectivenessGroups;

type EvolutionStage = { name: string; stage: number };

type FormEntry = {
  name: string;
  url: string;
  isDefault: boolean;
  label: string;
};

type TabDef = { id: string; label: string };

// Build the list of sprite variants PokeAPI provides for a Pokemon,
// skipping any that are missing (not every Pokémon or form has them all).
function getSpriteVariants(sprites: DetailSprites | null | undefined): SpriteVariant[] {
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
  return candidates.filter((c): c is SpriteVariant => !!c.url);
}

// Prefer the high-res official artwork for the hero image; the 96px
// front_default sprite looks blurry when scaled up.
function getDefaultSprite(sprites: DetailSprites): string | undefined {
  return (
    sprites.other?.['official-artwork']?.front_default ||
    sprites.front_default ||
    getSpriteVariants(sprites)[0]?.url ||
    undefined
  );
}

// Combine each defending type's damage relations into one multiplier per
// attacking type (their product, not a union), so dual-type Pokémon get the
// right 4x/2x/0.5x/0.25x/0x groupings instead of listing a type as both a
// weakness and a resistance when it actually cancels out to 1x.
function combineEffectiveness(relationsList: TypeDamageRelations[]): EffectivenessGroups {
  const multiplier = new Map<string, number>();
  const apply = (types: NamedAPIResource[], factor: number) =>
    types.forEach(({ name }) => multiplier.set(name, (multiplier.get(name) ?? 1) * factor));
  relationsList.forEach(({ double_damage_from, half_damage_from, no_damage_from }) => {
    apply(double_damage_from, 2);
    apply(half_damage_from, 0.5);
    apply(no_damage_from, 0);
  });

  const groups: EffectivenessGroups = { four: [], two: [], half: [], quarter: [], zero: [] };
  const byMultiplier: Record<number, EffectivenessKey> = {
    4: 'four',
    2: 'two',
    0.5: 'half',
    0.25: 'quarter',
    0: 'zero',
  };
  for (const [name, factor] of multiplier) {
    const group = byMultiplier[factor];
    // 1x (a weakness from one type cancelled by a resistance from the other)
    // is the default and isn't shown
    if (group) groups[group].push(name);
  }
  return groups;
}

// Turn a variety name like "giratina-origin" into a short label like "Origin",
// stripping the shared species name prefix (e.g. "giratina-").
function getFormLabel(varietyName: string, speciesName: string) {
  if (varietyName === speciesName) return 'Default';
  const prefix = `${speciesName}-`;
  const suffix = varietyName.startsWith(prefix) ? varietyName.slice(prefix.length) : varietyName;
  return suffix
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Order and labels for the groups combineEffectiveness produces
const EFFECTIVENESS_GROUPS: { key: EffectivenessKey; className: string; title: string }[] = [
  { key: 'four', className: 'weak', title: 'Weak Against (4x damage)' },
  { key: 'two', className: 'weak', title: 'Weak Against (2x damage)' },
  { key: 'half', className: 'resistant', title: 'Resistant To (0.5x damage)' },
  { key: 'quarter', className: 'resistant', title: 'Resistant To (0.25x damage)' },
  { key: 'zero', className: 'immune', title: 'Immune To (0x damage)' },
];

type Props = {
  pokemon: Pokemon;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onClose: () => void;
};

function PokemonDetail({ pokemon, isFavorite, onToggleFavorite, onShare, onClose }: Props) {
  const [displayedPokemon, setDisplayedPokemon] = useState(pokemon);
  const [forms, setForms] = useState<FormEntry[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [evolution, setEvolution] = useState<EvolutionStage[]>([]);
  const [evolutionLoading, setEvolutionLoading] = useState(true);
  const [typeEffectiveness, setTypeEffectiveness] = useState<Partial<EffectivenessGroups>>({});
  const [effectivenessLoading, setEffectivenessLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const spriteVariants = getSpriteVariants(displayedPokemon.sprites as DetailSprites);
  const [activeSprite, setActiveSprite] = useState<string | undefined>(
    getDefaultSprite(displayedPokemon.sprites as DetailSprites)
  );

  const tabs: TabDef[] = [
    { id: 'stats', label: 'Stats' },
    { id: 'abilities', label: 'Abilities' },
    { id: 'evolution', label: 'Evolution' },
    { id: 'moves', label: 'Moves' },
    { id: 'effectiveness', label: 'Effectiveness' },
    spriteVariants.length > 1 && { id: 'sprites', label: 'Sprites' },
    forms.length > 1 && { id: 'forms', label: 'Forms' },
  ].filter((t): t is TabDef => Boolean(t));

  // Fade whichever edge of the tab row has more tabs scrolled out of view,
  // so tabs past the sheet's edge (Effectiveness, Sprites, Forms) are discoverable
  const tabsRef = useRef<HTMLDivElement | null>(null);
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
    setActiveSprite(getDefaultSprite(displayedPokemon.sprites as DetailSprites));
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
        const speciesField = pokemon.species;
        const species: PokemonSpecies =
          'evolution_chain' in speciesField && speciesField.evolution_chain
            ? (speciesField as PokemonSpecies)
            : (await pokeapi.get<PokemonSpecies>((speciesField as SpeciesRef).url)).data;

        const evoRes = await pokeapi.get<{ chain: ChainLink }>(species.evolution_chain!.url);
        if (ignore) return;
        const chainList: EvolutionStage[] = [];
        function traverse(node: ChainLink, stage = 1) {
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
        const relations = await Promise.all(
          displayedPokemon.types.map((t) =>
            pokeapi
              .get<{ damage_relations: TypeDamageRelations }>(t.type.url)
              .then((r) => r.data.damage_relations)
          )
        );
        if (ignore) return;
        setTypeEffectiveness(combineEffectiveness(relations));
      } catch {
        if (ignore) return;
        devWarn('Could not load type effectiveness data');
        setTypeEffectiveness({ four: [], two: [], half: [], quarter: [], zero: [] });
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

  const handleFormSelect = async (form: FormEntry) => {
    if (form.name === displayedPokemon.name || formLoading) return;
    setFormLoading(true);
    try {
      const res = await pokeapi.get<Pokemon>(form.url);
      if (pokemonRef.current !== pokemon) return;
      setDisplayedPokemon({ ...res.data, species: pokemon.species });
    } catch {
      devWarn('Could not load that form, keeping current view');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatColor = (stat: number) => {
    if (stat >= 100) return '#4CAF50';
    if (stat >= 70) return '#8BC34A';
    if (stat >= 50) return '#FFC107';
    return '#FF5722';
  };

  const calculateTotalStats = () => {
    return displayedPokemon.stats.reduce((total, stat) => total + stat.base_stat, 0);
  };

  const moves = displayedPokemon.moves as PokemonMoveDetail[];

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
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
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
                {moves.slice(0, 20).map((m) => {
                  const learnDetail = m.version_group_details[0];
                  return (
                    <div key={m.move.name} className="move-item">
                      <span className="move-name">{m.move.name.replaceAll('-', ' ')}</span>
                      {learnDetail && (
                        <span className="move-learn-method">
                          {learnDetail.move_learn_method.name.replaceAll('-', ' ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {moves.length > 20 && (
                <div className="moves-note">
                  Showing first 20 of {moves.length} moves
                </div>
              )}
            </div>
          )}

          {activeTab === 'effectiveness' && (
            <div className="effectiveness-section">
              {effectivenessLoading ? (
                <div className="loading-spinner">Loading type effectiveness...</div>
              ) : EFFECTIVENESS_GROUPS.every(({ key }) => !typeEffectiveness[key]?.length) ? (
                <div className="no-evolution">Could not load type effectiveness data.</div>
              ) : (
                EFFECTIVENESS_GROUPS.map(
                  ({ key, className, title }) =>
                    (typeEffectiveness[key]?.length ?? 0) > 0 && (
                      <div key={key} className="effectiveness-group">
                        <h4 className={`effectiveness-title ${className}`}>{title}</h4>
                        <div className="type-pills">
                          {typeEffectiveness[key]!.map((type) => (
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
                    )
                )
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
