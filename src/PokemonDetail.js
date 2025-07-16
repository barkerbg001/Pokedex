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
        console.error(e);
      }
    }
    fetchExtra();
  }, [pokemon]);

  return (
    <div className="modal">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          Close
        </button>
        <h2>{pokemon.name}</h2>
        <img src={pokemon.sprites.front_default} alt={pokemon.name} />
        <h3>Stats</h3>
        <ul>
          {pokemon.stats.map(s => (
            <li key={s.stat.name}>
              {s.stat.name}: {s.base_stat}
            </li>
          ))}
        </ul>
        <h3>Abilities</h3>
        <ul>
          {pokemon.abilities.map(a => (
            <li key={a.ability.name}>
              {a.ability.name}
              {a.is_hidden ? ' (Hidden)' : ''}
            </li>
          ))}
        </ul>
        <h3>Evolution Chain</h3>
        <ul>
          {evolution.map(e => (
            <li key={e.name}>
              Stage {e.stage}: {e.name}
            </li>
          ))}
        </ul>
        <h3>Moves</h3>
        <ul className="moves-list">
          {pokemon.moves.map(m => (
            <li key={m.move.name}>
              {m.move.name} - {m.version_group_details[0].move_learn_method.name}
            </li>
          ))}
        </ul>
        <h3>Type Effectiveness</h3>
        <p>Weak to: {typeEffectiveness.weak && typeEffectiveness.weak.join(', ')}</p>
        <p>Resistant to: {typeEffectiveness.resistant && typeEffectiveness.resistant.join(', ')}</p>
        <p>Immune to: {typeEffectiveness.immune && typeEffectiveness.immune.join(', ')}</p>
      </div>
    </div>
  );
}

export default PokemonDetail;
