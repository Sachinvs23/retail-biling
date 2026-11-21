import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ApiError } from '../../../app/api/api-error';
import { apiContext } from '../../../app/api/api-context';
import type {
  BusinessContextData,
  CreateStoreResponse,
} from '../types/business.types';
import { createStore } from './store-flows';

const { createMock, applyCreatedStoreMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  applyCreatedStoreMock: vi.fn(),
}));

vi.mock('../api/store-api', () => ({
  storeApi: { create: createMock },
}));

vi.mock('../session/business-context', () => ({
  businessContext: { applyCreatedStore: applyCreatedStoreMock },
}));

const createdStore: CreateStoreResponse = {
  id: 'store-2',
  name: 'Tambaram Branch',
  code: 'TAMBARAM',
  createdAt: '2026-11-21T10:00:00.000Z',
};

const context = { stores: [createdStore] } as BusinessContextData;

function deferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe('store flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiContext.clearState();
    apiContext.setToken('access-token');
    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('store-1');
  });

  it('creates a store and applies it to the captured business session', async () => {
    const generation = apiContext.getSessionGeneration();
    createMock.mockResolvedValue(createdStore);
    applyCreatedStoreMock.mockReturnValue(context);

    const result = await createStore({
      storeName: '  Tambaram Branch  ',
      storeCode: '  TAMBARAM  ',
    });

    expect(createMock).toHaveBeenCalledWith({
      storeName: 'Tambaram Branch',
      storeCode: 'TAMBARAM',
    });
    expect(applyCreatedStoreMock).toHaveBeenCalledWith(
      createdStore,
      'business-1',
      generation,
    );
    expect(result).toBe(context);
  });

  it('does not activate a store when the business changes during the request', async () => {
    const pending = deferred<CreateStoreResponse>();
    createMock.mockResolvedValue(pending.promise);

    const creation = createStore({
      storeName: 'Tambaram Branch',
      storeCode: '',
    });

    apiContext.setBusinessId('business-2');
    pending.resolve(createdStore);

    await expect(creation).rejects.toThrow('Session or business changed');
    expect(applyCreatedStoreMock).not.toHaveBeenCalled();
  });

  it('does not activate a store when the session changes during the request', async () => {
    const pending = deferred<CreateStoreResponse>();
    createMock.mockResolvedValue(pending.promise);

    const creation = createStore({
      storeName: 'Tambaram Branch',
      storeCode: '',
    });

    apiContext.clearState();
    pending.resolve(createdStore);

    await expect(creation).rejects.toThrow('Session or business changed');
    expect(applyCreatedStoreMock).not.toHaveBeenCalled();
  });

  it('propagates API failures without changing context', async () => {
    const error = new ApiError(409, 'Duplicate store code');
    createMock.mockRejectedValue(error);

    await expect(
      createStore({ storeName: 'Branch', storeCode: 'MAIN' }),
    ).rejects.toBe(error);

    expect(applyCreatedStoreMock).not.toHaveBeenCalled();
  });

  it('requires an active business before making a request', async () => {
    apiContext.clearBusinessId();

    await expect(
      createStore({ storeName: 'Branch', storeCode: '' }),
    ).rejects.toThrow('No active business is selected');
    expect(createMock).not.toHaveBeenCalled();
  });
});
