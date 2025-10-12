import './App.css';
import { useState, useEffect } from 'react';
import Pokedex from './Pokedex'; // Import the Pokedex component

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('pokedex-theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pokedex-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="navbar-content">
          <h1>Pokédex</h1>
          <div className="navbar-actions">
            <input
              type="text"
              placeholder="Search Pokémon by name..."
              className="navbar-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
            />
            <button 
              className="theme-toggle" 
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>
      <Pokedex searchQuery={searchQuery} theme={theme} />
    </div>
  );
}

export default App;
