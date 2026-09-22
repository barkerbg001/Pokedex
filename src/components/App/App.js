import './App.css';
import { useState, useEffect } from 'react';
import Pokedex from '../Pokedex/Pokedex';
import InstallPrompt from '../InstallPrompt/InstallPrompt';

function App() {
  // The user's chosen preference: 'light', 'dark', or 'system'
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('pokedex-theme') || 'system';
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemPrefersDark(e.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // The actual light/dark theme in effect, resolving 'system' against the OS preference
  const appliedTheme =
    themePreference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themePreference;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appliedTheme);
    localStorage.setItem('pokedex-theme', themePreference);
  }, [appliedTheme, themePreference]);

  return (
    <div className="App">
      <InstallPrompt />
      <Pokedex
        themePreference={themePreference}
        appliedTheme={appliedTheme}
        onSetTheme={setThemePreference}
      />
    </div>
  );
}

export default App;
