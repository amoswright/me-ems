import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderLevel } from '@/types/protocol';

export type TextSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Theme = 'light' | 'dark' | 'system';

interface AppState {
  // User preferences
  providerLevel: ProviderLevel | 'ALL';
  textSize: TextSize;
  theme: Theme;

  // Actions
  setProviderLevel: (level: ProviderLevel | 'ALL') => void;
  setTextSize: (size: TextSize) => void;
  setTheme: (theme: Theme) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Default values
      providerLevel: 'ALL',
      textSize: 'medium',
      theme: 'light',

      // Actions
      setProviderLevel: (providerLevel) => {
        set({ providerLevel });
        console.log('Provider level set to:', providerLevel);
      },

      setTextSize: (textSize) => {
        set({ textSize });
        // Apply text size to document root
        const sizes = {
          small: '14px',
          medium: '16px',
          large: '18px',
          xlarge: '20px'
        };
        document.documentElement.style.setProperty('--text-base', sizes[textSize]);
        console.log('Text size set to:', textSize);
      },

      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        applyTheme(theme);
        console.log('Theme set to:', theme);
      },
    }),
    {
      name: 'meems-app-storage', // localStorage key
      partialize: (state) => ({
        providerLevel: state.providerLevel,
        textSize: state.textSize,
        theme: state.theme,
      }),
    }
  )
);

// Helper function to apply theme
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Initialize theme and text size on app load
if (typeof window !== 'undefined') {
  const store = useAppStore.getState();
  applyTheme(store.theme);

  const sizes = {
    small: '14px',
    medium: '16px',
    large: '18px',
    xlarge: '20px'
  };
  document.documentElement.style.setProperty('--text-base', sizes[store.textSize]);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = useAppStore.getState().theme;
    if (currentTheme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}
