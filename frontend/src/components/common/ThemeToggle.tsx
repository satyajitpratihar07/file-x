import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface Props {
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<Props> = ({ showLabel = false }) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${isDark ? 'theme-toggle-dark' : 'theme-toggle-light'}`}
      aria-label={isDark ? 'Switch to Day mode (Light)' : 'Switch to Night mode (Dark)'}
      title={isDark ? 'Switch to Day mode (Light)' : 'Switch to Night mode (Dark)'}
    >
      <div className="theme-toggle-thumb">
        {isDark ? (
          <Moon size={15} className="theme-icon-moon" />
        ) : (
          <Sun size={15} className="theme-icon-sun" />
        )}
      </div>
      {showLabel && (
        <span className="theme-toggle-text">
          {isDark ? 'Night' : 'Day'}
        </span>
      )}
    </button>
  );
};
