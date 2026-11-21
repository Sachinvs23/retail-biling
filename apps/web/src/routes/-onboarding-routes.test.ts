import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type {
  BusinessContextData,
  BusinessDiscoveryOutcome,
} from '../features/business/types/business.types';
import { ADD_BUSINESS_INTENT } from '../features/business/utils/business-routing';

const { restoreMock, restoreBusinessMock } = vi.hoisted(() => ({
  restoreMock: vi.fn(),
  restoreBusinessMock: vi.fn(),
}));

vi.mock('../features/auth/session/auth-session', () => ({
  authSession: { restore: restoreMock },
}));

vi.mock('../features/business/session/business-context', () => ({
  businessContext: { restore: restoreBusinessMock },
}));

import { Route as OnboardingLayoutRoute } from './_onboarding/route';
import { Route as OnboardingRoute } from './_onboarding/onboarding';
import { Route as StoreSelectionRoute } from './_onboarding/stores/select';

const context: BusinessContextData = {
  business: {
    id: 'business-1',
    name: 'Shop',
    slug: 'shop',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  membership: { role: 'OWNER' },
  stores: [
    {
      id: 'store-1',
      name: 'Main',
      code: 'MAIN',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'store-2',
      name: 'Branch',
      code: 'BRANCH',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const onboardingOutcome: BusinessDiscoveryOutcome = {
  status: 'onboarding-required',
};

const readyOutcome: BusinessDiscoveryOutcome = {
  status: 'ready',
  context,
};

function searchFromHref(href: string): Record<string, unknown> {
  const queryIndex = href.indexOf('?');

  if (queryIndex === -1) {
    return {};
  }

  return Object.fromEntries(new URLSearchParams(href.slice(queryIndex + 1)));
}

function callLayoutGuard(href = '/onboarding') {
  return OnboardingLayoutRoute.options.beforeLoad!({
    location: { href, search: searchFromHref(href) },
  } as never);
}

function callOnboardingGuard(
  outcome: BusinessDiscoveryOutcome,
  href = '/onboarding',
) {
  return OnboardingRoute.options.beforeLoad!({
    context: { businessOutcome: outcome },
    location: { href, search: searchFromHref(href) },
  } as never);
}

describe('onboarding route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreMock.mockResolvedValue(true);
    restoreBusinessMock.mockResolvedValue(onboardingOutcome);
  });

  it('redirects unauthenticated users to login', async () => {
    restoreMock.mockResolvedValue(false);

    const error = (await callLayoutGuard().catch(
      (value: unknown) => value,
    )) as {
      options: { to: string; search: { redirect: string } };
    };

    expect(error.options.to).toBe('/login');
    expect(error.options.search.redirect).toBe('/onboarding');
    expect(restoreBusinessMock).not.toHaveBeenCalled();
  });

  it('redirects ready sessions to the dashboard without explicit intent', async () => {
    restoreBusinessMock.mockResolvedValue(readyOutcome);

    const error = (await callLayoutGuard().catch(
      (value: unknown) => value,
    )) as {
      options: { to: string };
    };

    expect(error.options.to).toBe('/');
  });

  it('allows an active business to open onboarding with add-business intent', async () => {
    restoreBusinessMock.mockResolvedValue(readyOutcome);

    const result = await callLayoutGuard(
      `/onboarding?intent=${ADD_BUSINESS_INTENT}`,
    );

    expect(result).toEqual({ businessOutcome: readyOutcome });
  });

  it('redirects stale sessions to login even with add-business intent', async () => {
    restoreBusinessMock.mockResolvedValue({ status: 'stale' });

    const error = (await callLayoutGuard(
      `/onboarding?intent=${ADD_BUSINESS_INTENT}`,
    ).catch((value: unknown) => value)) as {
      options: { to: string };
    };

    expect(error.options.to).toBe('/login');
  });

  it('provides the discovery outcome to child routes', async () => {
    const result = await callLayoutGuard();

    expect(result).toEqual({ businessOutcome: onboardingOutcome });
  });

  it('keeps the first-time onboarding route available', () => {
    expect(() => callOnboardingGuard(onboardingOutcome)).not.toThrow();
  });

  it('keeps an active business on onboarding with add-business intent', () => {
    expect(() =>
      callOnboardingGuard(
        readyOutcome,
        `/onboarding?intent=${ADD_BUSINESS_INTENT}`,
      ),
    ).not.toThrow();
  });

  it('redirects an active business away from onboarding without intent', () => {
    const error = (() => {
      try {
        callOnboardingGuard(readyOutcome);
      } catch (value) {
        return value as { options: { to: string } };
      }
    })();

    expect(error!.options.to).toBe('/');
  });

  it('redirects a mismatched onboarding child to its correct route', () => {
    const error = (() => {
      try {
        callOnboardingGuard({
          status: 'selection-required',
          businesses: [context, context],
        });
      } catch (value) {
        return value as { options: { to: string } };
      }
    })();

    expect(error!.options.to).toBe('/businesses/select');
  });

  it('keeps store selection on the store selection route', () => {
    const beforeLoad = StoreSelectionRoute.options.beforeLoad!;

    expect(
      beforeLoad({
        context: {
          businessOutcome: { status: 'store-selection-required', context },
        },
        location: { href: '/stores/select' },
      } as never),
    ).toBeUndefined();
  });
});
