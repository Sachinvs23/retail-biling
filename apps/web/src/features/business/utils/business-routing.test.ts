import { describe, expect, it } from 'vite-plus/test';

import type { BusinessContextData } from '../types/business.types';
import {
  ADD_BUSINESS_INTENT,
  getBusinessSetupRoute,
  getRouteAfterBusinessSelection,
  getRouteAfterStoreSelection,
  isAddBusinessIntent,
  parseBusinessOnboardingSearch,
  requireBusinessSetupOutcome,
} from './business-routing';

const context = {
  business: {
    id: 'business-1',
    name: 'Shop',
    slug: 'shop',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  membership: { role: 'OWNER' },
  stores: [],
} satisfies BusinessContextData;

describe('business routing', () => {
  it('maps discovery outcomes to setup routes', () => {
    expect(getBusinessSetupRoute({ status: 'ready', context })).toBe('/');
    expect(getBusinessSetupRoute({ status: 'onboarding-required' })).toBe(
      '/onboarding',
    );
    expect(
      getBusinessSetupRoute({
        status: 'selection-required',
        businesses: [context],
      }),
    ).toBe('/businesses/select');
    expect(
      getBusinessSetupRoute({
        status: 'store-selection-required',
        context,
      }),
    ).toBe('/stores/select');
    expect(
      getBusinessSetupRoute({ status: 'store-setup-required', context }),
    ).toBe('/stores/setup');
    expect(getBusinessSetupRoute({ status: 'stale' })).toBeNull();
  });

  it('never sends a multi-store business directly to the dashboard', () => {
    expect(
      getRouteAfterBusinessSelection({
        status: 'store-selection-required',
        context,
      }),
    ).toBe('/stores/select');
  });

  it('auto-selects a single store after business selection', () => {
    expect(getRouteAfterBusinessSelection({ status: 'ready', context })).toBe(
      '/',
    );
  });

  it('sends zero-store businesses to store setup', () => {
    expect(
      getRouteAfterBusinessSelection({
        status: 'store-setup-required',
        context,
      }),
    ).toBe('/stores/setup');
  });

  it('returns to the dashboard after store selection', () => {
    expect(getRouteAfterStoreSelection()).toBe('/');
  });

  it('allows a child route to render for the expected outcome', () => {
    expect(
      requireBusinessSetupOutcome(
        { status: 'onboarding-required' },
        'onboarding-required',
        '/onboarding',
      ),
    ).toBeUndefined();
  });

  it('redirects a mismatched child route to the correct setup route', () => {
    const error = (() => {
      try {
        requireBusinessSetupOutcome(
          { status: 'store-selection-required', context },
          'onboarding-required',
          '/onboarding',
        );
      } catch (value) {
        return value as { options: { to: string } };
      }
    })();

    expect(error!.options.to).toBe('/stores/select');
  });

  it('redirects a stale child route to login', () => {
    const error = (() => {
      try {
        requireBusinessSetupOutcome(
          { status: 'stale' },
          'onboarding-required',
          '/onboarding',
        );
      } catch (value) {
        return value as {
          options: { to: string; search: { redirect: string } };
        };
      }
    })();

    expect(error!.options.to).toBe('/login');
    expect(error!.options.search.redirect).toBe('/onboarding');
  });

  it('recognizes only the explicit add-business intent', () => {
    expect(
      parseBusinessOnboardingSearch({ intent: ADD_BUSINESS_INTENT }),
    ).toEqual({ intent: ADD_BUSINESS_INTENT });
    expect(parseBusinessOnboardingSearch({ intent: 'other' })).toEqual({});
    expect(isAddBusinessIntent({ intent: ADD_BUSINESS_INTENT })).toBe(true);
    expect(isAddBusinessIntent({})).toBe(false);
    expect(isAddBusinessIntent(undefined)).toBe(false);
  });
});
