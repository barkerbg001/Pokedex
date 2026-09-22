import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import './Settings.css';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: FiSun },
  { value: 'dark', label: 'Dark', icon: FiMoon },
  { value: 'system', label: 'System', icon: FiMonitor },
];

function Settings({ themePreference, appliedTheme, onSetTheme }) {
  return (
    <div className="settings-page">
      <h2 className="settings-title">Settings</h2>

      <div className="settings-row">
        <div className="settings-row-label">
          <span className="settings-row-name">Theme</span>
          <span className="settings-row-description">
            Currently {appliedTheme === 'light' ? 'light' : 'dark'}
            {themePreference === 'system' ? ' (following system)' : ''}
          </span>
        </div>
        <div className="theme-option-group" role="group" aria-label="Theme">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`theme-option ${themePreference === value ? 'active' : ''}`}
              onClick={() => onSetTheme(value)}
              aria-pressed={themePreference === value}
              title={label}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings;
