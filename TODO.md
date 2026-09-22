# Pokédex — Audit TODO

Generated from a full repo audit on 2026-09-22. Organized by category, most impactful first.

## 🐛 Bugs / Errors

- [x] **`npm audit` reports 14 vulnerabilities (1 critical, 9 high, 3 moderate, 1 low)** — ran `npm audit fix`; all 14 were fixable within the existing `^` semver ranges in `package.json` (no `--force`/major bumps needed). Lockfile now pulls `axios@1.20.0`, `vite@7.3.6`, `vitest@4.1.11`, etc. `npm audit` now reports 0 vulnerabilities. Verified `eslint`/`vite build` still pass after the bump.
- [x] **Stray `.next/` directory** at repo root (untracked) — checked: it's no longer present in the working tree (was only in the initial session snapshot, not reproduced by any script in this repo), so nothing to delete. No `.gitignore` entry added since it isn't being regenerated — revisit if it reappears.
- [x] **No LICENSE file** despite `README.md` linking to `[LICENSE](LICENSE)` and claiming MIT — added `LICENSE` (MIT, copyright barkerbg001, 2026).
- [x] **Pagination silently stalls on API failure after the first page** — was: the mock-data fallback only triggered when `offset === 0`, and `hasMore` was never reset on a failed later page, so the `IntersectionObserver` retried forever. Fixed incidentally by the generation-sidebar rework: `loadGenerationBatch`'s catch block now unconditionally sets `hasMore(false)` on any failure, not just the first batch. Still no user-visible error message or retry button — that part of this item is now tracked separately below.
- [ ] **No request cancellation on unmount** — `axios.get` calls in [Pokedex.js](src/components/Pokedex/Pokedex.js) and [PokemonDetail.js](src/components/PokemonDetail/PokemonDetail.js) aren't aborted when the component unmounts (e.g. closing the modal mid-fetch), risking "set state on unmounted component" issues and wasted network calls. Use `AbortController` or an `isMounted`/cleanup guard.
- [ ] **`String.replace('-', ' ')` only replaces the first hyphen** ([PokemonDetail.js](src/components/PokemonDetail/PokemonDetail.js) and others) — stat/move/ability names with multiple hyphens won't be fully formatted. Use `.replace(/-/g, ' ')`.
- [ ] **Unsafe array access in moves tab** ([PokemonDetail.js](src/components/PokemonDetail/PokemonDetail.js)): `m.version_group_details[0].move_learn_method.name` will throw if `version_group_details` is ever empty for a move returned by the API.
- [ ] **Fragile modal backdrop-click check** ([PokemonDetail.js](src/components/PokemonDetail/PokemonDetail.js)): compares `e.target.className === 'modal'`, which breaks if the class list ever gains another class (e.g. via a theme/animation class). Compare `e.target === e.currentTarget` instead.
- [x] **`theme` prop is passed to `Pokedex` but never used** — now actually used: the theme toggle moved out of the navbar into a new Settings view (reachable from the Menu), and `theme`/`onToggleTheme` are passed from `App.js` through `Pokedex.js` to `Settings.js`.
- [x] **Favorites can silently disappear** — was: a favorited Pokémon only rendered in the favorites strip if it happened to already be loaded. Fixed as part of the generation-sidebar rework below: a dedicated effect now resolves any favorited id not present in the currently loaded list via a direct `/pokemon/{id}` fetch, so favorites show up regardless of which generation is selected or whether that Pokémon was ever paginated in.
- [x] ~~Search only applies to already-loaded Pokémon~~ — fixed: search now checks a full name index and fetches missing matches from PokéAPI on demand (see [Server-side/API-backed search](#-additional-feature-ideas-not-yet-in-readme) below). The **type filter** is still limited to loaded Pokémon only.
- [x] ~~No user-visible indicator when the app has silently fallen back to mock/demo data after an API failure~~ — moot: the mock/demo dataset has been removed entirely (see below). Failures now show a visible error state instead of silently substituting fake data.
- [x] **`PokemonDetail.js` evolution/forms fetch was silently broken for every real (non-mock) Pokémon**: [Pokedex.js](src/components/Pokedex/Pokedex.js) overwrites `pokemon.species` with the fully-expanded species resource (for generation grouping), but a species resource has no self `.url` field. `PokemonDetail.js` was doing `axios.get(pokemon.species.url)` → `axios.get(undefined)`, which always failed and silently fell into the mock-data catch block — meaning the Evolution tab (and now Forms) never used real data for anything loaded from the live API, only ever the 3 hardcoded mock Pokémon. Fixed by reusing the already-expanded `species` object when present (`pokemon.species.evolution_chain` exists) and only fetching by URL for the bare `{name, url}` reference shape (mock data). Bonus: this also removes a redundant species re-fetch for every real Pokémon's detail view.

## 🔒 Security

- [x] ~~Address the `npm audit` findings above~~ — see the `npm audit fix` entry above; 0 vulnerabilities remaining.
- [ ] Set up Dependabot **security** updates (currently only version-update schedule is configured in [dependabot.yml](.github/dependabot.yml)) or enable GitHub's Dependabot alerts.

## 🧹 Code Quality / Tech Debt

- [x] **Duplicated `typeColors`/`getTypeColor` maps** in both [Pokedex.js](src/components/Pokedex/Pokedex.js) and [PokemonDetail.js](src/components/PokemonDetail/PokemonDetail.js) — extracted to [src/constants.js](src/constants.js) (`typeColors`, `getTypeColor`, `generationNames`) and imported from both files.
- [x] **No ESLint or Prettier configuration** anywhere in the repo — added [eslint.config.js](eslint.config.js) (flat config, React + hooks + refresh plugins, Prettier-compatible) and [.prettierrc.json](.prettierrc.json)/[.prettierignore](.prettierignore), plus `npm run lint`, `npm run format`, `npm run format:check` scripts. Fixed the resulting lint findings (unused catch bindings, one empty catch block). Note: only the files touched this session were run through `prettier --write`; the rest of the repo has never been formatted — run `npm run format` repo-wide when it's a good time for a large, low-risk diff.
- [ ] **No TypeScript**, despite `@types/react`/`@types/react-dom` being installed as devDependencies with no `.ts`/`.tsx` files anywhere — either remove the unused type packages or consider migrating for type safety on API response shapes.
- [ ] Leftover `console.log`/debug logging in production code paths (API-failure handlers in [Pokedex.js](src/components/Pokedex/Pokedex.js), [PokemonDetail.js](src/components/PokemonDetail/PokemonDetail.js), [registerSW.js](src/registerSW.js#L7), [InstallPrompt.js](src/components/InstallPrompt/InstallPrompt.js)) — gate behind a dev flag or remove.
- [x] Hardcoded PokéAPI base URL repeated across files — centralized into [src/api/pokeapi.js](src/api/pokeapi.js), a small `axios`-based client with `baseURL` set once. Every `axios.get` call across `Pokedex.js` and `PokemonDetail.js` now goes through `pokeapi.get(...)` (it accepts either a relative path or a full URL, so calls using API-provided `.url` references didn't need rewriting). Also added, since PokéAPI resources are immutable: in-memory response caching (keyed by URL, indefinite TTL) that also dedupes concurrent identical requests, and automatic retry with backoff (2 retries) on failed requests, without caching failures. This directly helps the "no response cache" performance item below.
- [ ] Dead/half-dead branches in [reportWebVitals.js](src/reportWebVitals.js#L8-L21): `getCLS`/`getFID`/`getFCP`/`getLCP`/`getTTFB` no longer exist on `web-vitals@5.x`, so half of every `if/else` is always false — simplify to just the `on*` API.
- [ ] `site.webmanifest` and `manifest.json` in [public/](public/) appear to be duplicates of each other; only `manifest.json` is referenced from [index.html](index.html#L15) — confirm `site.webmanifest` is actually needed (e.g. for Safari pinned tabs) or remove it.
- [x] README's **Project Structure** section still describes `public/index.html` as the HTML template — fixed to show `index.html` at the repo root, and added the files introduced since the audit (`constants.js`, `eslint.config.js`, `.prettierrc.json`, `LICENSE`, `CONTRIBUTING.md`, `TODO.md`).

## ✅ Testing

- [ ] Test coverage is effectively zero — the only test ([App.test.js](src/components/App/App.test.js)) just checks the heading renders. Add tests for:
  - [ ] `Pokedex` filtering logic (search, type filter, generation grouping, "clear filters")
  - [ ] Favorites add/remove + localStorage persistence
  - [ ] `PokemonDetail` tabs (stats/abilities/evolution/moves/effectiveness) and the mock-data fallback path
  - [ ] `InstallPrompt` dismiss/7-day-cooldown logic
- [ ] No CI workflow exists ([.github/](.github/) only has `dependabot.yml`) — add a GitHub Actions workflow to run `npm test` and `npm run build` on PRs.
- [ ] No coverage reporting/thresholds configured in [vitest.config.js](vitest.config.js).

## ⚡ Performance

- [x] `loadGenerationBatch` (formerly `loadPokemons`) fetches each Pokémon's full detail **and** its species data individually per batch (up to 60 requests for a 30-item batch) — was previously uncached. Fixed as part of centralizing the API client ([src/api/pokeapi.js](src/api/pokeapi.js)): every request now goes through an in-memory cache keyed by URL, so re-fetching the same species/Pokémon/type (e.g. revisiting a generation, favoriting something already seen elsewhere, opening the same Pokémon's detail twice) no longer hits the network twice. This is per-session/in-memory only, not persistent across reloads — a persistent cache (e.g. via the service worker or IndexedDB) is still a possible future improvement.
- [ ] No `<img>` `width`/`height` attributes on Pokémon sprites/type icons ([Pokedex.js](src/components/Pokedex/Pokedex.js)) — risks layout shift, contradicting the README's claimed CLS < 0.1.
- [ ] Service worker precache list ([public/sw.js](public/sw.js#L2-L9)) is static and doesn't include the hashed JS/CSS bundle filenames Vite produces on build — the very first offline visit after install won't have the app shell cached; only runtime `fetch` caching covers it after the fact. Consider `vite-plugin-pwa`/Workbox to auto-generate a precache manifest per build.
- [ ] `CACHE_NAME` in [sw.js](public/sw.js#L1) is hardcoded (`pokedex-v1`) with no build-time versioning — every deploy needs someone to remember to bump it manually or stale caches persist indefinitely.

## ♿ Accessibility

- [ ] Detail modal ([PokemonDetail.js](src/components/PokemonDetail/PokemonDetail.js)) has no focus trap, no focus-return-to-trigger on close, and no `Escape`-to-close handler.
- [ ] No visually-hidden "skip to content" link or landmark roles beyond the header.
- [ ] Verify color-only type badges/swatches have sufficient contrast and a non-color cue for colorblind users (icons help, but confirm labels are always visible, not just on hover).

## 📚 Documentation

- [x] README technology versions are stale/inconsistent with `package.json` — rewrote the "Technologies Used" section to pull real version numbers and pointed to `package.json` as the source of truth going forward.
- [x] README claims "Background sync for favorites" under PWA offline support — removed; PWA section now only describes what [sw.js](public/sw.js) actually does.
- [x] README performance numbers (Lighthouse 95+, FCP < 1.5s, bundle < 500KB gzipped) read as aspirational/unverified — removed the unverified "Performance" section entirely rather than publish unmeasured numbers.
- [x] Add a `CONTRIBUTING.md`/issue templates to match the "Contributing" section's ambitions, or fold that section down — added `CONTRIBUTING.md`, bug/feature issue templates, and trimmed the README's "Contributing" section to point to them.

## ✨ New Features (from README's own "Planned" list, still outstanding)

- [ ] Pokémon team builder (6-member teams)
- [ ] Pokémon cry audio playback
- [x] Shiny sprite toggle — went further: the detail modal now shows a full sprite gallery (Default, Shiny, Back, Back Shiny, Official Art, Home, etc., whichever variants PokéAPI/mock data actually provides) as clickable thumbnails under the main image, not just a single shiny toggle.
- [ ] Compare Pokémon side-by-side
- [ ] Filter by egg group or habitat
- [ ] Move details with damage calculations
- [ ] Type coverage calculator
- [ ] Export teams as images
- [ ] Multi-language support
- [ ] Advanced search (height/weight ranges)

## 🆕 Additional Feature Ideas (not yet in README)

- [x] Server-side/API-backed search so users can find Pokémon that haven't been paginated in yet — added a one-time fetch of the full Pokémon name/url index, and on search the app now fetches full details for any matching names not already loaded (capped at 20 per query, debounced 350ms), merging them into the grid.
- [x] Retry button / visible error banner when live API data can't be loaded, instead of silently switching to demo data — implemented as part of removing the demo dataset (see below): a full-page error view (with "Try Again") when the generation list itself fails to load, and an inline error+retry block in place of the grid when a specific generation's Pokémon fail to load.
- [x] ~~Expand the mock/offline dataset beyond 3 Pokémon so offline/demo mode is actually usable~~ — superseded: the hardcoded 3-Pokémon mock dataset (`mockPokemonData`, `buildMockSprites`) was removed entirely from `Pokedex.js`, along with the mock evolution/type-effectiveness fallbacks in `PokemonDetail.js` and the mock type-filter list. On any API failure the app now shows a real error state (see the "Retry button" item above) instead of ever substituting fake data.
- [ ] Keyboard navigation for the pokemon grid and type-filter scroller (arrow keys, `Enter` to open detail).
- [x] Alternate forms (e.g. Giratina Altered/Origin, Deoxys Normal/Attack/Defense/Speed) weren't discoverable — they only appeared as unrelated, separate search results (PokéAPI models them as distinct Pokémon resources at ids 10001+, which normal infinite-scroll pagination never realistically reaches). Added a **Forms** tab to the detail modal, populated from `species.varieties`, that lets you switch between a Pokémon's forms in place — swapping sprites, stats, types, abilities, and moves, and correctly re-fetching type effectiveness since some alternate forms (e.g. Rotom's appliances) have different types than their default form.
- [x] ~~Generation/region display names hardcoded~~ — superseded by the generation-sidebar rework below, which fetches this live as part of loading each generation's full data anyway.
- [x] **Reworked browsing from one continuous infinite scroll into per-generation loading with a side menu.** Previously, all Pokémon loaded sequentially from `/pokemon?offset=X` (dex-number order) and were only visually grouped into collapsible generation sections client-side — meaning later generations (and especially alt-form entries at id 10001+) were nearly unreachable by scrolling. Now: a `Generations` sidebar (fetched from `/generation`, showing live region names and per-generation species counts) drives which generation is loaded; selecting one fetches only that generation's species (species → default variety → full Pokémon data), 30 at a time via the same infinite-scroll-within-a-list mechanic as before. Switching generations is cached in a ref so flipping back to a previously-viewed generation is instant, no refetch. Search remains global across all generations regardless of which one is selected (see the "Favorites can silently disappear" fix above for the related favorites-resolution change this required).
