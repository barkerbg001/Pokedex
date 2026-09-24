import pokeapi from './api/pokeapi';
import type { Pokemon, PokemonSpecies } from './types/pokeapi';

// Must match FAVORITES_CACHE_NAME in public/sw.js, which serves from this cache
const FAVORITES_CACHE_NAME = 'pokedex-favorites-v1';

// The requests the app makes to show a favorite in the grid and its detail
// sheet, so they can all be answered offline. URLs must match the app's own
// requests exactly, since caches match by URL.
async function getUrlsFor(pokemon: Pokemon): Promise<string[]> {
  const { species } = pokemon;
  // Species is the bare {name, url} ref on a raw /pokemon response, or the
  // expanded resource on Pokémon loaded through a generation (see Pokedex.js)
  const speciesUrl =
    species.url ||
    `${pokeapi.BASE_URL}/pokemon-species/${'id' in species ? species.id : ''}/`;
  const speciesData: PokemonSpecies =
    'evolution_chain' in species && species.evolution_chain
      ? (species as PokemonSpecies)
      : (await pokeapi.get<PokemonSpecies>(speciesUrl)).data;

  return [
    `${pokeapi.BASE_URL}/pokemon/${pokemon.id}`, // useFavorites resolves favorites by this URL
    speciesUrl,
    speciesData.evolution_chain?.url,
    ...pokemon.types.map((t) => t.type.url),
    pokemon.sprites.front_default,
    pokemon.sprites.other?.['official-artwork']?.front_default,
  ].filter((url): url is string => Boolean(url));
}

// Make the favorites cache hold exactly what `favorites` need: add anything
// missing (copying from the service worker's caches when already there) and
// remove entries no favorite needs any more. Failures are ignored; the next
// sync tries again.
export async function syncOfflineFavorites(favorites: Pokemon[]): Promise<void> {
  if (!('caches' in window)) return;

  const wanted = new Set(
    (await Promise.allSettled(favorites.map(getUrlsFor)))
      .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
  );
  const cache = await caches.open(FAVORITES_CACHE_NAME);
  const cachedUrls = new Set((await cache.keys()).map((request) => request.url));

  await Promise.allSettled([
    ...[...wanted]
      .filter((url) => !cachedUrls.has(url))
      .map(async (url) => {
        const existing = await caches.match(url, { ignoreVary: true });
        return existing ? cache.put(url, existing) : cache.add(url);
      }),
    ...[...cachedUrls].filter((url) => !wanted.has(url)).map((url) => cache.delete(url)),
  ]);
}
