import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ApiError } from '../../../app/api/api-error';
import { apiContext } from '../../../app/api/api-context';
import { authKeys } from '../../auth/auth-keys';
import { authSession } from '../../auth/session/auth-session';
import { businessKeys } from '../business-keys';
import type {
  BusinessContextData,
  BusinessContextResponse,
  CreateBusinessResponse,
} from '../types/business.types';

const { getContextMock, listMock } = vi.hoisted(() => ({
  getContextMock: vi.fn(),
  listMock: vi.fn(),
}));

vi.mock('../api/business-api', () => ({
  businessApi: {
    getContext: getContextMock,
    list: listMock,
    create: vi.fn(),
  },
}));

import { createBusinessContext } from './business-context';

const createdAt = '2026-01-01T00:00:00.000Z';

function makeStore(id: string) {
  return {
    id,
    name: `${id} store`,
    code: id.toUpperCase(),
    createdAt,
  };
}

function makeContext(
  businessId: string,
  storeIds: readonly string[] = ['store-1'],
): BusinessContextData {
  return {
    business: {
      id: businessId,
      name: `${businessId} business`,
      slug: businessId,
      status: 'ACTIVE',
      createdAt,
    },
    membership: { role: 'OWNER' },
    stores: storeIds.map(makeStore),
  };
}

function toContextResponse(
  context: BusinessContextData,
): BusinessContextResponse {
  return {
    business: context.business,
    membership: context.membership,
    stores: context.stores,
  };
}

