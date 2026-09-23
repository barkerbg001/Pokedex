# Pokédex — Future Ideas

Net-new feature ideas for the Pokédex app. See [TODO.md](TODO.md) for bugs and improvements.

## 🕹️ Team & Battle

- [ ] Pokémon team builder (6-member teams)
- [ ] Type coverage calculator
- [ ] Move details with damage calculations
- [ ] Team type-coverage heatmap — once a team builder exists, a small 18-type grid showing at a glance which types the team is weak/resistant to as a whole, not just per-Pokémon.
- [ ] Export teams as images

## 📊 Comparison & Visualization

- [ ] Compare Pokémon side-by-side
- [ ] Radar/spider chart for base stats — replace or supplement the stat bars with a hexagonal radar chart; makes stat spread (glass cannon vs. tank) far more readable at a glance. Pairs with the compare feature: two radar charts overlaid in different colors on one axis set.
- [ ] Evolution chain as a graph, not a list — branching evolutions (Eevee, Tyrogue, Wurmple) don't fit a linear strip well; a small node-and-arrow layout (conditions labeled on the edges: level, item, friendship, trade) reads much better.
- [ ] Sprite-through-the-generations strip — PokéAPI's `sprites.versions` has the same Pokémon's sprite from every game generation (Red/Blue through Scarlet/Violet); a horizontal filmstrip in the Sprites tab would be a fun nostalgia feature that needs no new data source.

## 🔍 Search & Filters

- [ ] Filter by egg group or habitat
- [ ] Advanced search (height/weight ranges)
- [ ] Game-version availability filter — PokéAPI's `pokemon_species.flavor_text_entries`/version group data can tell you which games a Pokémon actually appears in; useful alongside the height/weight filters above.

## 🎮 Games & Engagement

- [ ] "Who's That Pokémon?" guessing game — show a darkened/silhouette sprite (CSS `brightness(0)` on the official artwork), let the user type or pick from multiple choice, reveal with the classic flip animation. Easy win: no new data needed, just a game mode over the existing sprite/name data.
- [ ] Trivia quiz mode — pull questions from data already fetched (type matchups, stats, abilities, "which gen is X from") rather than a hardcoded question bank, so it scales to every Pokémon for free.
- [ ] Type-matchup quiz / trainer — "what's Water weak against?" style drills using the same effectiveness data the detail modal's Effectiveness tab already computes.
- [ ] "Surprise me" random Pokémon button — `/pokemon/{random 1-1025}`, opens straight into the detail sheet. Cheap, fun, and a good empty-state action for the search box.
- [ ] Seen/caught toggle per Pokémon — distinct from Favorites: a lightweight "seen" checkmark on every card (localStorage set of ids) so browsing feels like filling in a real Pokédex, plus a completion % per generation in the sidebar.
- [ ] Achievements/badges — "Completed Kanto", "Favorited a Legendary", "Found a shiny sprite" — small toasts + a badge shelf in Settings, computed from existing favorites/seen data.

## 🎨 Personalization & Sharing

