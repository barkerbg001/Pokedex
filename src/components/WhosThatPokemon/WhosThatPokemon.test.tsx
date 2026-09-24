import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import pokeapi from '../../api/pokeapi';
import WhosThatPokemon from './WhosThatPokemon';

vi.mock('../../api/pokeapi', () => ({ default: { get: vi.fn() } }));

const names = { 1: 'bulbasaur', 2: 'ivysaur', 3: 'venusaur', 122: 'mr-mime' };
const species = (id) => ({
  name: names[id],
  url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
});
const generationWith = (...ids) => [
  { name: 'generation-i', displayName: 'Generation I (Kanto)', speciesList: ids.map(species) },
];

const fetchPokemon = async (url) => {
  const id = Number(url.match(/^\/pokemon\/(\d+)$/)[1]);
  return {
    data: {
      id,
      name: names[id],
      sprites: { other: { 'official-artwork': { front_default: `/art/${id}.png` } } },
    },
  };
};

const renderGame = (generations = generationWith(1, 2, 3, 122), onOpenPokemon = () => {}) =>
  render(<WhosThatPokemon generations={generations} onOpenPokemon={onOpenPokemon} />);

const score = () => document.querySelector('.quiz-score');

describe('WhosThatPokemon', () => {
  beforeEach(() => {
    localStorage.clear();
    pokeapi.get.mockReset();
    pokeapi.get.mockImplementation(fetchPokemon);
    // Always pick the first eligible species, so rounds are predictable
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows a silhouette and four choices, and reveals a correct guess', async () => {
    const user = userEvent.setup();
    renderGame();

    const art = await screen.findByAltText('Silhouette of a mystery Pokémon');
    expect(art).toHaveAttribute('src', '/art/1.png');
    const choices = document.querySelectorAll('.quiz-choice');
    expect(choices).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: /Bulbasaur/ }));

    expect(screen.getByText(/Correct! It’s/)).toHaveTextContent('Correct! It’s Bulbasaur!');
    expect(screen.getByAltText('Bulbasaur')).toBeInTheDocument();
    expect(score()).toHaveTextContent('Score 1/1 · Streak 1 · Best 1');
    expect(localStorage.getItem('pokedex-quiz-best')).toBe('1');
    choices.forEach((c) => expect(c).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Next Pokémon' })).toHaveFocus();
  });

  it('marks a wrong guess and resets the streak', async () => {
    const user = userEvent.setup();
    renderGame();

    await screen.findByAltText('Silhouette of a mystery Pokémon');
    const wrong = screen.getByRole('button', { name: /Ivysaur/ });
    await user.click(wrong);

    expect(screen.getByText(/Not quite/)).toHaveTextContent('Not quite, it’s Bulbasaur!');
    expect(wrong).toHaveClass('wrong');
    expect(screen.getByRole('button', { name: /Bulbasaur/ })).toHaveClass('correct');
    expect(score()).toHaveTextContent('Score 0/1 · Streak 0 · Best 0');
  });

  it('picks a choice with the number keys', async () => {
    const user = userEvent.setup();
    renderGame();

    await screen.findByAltText('Silhouette of a mystery Pokémon');
    await user.keyboard('1');
    expect(score()).toHaveTextContent('Score 0/1');
    expect(document.querySelector('.quiz-choice')).toBeDisabled();
  });

  it('loads a different Pokémon for the next round', async () => {
    const user = userEvent.setup();
    renderGame();

    await screen.findByAltText('Silhouette of a mystery Pokémon');
    await user.click(screen.getByRole('button', { name: /Bulbasaur/ }));
    await user.click(screen.getByRole('button', { name: 'Next Pokémon' }));

    const art = await screen.findByAltText('Silhouette of a mystery Pokémon');
    expect(art).toHaveAttribute('src', '/art/2.png');
    expect(screen.getByRole('button', { name: /Ivysaur/ })).toBeEnabled();
  });

  it('accepts a typed guess regardless of punctuation, and remembers the mode', async () => {
    const user = userEvent.setup();
    renderGame(generationWith(122, 1, 2, 3));

    await screen.findByAltText('Silhouette of a mystery Pokémon');
    await user.click(screen.getByRole('button', { name: 'Type it' }));
    await user.type(screen.getByRole('textbox', { name: 'Your guess' }), 'Mr. Mime{Enter}');

    expect(screen.getByText(/Correct! It’s/)).toHaveTextContent('Correct! It’s Mr Mime!');
    expect(JSON.parse(localStorage.getItem('pokedex-quiz-prefs'))).toMatchObject({ mode: 'type' });
  });

  it('reveals the answer on giving up', async () => {
    const user = userEvent.setup();
    localStorage.setItem('pokedex-quiz-prefs', JSON.stringify({ mode: 'type' }));
    renderGame();

    await screen.findByAltText('Silhouette of a mystery Pokémon');
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    expect(screen.getByText(/It’s/)).toHaveTextContent('It’s Bulbasaur!');
    expect(score()).toHaveTextContent('Score 0/1');
  });

  it('opens the revealed Pokémon in the Pokédex', async () => {
    const user = userEvent.setup();
    const onOpenPokemon = vi.fn();
    renderGame(undefined, onOpenPokemon);

    await screen.findByAltText('Silhouette of a mystery Pokémon');
    await user.click(screen.getByRole('button', { name: /Bulbasaur/ }));
    await user.click(screen.getByRole('button', { name: 'View in Pokédex' }));
    expect(onOpenPokemon).toHaveBeenCalledWith(expect.objectContaining({ name: 'bulbasaur' }));
  });

  it('offers a retry when a Pokémon fails to load', async () => {
    const user = userEvent.setup();
    pokeapi.get.mockRejectedValue(new Error('network'));
    renderGame();

    const retry = await screen.findByRole('button', { name: 'Try Again' });
    pokeapi.get.mockImplementation(fetchPokemon);
    await user.click(retry);
    await waitFor(() =>
      expect(screen.getByAltText('Silhouette of a mystery Pokémon')).toBeInTheDocument()
    );
  });
});