describe('business context', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiContext.clearState();
  });

  it('validates a stored business and reuses a valid stored store', async () => {
    const service = createBusinessContext(new QueryClient());
    const context = makeContext('business-1', ['store-1', 'store-2']);

    apiContext.setToken('access-token');
    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('store-2');
    getContextMock.mockResolvedValue(toContextResponse(context));

    const outcome = await service.restore();

    expect(getContextMock).toHaveBeenCalledWith('business-1');
    expect(listMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'ready', context });
    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBe('store-2');
    expect(apiContext.getToken()).toBe('access-token');
    expect(service.getActiveContext()).toEqual(context);
  });

  it('does not reuse a stored store ID that belongs to another business', async () => {
    const service = createBusinessContext(new QueryClient());
    const context = makeContext('business-1', ['store-1', 'store-2']);

    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('stale-store');
    getContextMock.mockResolvedValue(toContextResponse(context));

    const outcome = await service.restore();

    expect(outcome).toEqual({
      status: 'store-selection-required',
      context,
    });
    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBeNull();
  });

  it('clears stale context and auto-selects one business with one store', async () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const discovered = makeContext('business-1');

    apiContext.setToken('access-token');
    apiContext.setBusinessId('business-old');
    apiContext.setStoreId('store-old');
    client.setQueryData(businessKeys.products('business-old'), ['stale']);
    getContextMock.mockRejectedValue(new ApiError(404, 'Not found'));
    listMock.mockResolvedValue({ businesses: [discovered] });

    const outcome = await service.restore();

    expect(outcome).toEqual({ status: 'ready', context: discovered });
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(
      client.getQueryData(businessKeys.products('business-old')),
    ).toBeUndefined();
    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBe('store-1');
    expect(apiContext.getToken()).toBe('access-token');
  });

  it('requires explicit store selection for one business with multiple stores', async () => {
    const service = createBusinessContext(new QueryClient());
    const discovered = makeContext('business-1', ['store-1', 'store-2']);

    listMock.mockResolvedValue({ businesses: [discovered] });

    const outcome = await service.restore();

    expect(outcome).toEqual({
      status: 'store-selection-required',
      context: discovered,
    });
    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBeNull();
    expect(service.getActiveContext()).toEqual(discovered);
  });

  it('requires store setup when the only business has no stores', async () => {
    const service = createBusinessContext(new QueryClient());
    const discovered = makeContext('business-1', []);

    listMock.mockResolvedValue({ businesses: [discovered] });

    const outcome = await service.restore();

    expect(outcome).toEqual({
      status: 'store-setup-required',
      context: discovered,
    });
    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBeNull();
  });

  it('requires selection when multiple businesses are discovered', async () => {
    const service = createBusinessContext(new QueryClient());
    const businesses = [makeContext('business-1'), makeContext('business-2')];

    listMock.mockResolvedValue({ businesses });

    const outcome = await service.restore();

    expect(outcome).toEqual({ status: 'selection-required', businesses });
    expect(getContextMock).not.toHaveBeenCalled();
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
  });

  it('requests onboarding when no businesses exist', async () => {
    const service = createBusinessContext(new QueryClient());

    apiContext.setToken('access-token');
    apiContext.setBusinessId('business-old');
    apiContext.setStoreId('store-old');
    getContextMock.mockRejectedValue(new ApiError(403, 'Forbidden'));
    listMock.mockResolvedValue({ businesses: [] });

    const outcome = await service.restore();

    expect(outcome).toEqual({ status: 'onboarding-required' });
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
    expect(apiContext.getToken()).toBe('access-token');
  });

  it('does not treat authentication failures as stale business context', async () => {
    const service = createBusinessContext(new QueryClient());
    const error = new ApiError(401, 'Unauthorized');

    apiContext.setBusinessId('business-1');
    getContextMock.mockRejectedValue(error);

    await expect(service.restore()).rejects.toBe(error);

    expect(listMock).not.toHaveBeenCalled();
    expect(apiContext.getBusinessId()).toBe('business-1');
  });

  it('shares one restoration attempt across concurrent callers', async () => {
    const service = createBusinessContext(new QueryClient());
    const discovered = makeContext('business-1');

    listMock.mockResolvedValue({ businesses: [discovered] });

    const outcomes = await Promise.all([service.restore(), service.restore()]);

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([
      { status: 'ready', context: discovered },
      { status: 'ready', context: discovered },
    ]);
  });

  it('refreshes and caches the business list without changing the session', async () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const businesses = [makeContext('business-1'), makeContext('business-2')];

    apiContext.setToken('access-token');
    listMock.mockResolvedValue({ businesses });

    await expect(service.refreshBusinessList()).resolves.toEqual(businesses);

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(businessKeys.discoveryList())).toEqual(
      businesses,
    );
    expect(apiContext.getToken()).toBe('access-token');
  });

  it('activates a newly created second business, selects its store and isolates its cache', () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const first = makeContext('business-1');
    const second = makeContext('business-2', ['store-9']);
    const createResponse: CreateBusinessResponse = {
      business: second.business,
      membership: second.membership,
      store: second.stores[0]!,
    };

    apiContext.setToken('access-token');
    service.selectBusiness(first);
    client.setQueryData(businessKeys.products('business-1'), ['first']);
    client.setQueryData(businessKeys.inventory('business-1', 'store-1'), [
      'first-store',
    ]);
    client.setQueryData(businessKeys.products('business-2'), ['second']);
    client.setQueryData(authKeys.currentUser, { id: 'user-1' });

    const context = service.applyResponse(createResponse);

    expect(context).toEqual(second);
    expect(apiContext.getBusinessId()).toBe('business-2');
    expect(apiContext.getStoreId()).toBe('store-9');
    expect(
      client.getQueryData(businessKeys.products('business-1')),
    ).toBeUndefined();
    expect(
      client.getQueryData(businessKeys.inventory('business-1', 'store-1')),
    ).toBeUndefined();
    expect(client.getQueryData(businessKeys.products('business-2'))).toEqual([
      'second',
    ]);
    expect(client.getQueryData(authKeys.currentUser)).toEqual({ id: 'user-1' });
    expect(apiContext.getToken()).toBe('access-token');
  });

  it('auto-selects only one store after business selection', () => {
    const service = createBusinessContext(new QueryClient());
    const context = makeContext('business-1', ['store-1']);

    expect(service.selectBusiness(context)).toEqual({
      status: 'ready',
      context,
    });
    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBe('store-1');
  });

  it('requires explicit store selection after selecting a multi-store business', () => {
    const service = createBusinessContext(new QueryClient());
    const context = makeContext('business-1', ['store-1', 'store-2']);

    expect(service.selectBusiness(context)).toEqual({
      status: 'store-selection-required',
      context,
    });
    expect(apiContext.getStoreId()).toBeNull();

    expect(service.selectBusiness(context, 'store-2')).toEqual({
      status: 'ready',
      context,
    });
    expect(apiContext.getStoreId()).toBe('store-2');
    expect(() => service.selectBusiness(context, 'missing')).toThrow();
  });

  it('removes previous business queries without changing authentication', () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const first = makeContext('business-1');
    const second = makeContext('business-2');

    apiContext.setToken('access-token');
    client.setQueryData(businessKeys.products('business-1'), ['first']);
    client.setQueryData(businessKeys.products('business-2'), ['second']);

    service.selectBusiness(first);
    service.selectBusiness(second);

    expect(
      client.getQueryData(businessKeys.products('business-1')),
    ).toBeUndefined();
    expect(client.getQueryData(businessKeys.products('business-2'))).toEqual([
      'second',
    ]);
    expect(service.getActiveContext()).toEqual(second);
    expect(apiContext.getToken()).toBe('access-token');
  });

  it('uses one consolidated store-specific key namespace', () => {
    expect(businessKeys.storeScope('business-1', 'store-1')).toEqual([
      'business',
      'business-1',
      'store',
      'store-1',
    ]);
    expect(businessKeys.inventory('business-1', 'store-1')).toEqual(
      businessKeys.storeScope('business-1', 'store-1', 'inventory'),
    );
    expect(businessKeys.stores('business-1')).toEqual([
      'business',
      'business-1',
      'stores',
    ]);
  });

  it('removes only previous store queries when switching stores', () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const context = makeContext('business-1', [
      'store-1',
      'store-2',
      'store-3',
    ]);

    apiContext.setToken('access-token');
    service.selectBusiness(context, 'store-1');

    const previousStoreKey = businessKeys.storeScope('business-1', 'store-1');
    const previousInventoryKey = businessKeys.storeScope(
      'business-1',
      'store-1',
      'inventory',
    );
    const otherStoreKey = businessKeys.storeScope(
      'business-1',
      'store-2',
      'inventory',
    );

    client.setQueryData(previousStoreKey, ['previous-store']);
    client.setQueryData(previousInventoryKey, ['previous-inventory']);
    client.setQueryData(otherStoreKey, ['other-store']);
    client.setQueryData(businessKeys.context('business-1'), context);
    client.setQueryData(businessKeys.products('business-1'), ['business']);
    client.setQueryData(authKeys.currentUser, { id: 'user-1' });

    service.selectStore('store-3');

    expect(client.getQueryData(previousStoreKey)).toBeUndefined();
    expect(client.getQueryData(previousInventoryKey)).toBeUndefined();
    expect(client.getQueryData(otherStoreKey)).toEqual(['other-store']);
    expect(client.getQueryData(businessKeys.context('business-1'))).toEqual(
      context,
    );
    expect(client.getQueryData(businessKeys.products('business-1'))).toEqual([
      'business',
    ]);
    expect(client.getQueryData(authKeys.currentUser)).toEqual({ id: 'user-1' });
    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBe('store-3');
    expect(apiContext.getToken()).toBe('access-token');
    expect(() => service.selectStore('missing')).toThrow();
  });

  it('clears business context and its cached queries', () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const context = makeContext('business-1');

    service.selectBusiness(context);
    expect(client.getQueryData(businessKeys.context('business-1'))).toEqual(
      context,
    );

    service.clear();

    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
    expect(
      client.getQueryData(businessKeys.context('business-1')),
    ).toBeUndefined();
  });

  it('does not reapply context when authentication is cleared during restoration', async () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const context = makeContext('business-1');
    let resolveContext!: (value: BusinessContextResponse) => void;

    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('store-1');
    client.setQueryData(businessKeys.context('business-1'), context);
    client.setQueryData(businessKeys.products('business-1'), ['stale']);

    getContextMock.mockImplementation(
      () =>
        new Promise<BusinessContextResponse>((resolve) => {
          resolveContext = resolve;
        }),
    );

    const restoration = service.restore();

    authSession.clear();
    resolveContext(toContextResponse(context));

    const outcome = await restoration;

    expect(outcome).toEqual({ status: 'stale' });
    expect(listMock).not.toHaveBeenCalled();
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
    expect(
      client.getQueryData(businessKeys.context('business-1')),
    ).toBeUndefined();
    expect(
      client.getQueryData(businessKeys.products('business-1')),
    ).toBeUndefined();
  });

  it('does not cache discovery results after authentication is cleared', async () => {
    const client = new QueryClient();
    const service = createBusinessContext(client);
    const context = makeContext('business-1');
    let resolveList!: (value: { businesses: BusinessContextData[] }) => void;

    listMock.mockImplementation(
      () =>
        new Promise<{ businesses: BusinessContextData[] }>((resolve) => {
          resolveList = resolve;
        }),
    );

    const restoration = service.restore();

    authSession.clear();
    resolveList({ businesses: [context] });

    const outcome = await restoration;

    expect(outcome).toEqual({ status: 'stale' });
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
    expect(
      client.getQueryData(businessKeys.context('business-1')),
    ).toBeUndefined();
  });
});
