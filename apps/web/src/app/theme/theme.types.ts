export type ThemeMode = 'light' | 'dark' | 'system';

export type AccentColor =
  | 'orange'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber';

export interface ThemePreferences {
  mode: ThemeMode;
  accent: AccentColor;
}

export interface ThemeContextValue {
  preferences: ThemePreferences;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  resetTheme: () => void;
}
