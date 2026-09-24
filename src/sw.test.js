// @vitest-environment node
//
// public/sw.js is a hand-written, unbundled script that runs in a
// ServiceWorkerGlobalScope, not an ES module - jsdom (this project's default
// test environment) doesn't implement the Cache Storage API either. This
// harness loads its source into a small sandboxed `vm` context with a fake
// `self`/`caches`/`fetch`, captures the listeners it registers via
// addEventListener, and fires them directly.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const swPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/sw.js');
const swSource = readFileSync(swPath, 'utf-8')
  // Only filled in at build time (see swBuildManifest in vite.config.js)
  .replace('__BUILD_HASH__', 'test')
  .replace('/* __BUILD_ASSETS__ */ []', JSON.stringify(['/assets/main.js']));

const ORIGIN = 'https://pokedex.test';

// A plain object with just the Request properties/methods sw.js actually
// touches - the real Fetch API's Request forbids constructing one with
// mode: 'navigate' at all, which sw.js needs to branch on
function fakeRequest({ method = 'GET', url, mode = 'cors', destination = '' } = {}) {
  return {
    method,
    url,
    mode,
    destination,
    clone() {
      return fakeRequest({ method, url, mode, destination });
    },
  };
}

function fakeResponse({ ok = true, status = 200, type = 'basic' } = {}) {
  return {
    ok,
    status,
    type,
    clone() {
      return fakeResponse({ ok, status, type });
    },
  };
}

// A minimal in-memory CacheStorage: enough of the real interface (open,
// match/put/delete/keys/addAll on a Cache, and match/keys/delete on the
// top-level CacheStorage) for sw.js's own logic to run against
function createFakeCaches(fetchImpl) {
  const named = new Map();

  function keyOf(reqOrUrl) {
    return typeof reqOrUrl === 'string' ? new URL(reqOrUrl, ORIGIN).href : reqOrUrl.url;
  }

  function makeCache() {
    const store = new Map();
    return {
      match: async (reqOrUrl) => store.get(keyOf(reqOrUrl)),
      put: async (reqOrUrl, response) => {
        const request = typeof reqOrUrl === 'string' ? fakeRequest({ url: reqOrUrl }) : reqOrUrl;
        if (request.method !== 'GET') {
          throw new TypeError(
            `Failed to execute 'put': Request method '${request.method}' is unsupported`
          );
        }
        store.set(keyOf(reqOrUrl), response);
      },
      delete: async (reqOrUrl) => store.delete(keyOf(reqOrUrl)),
      keys: async () => [...store.keys()].map((url) => fakeRequest({ url })),
      addAll: async (urls) => {
        await Promise.all(
          urls.map(async (url) => store.set(keyOf(url), await fetchImpl(fakeRequest({ url }))))
        );
      },
      _store: store,
    };
  }

  return {
    open: async (name) => {
      if (!named.has(name)) named.set(name, makeCache());
      return named.get(name);
    },
    match: async (reqOrUrl, opts) => {
      for (const cache of named.values()) {
        const hit = await cache.match(reqOrUrl, opts);
        if (hit) return hit;
      }
      return undefined;
    },
    keys: async () => [...named.keys()],
    delete: async (name) => named.delete(name),
    _named: named,
  };
}

function loadSW({ fetchImpl = vi.fn(async () => fakeResponse()) } = {}) {
  const listeners = {};
  const caches = createFakeCaches(fetchImpl);
  const skipWaiting = vi.fn();
  const claim = vi.fn(async () => {});
  const selfObj = {
    addEventListener: (type, handler) => {
      (listeners[type] ??= []).push(handler);
    },
    skipWaiting,
    clients: { claim },
    location: new URL(ORIGIN),
  };
  const sandbox = { self: selfObj, caches, fetch: fetchImpl, console, URL };
  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox, { filename: 'sw.js' });
  return { listeners, caches, skipWaiting, claim, fetchImpl };
}

// Fires every handler registered for `type`, collecting waitUntil() promises
// and whatever respondWith() was (eventually) given
function fire(listeners, type, event = {}) {
  const waits = [];
  const full = {
    ...event,
    waitUntil: (p) => waits.push(p),
    respondWith: (p) => {
      full.response = p;
    },
  };
  (listeners[type] || []).forEach((handler) => handler(full));
  return { event: full, ready: Promise.all(waits) };
}

