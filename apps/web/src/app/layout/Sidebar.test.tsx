import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vite-plus/test';

import enIN from '../i18n/messages/en-IN.json';
import taIN from '../i18n/messages/ta-IN.json';

const { useActiveBusinessContextMock } = vi.hoisted(() => ({
  useActiveBusinessContextMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={`${to}?${new URLSearchParams(search).toString()}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../features/business/hooks/useActiveBusinessContext', () => ({
  useActiveBusinessContext: useActiveBusinessContextMock,
}));

import Sidebar from './Sidebar';

const messages = { 'en-IN': enIN, 'ta-IN': taIN };

function render(locale: 'en-IN' | 'ta-IN') {
  return renderToStaticMarkup(
    <IntlProvider locale={locale} messages={messages[locale]}>
      <Sidebar
        collapsed={false}
        mobileOpen={false}
        onToggle={vi.fn()}
        onNavigate={vi.fn()}
      />
    </IntlProvider>,
  );
}

describe('sidebar business switcher', () => {
  it('offers localized explicit access to business onboarding', () => {
    useActiveBusinessContextMock.mockReturnValue({
      context: undefined,
      storeId: null,
    });

    const html = render('en-IN');

    expect(html).toContain('href="/onboarding?intent=add-business"');
    expect(html).toContain('Add another business');
  });

  it('localizes the add action in Tamil', () => {
    useActiveBusinessContextMock.mockReturnValue({
      context: undefined,
      storeId: null,
    });

    const html = render('ta-IN');

    expect(html).toContain('மற்றொரு வணிகத்தைச் சேர்க்கவும்');
  });
});
