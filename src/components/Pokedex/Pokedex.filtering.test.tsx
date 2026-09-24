import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pokedex from './Pokedex';

// Generation I: four Pokemon of different types, so type filtering has
// something to narrow. Generation IV: one, to check switching generations
// replaces the grid rather than merging into it.
const pokemon: Record<string, { id: number; name: string; types: { type: { name: string } }[] }> = {
  1: { id: 1, name: 'bulbasaur', types: [{ type: { name: 'grass' } }] },
  4: { id: 4, name: 'charmander', types: [{ type: { name: 'fire' } }] },
  7: { id: 7, name: 'squirtle', types: [{ type: { name: 'water' } }] },
  25: { id: 25, name: 'pikachu', types: [{ type: { name: 'electric' } }] },
  387: { id: 387, name: 'turtwig', types: [{ type: { name: 'grass' } }] },
};
const withSprites = (p: (typeof pokemon)[string]) => ({
  ...p,
  sprites: { front_default: `/${p.name}.png` },
  stats: [],
  abilities: [],
  moves: [],
  species: { name: p.name, url: `species/${p.id}` },
});
const TYPE_NAMES = ['grass', 'fire', 'water', 'electric'];

vi.mock('../../api/pokeapi', () => {
  const generations: Record<
    string,
    { id: number; name: string; species: number[]; region: string }
  > = {
    'generation-i': { id: 1, name: 'generation-i', species: [1, 4, 7, 25], region: 'kanto' },
    'generation-iv': { id: 4, name: 'generation-iv', species: [387], region: 'sinnoh' },
  };
  const get = vi.fn(async (url: string) => {
    if (url.startsWith('/generation?')) {
      return {
        data: { results: Object.keys(generations).map((name) => ({ url: `gen/${name}` })) },
      };
    }
    if (url.startsWith('gen/')) {
      const g = generations[url.slice(4)]!;
      return {
        data: {
          id: g.id,
          name: g.name,
          names: [],
          main_region: { name: g.region },
          pokemon_species: g.species.map((id: number) => ({
            name: String(id),
            url: `species/${id}`,
          })),
        },
      };
    }
    if (url.startsWith('species/')) {
      const id = url.slice(8);
      return { data: { varieties: [{ is_default: true, pokemon: { url: `/pokemon/${id}` } }] } };
    }
    if (url.startsWith('/type?')) {
      return { data: { results: TYPE_NAMES.map((name) => ({ name, url: `type/${name}` })) } };
    }
    const match = url.match(/^\/pokemon\/(\w+)$/);
    if (match) {
      const key = match[1]!;
      const found = pokemon[key] || Object.values(pokemon).find((p) => p.name === key);
      if (!found) throw new Error('404');
      return { data: withSprites(found) };
    }
    return { data: { results: [] } };
  });
  return { default: { get } };
});

const renderPokedex = () =>
  render(<Pokedex themePreference="light" appliedTheme="light" onSetTheme={() => {}} />);

const grid = () => document.querySelector('.pokemon-grid')!;
const cardNames = () =>
  [...grid().querySelectorAll('.pokemon-card-open')].map((el) => el.textContent);
const resultsText = () => document.querySelector('.results-info')?.textContent;

describe('filtering', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(cleanup);

  it('filters the grid by search, and clearing it restores the full list', async () => {
    const user = userEvent.setup();
    renderPokedex();

    await screen.findByText('charmander');
    expect(cardNames().sort()).toEqual(['bulbasaur', 'charmander', 'pikachu', 'squirtle']);
    expect(resultsText()).toBe('Showing 4 Pokémon');

    await user.type(screen.getByRole('searchbox', { name: 'Search Pokémon by name' }), 'char');
    await waitFor(() => expect(cardNames()).toEqual(['charmander']));
    expect(resultsText()).toBe('Showing 1 Pokémon');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() =>
      expect(cardNames().sort()).toEqual(['bulbasaur', 'charmander', 'pikachu', 'squirtle'])
    );
    expect(resultsText()).toBe('Showing 4 Pokémon');
  });

  it('narrows by type, shows an active-filter badge, and Clear all resets it', async () => {
    const user = userEvent.setup();
    renderPokedex();

    await screen.findByText('charmander');
    await user.click(screen.getByRole('button', { name: 'Filter by type' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filter by type' });

    await user.click(within(dialog).getByTitle('Filter by fire'));
    await waitFor(() => expect(cardNames()).toEqual(['charmander']));
    expect(screen.getByRole('button', { name: 'Filter by type' })).toHaveTextContent('1');

    await user.click(within(dialog).getByRole('button', { name: 'Clear all' }));
    await waitFor(() =>
      expect(cardNames().sort()).toEqual(['bulbasaur', 'charmander', 'pikachu', 'squirtle'])
    );
    expect(screen.getByRole('button', { name: 'Filter by type' })).not.toHaveTextContent('1');
  });

  it('combines search and type filters', async () => {
    const user = userEvent.setup();
    renderPokedex();

    await screen.findByText('charmander');
    await user.click(screen.getByRole('button', { name: 'Filter by type' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filter by type' });
    await user.click(within(dialog).getByTitle('Filter by grass'));
    await waitFor(() => expect(cardNames()).toEqual(['bulbasaur']));

    // Bulbasaur is grass, but doesn't match this search - nothing should match
    await user.type(screen.getByRole('searchbox', { name: 'Search Pokémon by name' }), 'char');
    await waitFor(() => expect(cardNames()).toEqual([]));
    expect(screen.getByText('No Pokémon match your filters.')).toBeInTheDocument();
  });

  it('switching generation replaces the grid instead of merging into it', async () => {
    const user = userEvent.setup();
    renderPokedex();

    await screen.findByText('charmander');
    await user.click(screen.getByRole('button', { name: /generation-iv/i }));

    await screen.findByText('turtwig');
    expect(cardNames()).toEqual(['turtwig']);
    expect(screen.queryByText('bulbasaur')).not.toBeInTheDocument();

    // Switching back restores the Gen I list from cache
    await user.click(screen.getByRole('button', { name: /generation-i\b/i }));
    await waitFor(() =>
      expect(cardNames().sort()).toEqual(['bulbasaur', 'charmander', 'pikachu', 'squirtle'])
    );
  });
});
