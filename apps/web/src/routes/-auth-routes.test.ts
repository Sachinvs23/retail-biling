import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type {
  BusinessContextData,
  BusinessDiscoveryOutcome,
} from '../features/business/types/business.types';

const {
  restoreMock,
  restoreBusinessMock,
  getBusinessIdMock,
  getStoreIdMock,
  getActiveContextMock,
} = vi.hoisted(() => ({
  restoreMock: vi.fn(),
  restoreBusinessMock: vi.fn(),
  getBusinessIdMock: vi.fn(),
  getStoreIdMock: vi.fn(),
  getActiveContextMock: vi.fn(),
}));

vi.mock('../features/auth/session/auth-session', () => ({
  authSession: {
    restore: restoreMock,
  },
}));

vi.mock('../features/business/session/business-context', () => ({
  businessContext: {
    restore: restoreBusinessMock,
    getBusinessId: getBusinessIdMock,
    getStoreId: getStoreIdMock,
    getActiveContext: getActiveContextMock,
  },
}));

import { Route as AuthenticatedRoute } from './_authenticated/route';
import { Route as StoreNewRoute } from './_authenticated/stores/new';

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
  ],
};

const readyOutcome: BusinessDiscoveryOutcome = {
  status: 'ready',
  context,
};

function callBeforeLoad(href = '/') {
  const beforeLoad = AuthenticatedRoute.options.beforeLoad!;

  return beforeLoad({ location: { href } } as never);
}

describe('dashboard route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreMock.mockResolvedValue(true);
    getBusinessIdMock.mockReturnValue('business-1');
    getStoreIdMock.mockReturnValue('store-1');
    restoreBusinessMock.mockResolvedValue(readyOutcome);
  });

  it('redirects unauthenticated users back to the requested page', async () => {
    restoreMock.mockResolvedValue(false);

    const error = (await callBeforeLoad('/reports?range=week').catch(
      (value: unknown) => value,
    )) as { options: { to: string; search: { redirect: string } } };

    expect(error.options.to).toBe('/login');
    expect(error.options.search.redirect).toBe('/reports?range=week');
    expect(restoreBusinessMock).not.toHaveBeenCalled();
  });

  it('allows the protected layout once session and business context are ready', async () => {
    const result = await callBeforeLoad('/');

    expect(result).toEqual({ businessOutcome: readyOutcome });
    expect(restoreBusinessMock).toHaveBeenCalledTimes(1);
    expect(getBusinessIdMock).toHaveBeenCalled();
    expect(getStoreIdMock).toHaveBeenCalled();
  });

  it('rejects a ready outcome when the stored store ID is missing', async () => {
    getStoreIdMock.mockReturnValue(null);

    const error = (await callBeforeLoad('/').catch(
      (value: unknown) => value,
    )) as {
      options: { to: string; search: { redirect: string } };
    };

    expect(error.options.to).toBe('/login');
    expect(error.options.search.redirect).toBe('/');
  });

  it('redirects to onboarding when no business exists', async () => {
    restoreBusinessMock.mockResolvedValue({ status: 'onboarding-required' });

    const error = (await callBeforeLoad().catch((value: unknown) => value)) as {
      options: { to: string };
    };

    expect(error.options.to).toBe('/onboarding');
  });

  it('redirects to business selection when multiple businesses exist', async () => {
    restoreBusinessMock.mockResolvedValue({
      status: 'selection-required',
      businesses: [context, context],
    });

    const error = (await callBeforeLoad().catch((value: unknown) => value)) as {
      options: { to: string };
    };

    expect(error.options.to).toBe('/businesses/select');
  });

  it('redirects to store selection when a business has multiple stores', async () => {
    restoreBusinessMock.mockResolvedValue({
      status: 'store-selection-required',
      context,
    });

    const error = (await callBeforeLoad().catch((value: unknown) => value)) as {
      options: { to: string };
    };

    expect(error.options.to).toBe('/stores/select');
  });

  it('redirects to store setup when a business has no stores', async () => {
    restoreBusinessMock.mockResolvedValue({
      status: 'store-setup-required',
      context,
    });

    const error = (await callBeforeLoad().catch((value: unknown) => value)) as {
      options: { to: string };
    };

    expect(error.options.to).toBe('/stores/setup');
  });

  it('redirects to login when restoration is stale', async () => {
    restoreBusinessMock.mockResolvedValue({ status: 'stale' });

    const error = (await callBeforeLoad('/').catch(
      (value: unknown) => value,
    )) as {
      options: { to: string; search: { redirect: string } };
    };

    expect(error.options.to).toBe('/login');
    expect(error.options.search.redirect).toBe('/');
  });

  it('redirects to login when business restoration fails', async () => {
    restoreBusinessMock.mockRejectedValue(new Error('network'));

    const error = (await callBeforeLoad('/').catch(
      (value: unknown) => value,
    )) as {
      options: { to: string };
    };

    expect(error.options.to).toBe('/login');
  });
});

describe('store creation route guards', () => {
  function callStoreCreationBeforeLoad() {
    const beforeLoad = StoreNewRoute.options.beforeLoad!;

    return beforeLoad({} as never);
  }

  function captureStoreCreationRedirect() {
    try {
      callStoreCreationBeforeLoad();
      return null;
    } catch (error) {
      return error as { options: { to: string } };
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getActiveContextMock.mockReturnValue(context);
  });

  it('allows owners and admins', () => {
    getActiveContextMock.mockReturnValue({
      ...context,
      membership: { role: 'ADMIN' },
    });

    expect(callStoreCreationBeforeLoad()).toBeUndefined();
  });

  it('redirects managers, cashiers, and stale contexts to the dashboard', () => {
    for (const role of ['MANAGER', 'CASHIER'] as const) {
      getActiveContextMock.mockReturnValue({
        ...context,
        membership: { role },
      });

      const error = captureStoreCreationRedirect();

      expect(error?.options.to).toBe('/');
    }

    getActiveContextMock.mockReturnValue(undefined);
    const error = captureStoreCreationRedirect();

    expect(error?.options.to).toBe('/');
  });
});
