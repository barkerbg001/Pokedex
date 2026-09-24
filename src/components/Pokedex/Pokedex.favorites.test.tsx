import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pokedex from './Pokedex';

// Two generations with one Pokemon each, so we can check a favorite from one
// generation doesn't leak into the other's grid.
const pokemon: Record<string, { id: number; name: string; types: { type: { name: string } }[] }> = {
  1: { id: 1, name: 'bulbasaur', types: [{ type: { name: 'grass' } }] },
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

vi.mock('../../api/pokeapi', () => {
  const generations: Record<
    string,
    { id: number; name: string; species: number; region: string }
  > = {
    'generation-i': { id: 1, name: 'generation-i', species: 1, region: 'kanto' },
    'generation-iv': { id: 4, name: 'generation-iv', species: 387, region: 'sinnoh' },
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
          pokemon_species: [{ name: String(g.species), url: `species/${g.species}` }],
        },
      };
    }
    if (url.startsWith('species/')) {
      const id = url.slice(8);
      return { data: { varieties: [{ is_default: true, pokemon: { url: `/pokemon/${id}` } }] } };
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

const grid = () => document.querySelector('.pokemon-grid') as HTMLElement;

describe('favorites', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(cleanup);

  it('adds from a card, shows it in Favorites, and undoes a removal', async () => {
    const user = userEvent.setup();
    renderPokedex();

    // Under full-suite parallel load, the first cold mount can exceed the
    // default 5s asyncUtilTimeout before the generation batch lands
    const star = await screen.findByRole(
      'button',
      { name: 'Favorite bulbasaur' },
      { timeout: 15000 }
    );
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await user.click(star);

    expect(star).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Added bulbasaur to Favorites');
    expect(JSON.parse(localStorage.getItem('pokedex:favorites')!)).toEqual([1]);

    // Desktop sidebar item shows the count
    const menuItem = screen.getAllByRole('button', { name: /Favorites/ })[0]!;
    expect(menuItem).toHaveTextContent('1');
    await user.click(menuItem);

    expect(screen.getByRole('heading', { name: 'Favorites' })).toBeInTheDocument();
    expect(within(grid()).getByText('bulbasaur')).toBeInTheDocument();

    await user.click(within(grid()).getByRole('button', { name: 'Favorite bulbasaur' }));
    expect(screen.getByText('No favorites yet')).toBeInTheDocument();

    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
    expect(within(grid()).getByText('bulbasaur')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('pokedex:favorites')!)).toEqual([1]);
  });

  it('loads saved favorites from other generations without adding them to Browse', async () => {
    localStorage.setItem('pokedex:favorites', JSON.stringify([387]));
    const user = userEvent.setup();
    renderPokedex();

    // Browsing Gen I: only Bulbasaur, not the Gen IV favorite
    await screen.findByRole('button', { name: 'Favorite bulbasaur' });
    await waitFor(() => expect(within(grid()).queryByText('turtwig')).not.toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: /Favorites/ })[0]!);
    expect(await within(grid()).findByText('turtwig')).toBeInTheDocument();
    expect(within(grid()).queryByText('bulbasaur')).not.toBeInTheDocument();
  });

  it('shows an empty state that leads back to Browse', async () => {
    const user = userEvent.setup();
    renderPokedex();
    await screen.findByRole('button', { name: 'Favorite bulbasaur' });

    await user.click(screen.getAllByRole('button', { name: /Favorites/ })[0]!);
    expect(screen.getByText('No favorites yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Browse Pokémon' }));
    expect(within(grid()).getByText('bulbasaur')).toBeInTheDocument();
  });
});

describe('offline', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    cleanup();
  });

  it('shows an offline notice while the browser is offline', async () => {
    renderPokedex();
    await screen.findByRole('button', { name: 'Favorite bulbasaur' });
    expect(screen.queryByText(/You’re offline/)).not.toBeInTheDocument();

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByText(/You’re offline/)).toBeInTheDocument();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.queryByText(/You’re offline/)).not.toBeInTheDocument();
  });
});

describe('navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(cleanup);

  const dialog = () => screen.queryByRole('dialog');
  // history.back() is asynchronous; wait for the popstate to be handled
  const goBack = async () => {
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    });
  };

  it('puts the open Pokémon in the URL, and back closes it', async () => {
    const user = userEvent.setup();
    renderPokedex();
    await user.click(await within(await screen.findByRole('main')).findByText('bulbasaur'));

    expect(dialog()).toHaveAccessibleName('bulbasaur');
    expect(window.location.search).toBe('?pokemon=bulbasaur');

    await goBack();
    expect(dialog()).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('steps back through history when a screen change is undone', async () => {
    const user = userEvent.setup();
    renderPokedex();
    await screen.findByRole('button', { name: 'Favorite bulbasaur' });

    await user.click(screen.getAllByRole('button', { name: /Favorites/ })[0]!);
    expect(window.location.search).toBe('?view=favorites');

    await goBack();
    expect(screen.queryByRole('heading', { name: 'Favorites' })).not.toBeInTheDocument();
    expect(within(grid()).getByText('bulbasaur')).toBeInTheDocument();
  });

  it('opens deep links to a screen and to a Pokémon that isn’t loaded', async () => {
    window.history.replaceState(null, '', '/?view=favorites&pokemon=turtwig');
    renderPokedex();

    expect(screen.getByRole('heading', { name: 'Favorites' })).toBeInTheDocument();
    await waitFor(() => expect(dialog()).toHaveAccessibleName('turtwig'));

    // Nothing to step back to: closing just drops it from the URL
    await userEvent.setup().click(within(dialog()!).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(window.location.search).toBe('?view=favorites');
  });

  it('closing with the close button steps back instead of adding an entry', async () => {
    const user = userEvent.setup();
    renderPokedex();
    await user.click(await within(await screen.findByRole('main')).findByText('bulbasaur'));
    const lengthWithDetail = window.history.length;

    await user.click(within(dialog()!).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(window.location.search).toBe('');
    expect(window.history.state.index).toBe(0);
    expect(window.history.length).toBe(lengthWithDetail);
  });

  it('picking in the generation sheet replaces its entry, so back skips the sheet', async () => {
    const user = userEvent.setup();
    renderPokedex();
    await screen.findByRole('button', { name: 'Favorite bulbasaur' });

    await user.click(screen.getByRole('button', { name: 'Gen I' }));
    expect(dialog()).toHaveAccessibleName('Choose generation');
    await user.click(within(dialog()!).getByRole('button', { name: /generation-iv/ }));

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(window.location.search).toBe('?gen=generation-iv');
    expect(await within(grid()).findByText('turtwig')).toBeInTheDocument();

    await goBack();
    expect(dialog()).not.toBeInTheDocument();
    expect(await within(grid()).findByText('bulbasaur')).toBeInTheDocument();
  });

  it('opens a generation from the URL', async () => {
    window.history.replaceState(null, '', '/?gen=generation-iv');
    renderPokedex();
    expect(await within(grid()).findByText('turtwig')).toBeInTheDocument();
    expect(within(grid()).queryByText('bulbasaur')).not.toBeInTheDocument();
  });
});
