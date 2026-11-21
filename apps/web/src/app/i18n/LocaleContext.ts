import { createContext } from 'react';
import type { AppLocale } from './config';

export const LocaleContext = createContext<{
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
} | null>(null);
