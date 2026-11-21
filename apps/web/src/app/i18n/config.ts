export const DEFAULT_LOCALE = 'en-IN';

export const SUPPORTED_LOCALES = {
  'en-IN': 'English',
  'ta-IN': 'தமிழ்',
} as const;

export type AppLocale = keyof typeof SUPPORTED_LOCALES;
