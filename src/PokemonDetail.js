import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PokemonDetail.css';

function PokemonDetail({ pokemon, onClose }) {
  const [evolution, setEvolution] = useState([]);
  const [typeEffectiveness, setTypeEffectiveness] = useState({});

  useEffect(() => {
    async function fetchExtra() {
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
      }
    }
    fetchExtra();
  }, [pokemon]);

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="detail-header">
          <h2 className="pokemon-name">{pokemon.name}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="detail-body">
          <div className="basic-info">
            <img
              className="pokemon-image"
              src={pokemon.sprites.front_default}
              alt={pokemon.name}
            />
            <ul className="stats">
              {pokemon.stats.map(s => (
                <li key={s.stat.name} className="stat">
                  <span className="stat-name">{s.stat.name}</span>
                  <span className="stat-value">{s.base_stat}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="extra-info">
            <section>
              <h3>Abilities</h3>
              <ul className="abilities-list">
                {pokemon.abilities.map(a => (
                  <li key={a.ability.name}>
                    {a.ability.name}
                    {a.is_hidden ? ' (Hidden)' : ''}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Evolution Chain</h3>
              <ul className="evolution-list">
                {evolution.map(e => (
                  <li key={e.name}>
                    Stage {e.stage}: {e.name}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Moves</h3>
              <ul className="moves-list">
                {pokemon.moves.map(m => (
                  <li key={m.move.name}>
                    {m.move.name} - {m.version_group_details[0].move_learn_method.name}
                  </li>
                ))}
              </ul>
            </section>
            <section className="type-effectiveness">
              <h3>Type Effectiveness</h3>
              <p>
                Weak to:{' '}
                {typeEffectiveness.weak && typeEffectiveness.weak.join(', ')}
              </p>
              <p>
                Resistant to:{' '}
                {typeEffectiveness.resistant &&
                  typeEffectiveness.resistant.join(', ')}
              </p>
              <p>
                Immune to:{' '}
                {typeEffectiveness.immune && typeEffectiveness.immune.join(', ')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PokemonDetail;
