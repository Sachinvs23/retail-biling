import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vite-plus/test';

import enIN from '../../../app/i18n/messages/en-IN.json';
import taIN from '../../../app/i18n/messages/ta-IN.json';
import type { BusinessContextData } from '../types/business.types';
import type { CreateBusinessValues } from '../validation';
import { BusinessSelectionList } from './BusinessSelectionList';
import { BusinessSetupLoading } from './BusinessSetupState';
import { OnboardingForm } from './OnboardingForm';
import { StoreSelectionList } from './StoreSelectionList';

const messages = { 'en-IN': enIN, 'ta-IN': taIN };

function render(node: ReactNode, locale: 'en-IN' | 'ta-IN' = 'en-IN') {
  return renderToStaticMarkup(
    <IntlProvider locale={locale} messages={messages[locale]}>
      {node}
    </IntlProvider>,
  );
}

const values: CreateBusinessValues = {
  businessName: 'Shop',
  slug: 'shop',
  storeName: 'Main',
  storeCode: 'MAIN',
};

const context: BusinessContextData = {
  business: {
    id: 'business-1',
    name: 'Retail One',
    slug: 'retail-one',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  membership: { role: 'OWNER' },
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
};

describe('business setup components', () => {
  it('renders onboarding fields and localized validation errors', () => {
    const html = render(
      <OnboardingForm
        values={values}
        errors={{ slug: 'slugInvalid' }}
        serverError="A business with this slug already exists."
        isSubmitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain('Business name');
    expect(html).toContain('Business slug');
    expect(html).toContain('Store code (optional)');
    expect(html).toContain(
      'Use lowercase letters, numbers and single hyphens.',
    );
    expect(html).toContain('A business with this slug already exists.');
    expect(html).toContain('Create business');
  });

  it('disables onboarding submission while the API request is pending', () => {
    const html = render(
      <OnboardingForm
        values={values}
        errors={{}}
        isSubmitting
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain('Creating business...');
    expect(html).toContain('disabled=""');
  });

  it('renders multiple businesses with their store counts', () => {
    const html = render(
      <BusinessSelectionList
        businesses={[
          context,
          {
            ...context,
            business: {
              ...context.business,
              id: 'business-2',
              name: 'Retail Two',
            },
          },
        ]}
        onSelect={vi.fn()}
      />,
    );

    expect(html).toContain('Retail One');
    expect(html).toContain('Retail Two');
    expect(html).toContain('2 stores');
    expect(html).toContain('Select business');
  });

  it('renders the business empty state', () => {
    const html = render(
      <BusinessSelectionList businesses={[]} onSelect={vi.fn()} />,
    );

    expect(html).toContain('You do not have access to any businesses yet.');
  });

  it('renders stores with codes and localizes in Tamil', () => {
    const html = render(
      <StoreSelectionList stores={context.stores} onSelect={vi.fn()} />,
      'ta-IN',
    );

    expect(html).toContain('கடையைத் தேர்ந்தெடு');
    expect(html).toContain('Main Store');
    expect(html).toContain('குறியீடு: MAIN');
    expect(html).toContain('கடையைத் தேர்ந்தெடு');
  });

  it('renders the store setup empty state', () => {
    const html = render(<StoreSelectionList stores={[]} onSelect={vi.fn()} />);

    expect(html).toContain('No store available');
    expect(html).toContain('Ask an administrator to add one');
  });

  it('renders the route loading state', () => {
    expect(render(<BusinessSetupLoading />)).toContain(
      'Checking your workspace',
    );
  });
});
