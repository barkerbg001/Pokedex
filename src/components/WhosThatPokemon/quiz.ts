import type { Generation } from '../../types/pokeapi';

// Pure helpers for the "Who's That Pokémon?" game, kept separate from the
// component so they're easy to test.

export interface QuizSpecies {
  id: number;
  name: string;
}

export interface QuizRound {
  answer: QuizSpecies;
  choices: QuizSpecies[];
}

// "https://pokeapi.co/api/v2/pokemon-species/25/" -> 25
function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

// Every species the game can ask about: from all generations, or just one.
// Uses species names (e.g. "deoxys", not the default form's "deoxys-normal").
export function buildPool(generations: Generation[], genName = 'all'): QuizSpecies[] {
  const chosen = genName === 'all' ? generations : generations.filter((g) => g.name === genName);
  return chosen
    .flatMap((g) => g.speciesList)
    .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
    .filter((s): s is QuizSpecies => s.id !== null);
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy;
}

// A random answer (avoiding `excludeId`, the previous round, when possible)
// plus up to 3 other species as wrong choices, all shuffled together
export function pickRound(
  pool: QuizSpecies[],
  rng: () => number = Math.random,
  excludeId: number | null = null
): QuizRound | null {
  if (pool.length === 0) return null;
  const candidates = pool.length > 1 ? pool.filter((p) => p.id !== excludeId) : pool;
  const answer = candidates[Math.floor(rng() * candidates.length)];
  if (!answer) return null;
  const others = shuffle(
    pool.filter((p) => p.id !== answer.id),
    rng
  ).slice(0, 3);
  return { answer, choices: shuffle([answer, ...others], rng) };
}

// Lenient comparison for typed guesses: "Mr. Mime" matches "mr-mime",
// "Nidoran♀" matches "nidoran-f"
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .replace(/[^a-z0-9]/g, '');
}

// "mr-mime" -> "Mr Mime"
export function formatName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
