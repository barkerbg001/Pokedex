# Pokédex

A modern, feature-rich Progressive Web App (PWA) built with React that provides comprehensive Pokémon information using the [PokéAPI](https://pokeapi.co). Browse, search, and explore detailed information about your favorite Pokémon with an intuitive interface that works offline and can be installed on any device.

## Features

### Core Functionality
- **Infinite Scroll**: Automatically loads more Pokémon as you scroll through the list
- **Real-time Search**: Navbar search bar filters Pokémon instantly as you type
- **Advanced Filtering**:
   - Compact type filter blocks with smooth horizontal scrolling
   - Generation grouping with collapsible sections
   - Search by ability name
   - Filter by minimum attack stat
- **Detailed Pokémon View**: Click any Pokémon to open a modal with:
   - Base stats with visual bars (HP, Attack, Defense, Sp. Attack, Sp. Defense, Speed)
   - Type information and effectiveness chart
   - Abilities (including hidden abilities)
   - Complete move list with learn methods
   - Full evolution chain with images
   - Type matchups (weaknesses, resistances, immunities)

### Favorites & Personalization
- **Favorites System**: Mark Pokémon as favorites with the star button
- **Persistent Storage**: Favorites saved to localStorage and synced across sessions
- **Quick Access**: Compact horizontal favorites list displayed above the main grid
- **Theme Toggle**: Switch between light and dark themes with smooth transitions

### Progressive Web App (PWA)
- **Installable**: Clean install prompt that appears on eligible devices
- **Offline Support**: Service worker caches resources for offline browsing
- **App-like Experience**: Standalone mode when installed (no browser UI)
- **Fast Loading**: Cached resources load instantly on repeat visits
- **Cross-platform**: Works on desktop, mobile, and tablets

### Technical Features
- **Modern React**: Built with React 19 and modern hooks (useState, useEffect, useCallback, useRef)
- **Vite Build System**: Lightning-fast development and optimized production builds
- **Lazy Loading**: Images load progressively for optimal performance
- **Responsive Design**: Fluid layouts that adapt to any screen size
- **Mock Data Fallback**: Demo mode works without internet connection
- **API Integration**: Efficient data fetching with Axios
- **Service Worker**: Advanced caching strategies for offline functionality
- **Web Vitals**: Performance monitoring for optimal user experience

## Technologies Used

- **React 19.2.0** - Modern UI library with concurrent features
- **Vite 6.0.5** - Next-generation frontend tooling
- **Axios 1.6.8** - Promise-based HTTP client
- **PokéAPI v2** - Comprehensive RESTful Pokémon database
- **Vitest 2.1.8** - Fast unit testing framework
- **React Testing Library 16.0.0** - Component testing utilities
- **CSS3** - Custom properties, animations, and modern layouts
- **Web Vitals 5.1.0** - Real user monitoring metrics
- **Service Workers** - PWA offline capabilities

## Prerequisites

- **Node.js** (v16 or higher) and **npm** (v7 or higher)
- Internet connection for initial API data (optional after caching)

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

### Search and Filter
- **Search**: Type in the navbar search to filter Pokémon by name in real-time
- **Type Filter**: Click type badges to filter by type (use scroll buttons for more types)
- **Generation**: Click generation headers to expand/collapse groups
- **Ability Search**: Enter ability name to find Pokémon with that ability
- **Attack Filter**: Set minimum attack value to filter stronger Pokémon
- **Clear Filters**: Click "Clear All Filters" to reset

### Favorites
- Click the ★ icon on any Pokémon card to add/remove favorites
- Favorites appear in a horizontal scrollable list above the main grid
- Favorites persist across browser sessions

### Detail View
- Click any Pokémon card to open the detailed modal
- View comprehensive stats, abilities, moves, and evolution chains
- Click outside the modal or the X button to close

### Theme
- Toggle between light and dark themes using the sun/moon icon in the navbar

### Installing as PWA
- Look for the install prompt at the bottom of the screen
- Click "Install" to add the app to your home screen/desktop
- Access it like a native app with offline support

## Project Structure

```
Pokedex/
├── public/
│   ├── index.html              # HTML template
│   ├── manifest.json           # PWA manifest configuration
│   ├── site.webmanifest        # Web app manifest
│   ├── sw.js                   # Service worker for offline support
│   ├── robots.txt              # Search engine directives
│   ├── favicon.ico             # Favicon
│   ├── logo192.png             # App icon (192x192)
│   ├── logo512.png             # App icon (512x512)
│   ├── apple-touch-icon.png    # iOS app icon
│   └── types/                  # Pokémon type icons (SVG)
├── src/
│   ├── App.js                  # Main app component with navbar & theme
│   ├── App.css                 # App styles & CSS variables (themes)
│   ├── Pokedex.js              # Main grid component with filters
│   ├── Pokedex.css             # Pokedex styles (grid, type filters)
│   ├── PokemonDetail.js        # Detail modal component
│   ├── PokemonDetail.css       # Detail modal styles
│   ├── InstallPrompt.js        # PWA install prompt component
│   ├── InstallPrompt.css       # Install prompt styles
│   ├── registerSW.js           # Service worker registration
│   ├── vitals.js               # Web vitals monitoring
│   ├── index.js                # App entry point
│   ├── index.css               # Global styles & resets
│   └── setupTests.js           # Test configuration
├── vite.config.js              # Vite configuration
├── vitest.config.js            # Vitest test configuration
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## Available Scripts

### `npm run dev`
Starts the development server with hot module replacement (HMR)
- Opens at `http://localhost:3000`
- Auto-reloads on file changes

### `npm run build`
Creates an optimized production build in the `dist` folder
- Minifies and bundles all assets
- Generates service worker for offline support
- Optimizes images and resources

### `npm run preview`
Previews the production build locally
- Serves the built `dist` folder
- Useful for testing before deployment

### `npm test`
Launches Vitest in interactive watch mode
- Runs all test suites
- Re-runs tests on file changes
- Provides coverage reports

## API Integration

This app integrates with the [PokéAPI v2](https://pokeapi.co/docs/v2) to fetch:
- **Pokémon Data**: Names, sprites, types, stats
- **Species Information**: Evolution chains, habitat, descriptions
- **Abilities**: All abilities with hidden abilities flagged
- **Moves**: Complete move lists with learn methods and levels
- **Type Effectiveness**: Damage relations for type matchups

**Caching Strategy**: 
- API responses are cached in memory during the session
- Service worker caches assets for offline access
- Mock data included for demonstration without internet

## PWA Features

### Installation
- Custom install prompt with clean design
- Appears automatically when PWA criteria are met
- Dismissible with 7-day cooldown
- Supports iOS, Android, desktop platforms

### Offline Support
- Service worker caches all static assets
- Previously viewed Pokémon remain accessible offline
- Graceful fallback messaging when offline
- Background sync for favorites

### App-Like Experience
- Standalone display mode (no browser UI)
- Custom app icons for all platforms
- Splash screens on mobile devices
- Fast, native-like performance

## Contributing

We welcome contributions to improve the Pokédex! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Pokedex.git
   cd Pokedex
   ```
3. **Create a new branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and test them locally:
   ```bash
   npm install
   npm run dev
   ```
5. **Commit your changes** with clear messages:
   ```bash
   git commit -m "Add: description of your change"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request** on GitHub with a clear description of your changes

### Code Style

- Use consistent formatting (the project uses standard JavaScript/React conventions)
- Add comments for complex logic, especially API interactions
- Keep components focused and reusable
- Test your changes in both light and dark themes
- Ensure responsive design works on mobile and desktop

### What to Contribute

- **Bug fixes**: Report issues or submit fixes
- **New features**: See the "Future Enhancements" section for ideas
- **Filter improvements**: Add new filter options or enhance existing ones
- **Accessibility**: Improve keyboard navigation, screen reader support, or ARIA labels
- **Performance**: Optimize API calls, reduce bundle size, or improve loading times
- **Testing**: Add unit tests or improve test coverage
- **Documentation**: Fix typos, clarify instructions, or add examples

## Future Enhancements

**Completed:**
- [x] Favorite Pokémon with localStorage persistence
- [x] PWA installation support
- [x] Offline caching with service workers
- [x] Dark/light theme toggle
- [x] Advanced filtering system
- [x] Responsive mobile design

**Planned:**
- [ ] Pokémon team builder (6-member teams)
- [ ] Pokémon cry audio playback
- [ ] Shiny sprite toggle
- [ ] Compare Pokémon side-by-side
- [ ] Filter by egg group or habitat
- [ ] Move details with damage calculations
- [ ] Type coverage calculator
- [ ] Export teams as images
- [ ] Multi-language support
- [ ] Advanced search (height, weight ranges)

## Performance

- **Lighthouse Score**: 95+ across all metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **Bundle Size**: < 500KB (gzipped)

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### Deploy to Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Deploy to GitHub Pages
1. Update `vite.config.js` with base path
2. Run `npm run build`
3. Deploy the `dist` folder to GitHub Pages

## Browser Support

Works on all modern devices and platforms with web standards support.

## Acknowledgments

- **[PokéAPI](https://pokeapi.co/)** - Comprehensive Pokémon data API
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool
- **[React Team](https://react.dev/)** - Modern UI framework
- **Nintendo/Game Freak/The Pokémon Company** - Pokémon franchise

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

---

**Made with ❤️ by [barkerbg001](https://github.com/barkerbg001)**

*Pokémon and Pokémon character names are trademarks of Nintendo.*
