import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vite-plus/test';

import enIN from '../../../app/i18n/messages/en-IN.json';
import taIN from '../../../app/i18n/messages/ta-IN.json';
import StoreCreationPage from '../pages/StoreCreationPage';
import { StoreForm } from './StoreForm';

const messages = { 'en-IN': enIN, 'ta-IN': taIN };

function render(node: ReactNode, locale: 'en-IN' | 'ta-IN' = 'en-IN') {
  return renderToStaticMarkup(
    <IntlProvider locale={locale} messages={messages[locale]}>
      {node}
    </IntlProvider>,
  );
}

const values = { storeName: '', storeCode: '' };

describe('store creation UI', () => {
  it('renders localized fields and validation messages', () => {
    const html = render(
      <StoreForm
        values={values}
        errors={{
          storeName: 'storeNameTooShort',
          storeCode: 'storeCodeTooLong',
        }}
        isSubmitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain('Store name');
    expect(html).toContain('Store code (optional)');
    expect(html).toContain('Use at least 2 characters.');
    expect(html).toContain('Use no more than 30 characters.');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('Add store');
  });

  it('shows duplicate-store failures and success confirmation', () => {
    const html = render(
      <StoreForm
        values={values}
        errors={{ storeName: 'storeNameRequired' }}
        serverError="That code is already used here. Use a different code, or leave it blank."
        successMessage="Store added and selected."
        isSubmitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain('Enter a store name.');
    expect(html).toContain(
      'That code is already used here. Use a different code, or leave it blank.',
    );
    expect(html).toContain('Store added and selected.');
    expect(html).toContain('role="alert"');
    expect(html).toContain('role="status"');
  });

  it('disables submission while a store is being created', () => {
    const html = render(
      <StoreForm
        values={values}
        errors={{}}
        isSubmitting
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain('Adding store...');
    expect(html).toContain('disabled=""');
  });

  it('localizes the form and page in Tamil', () => {
    const formHtml = render(
      <StoreForm
        values={values}
        errors={{ storeName: 'storeNameRequired' }}
        isSubmitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
      'ta-IN',
    );
    const pageHtml = render(<StoreCreationPage />, 'ta-IN');

    expect(formHtml).toContain('கடையின் பெயர்');
    expect(formHtml).toContain('கடைக் குறியீடு (விரும்பினால்)');
    expect(formHtml).toContain('கடையின் பெயரை உள்ளிடவும்.');
    expect(pageHtml).toContain('மற்றொரு கடையைச் சேர்க்கவும்');
    expect(pageHtml).toContain(
      'நீங்கள் வேலை செய்யும் வணிகத்தில் ஒரு கிளையைச் சேர்க்கவும்.',
    );
    expect(pageHtml).toContain('business-setup-card--store');
  });
});
