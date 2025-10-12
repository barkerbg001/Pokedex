# Pokédex React App

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
- **Axios 1.6.8** - HTTP client for API requests
- **PokéAPI** - RESTful Pokémon data API
- **Node.js & npm** - JavaScript runtime and package manager
- **CSS3** - Styling and animations
- **React Testing Library** - Component testing

## Prerequisites

Before you begin, ensure you have met the following requirements:
- You have Node.js and npm installed (visit [nodejs.org](https://nodejs.org) for installation instructions).
- Basic familiarity with React and npm scripts is helpful.

## Installing Pokedex

To install Pokedex locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/barkerbg001/Pokedex
   ```
2. Navigate to the project directory and install dependencies:
   ```bash
   cd Pokedex
   npm install
   ```

## Using Pokedex

Start the development server and open the app in your browser.

Common commands (pick the one your project uses):

```powershell
# Start the dev server (some projects use `start`)
npm start

# Or, if you use a lighter dev task (Vite/other), you might use:
npm run dev
```

Open `http://localhost:3000` (or the port printed in the terminal) in your browser.

### Features Guide

**Search and Filter:**
- Use the search bar in the navbar to find Pokémon by name in real time.
- Type filter blocks are compact and horizontally scrollable — use the left/right buttons to scroll the list and hide the native scrollbar.
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
│   └── robots.txt          # SEO configuration
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

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

## API Integration

This app uses the [PokéAPI](https://pokeapi.co/docs/v2) to fetch:
- Pokémon basic information (name, sprites, types)
- Detailed stats and abilities
- Species data and evolution chains
- Type effectiveness data
- Move lists and learn methods

The app includes mock data for offline demonstration purposes.

## Contributing to Pokedex

Contributions are welcome! To contribute to Pokedex, follow these steps:

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

## Future Enhancements

Potential features to add:
- [ ] Favorite Pokémon list with local storage
- [ ] Comparison tool for multiple Pokémon
- [ ] Advanced sorting options (by stat, alphabetically, etc.)
- [ ] Pokémon team builder
- [ ] PWA improvements (offline caching, installable)
- [ ] Audio for Pokémon cries
- [ ] Shiny sprite toggle
- [ ] Filter by egg group or habitat
- [ ] Move details with damage calculations

## Acknowledgments

- [PokéAPI](https://pokeapi.co/) for providing the comprehensive Pokémon data
- [Create React App](https://create-react-app.dev/) for the project setup
- Nintendo/Game Freak/Pokémon Company for creating Pokémon

## License

This project uses the following license: [MIT](https://opensource.org/licenses/MIT).
