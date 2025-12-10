# Pokédex

A modern, feature-rich Pokédex application built with React that provides comprehensive Pokémon information using the [PokéAPI](https://pokeapi.co). Browse, search, and explore detailed information about your favorite Pokémon with an intuitive interface.

## Features

### Core Functionality
- **Infinite Scroll**: Automatically loads more Pokémon as you scroll through the list.
- **Real-time Search**: Search bar is in the navbar for quick access and filters the list as you type.
- **Advanced Filtering**:
   - Compact type filter blocks with left/right scroll buttons (no visible native scrollbar).
   - Grouping by generation with collapsible generation sections.
   - Search by ability name and filter by minimum attack stat.
- **Detailed Pokémon View**: Click any Pokémon to open a modal with:
   - Base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed)
   - Type information and type effectiveness
   - Abilities (including hidden abilities)
   - Move list with learn methods
   - Complete evolution chain
   - Weaknesses, resistances, and immunities

   ### Favorites

   - Favorite Pokémon list with local storage: mark any Pokémon as a favorite using the star button on a card. Favorites are shown in a compact horizontal list above the results and persist across browser reloads using localStorage.

### Technical Features
- Lazy loading images for optimal performance
- Mock data fallback for offline demonstration
- Responsive grid layout
- Modal-based detail view
- Built with React 19 and modern React Hooks (useState, useEffect, useCallback, useRef)
- API integration with Axios

## Screenshots

![Pokedex Grid View](https://via.placeholder.com/900x420?text=Pokedex+Grid+View)
*Main grid view with search and compact type-filter blocks shown at the top.*

![Pokemon Detail Modal](https://via.placeholder.com/900x420?text=Pokemon+Detail+View)
*Detailed view showing stats, abilities, moves, and evolution chain.*

## Technologies Used

- **React 19.2.0** - UI library
- **Vite 6.0.5** - Build tool and dev server
- **Axios 1.6.8** - HTTP client for API requests
- **PokéAPI** - RESTful Pokémon data API
- **Node.js & npm** - JavaScript runtime and package manager
- **CSS3** - Styling and animations
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing utilities

## Prerequisites

Before you begin, ensure you have met the following requirements:
- You have Node.js and npm installed (visit [nodejs.org](https://nodejs.org) for installation instructions).
- Basic familiarity with React and npm scripts is helpful.

## Installation

To install Pokédex locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/barkerbg001/Pokedex
   ```
2. Navigate to the project directory and install dependencies:
   ```bash
   cd Pokedex
   npm install
   ```

## Usage

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser to view the app.

### Features Guide

**Search and Filter:**
- Use the search bar in the navbar to find Pokémon by name in real time.
- Type filter blocks are compact vertical blocks (icon on top, label underneath) and horizontally scrollable — use the left/right buttons to scroll and hide the native scrollbar.
- Type icons live in `public/types/` (named like `fire.svg`, `water.svg`, etc.). If an icon is missing the colored swatch acts as a fallback so filtering still works.
- Click a generation header to expand or collapse that generation group.
- Enter an ability name to find Pokémon with that ability.
- Set a minimum attack value to filter stronger Pokémon.

**View Details:**
- Click on any Pokémon card to open the detailed view
- Scroll through the detail modal to see stats, abilities, moves, and evolution chain
- Click the X button or outside the modal to close it

**Infinite Scroll:**
- Simply scroll down to automatically load more Pokémon

## Project Structure

```
Pokedex/
├── public/
│   ├── index.html          # HTML template
│   ├── manifest.json       # PWA manifest
│   ├── site.webmanifest    # Web manifest
│   ├── favicon.ico         # Favicon
│   ├── logo192.png         # App icon (192x192)
│   ├── logo512.png         # App icon (512x512)
│   ├── apple-touch-icon.png # iOS app icon
│   └── types/              # Pokémon type icons
├── src/
│   ├── App.js              # Main app component (navbar, theme toggle)
│   ├── App.css             # App styles & theme variables
│   ├── Pokedex.js          # Main Pokedex grid component (filters, grouping)
│   ├── Pokedex.css         # Pokedex styles (type blocks + scroll buttons)
│   ├── PokemonDetail.js    # Pokemon detail modal component
│   ├── PokemonDetail.css   # Detail modal styles
│   ├── index.js            # App entry point
│   ├── index.css           # Global styles
│   └── setupTests.js       # Test configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## Available Scripts

In the project directory, you can run:

### `npm run dev`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner (Vitest) in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run preview`
Preview the production build locally

## API Integration

This app uses the [PokéAPI](https://pokeapi.co/docs/v2) to fetch:
- Pokémon basic information (name, sprites, types)
- Detailed stats and abilities
- Species data and evolution chains
- Type effectiveness data
- Move lists and learn methods

The app includes mock data for offline demonstration purposes.

## Contributing

Contributions are welcome! To contribute to Pokédex, follow these steps:

1. Fork this repository
2. Create a branch: `git checkout -b feature/<feature_name>`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to your branch: `git push origin feature/<feature_name>`
5. Create a pull request

Please ensure your code:
- Follows the existing code style
- Includes appropriate comments
- Passes all existing tests
- Adds tests for new features when applicable

Alternatively, see the GitHub documentation on [creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## PWA Features

This app is a Progressive Web App (PWA) with the following features:
- **Installable**: Custom install prompt that appears when the app can be installed
- **Offline Support**: Service worker caches resources for offline browsing
- **App-like Experience**: Standalone display mode when installed
- **Fast Loading**: Cached resources load instantly on repeat visits

## Future Enhancements

Potential features to add:
- [x] Favorite Pokémon list with local storage
- [x] PWA improvements (offline caching, installable)
- [ ] Pokémon team builder
- [ ] Audio for Pokémon cries
- [ ] Shiny sprite toggle
- [ ] Filter by egg group or habitat
- [ ] Move details with damage calculations

## Acknowledgments

- [PokéAPI](https://pokeapi.co/) for providing the comprehensive Pokémon data
- [Vite](https://vitejs.dev/) for the build tool and dev server
- Nintendo/Game Freak/Pokémon Company for creating Pokémon

## License

This project uses the following license: [MIT](https://opensource.org/licenses/MIT).
