import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncOfflineFavorites } from './offlineFavorites';
import type { Pokemon } from './types/pokeapi';

const BASE = 'https://pokeapi.co/api/v2';

vi.mock('./api/pokeapi', () => ({
  default: {
    BASE_URL: 'https://pokeapi.co/api/v2',
    get: vi.fn(async (url: string) => ({
      data: { evolution_chain: { url: `${url.replace('pokemon-species', 'evolution-chain')}` } },
    })),
  },
}));

type FakeCache = {
  entries: Map<string, unknown>;
  keys: () => Promise<{ url: string }[]>;
  put: (url: string, res: unknown) => Promise<void>;
  add: ReturnType<typeof vi.fn>;
  delete: (url: string) => Promise<boolean>;
  match: (url: string) => Promise<unknown>;
};

// Minimal Cache API with one named cache per store
function installFakeCaches() {
  const stores = new Map<string, FakeCache>();
  const makeCache = (): FakeCache => {
    const entries = new Map<string, unknown>();
    return {
      entries,
      keys: async () => [...entries.keys()].map((url) => ({ url })),
      put: async (url, res) => {
        entries.set(url, res);
      },
      add: vi.fn(async (url: string) => {
        entries.set(url, `fetched ${url}`);
      }),
      delete: async (url) => entries.delete(url),
      match: async (url) => entries.get(url),
    };
  };
  (window as unknown as { caches: CacheStorage }).caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, makeCache());
      return stores.get(name) as unknown as Cache;
    },
    match: async (url: RequestInfo | URL) => {
      const key = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      for (const cache of stores.values()) {
        const hit = await cache.match(key);
        if (hit) return hit as Response;
      }
      return undefined;
    },
  } as CacheStorage;
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
} as unknown as Pokemon;

// As loaded through a generation: species expanded, no self url
const loadedBulbasaur = {
  id: 1,
  species: { id: 1, evolution_chain: { url: `${BASE}/evolution-chain/1/` } },
  types: [{ type: { url: `${BASE}/type/12/` } }],
  sprites: { front_default: 'https://sprites/1.png', other: {} },
} as unknown as Pokemon;

describe('syncOfflineFavorites', () => {
  let stores: Map<string, FakeCache>;
  beforeEach(() => {
    stores = installFakeCaches();
  });
  afterEach(() => {
    (window as unknown as { caches?: CacheStorage }).caches = undefined;
  });

  it('caches everything a favorite needs, reusing existing cache entries', async () => {
    const spriteCache = await window.caches.open('sprites-v1');
    await spriteCache.put('https://sprites/25.png', 'already cached' as unknown as Response);

    await syncOfflineFavorites([rawPikachu, loadedBulbasaur]);

    const favorites = stores.get('pokedex-favorites-v1')!;
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

    const urls = [...stores.get('pokedex-favorites-v1')!.entries.keys()];
    expect(urls.some((url) => url.includes('25'))).toBe(false);
    expect(urls).toContain(`${BASE}/pokemon/1`);
  });
});
