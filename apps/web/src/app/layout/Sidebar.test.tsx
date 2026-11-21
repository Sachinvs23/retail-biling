import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import enIN from '../i18n/messages/en-IN.json';
import taIN from '../i18n/messages/ta-IN.json';

const { useActiveBusinessContextMock, selectStoreMock } = vi.hoisted(() => ({
  useActiveBusinessContextMock: vi.fn(),
  selectStoreMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a
      href={`${to}${search ? `?${new URLSearchParams(search).toString()}` : ''}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock('../../features/business/hooks/useActiveBusinessContext', () => ({
  useActiveBusinessContext: useActiveBusinessContextMock,
}));

vi.mock('../../features/business/session/business-context', () => ({
  businessContext: { selectStore: selectStoreMock },
}));

import Sidebar from './Sidebar';

const messages = { 'en-IN': enIN, 'ta-IN': taIN };

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER';

function setContext(role: Role = 'OWNER') {
  useActiveBusinessContextMock.mockReturnValue({
    context: {
      business: {
        id: 'business-1',
        name: 'Retail One',
        slug: 'retail-one',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      membership: { role },
      stores: [
        {
          id: 'store-1',
          name: 'Main Store',
          code: 'MAIN',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'store-2',
          name: 'Branch Store',
          code: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    storeId: 'store-1',
  });
}

function render(locale: 'en-IN' | 'ta-IN', collapsed = false) {
  return renderToStaticMarkup(
    <IntlProvider locale={locale} messages={messages[locale]}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={false}
        onToggle={vi.fn()}
        onNavigate={vi.fn()}
      />
    </IntlProvider>,
  );
}

describe('sidebar business and store switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setContext();
  });

  it('offers localized explicit access to business onboarding', () => {
    useActiveBusinessContextMock.mockReturnValue({
      context: undefined,
      storeId: null,
    });

    const html = render('en-IN');

    expect(html).toContain('href="/onboarding?intent=add-business"');
    expect(html).toContain('Add another business');
  });

  it('localizes the add business action in Tamil', () => {
    useActiveBusinessContextMock.mockReturnValue({
      context: undefined,
      storeId: null,
    });

    const html = render('ta-IN');

    expect(html).toContain('மற்றொரு வணிகத்தைச் சேர்க்கவும்');
  });

  it('lists active business stores and marks the selected store', () => {
    const html = render('en-IN');

    expect(html).toContain('aria-label="Store switcher"');
    expect(html).toContain('data-store-id="store-1"');
    expect(html).toContain('data-store-id="store-2"');
    expect(html).toContain('Main Store');
    expect(html).toContain('Branch Store');
    expect(html).toMatch(
      /data-store-id="store-1"[^>]*aria-current="true"[^>]*aria-label="Switch to Main Store"/,
    );
    expect(html).not.toMatch(/data-store-id="store-2"[^>]*aria-current="true"/);
    expect(html).toContain('aria-label="Switch to Branch Store"');
    expect(html).toContain('title="Business Retail One, store Main Store"');
  });

  it('offers store creation to owners and admins', () => {
    expect(render('en-IN')).toContain('href="/stores/new"');

    setContext('ADMIN');
    expect(render('en-IN')).toContain('href="/stores/new"');
  });

  it('hides store creation from managers and cashiers but keeps business creation', () => {
    for (const role of ['MANAGER', 'CASHIER'] as const) {
      setContext(role);
      const html = render('en-IN');

      expect(html).not.toContain('href="/stores/new"');
      expect(html).not.toContain('Add another store');
      expect(html).toContain('href="/onboarding?intent=add-business"');
    }
  });

  it('localizes store switching and creation in Tamil', () => {
    const html = render('ta-IN');

    expect(html).toContain('கடை மாற்றி');
    expect(html).toContain('கடைகள்');
    expect(html).toContain('Main Store க்கு மாறவும்');
    expect(html).toContain('மற்றொரு கடையைச் சேர்க்கவும்');
  });

  it('keeps accessible store controls when collapsed', () => {
    const html = render('en-IN', true);

    expect(html).toContain('sidebar--collapsed');
    expect(html).toContain('aria-label="Switch to Branch Store"');
    expect(html).toContain('aria-label="Add another store"');
    expect(html).not.toContain('>Branch Store</span>');
    expect(html).toContain('aria-label="Expand sidebar"');
    expect(selectStoreMock).not.toHaveBeenCalled();
  });
});
