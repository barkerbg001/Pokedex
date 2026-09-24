import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import pokeapi from '../../api/pokeapi';
import type { Pokemon } from '../../types/pokeapi';
import PokemonDetail from './PokemonDetail';

vi.mock('../../api/pokeapi', () => ({ default: { get: vi.fn() } }));

const type = (name: string) => ({ type: { name, url: `type/${name}` } });
const stat = (name: string, base_stat: number) => ({
  stat: { name, url: `stat/${name}` },
  base_stat,
  effort: 0,
});
const move = (name: string, method = 'level-up') => ({
  move: { name, url: `move/${name}` },
  version_group_details: [{ move_learn_method: { name: method } }],
});

const charmander = {
  id: 4,
  name: 'charmander',
  height: 6,
  weight: 85,
  types: [type('fire')],
  stats: [
    stat('hp', 39),
    stat('attack', 52),
    stat('defense', 43),
    stat('special-attack', 60),
    stat('special-defense', 50),
    stat('speed', 65),
  ],
  abilities: [
    { ability: { name: 'blaze', url: 'ability/blaze' }, is_hidden: false, slot: 1 },
    { ability: { name: 'solar-power', url: 'ability/solar-power' }, is_hidden: true, slot: 3 },
  ],
  // 25 moves, to check only the first 20 are listed
  moves: [
    move('scratch'),
    move('fire-punch', 'machine'),
    ...Array.from({ length: 23 }, (_, i) => move(`move-${i}`)),
  ],
  sprites: {
    front_default: '/sprites/4.png',
    front_shiny: '/sprites/shiny/4.png',
    other: { 'official-artwork': { front_default: '/art/4.png' } },
  },
  species: { name: 'charmander', url: 'species/charmander' },
} as unknown as Pokemon;

const rotom = {
  id: 479,
  name: 'rotom',
  height: 3,
  weight: 3,
  types: [type('electric'), type('ghost')],
  stats: [stat('hp', 50)],
  abilities: [{ ability: { name: 'levitate', url: 'ability/levitate' }, is_hidden: false, slot: 1 }],
  moves: [],
  sprites: { front_default: '/sprites/479.png' },
  species: { name: 'rotom', url: 'species/rotom' },
} as unknown as Pokemon;

const rotomWash = {
  ...rotom,
  id: 10008,
  name: 'rotom-wash',
  types: [type('electric'), type('water')],
  sprites: { front_default: '/sprites/10008.png' },
} as unknown as Pokemon;

// grass/poison, like Bulbasaur: bug is 2x from grass but 0.5x from poison, so
// it should net to 1x and not appear as either a weakness or a resistance
const bulbasaur = {
  id: 1,
  name: 'bulbasaur',
  height: 7,
  weight: 69,
  types: [type('grass'), type('poison')],
  stats: [stat('hp', 45)],
  abilities: [{ ability: { name: 'overgrow', url: 'ability/overgrow' }, is_hidden: false, slot: 1 }],
  moves: [],
  sprites: { front_default: '/sprites/1.png' },
  species: { name: 'bulbasaur', url: 'species/bulbasaur' },
} as unknown as Pokemon;

// dragon/flying, like Dragonite: ice is 2x from both types, so it should be a
// 4x weakness, not a plain 2x one; grass is 0.5x from both, for a 0.25x resistance
const dragonite = {
  id: 149,
  name: 'dragonite',
  height: 22,
  weight: 2100,
  types: [type('dragon'), type('flying')],
  stats: [stat('hp', 91)],
  abilities: [
    { ability: { name: 'inner-focus', url: 'ability/inner-focus' }, is_hidden: false, slot: 1 },
  ],
  moves: [],
  sprites: { front_default: '/sprites/149.png' },
  species: { name: 'dragonite', url: 'species/dragonite' },
} as unknown as Pokemon;

const relations = (double: string[], half: string[] = [], none: string[] = []) => ({
  damage_relations: {
    double_damage_from: double.map((name) => ({ name })),
    half_damage_from: half.map((name) => ({ name })),
    no_damage_from: none.map((name) => ({ name })),
  },
});

type EvoNode = { species: { name: string }; evolves_to: EvoNode[] };
const chain = (...names: string[]) => {
  const build = (parts: string[]): EvoNode => {
    const [name, ...rest] = parts;
    return {
      species: { name: name! },
      evolves_to: rest.length ? [build(rest)] : [],
    };
  };
  return { chain: build(names) };
};

