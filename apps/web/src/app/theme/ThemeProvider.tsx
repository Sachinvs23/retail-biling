import { useCallback, useEffect, useState, type ReactNode } from 'react';

import type { AccentColor, ThemeMode, ThemePreferences } from './theme.types';
import { ThemeContext } from './ThemeContext';

const STORAGE_KEY = 'retail-billing:appearance:v1';

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'system',
  accent: 'orange',
};

const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system'];

const VALID_ACCENTS: AccentColor[] = [
  'orange',
  'blue',
  'emerald',
  'violet',
  'rose',
  'amber',
];

function loadPreferences(): ThemePreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return DEFAULT_PREFERENCES;

    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_PREFERENCES;
    }

    const value = parsed as Record<string, unknown>;

    return {
      mode: VALID_MODES.includes(value.mode as ThemeMode)
        ? (value.mode as ThemeMode)
        : DEFAULT_PREFERENCES.mode,
      accent: VALID_ACCENTS.includes(value.accent as AccentColor)
        ? (value.accent as AccentColor)
        : DEFAULT_PREFERENCES.accent,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preferences, setPreferences] =
    useState<ThemePreferences>(loadPreferences);

  const setMode = useCallback((mode: ThemeMode) => {
    setPreferences((current) => ({ ...current, mode }));
  }, []);

  const setAccent = useCallback((accent: AccentColor) => {
    setPreferences((current) => ({ ...current, accent }));
  }, []);

  const resetTheme = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedMode =
        preferences.mode === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : preferences.mode;

      root.dataset.theme = resolvedMode;
      root.dataset.accent = preferences.accent;
      root.style.colorScheme = resolvedMode;
    };

    applyTheme();

    if (preferences.mode === 'system') {
      media.addEventListener('change', applyTheme);

      return () => media.removeEventListener('change', applyTheme);
    }
  }, [preferences.mode, preferences.accent]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  return (
    <ThemeContext.Provider
      value={{ preferences, setMode, setAccent, resetTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
