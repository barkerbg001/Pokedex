// The placeholder below is replaced at build time with a hash of the build output
// (see swBuildManifest in vite.config.js), so each deploy that changes any file
// gets a fresh cache and the activate handler below purges the old one.
const CACHE_NAME = 'pokedex-__BUILD_HASH__';
// Filled in at build time with the hashed JS/CSS bundles and type icons
// (see swBuildManifest in vite.config.js); stays empty in dev.
const buildAssets = /* __BUILD_ASSETS__ */ [];
// PokéAPI data and sprite images never change, so they're cached separately
// from the app shell and kept across deploys (the activate handler leaves these
// caches alone). Bump a version only if its stored format ever needs to change.
const API_CACHE_NAME = 'pokeapi-v1';
const SPRITE_CACHE_NAME = 'sprites-v1';
// Filled by the app itself (src/offlineFavorites.js) with everything needed to
// show favorites offline. Never evicted; the app removes unfavorited entries.
const FAVORITES_CACHE_NAME = 'pokedex-favorites-v1';

// Per-Pokémon API entries are the bulk of the API cache (roughly 20-400 KB
// each), so only they are evicted, oldest first, beyond this many. Everything
// else (generation and type lists, the name index) is small and needed to
// start the app offline, so it's never evicted.
const MAX_EVICTABLE_API_ENTRIES = 600;
const EVICTABLE_API_PATH = /^\/api\/v2\/(pokemon|pokemon-species)\//;
// Sprites run from under 1 KB (pixel sprites) to ~150 KB (official artwork)
const MAX_SPRITE_ENTRIES = 500;

const RUNTIME_CACHES = {
  'https://pokeapi.co': {
    name: API_CACHE_NAME,
    isEvictable: (url) => EVICTABLE_API_PATH.test(url.pathname),
    maxEntries: MAX_EVICTABLE_API_ENTRIES,
  },
  'https://raw.githubusercontent.com': {
    name: SPRITE_CACHE_NAME,
    isEvictable: () => true,
    maxEntries: MAX_SPRITE_ENTRIES,
  },
};

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico',
  ...buildAssets
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Serve from any cache (including the favorites cache), otherwise fetch and
// store in the runtime cache for that origin. Offline with nothing cached, the
// request fails as it would without a service worker, and the app shows its
// usual error state.
async function runtimeCacheFirst(event, config) {
  const cached = await caches.match(event.request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(event.request);
  // Opaque responses (e.g. an <img> without crossorigin) can't be checked, and
  // Chrome counts each one as several MB of storage quota, so they're skipped
  if (response.ok && response.type !== 'opaque') {
    event.waitUntil(
      caches
        .open(config.name)
        .then((cache) =>
          cache.put(event.request, response.clone()).then(() => trimCache(cache, config))
        )
        .catch(() => {
          // Storage full or unavailable: the response is still returned uncached
        })
    );
  }
  return response;
}

// cache.keys() lists entries in insertion order, so the first ones are oldest
async function trimCache(cache, { isEvictable, maxEntries }) {
  const evictable = (await cache.keys()).filter((request) => isEvictable(new URL(request.url)));
  const excess = evictable.length - maxEntries;
  if (excess > 0) {
    await Promise.all(evictable.slice(0, excess).map((request) => cache.delete(request)));
  }
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const runtimeCache = RUNTIME_CACHES[new URL(event.request.url).origin];
  if (event.request.method === 'GET' && runtimeCache) {
    event.respondWith(runtimeCacheFirst(event, runtimeCache));
    return;
  }

  // Every page URL (?view=favorites, ?pokemon=pikachu, the manifest shortcuts)
  // is the same single-page app, so answer navigations with the cached shell;
  // an exact-URL match would miss for any query string
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches
        .match('/', { ignoreVary: true })
        .then((shell) => shell || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    // ignoreVary: servers often send `Vary: Origin`, and Vite's <script>/<link>
    // tags use `crossorigin` (so requests carry an Origin header the precache
    // requests didn't), which would otherwise make every precached bundle miss.
    caches.match(event.request, { ignoreVary: true })
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME, SPRITE_CACHE_NAME, FAVORITES_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


