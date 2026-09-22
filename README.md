# Pokédex

A modern, feature-rich Progressive Web App (PWA) built with React that provides comprehensive Pokémon information using the [PokéAPI](https://pokeapi.co). Browse, search, and explore detailed information about your favorite Pokémon with an intuitive interface that works offline and can be installed on any device.

## Features

### Core Functionality
- **Menu**: A sidebar (left on desktop, horizontal strip on mobile) showing the app title, a Generations list, and Settings. Browse one generation at a time (live region names, e.g. "Generation I (Kanto)", with a Pokémon count per generation) instead of scrolling through the entire Pokédex at once. Switching generations is cached, so flipping back to one you've already viewed is instant.
- **Infinite Scroll**: Within the selected generation, more Pokémon load automatically as you scroll
- **Real-time Search**: A search box above the results filters Pokémon instantly as you type, matching against everything loaded so far
- **API-Backed Search**: If your search doesn't match anything loaded yet, the app looks it up against the full PokéAPI name index and fetches it on demand — search works across *all* generations regardless of which one is selected
- **Type Filtering**: A floating filter button opens a modal grid of type badges (applies to whatever's currently loaded/displayed); the button shows a badge with the active filter count
- **Detailed Pokémon View**: Click any Pokémon to open a side panel with:
   - Base stats with visual bars (HP, Attack, Defense, Sp. Attack, Sp. Defense, Speed)
   - Type information and effectiveness chart
   - A sprite gallery (default, shiny, back, back shiny, official artwork, home — whichever variants exist for that Pokémon)
   - A Forms tab for Pokémon with alternate forms (e.g. Giratina Altered/Origin, Deoxys's four forms), switching sprites/stats/types/abilities/moves in place
   - Abilities (including hidden abilities)
   - Move list with learn methods (first 20 moves)
   - Full evolution chain
   - Type matchups (weaknesses, resistances, immunities)

### Favorites & Personalization
- **Favorites System**: Mark Pokémon as favorites with the star button
- **Persistent Storage**: Favorites saved to localStorage and synced across sessions
- **Quick Access**: Compact horizontal favorites list displayed above the main grid
- **Theme Selector**: Choose Light, Dark, or System (follows the OS preference live) from the Settings view (in the Menu)

### Progressive Web App (PWA)
- **Installable**: Clean install prompt that appears on eligible devices
- **Offline Support**: Service worker caches app-shell assets for offline browsing
- **App-like Experience**: Standalone mode when installed (no browser UI)
- **Cross-platform**: Works on desktop, mobile, and tablets

### Technical Features
- **Modern React**: Built with React 19 and hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
- **Vite Build System**: Fast development server and optimized production builds
- **Lazy Loading**: Images load progressively via `loading="lazy"`
- **Responsive Design**: Fluid layouts that adapt to any screen size
- **Error Handling**: If PokéAPI can't be reached, the app shows a clear error state with a retry action instead of silently substituting fake data
- **Web Vitals**: Performance metrics reported to Vercel Analytics when `VITE_VERCEL_ANALYTICS_ID` is set

## Technologies Used

- **React** `^19.2.1` — UI library
- **Vite** `^7.2.7` — build tool and dev server
- **Axios** `^1.13.2` — HTTP client for PokéAPI requests
- **PokéAPI v2** — Pokémon data source
- **Vitest** `^4.0.15` + **React Testing Library** `^16.0.0` — testing
- **ESLint** `^9.39.5` + **Prettier** `^3.9.8` — linting and formatting
- **web-vitals** `^5.1.0` — real user monitoring metrics
- **Service Workers** — PWA offline caching

See [package.json](package.json) for the exact, up-to-date dependency versions.

## Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0` (required by Vite 7) and a matching npm version
- Internet connection — this app is a thin client over the live PokéAPI and has no offline dataset; it shows an error state with a retry option if the API is unreachable

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/barkerbg001/Pokedex.git
   cd Pokedex
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### Browsing by Generation
- Use the **Menu** (left on desktop, a horizontal scrollable strip on mobile) to pick a generation to browse.
- The grid loads that generation's Pokémon 30 at a time as you scroll; switching generations and coming back reuses what was already loaded.

### Search and Filter
- **Search**: The search box sits below the page header, above the results. It filters Pokémon by name in real-time; if no loaded Pokémon match, the app queries PokéAPI directly and adds any matches to the grid — search isn't limited to the currently selected generation.
- **Type Filter**: Click the floating filter button (bottom-right) to open a type-picker modal. This only filters Pokémon already loaded into the grid.
- **Clear Filters**: Click "Clear all" in the type filter modal to reset it.

### Favorites
- Click the star icon on any Pokémon card to add/remove favorites.
- Favorites appear in a horizontal scrollable list above the main grid.
- Favorites persist across browser sessions via localStorage, and are resolved by id on load regardless of which generation is currently selected, so they always show up in the strip.

### Detail View
- Click any Pokémon card to open its details in a side panel.
- View stats, abilities, evolution chain, moves, sprites, forms (if any), and type effectiveness across tabs.
- Click outside the panel or the ✕ button to close.

### Settings
- Click **Settings** at the bottom of the Menu to open the settings view.
- Choose **Light**, **Dark**, or **System** — System follows your OS preference and updates live if it changes while the app is open.

### Installing as PWA
- Look for the install prompt at the bottom of the screen.
- Click "Install" to add the app to your home screen/desktop.
- Dismissing the prompt hides it for 7 days.

## Project Structure

```
Pokedex/
├── public/
│   ├── manifest.json           # PWA manifest configuration
│   ├── site.webmanifest        # Secondary web app manifest
│   ├── sw.js                   # Service worker for offline support
│   ├── robots.txt              # Search engine directives
│   ├── favicon.ico, favicon-16x16.png, favicon-32x32.png
│   ├── logo192.png, logo512.png, apple-touch-icon.png
│   └── types/                  # Pokémon type icons (SVG)
├── src/
│   ├── components/
│   │   ├── App/                 # Root component: owns theme state, renders InstallPrompt + Pokedex (+ App.css, App.test.js)
│   │   ├── Pokedex/              # Per-generation loading, search, type filters, favorites, main grid (+ Pokedex.css)
│   │   ├── Menu/                 # Sidebar nav: app title, generation list, Settings entry (+ Menu.css)
│   │   ├── Settings/             # Settings view: Light/Dark/System theme selector (+ Settings.css)
│   │   ├── PokemonDetail/        # Detail side panel (+ PokemonDetail.css)
│   │   ├── TypeFilterModal/      # Type filter, opened via a floating action button (+ TypeFilterModal.css)
│   │   └── InstallPrompt/        # PWA install prompt (+ InstallPrompt.css)
│   ├── api/
│   │   └── pokeapi.js           # Shared PokéAPI client: base URL, in-memory response cache, retry with backoff
│   ├── styles/
│   │   └── modal.css            # Shared right-side slide-out panel shell (used by PokemonDetail + TypeFilterModal)
│   ├── constants.js            # Shared type colors
│   ├── registerSW.js           # Service worker registration
│   ├── vitals.js               # Vercel Analytics web-vitals reporter
│   ├── reportWebVitals.js      # web-vitals collection helper
│   ├── index.js                # App entry point
│   ├── index.css               # Global styles & resets
│   └── setupTests.js           # Test environment setup
├── index.html                  # HTML entry point (Vite convention — lives at the repo root)
├── eslint.config.js            # ESLint flat config
├── .prettierrc.json / .prettierignore
├── vite.config.js              # Vite configuration (dev server, build output)
├── vitest.config.js            # Vitest test configuration
├── CONTRIBUTING.md             # Contribution guide
├── TODO.md                     # Audit findings and planned work, tracked as checkboxes
├── LICENSE                     # MIT license
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## Available Scripts

### `npm run dev`
Starts the Vite dev server with hot module replacement at `http://localhost:3000`.

### `npm run build`
Creates an optimized production build in the `build/` folder.

### `npm run preview`
Serves the built `build/` folder locally, for testing a production build before deploying.

### `npm test`
Runs the Vitest suite in watch mode (add `-- --run` for a single non-watching run). Coverage reporting isn't set up yet — see [TODO.md](TODO.md).

### `npm run lint`
Runs ESLint across the project (`eslint.config.js`).

### `npm run format`
Formats the project with Prettier.

### `npm run format:check`
Checks formatting without writing changes (useful in CI).

## API Integration

This app integrates with the [PokéAPI v2](https://pokeapi.co/docs/v2) to fetch:
- **Generations**: The full `/generation` list, each with its English name, main region, and species list — powers the sidebar and per-generation loading
- **Pokémon Data**: Names, sprites, types, stats, abilities, moves
- **Species Information**: Evolution chain URL, alternate form varieties
- **Evolution Chains**: Full evolution line, fetched per-Pokémon when its detail view opens
- **Type Data**: Damage relations, used to compute weaknesses/resistances/immunities

**Notes on data fetching:**
- Selecting a generation loads its Pokémon species 30 at a time (species → default variety → full Pokémon detail, so a batch is 60+ requests — there's no persistent caching layer yet beyond the in-session generation cache, see [TODO.md](TODO.md)).
- A one-time, lightweight fetch of every Pokémon's name/URL backs the API-fallback search described above, independent of generation selection.
- If the PokéAPI is unreachable, the app shows a "404" error state with a "Try Again" button — a full-page error if the generation list itself can't load, or an inline error in place of the grid if a specific generation's Pokémon fail to load.

## PWA Features

### Installation
- Custom install prompt, shown when the browser fires `beforeinstallprompt`
- Dismissible with a 7-day cooldown before it reappears
- Supports iOS, Android, and desktop platforms that expose PWA install APIs

### Offline Support
- Service worker ([public/sw.js](public/sw.js)) precaches the app shell (`/`, manifest, icons) on install
- Runtime requests are cached as you browse, so previously viewed pages/assets remain available offline
- Falls back to the cached `index.html` if a navigation request fails offline

### App-Like Experience
- Standalone display mode (no browser UI) when installed
- Custom app icons for all platforms via [public/manifest.json](public/manifest.json)

## Contributing

We welcome contributions to improve the Pokédex! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup steps, code style expectations, and the pull request process. Use the [issue templates](.github/ISSUE_TEMPLATE) when reporting a bug or requesting a feature.

## Roadmap

A full, checkbox-tracked audit of known bugs, tech debt, and planned features lives in [TODO.md](TODO.md). Highlights of what's planned next:

- Pokémon team builder (6-member teams)
- Pokémon cry audio playback
- Compare Pokémon side-by-side
- Filter by egg group or habitat
- Type coverage calculator
- Advanced search (height/weight ranges)

## Deployment

### Build for Production
```bash
npm run build
```
Output is written to the `build/` folder.

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### Deploy to Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=build
```

### Deploy to GitHub Pages
1. Set `base` in [vite.config.js](vite.config.js) to your repo path (e.g. `/Pokedex/`).
2. Run `npm run build`.
3. Deploy the `build/` folder to GitHub Pages.

## Browser Support

Works on modern browsers with standard Service Worker and Web App Manifest support (recent Chrome, Edge, Firefox, Safari).

## Acknowledgments

- **[PokéAPI](https://pokeapi.co/)** - Comprehensive Pokémon data API
- **[Vite](https://vitejs.dev/)** - Fast build tool
- **[React Team](https://react.dev/)** - Modern UI framework
- **Nintendo/Game Freak/The Pokémon Company** - Pokémon franchise

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by [barkerbg001](https://github.com/barkerbg001)**

*Pokémon and Pokémon character names are trademarks of Nintendo.*