const responses: Record<string, unknown> = {
  'species/charmander': {
    name: 'charmander',
    url: 'species/charmander',
    evolution_chain: { url: 'evo/charmander' },
    varieties: [{ is_default: true, pokemon: { name: 'charmander', url: '/pokemon/charmander' } }],
  },
  'species/rotom': {
    name: 'rotom',
    url: 'species/rotom',
    evolution_chain: { url: 'evo/rotom' },
    varieties: [
      { is_default: true, pokemon: { name: 'rotom', url: '/pokemon/rotom' } },
      { is_default: false, pokemon: { name: 'rotom-wash', url: '/pokemon/rotom-wash' } },
    ],
  },
  'evo/charmander': chain('charmander', 'charmeleon', 'charizard'),
  'evo/rotom': chain('rotom'),
  'type/fire': relations(
    ['water', 'ground', 'rock'],
    ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy']
  ),
  'type/electric': relations(['ground'], ['electric', 'flying', 'steel']),
  'type/ghost': relations(['ghost', 'dark'], ['poison', 'bug'], ['normal', 'fighting']),
  'type/water': relations(['electric', 'grass'], ['fire', 'water', 'ice', 'steel']),
  '/pokemon/rotom-wash': rotomWash,
  'type/grass': relations(['bug', 'fire', 'flying', 'ice']),
  'type/poison': relations(['ground', 'psychic'], ['fighting', 'poison', 'bug', 'grass']),
  'type/dragon': relations(['ice', 'dragon'], ['fire', 'water', 'grass', 'electric']),
  'type/flying': relations(['electric', 'ice', 'rock'], ['fighting', 'bug', 'grass']),
};

const renderDetail = (pokemon: Pokemon = charmander) =>
  render(
    <PokemonDetail
      pokemon={pokemon}
      isFavorite={false}
      onToggleFavorite={() => {}}
      onShare={() => {}}
      onClose={() => {}}
    />
  );

const openTab = (user: UserEvent, name: string) => user.click(screen.getByRole('button', { name }));
const pillsUnder = (heading: string) =>
  within(screen.getByText(heading).closest('.effectiveness-group')!)
    .getAllByText(/./, { selector: '.type-pill' })
    .map((el) => el.textContent);

