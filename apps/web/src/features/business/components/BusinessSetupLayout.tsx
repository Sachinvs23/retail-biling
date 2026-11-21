import type { ReactNode } from 'react';
import { useIntl } from 'react-intl';

import './BusinessSetup.css';

interface BusinessSetupLayoutProps {
  titleKey: string;
  subtitleKey: string;
  children: ReactNode;
}

export function BusinessSetupLayout({
  titleKey,
  subtitleKey,
  children,
}: BusinessSetupLayoutProps) {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });

  return (
    <main className="business-setup-page">
      <section
        className="business-setup-card"
        aria-labelledby="business-setup-title"
      >
        <header className="business-setup-header">
          <h1 className="business-setup-title" id="business-setup-title">
            {t(titleKey)}
          </h1>
          <p className="business-setup-subtitle">{t(subtitleKey)}</p>
        </header>
        {children}
      </section>
    </main>
  );
}
