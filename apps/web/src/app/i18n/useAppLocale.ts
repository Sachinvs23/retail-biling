import { useContext } from 'react';
import { LocaleContext } from './LocaleContext';

export function useAppLocale() {
  const context = useContext(LocaleContext);
  if (!context)
    throw new Error('useAppLocale must be used within I18nProvider');
  return context;
}
