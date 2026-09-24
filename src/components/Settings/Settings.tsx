import type { IconType } from 'react-icons';
import { FiSun, FiMoon, FiMonitor, FiDownload, FiShare } from 'react-icons/fi';
import type {
  ThemePreference,
  AppliedTheme,
  InstallPromptState,
} from '../../types/pokeapi';
import './Settings.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconType }[] = [
  { value: 'light', label: 'Light', icon: FiSun },
  { value: 'dark', label: 'Dark', icon: FiMoon },
  { value: 'system', label: 'System', icon: FiMonitor },
];

type Props = {
  themePreference: ThemePreference;
  appliedTheme: AppliedTheme;
  onSetTheme: (theme: ThemePreference) => void;
  install?: InstallPromptState;
};

function Settings({ themePreference, appliedTheme, onSetTheme, install }: Props) {
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

      {install?.canInstall && (
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-name">Install app</span>
            <span className="settings-row-description">Quick access and offline browsing</span>
          </div>
          <button type="button" className="settings-action-btn" onClick={install.promptInstall}>
            <FiDownload />
            <span>Install</span>
          </button>
        </div>
      )}

      {install?.showIosHint && (
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-name">Install app</span>
            <span className="settings-row-description">
              Tap <FiShare className="settings-inline-icon" aria-hidden="true" /> Share, then{' '}
              <strong>Add to Home Screen</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