describe('sw.js install/activate/message', () => {
  it('precaches the app shell plus the build-time asset list on install', async () => {
    const { listeners, caches } = loadSW();
    const { ready } = fire(listeners, 'install');
    await ready;

    const cache = await caches.open('pokedex-test');
    expect([...cache._store.keys()]).toEqual(
      expect.arrayContaining([`${ORIGIN}/`, `${ORIGIN}/manifest.json`, `${ORIGIN}/assets/main.js`])
    );
  });

  it('skips waiting only for a SKIP_WAITING message', () => {
    const { listeners, skipWaiting } = loadSW();
    fire(listeners, 'message', { data: { type: 'SOMETHING_ELSE' } });
    fire(listeners, 'message', {});
    expect(skipWaiting).not.toHaveBeenCalled();

    fire(listeners, 'message', { data: { type: 'SKIP_WAITING' } });
    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('deletes caches outside the whitelist and claims open clients', async () => {
    const { listeners, caches, claim } = loadSW();
    await caches.open('pokedex-test');
    await caches.open('pokeapi-v1');
    await caches.open('sprites-v1');
    await caches.open('pokedex-favorites-v1');
    await caches.open('pokedex-some-old-build');

    const { ready } = fire(listeners, 'activate');
    await ready;

    expect([...caches._named.keys()].sort()).toEqual(
      ['pokeapi-v1', 'pokedex-favorites-v1', 'pokedex-test', 'sprites-v1'].sort()
    );
    expect(claim).toHaveBeenCalledTimes(1);
  });
});

describe('sw.js fetch handler', () => {
  it('leaves a non-GET request untouched (no respondWith)', () => {
    const { listeners } = loadSW();
    const { event } = fire(listeners, 'fetch', {
      request: fakeRequest({ method: 'POST', url: `${ORIGIN}/api/favorite` }),
    });
    expect(event.response).toBeUndefined();
  });

  it('leaves an unhandled cross-origin GET untouched', () => {
    const { listeners, fetchImpl } = loadSW();
    const { event } = fire(listeners, 'fetch', {
      request: fakeRequest({
        method: 'GET',
        url: 'https://example.com/thing.png',
        mode: 'no-cors',
      }),
    });
    expect(event.response).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('serves a same-origin GET from the network and caches it, tolerating a cache write failure', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({ status: 200, type: 'basic' }));
    const { listeners, caches } = loadSW({ fetchImpl });
    const cache = await caches.open('pokedex-test');
    cache.put = vi.fn(async () => {
      throw new Error('storage full');
    });

    const { event } = fire(listeners, 'fetch', {
      request: fakeRequest({ method: 'GET', url: `${ORIGIN}/assets/other.js` }),
    });
    const response = await event.response;

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('answers a navigation with the cached shell regardless of query string, without hitting the network', async () => {
    const fetchImpl = vi.fn();
    const { listeners, caches } = loadSW({ fetchImpl });
    const cache = await caches.open('pokedex-test');
    const shellResponse = fakeResponse({ status: 200 });
    await cache.put('/', shellResponse);

    const { event } = fire(listeners, 'fetch', {
      request: fakeRequest({
        method: 'GET',
        url: `${ORIGIN}/?view=favorites`,
        mode: 'navigate',
        destination: 'document',
      }),
    });
    const response = await event.response;

    expect(response).toBe(shellResponse);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('serves a runtime-cached origin (PokéAPI) cache-first, then falls back to the network on a miss', async () => {
    const cached = fakeResponse({ status: 200 });
    const fromNetwork = fakeResponse({ status: 200, type: 'basic' });
    const fetchImpl = vi.fn(async () => fromNetwork);
    const { listeners, caches } = loadSW({ fetchImpl });
    const apiCache = await caches.open('pokeapi-v1');
    await apiCache.put('https://pokeapi.co/api/v2/pokemon/1', cached);

    const hit = fire(listeners, 'fetch', {
      request: fakeRequest({ method: 'GET', url: 'https://pokeapi.co/api/v2/pokemon/1' }),
    });
    expect(await hit.event.response).toBe(cached);
    expect(fetchImpl).not.toHaveBeenCalled();

    const miss = fire(listeners, 'fetch', {
      request: fakeRequest({ method: 'GET', url: 'https://pokeapi.co/api/v2/pokemon/2' }),
    });
    await miss.ready;
    expect(await miss.event.response).toBe(fromNetwork);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
