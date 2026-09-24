# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server at http://localhost:3000
npm run build           # production build to build/
npm run preview         # serve the build/ output locally
npm test                # vitest in watch mode
npm test -- --run       # single non-watching run (use in CI/scripts)
npm test -- --run src/components/Pokedex/Pokedex.favorites.test.js  # single test file
npm run test:coverage    # single run with a coverage report (text + html in coverage/)
npm run lint             # eslint .
npm run format           # prettier --write .
npm run format:check     # prettier --check . (no writes)
```

`vitest.config.js` sets coverage thresholds (lines/statements/functions/branches) a little under actual coverage, as a regression floor rather than a target — raise them as more of the app gets covered.

## Architecture

### JSX lives in `.js` files, not `.jsx`

This is a project-wide, load-bearing convention: every component file is `Component.js` containing JSX, never `.jsx`. Both [vite.config.js](vite.config.js) and [vitest.config.js](vitest.config.js) explicitly configure esbuild (`loader: 'jsx'`, `include: /src\/.*\.jsx?$/`) and `@vitejs/plugin-react` (`include: /\.jsx?$/`) to parse `.js` as JSX — without that, nothing imports. If you add new tooling (a new vite plugin, a different test runner, a storybook config, etc.), it needs the same override or it will silently fail to parse components.

### Data layer: one API client, cached indefinitely

All PokéAPI access goes through [src/api/pokeapi.js](src/api/pokeapi.js) — a single axios instance with an in-memory `Map` cache keyed by URL. Because PokéAPI resources are immutable, responses are cached forever for the life of the tab (no TTL/eviction), and the cache stores the in-flight _promise_, not just the resolved value, so concurrent requests for the same URL are deduped automatically. Failed requests are retried twice with backoff and are not cached. `pokeapi.get()` accepts either a path relative to the base URL or a full URL (as returned in other PokéAPI responses' `.url` fields), so callers rarely need to know which they have.

Never call `axios` directly for PokéAPI requests — always go through this client, or you lose caching/dedup/retry and diverge from the rest of the app.

### Routing: hand-rolled history, no react-router

There's no router dependency. [src/hooks/useHistoryLocation.js](src/hooks/useHistoryLocation.js) owns `window.history` directly: `view`/`gen`/`pokemon` are reflected in the URL (`?view=favorites` / `quiz` / `settings`, `?gen=generation-iv`, `?pokemon=pikachu`) so reloads/deep links/shortcuts work, while an open sheet (`sheet: 'filter' | 'generations'`) lives only in the history _entry_ (not the URL) so the back button/gesture can close it without changing the address bar. `navigate()` pushes or replaces an entry; an entry for an already-open sheet gets replaced (not stacked) so back doesn't reopen it. `closeOverlay(key, value)` is the counterpart used to close something `navigate()` opened — it steps back through history when that's still consistent, otherwise just clears local state — which is what makes the hardware/gesture back button and a sheet's own close (✕) button behave identically. [src/components/Pokedex/Pokedex.js](src/components/Pokedex/Pokedex.js) is the sole consumer; its `view`/`detailName`/`sheet` state mirrors the current history entry via `handleLocationChangeRef`.

### `Pokedex.js` is the app's core stateful component

[src/components/Pokedex/Pokedex.js](src/components/Pokedex/Pokedex.js) owns generation loading/caching (`generationCacheRef`, so revisiting a generation is instant), infinite-scroll batching per generation, global search (a one-time name/URL index plus on-demand fetch for matches not yet loaded), type filtering, favorites (delegated to `useFavorites`), and which sheet/detail view is open. Most feature work touches this file. `src/components/PokemonGrid/`, `GenerationList/`, `TypeFilterModal/`, and `PokemonDetail/` are largely presentational consumers driven by its state.

### One shared overlay shell for every sheet/modal

[src/components/Modal/Modal.js](src/components/Modal/Modal.js) is the single shared component behind every overlay — `PokemonDetail`, `GenerationSheet`, and `TypeFilterModal` all render through it rather than each building their own backdrop/panel. It renders as a right-side slide-in panel on desktop and a bottom sheet on mobile via CSS media query (no separate "sheet" vs "dialog" prop needed), and owns focus trap, Escape-to-close, backdrop click, focus-return-on-close, and swipe-to-dismiss (Pointer Events, drag only from elements marked `data-sheet-drag`) itself. Don't duplicate backdrop/animation/focus-trap logic in a new overlay — extend `Modal` instead.

### PWA / service worker: custom, not Workbox

[public/sw.js](public/sw.js) is hand-written (no Workbox). [vite.config.js](vite.config.js)'s `swBuildManifest` plugin rewrites two placeholders in the _built_ `sw.js` at build time: `__BUILD_HASH__` becomes a hash of the rest of the build output (so `CACHE_NAME` changes only when something actually changed, with no manual version bump), and `/* __BUILD_ASSETS__ */ []` becomes the list of hashed `assets/` and `types/` files to precache. In dev these placeholders are left literal — the build fails loudly if either placeholder goes missing, so don't rename them without updating the plugin. Same-origin app files, `pokeapi.co` API responses, and sprite images each get their own long-lived cache (survives deploys; only `CACHE_NAME` itself is deploy-versioned). [src/offlineFavorites.js](src/offlineFavorites.js) proactively mirrors whatever a favorited Pokémon needs (data, species, evolution chain, types, sprites) into a dedicated `pokedex-favorites-v1` cache so Favorites works offline regardless of recent browsing — its cache name must stay in sync with the one `sw.js` reads, since they're two independent hardcoded strings, not a shared constant.

### Shared constants and logging

[src/constants.js](src/constants.js) holds `typeColors`, `getTypeColor`, `getTypeTextColor` (WCAG-AA-checked text color per type badge), and `generationNames` — import from here rather than redefining type color maps per component. [src/logger.js](src/logger.js)'s `devWarn` gates console output behind `import.meta.env.DEV` for non-fatal failure paths (e.g. an optional favorite fetch failing); use it instead of a bare `console.warn` so production consoles stay clean.

## Planning docs

- [TODO.md](TODO.md) — bugs and improvements found in a repo audit, checkbox-tracked by category.
- [FUTURE_IDEAS.md](FUTURE_IDEAS.md) — net-new feature ideas, not yet planned work.

README.md's "Project Structure" section has gone stale before (referencing removed files); prefer this file and the actual source tree over that section when they conflict.