describe('PokemonDetail', () => {
  beforeAll(() => {
    // Tabs scroll themselves into view; jsdom doesn't implement it
    Element.prototype.scrollIntoView = () => {};
  });
  beforeEach(() => {
    vi.mocked(pokeapi.get).mockReset();
    vi.mocked(pokeapi.get).mockImplementation(async (url: string) => {
      if (!(url in responses)) throw new Error(`Unexpected request: ${url}`);
      return { data: responses[url] } as Awaited<ReturnType<typeof pokeapi.get>>;
    });
  });
  afterEach(cleanup);

  it('opens on Stats, with a total and every base stat', () => {
    renderDetail();

    expect(screen.getByRole('heading', { name: 'charmander' })).toBeInTheDocument();
    expect(screen.getByText('#004')).toBeInTheDocument();
    const total = screen.getByText('Total').closest('.stat-row-total');
    expect(total).toHaveTextContent('309');
    const rows = document.querySelectorAll('.stat-row');
    expect(rows).toHaveLength(6);
    expect(rows[3]).toHaveTextContent('special attack');
    expect(rows[3]).toHaveTextContent('60');
  });

  it('lists abilities, marking hidden ones', async () => {
    const user = userEvent.setup();
    renderDetail();

    await openTab(user, 'Abilities');
    const abilities = document.querySelectorAll('.ability-item');
    expect(abilities).toHaveLength(2);
    expect(abilities[0]).toHaveTextContent('blaze');
    expect(abilities[0]).not.toHaveTextContent('Hidden');
    expect(abilities[1]).toHaveTextContent('solar powerHidden');
  });

  it('shows the evolution chain in stages', async () => {
    const user = userEvent.setup();
    renderDetail();

    await openTab(user, 'Evolution');
    await screen.findByText('charizard');
    const stages = [...document.querySelectorAll('.evolution-stage')].map((el) => el.textContent);
    expect(stages).toEqual(['charmanderStage 1', 'charmeleonStage 2', 'charizardStage 3']);
    expect(document.querySelectorAll('.evolution-arrow')).toHaveLength(2);
  });

  it('lists the first 20 moves with how each is learned', async () => {
    const user = userEvent.setup();
    renderDetail();

    await openTab(user, 'Moves');
    const moves = document.querySelectorAll('.move-item');
    expect(moves).toHaveLength(20);
    expect(moves[0]).toHaveTextContent('scratchlevel up');
    expect(moves[1]).toHaveTextContent('fire punchmachine');
    expect(screen.getByText('Showing first 20 of 25 moves')).toBeInTheDocument();
  });

  it('shows weaknesses and resistances from the Pokémon’s type', async () => {
    const user = userEvent.setup();
    renderDetail();

    await openTab(user, 'Effectiveness');
    await screen.findByText('Weak Against (2x damage)');
    expect(pillsUnder('Weak Against (2x damage)')).toEqual(['water', 'ground', 'rock']);
    expect(pillsUnder('Resistant To (0.5x damage)')).toEqual([
      'fire',
      'grass',
      'ice',
      'bug',
      'steel',
      'fairy',
    ]);
    expect(screen.queryByText('Immune To (0x damage)')).not.toBeInTheDocument();
  });

  it('combines dual-type relations instead of unioning them, so a cancelled-out type is dropped', async () => {
    const user = userEvent.setup();
    renderDetail(bulbasaur);

    await openTab(user, 'Effectiveness');
    await screen.findByText('Weak Against (2x damage)');
    // bug is 2x from grass and 0.5x from poison: nets to 1x, so it shouldn't
    // show up as a weakness or (as the old set-union logic did) also a resistance
    const allPills = [...document.querySelectorAll('.type-pill')].map((el) => el.textContent);
    expect(allPills).not.toContain('bug');
    expect(pillsUnder('Weak Against (2x damage)')).toEqual([
      'fire',
      'flying',
      'ice',
      'ground',
      'psychic',
    ]);
    expect(pillsUnder('Resistant To (0.5x damage)')).toEqual(['fighting', 'poison', 'grass']);
    expect(screen.queryByText('Weak Against (4x damage)')).not.toBeInTheDocument();
  });

  it('groups a double weakness as 4x and a double resistance as 0.25x', async () => {
    const user = userEvent.setup();
    renderDetail(dragonite);

    await openTab(user, 'Effectiveness');
    await screen.findByText('Weak Against (4x damage)');
    // ice is 2x from both dragon and flying
    expect(pillsUnder('Weak Against (4x damage)')).toEqual(['ice']);
    // electric is 0.5x from dragon and 2x from flying, netting to 1x - shown nowhere
    expect(pillsUnder('Weak Against (2x damage)')).toEqual(['dragon', 'rock']);
    // grass is 0.5x from both
    expect(pillsUnder('Resistant To (0.25x damage)')).toEqual(['grass']);
    expect(pillsUnder('Resistant To (0.5x damage)')).toEqual(['fire', 'water', 'fighting', 'bug']);
    const allPills = [...document.querySelectorAll('.type-pill')].map((el) => el.textContent);
    expect(allPills).not.toContain('electric');
  });

  it('switches the header image from the Sprites tab', async () => {
    const user = userEvent.setup();
    renderDetail();

    const hero = document.querySelector('.pokemon-image');
    expect(hero).toHaveAttribute('src', '/art/4.png');
    await openTab(user, 'Sprites');
    const shiny = screen.getByRole('button', { name: /Shiny/ });
    await user.click(shiny);
    expect(hero).toHaveAttribute('src', '/sprites/shiny/4.png');
    expect(shiny).toHaveAttribute('aria-pressed', 'true');
  });

  it('only offers Sprites and Forms tabs when there’s more than one', async () => {
    renderDetail(rotom);

    // Rotom has one sprite but two forms
    await screen.findByRole('button', { name: 'Forms' });
    expect(screen.queryByRole('button', { name: 'Sprites' })).not.toBeInTheDocument();
  });

  it('swaps to an alternate form, with its own types and effectiveness', async () => {
    const user = userEvent.setup();
    renderDetail(rotom);

    await openTab(user, 'Effectiveness');
    await screen.findByText('Immune To (0x damage)');
    expect(pillsUnder('Immune To (0x damage)')).toEqual(['normal', 'fighting']);

    await user.click(await screen.findByRole('button', { name: 'Forms' }));
    await user.click(screen.getByRole('button', { name: 'Wash' }));

    expect(await screen.findByRole('heading', { name: 'rotom wash' })).toBeInTheDocument();
    const types = [...document.querySelectorAll('.type-badge')].map((el) => el.textContent);
    expect(types).toEqual(['electric', 'water']);
    expect(screen.getByRole('button', { name: 'Wash' })).toHaveAttribute('aria-pressed', 'true');

    await openTab(user, 'Effectiveness');
    await screen.findByText('Weak Against (2x damage)');
    expect(screen.queryByText('Immune To (0x damage)')).not.toBeInTheDocument();
    expect(pokeapi.get).toHaveBeenCalledWith('type/water');
  });

  it('uses species data that’s already loaded instead of fetching it again', async () => {
    const user = userEvent.setup();
    // Pokedex.js hands over the fully expanded species, not a {name, url} ref
    renderDetail({
      ...charmander,
      species: responses['species/charmander'] as Pokemon['species'],
    });

    await openTab(user, 'Evolution');
    await screen.findByText('charizard');
    expect(pokeapi.get).not.toHaveBeenCalledWith('species/charmander');
  });

  it('says so when evolution or effectiveness data can’t be loaded', async () => {
    const user = userEvent.setup();
    vi.mocked(pokeapi.get).mockRejectedValue(new Error('network'));
    renderDetail();

    await openTab(user, 'Evolution');
    expect(await screen.findByText('Could not load evolution data.')).toBeInTheDocument();
    await openTab(user, 'Effectiveness');
    expect(await screen.findByText('Could not load type effectiveness data.')).toBeInTheDocument();
    // Tabs that only need the Pokémon's own data still work
    await openTab(user, 'Abilities');
    expect(screen.getByText('blaze')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forms' })).not.toBeInTheDocument();
  });
});
