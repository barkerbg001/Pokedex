# Pokédex React App

A modern, feature-rich Pokédex application built with React that provides comprehensive Pokémon information using the [PokéAPI](https://pokeapi.co). Browse, search, and explore detailed information about your favorite Pokémon with an intuitive interface.

## Features

### Core Functionality
- **Infinite Scroll**: Automatically loads more Pokémon as you scroll through the list
- **Real-time Search**: Instantly filter Pokémon by name
- **Advanced Filtering**: 
  - Filter by Pokémon type (Fire, Water, Grass, etc.)
  - Filter by generation (Gen I, Gen II, etc.)
  - Search by ability name
  - Filter by minimum attack stat
- **Detailed Pokémon View**: Click any Pokémon to see:
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

![Pokedex Grid View](https://via.placeholder.com/800x400?text=Pokedex+Grid+View)
*Main grid view with search and filter options*

![Pokemon Detail Modal](https://via.placeholder.com/800x400?text=Pokemon+Detail+View)
*Detailed view showing stats, abilities, moves, and evolution chain*

## Technologies Used

- **React 19.2.0** - UI library
- **Axios 1.6.8** - HTTP client for API requests
- **PokéAPI** - RESTful Pokémon data API
- **Node.js & npm** - JavaScript runtime and package manager
- **CSS3** - Styling and animations
- **React Testing Library** - Component testing

## Prerequisites

Before you begin, ensure you have met the following requirements:
- You have installed Node.js and npm (visit [nodejs.org](https://nodejs.org) for installation instructions)
- You have a basic understanding of React concepts

## Installing Pokedex

To install Pokedex, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/barkerbg001/Pokedex
   ```
2. Navigate to the project directory:
   ```bash
   cd Pokedex
   ```
3. Install the necessary packages:
   ```bash
   npm install
   ```

## Using Pokedex

To use Pokedex, follow these steps:

1. Start the development server:
   ```bash
   npm start
   ```
2. Open your browser and go to `http://localhost:3000`

### Features Guide

**Search and Filter:**
- Use the search bar to find Pokémon by name
- Select a type from the dropdown to filter by type
- Choose a generation to see Pokémon from specific games
- Enter an ability name to find Pokémon with that ability
- Set a minimum attack value to filter strong Pokémon

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
│   ├── App.js              # Main app component
│   ├── App.css             # App styles
│   ├── Pokedex.js          # Main Pokedex grid component
│   ├── Pokedex.css         # Pokedex styles
│   ├── PokemonDetail.js    # Pokemon detail modal component
│   ├── PokemonDetail.css   # Detail modal styles
│   ├── index.js            # App entry point
│   ├── index.css           # Global styles
│   └── setupTests.js       # Test configuration
├── package.json            # Dependencies and scripts
└── README.md              # This file
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
- [ ] Dark mode toggle
- [ ] Progressive Web App (PWA) functionality
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
