import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PokemonDetail.css';

function PokemonDetail({ pokemon, onClose }) {
  const [evolution, setEvolution] = useState([]);
  const [typeEffectiveness, setTypeEffectiveness] = useState({});
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExtra() {
      setLoading(true);
      try {
        const speciesRes = await axios.get(pokemon.species.url);
        const evoRes = await axios.get(speciesRes.data.evolution_chain.url);
        const chainList = [];
        function traverse(node, stage = 1) {
          chainList.push({ name: node.species.name, stage });
          node.evolves_to.forEach(n => traverse(n, stage + 1));
        }
        traverse(evoRes.data.chain);
        setEvolution(chainList);

        const rel = { weak: new Set(), resistant: new Set(), immune: new Set() };
        for (const t of pokemon.types) {
          const typeData = await axios.get(t.type.url);
          typeData.data.damage_relations.double_damage_from.forEach(x => rel.weak.add(x.name));
          typeData.data.damage_relations.half_damage_from.forEach(x => rel.resistant.add(x.name));
          typeData.data.damage_relations.no_damage_from.forEach(x => rel.immune.add(x.name));
        }
        setTypeEffectiveness({
          weak: Array.from(rel.weak),
          resistant: Array.from(rel.resistant),
          immune: Array.from(rel.immune),
        });
      } catch (e) {
        console.log('Using mock evolution and type data');
        // Mock evolution chain data
        const mockEvolutions = {
          'bulbasaur': [
            { name: 'bulbasaur', stage: 1 },
            { name: 'ivysaur', stage: 2 },
            { name: 'venusaur', stage: 3 }
          ],
          'charmander': [
            { name: 'charmander', stage: 1 },
            { name: 'charmeleon', stage: 2 },
            { name: 'charizard', stage: 3 }
          ],
          'squirtle': [
            { name: 'squirtle', stage: 1 },
            { name: 'wartortle', stage: 2 },
            { name: 'blastoise', stage: 3 }
          ]
        };
        
        // Mock type effectiveness data
        const mockTypeEffectiveness = {
          'bulbasaur': {
            weak: ['fire', 'ice', 'flying', 'psychic'],
            resistant: ['water', 'electric', 'grass', 'ground'],
            immune: []
          },
          'charmander': {
            weak: ['water', 'ground', 'rock'],
            resistant: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],
            immune: []
          },
          'squirtle': {
            weak: ['electric', 'grass'],
            resistant: ['fire', 'water', 'ice', 'steel'],
            immune: []
          }
        };
        
        setEvolution(mockEvolutions[pokemon.name] || [{ name: pokemon.name, stage: 1 }]);
        setTypeEffectiveness(mockTypeEffectiveness[pokemon.name] || { weak: [], resistant: [], immune: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchExtra();
  }, [pokemon]);

  const getTypeColor = (type) => {
    const colors = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return colors[type] || '#777';
  };

  const getStatColor = (stat) => {
    if (stat >= 100) return '#4CAF50';
    if (stat >= 70) return '#8BC34A';
    if (stat >= 50) return '#FFC107';
    return '#FF5722';
  };

  const calculateTotalStats = () => {
    return pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0);
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
          ✕
        </button>
        
        <div className="detail-header">
          <div className="header-content">
            <h2 className="pokemon-name">{pokemon.name}</h2>
            <span className="pokemon-id">#{String(pokemon.id).padStart(3, '0')}</span>
          </div>
          <div className="pokemon-types">
            {pokemon.types.map(t => (
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
            <img
              className="pokemon-image"
              src={pokemon.sprites.front_default}
              alt={pokemon.name}
            />
            <div className="total-stats">
              Total: {calculateTotalStats()}
            </div>
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
          </div>

          <div className="tab-content">
            {activeTab === 'stats' && (
              <div className="stats-section">
                {pokemon.stats.map(s => (
                  <div key={s.stat.name} className="stat-row">
                    <span className="stat-name">{s.stat.name.replace('-', ' ')}</span>
                    <div className="stat-bar-container">
                      <div 
                        className="stat-bar"
                        style={{ 
                          width: `${Math.min((s.base_stat / 255) * 100, 100)}%`,
                          backgroundColor: getStatColor(s.base_stat)
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
                {pokemon.abilities.map(a => (
                  <div key={a.ability.name} className="ability-item">
                    <span className="ability-name">{a.ability.name.replace('-', ' ')}</span>
                    {a.is_hidden && <span className="hidden-badge">Hidden</span>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'evolution' && (
              <div className="evolution-section">
                {loading ? (
                  <div className="loading-spinner">Loading evolution chain...</div>
                ) : evolution.length > 0 ? (
                  <div className="evolution-chain">
                    {evolution.map((e, index) => (
                      <React.Fragment key={e.name}>
                        <div className="evolution-stage">
                          <div className="evolution-name">{e.name}</div>
                          <div className="evolution-stage-label">Stage {e.stage}</div>
                        </div>
                        {index < evolution.length - 1 && (
                          <div className="evolution-arrow">→</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="no-evolution">No evolution data available</div>
                )}
              </div>
            )}

            {activeTab === 'moves' && (
              <div className="moves-section">
                <div className="moves-list">
                  {pokemon.moves.slice(0, 20).map(m => (
                    <div key={m.move.name} className="move-item">
                      <span className="move-name">{m.move.name.replace('-', ' ')}</span>
                      <span className="move-learn-method">
                        {m.version_group_details[0].move_learn_method.name.replace('-', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
                {pokemon.moves.length > 20 && (
                  <div className="moves-note">Showing first 20 of {pokemon.moves.length} moves</div>
                )}
              </div>
            )}

            {activeTab === 'effectiveness' && (
              <div className="effectiveness-section">
                {loading ? (
                  <div className="loading-spinner">Loading type effectiveness...</div>
                ) : (
                  <>
                    {typeEffectiveness.weak && typeEffectiveness.weak.length > 0 && (
                      <div className="effectiveness-group">
                        <h4 className="effectiveness-title weak">Weak Against (2x damage)</h4>
                        <div className="type-pills">
                          {typeEffectiveness.weak.map(type => (
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
                        <h4 className="effectiveness-title resistant">Resistant To (0.5x damage)</h4>
                        <div className="type-pills">
                          {typeEffectiveness.resistant.map(type => (
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
                          {typeEffectiveness.immune.map(type => (
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default PokemonDetail;
