import './App.css';
import { useState, useEffect } from 'react';
import Pokedex from '../Pokedex/Pokedex';
import useInstallPrompt from '../../hooks/useInstallPrompt';
import useServiceWorkerUpdate from '../../hooks/useServiceWorkerUpdate';

function App() {
  // The user's chosen preference: 'light', 'dark', or 'system'
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('pokedex-theme') || 'system';
  });
  const install = useInstallPrompt();
  const swUpdate = useServiceWorkerUpdate();
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
    // An inline script in index.html does the same before first paint; keep the
    // two in sync (storage key and colors).
    // Tint the mobile browser / installed-app status bar to match the theme.
    // index.html has one tag per color scheme; set both so a manual theme
    // choice wins over the OS setting.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) =>
        meta.setAttribute('content', appliedTheme === 'dark' ? '#0f1419' : '#d4f3fb')
      );
    localStorage.setItem('pokedex-theme', themePreference);
  }, [appliedTheme, themePreference]);

  return (
    <div className="App">
      <Pokedex
        themePreference={themePreference}
        appliedTheme={appliedTheme}
        onSetTheme={setThemePreference}
        install={install}
        swUpdate={swUpdate}
      />
    </div>
  );
}

export default App;
