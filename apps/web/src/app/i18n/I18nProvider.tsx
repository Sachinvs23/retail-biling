import { useEffect, useState, type ReactNode } from 'react';
import { IntlProvider } from 'react-intl';

import { DEFAULT_LOCALE, type AppLocale } from './config';
import { LocaleContext } from './LocaleContext';

import enIN from './messages/en-IN.json';
import taIN from './messages/ta-IN.json';

const messages = {
  'en-IN': enIN,
  'ta-IN': taIN,
};

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<AppLocale>(() => {
    const savedLocale = localStorage.getItem('retail-billing-locale');
    return savedLocale && savedLocale in messages
      ? (savedLocale as AppLocale)
      : DEFAULT_LOCALE;
  });

  const updateLocale = (nextLocale: AppLocale) => {
    setLocale(nextLocale);
    localStorage.setItem('retail-billing-locale', nextLocale);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages[locale]['app.name'];
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: updateLocale }}>
      <IntlProvider
        locale={locale}
        defaultLocale={DEFAULT_LOCALE}
        messages={messages[locale]}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
