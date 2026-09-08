import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

interface ThemeStore {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const STORAGE_KEY = 'convertx_theme_preference';

const getInitialTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // ignore
  }
  // Default is white (light mode) per user requirement: "defult make white"
  return 'light';
};

const applyThemeToDOM = (theme: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${theme}`);
  document.body.setAttribute('data-theme', theme);
  
  // Set theme color meta tag
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#08091a' : '#ffffff');
  }
};

export const useThemeStore = create<ThemeStore>((set, get) => {
  const initialTheme = getInitialTheme();
  
  // Apply immediately upon script execution
  if (typeof window !== 'undefined') {
    applyThemeToDOM(initialTheme);
  }

  return {
    theme: initialTheme,

    toggleTheme: () => {
      const nextTheme: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
      set({ theme: nextTheme });
      applyThemeToDOM(nextTheme);
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // ignore
      }
    },

    setTheme: (theme: ThemeMode) => {
      set({ theme });
      applyThemeToDOM(theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore
      }
    },
  };
});
