import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncOfflineFavorites } from './offlineFavorites';

const BASE = 'https://pokeapi.co/api/v2';

vi.mock('./api/pokeapi', () => ({
  default: {
    BASE_URL: 'https://pokeapi.co/api/v2',
    get: vi.fn(async (url) => ({
      data: { evolution_chain: { url: `${url.replace('pokemon-species', 'evolution-chain')}` } },
    })),
  },
}));

// Minimal Cache API with one named cache per store
function installFakeCaches() {
  const stores = new Map();
  const makeCache = () => {
    const entries = new Map();
    return {
      entries,
      keys: async () => [...entries.keys()].map((url) => ({ url })),
      put: async (url, res) => entries.set(url, res),
      add: vi.fn(async (url) => entries.set(url, `fetched ${url}`)),
      delete: async (url) => entries.delete(url),
      match: async (url) => entries.get(url),
    };
  };
  window.caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, makeCache());
      return stores.get(name);
    },
    match: async (url) => {
      for (const cache of stores.values()) {
        const hit = await cache.match(url);
        if (hit) return hit;
      }
    },
  };
  return stores;
}

const rawPikachu = {
  id: 25,
  species: { name: 'pikachu', url: `${BASE}/pokemon-species/25/` },
  types: [{ type: { url: `${BASE}/type/13/` } }],
  sprites: {
    front_default: 'https://sprites/25.png',
    other: { 'official-artwork': { front_default: 'https://sprites/art/25.png' } },
  },
};

// As loaded through a generation: species expanded, no self url
const loadedBulbasaur = {
  id: 1,
  species: { id: 1, evolution_chain: { url: `${BASE}/evolution-chain/1/` } },
  types: [{ type: { url: `${BASE}/type/12/` } }],
  sprites: { front_default: 'https://sprites/1.png', other: {} },
};

describe('syncOfflineFavorites', () => {
  let stores;
  beforeEach(() => {
    stores = installFakeCaches();
  });
  afterEach(() => {
    delete window.caches;
  });

  it('caches everything a favorite needs, reusing existing cache entries', async () => {
    const spriteCache = await window.caches.open('sprites-v1');
    await spriteCache.put('https://sprites/25.png', 'already cached');

    await syncOfflineFavorites([rawPikachu, loadedBulbasaur]);

    const favorites = stores.get('pokedex-favorites-v1');
    expect([...favorites.entries.keys()].sort()).toEqual(
      [
        `${BASE}/pokemon/25`,
        `${BASE}/pokemon-species/25/`,
        `${BASE}/evolution-chain/25/`,
        `${BASE}/type/13/`,
        'https://sprites/25.png',
        'https://sprites/art/25.png',
        `${BASE}/pokemon/1`,
        `${BASE}/pokemon-species/1/`,
        `${BASE}/evolution-chain/1/`,
        `${BASE}/type/12/`,
        'https://sprites/1.png',
      ].sort()
    );
    expect(favorites.entries.get('https://sprites/25.png')).toBe('already cached');
    expect(favorites.add).not.toHaveBeenCalledWith('https://sprites/25.png');
  });

  it('removes entries for Pokémon that are no longer favorites', async () => {
    await syncOfflineFavorites([rawPikachu, loadedBulbasaur]);
    await syncOfflineFavorites([loadedBulbasaur]);

    const urls = [...stores.get('pokedex-favorites-v1').entries.keys()];
    expect(urls.some((url) => url.includes('25'))).toBe(false);
    expect(urls).toContain(`${BASE}/pokemon/1`);
  });
});
