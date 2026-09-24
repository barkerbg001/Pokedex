import { describe, it, expect } from 'vitest';
import { buildPool, pickRound, normalizeName, formatName } from './quiz';

const species = (id, name) => ({ name, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` });
const generations = [
  { name: 'generation-i', speciesList: [species(1, 'bulbasaur'), species(122, 'mr-mime')] },
  { name: 'generation-iv', speciesList: [species(387, 'turtwig'), species(386, 'deoxys')] },
];

// A deterministic rng cycling through the given values
const sequence = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('buildPool', () => {
  it('takes every species from every generation, with ids from their URLs', () => {
    expect(buildPool(generations)).toEqual([
      { id: 1, name: 'bulbasaur' },
      { id: 122, name: 'mr-mime' },
      { id: 387, name: 'turtwig' },
      { id: 386, name: 'deoxys' },
    ]);
  });

  it('takes just one generation when asked', () => {
    expect(buildPool(generations, 'generation-iv').map((p) => p.name)).toEqual([
      'turtwig',
      'deoxys',
    ]);
  });
});

describe('pickRound', () => {
  const pool = buildPool(generations);

  it('offers four different choices, one of them the answer', () => {
    const round = pickRound(pool, sequence(0.9, 0.1, 0.5, 0.3));
    expect(round.choices).toHaveLength(4);
    expect(new Set(round.choices.map((c) => c.id)).size).toBe(4);
    expect(round.choices).toContainEqual(round.answer);
  });

  it('avoids repeating the previous answer', () => {
    for (let i = 0; i < 10; i++) {
      expect(pickRound(pool, Math.random, 1).answer.id).not.toBe(1);
    }
  });

  it('copes with small pools', () => {
    const tiny = pool.slice(0, 2);
    const round = pickRound(tiny, Math.random);
    expect(round.choices).toHaveLength(2);
    expect(pickRound(tiny.slice(0, 1), Math.random, 1).answer.id).toBe(1);
    expect(pickRound([], Math.random)).toBeNull();
  });
});

describe('normalizeName', () => {
  it('ignores case, spaces and punctuation', () => {
    expect(normalizeName('Mr. Mime')).toBe(normalizeName('mr-mime'));
    expect(normalizeName("Farfetch'd")).toBe(normalizeName('farfetchd'));
    expect(normalizeName('  Pikachu ')).toBe('pikachu');
  });

  it('spells out gender symbols', () => {
    expect(normalizeName('Nidoran♀')).toBe(normalizeName('nidoran-f'));
    expect(normalizeName('Nidoran♂')).toBe(normalizeName('nidoran-m'));
  });
});

describe('formatName', () => {
  it('title-cases and splits on hyphens', () => {
    expect(formatName('mr-mime')).toBe('Mr Mime');
    expect(formatName('pikachu')).toBe('Pikachu');
  });
});