- [ ] Shareable "trading card" export — render a Pokémon's sprite, name, type, and stats onto a `<canvas>` styled like a trading card and let the user save/share it as an image (`canvas.toBlob` + `navigator.share`/download). Builds on the existing share-button + deep-link work.
- [ ] Per-type accent theme — beyond light/dark, let Settings tint the UI's accent color to match a "favorite type" (uses the type colors already defined in [constants.js](src/constants.js)).
- [ ] Classic Pokédex UI sound effects — short blip/select/confirm sounds on navigation and favoriting, toggleable in Settings.
- [ ] Pokémon cry audio playback
- [x] Haptic feedback on mobile — `navigator.vibrate()` on favorite-toggle and swipe actions, cheap to add and feels native on Android. Added [src/haptics.js](src/haptics.js) (a try/catch'd `navigator.vibrate` wrapper; iOS Safari has no Vibration API and silently no-ops). Wired into `toggleFavorite` in [Pokedex.js](src/components/Pokedex/Pokedex.js) and into the sheet swipe-to-dismiss gesture in [Modal.js](src/components/Modal/Modal.js) (a light tick when the drag crosses the dismiss threshold, a stronger pulse on an actual swipe-dismiss).
- [ ] PWA shortcuts to specific favorites — extend the existing manifest `shortcuts` (Search, Favorites) with dynamically-registered shortcuts to a user's top favorited Pokémon, where the platform supports runtime shortcut updates.
- [ ] Multi-language support

## 📚 Reference & Data

- [ ] Standalone full type-effectiveness chart — an 18×18 interactive grid (attacker vs. defender) as its own reference screen, reachable from Settings/Menu, useful independent of any single Pokémon's detail view.
- [ ] Size comparison tool — render a Pokémon's silhouette next to a fixed human-height reference bar using its actual `height`/`weight` data; genuinely surprising for things like Wailord or Diglett that players misjudge.
- [ ] Held items & breeding info tab — `held_items`, egg groups, and gender ratio are already in the `/pokemon` and `/pokemon-species` payloads being fetched but aren't surfaced anywhere in the detail modal.
- [ ] Flavor text read-aloud — feed the Pokédex flavor text entries already available per-species into the Web Speech API's `speechSynthesis` for a screen-reader-adjacent "read to me" button; a nice accessibility + novelty combo.

## ✅ Shipped

- [x] Shiny sprite toggle — went further: the detail modal now shows a full sprite gallery (Default, Shiny, Back, Back Shiny, Official Art, Home, etc., whichever variants PokéAPI/mock data actually provides) as clickable thumbnails under the main image, not just a single shiny toggle.
- [x] Server-side/API-backed search so users can find Pokémon that haven't been paginated in yet — added a one-time fetch of the full Pokémon name/url index, and on search the app now fetches full details for any matching names not already loaded (capped at 20 per query, debounced 350ms), merging them into the grid.
- [x] Retry button / visible error banner when live API data can't be loaded, instead of silently switching to demo data — implemented as part of removing the demo dataset: a full-page error view (with "Try Again") when the generation list itself fails to load, and an inline error+retry block in place of the grid when a specific generation's Pokémon fail to load.
- [x] ~~Expand the mock/offline dataset beyond 3 Pokémon so offline/demo mode is actually usable~~ — superseded: the hardcoded 3-Pokémon mock dataset (`mockPokemonData`, `buildMockSprites`) was removed entirely from `Pokedex.js`, along with the mock evolution/type-effectiveness fallbacks in `PokemonDetail.js` and the mock type-filter list. On any API failure the app now shows a real error state instead of ever substituting fake data.
- [x] Keyboard navigation for the pokemon grid and type-filter scroller (arrow keys, `Enter` to open detail). Done via a shared roving-tabindex hook ([useGridNavigation.js](src/hooks/useGridNavigation.js)): arrows/Home/End move between items (column count read from the live `auto-fill` layout), and only one item per grid is a Tab stop. Pokémon cards were non-focusable `<div onClick>`s — each now has a real button stretched over the card, so `Enter`/`Space` open the detail, with the favorite star as a separate button (Tab from the focused card reaches it).
- [x] Alternate forms (e.g. Giratina Altered/Origin, Deoxys Normal/Attack/Defense/Speed) weren't discoverable — they only appeared as unrelated, separate search results (PokéAPI models them as distinct Pokémon resources at ids 10001+, which normal infinite-scroll pagination never realistically reaches). Added a **Forms** tab to the detail modal, populated from `species.varieties`, that lets you switch between a Pokémon's forms in place — swapping sprites, stats, types, abilities, and moves, and correctly re-fetching type effectiveness since some alternate forms (e.g. Rotom's appliances) have different types than their default form.
- [x] ~~Generation/region display names hardcoded~~ — superseded by the generation-sidebar rework below, which fetches this live as part of loading each generation's full data anyway.
- [x] **Reworked browsing from one continuous infinite scroll into per-generation loading with a side menu.** Previously, all Pokémon loaded sequentially from `/pokemon?offset=X` (dex-number order) and were only visually grouped into collapsible generation sections client-side — meaning later generations (and especially alt-form entries at id 10001+) were nearly unreachable by scrolling. Now: a `Generations` sidebar (fetched from `/generation`, showing live region names and per-generation species counts) drives which generation is loaded; selecting one fetches only that generation's species (species → default variety → full Pokémon data), 30 at a time via the same infinite-scroll-within-a-list mechanic as before. Switching generations is cached in a ref so flipping back to a previously-viewed generation is instant, no refetch. Search remains global across all generations regardless of which one is selected.
