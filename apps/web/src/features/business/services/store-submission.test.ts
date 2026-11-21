import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ApiError } from '../../../app/api/api-error';
import type { BusinessContextData } from '../types/business.types';
import { submitStoreCreation } from './store-submission';

const { createStoreMock } = vi.hoisted(() => ({
  createStoreMock: vi.fn(),
}));

vi.mock('./store-flows', () => ({
  createStore: createStoreMock,
}));

import { createStore } from './store-flows';

const context = { stores: [] } as unknown as BusinessContextData;

describe('store submission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects invalid values before calling the API', async () => {
    const result = await submitStoreCreation(
      { storeName: ' ', storeCode: '' },
      createStoreMock,
    );

    expect(result).toEqual({
      status: 'validation',
      errors: { storeName: 'storeNameRequired' },
    });
    expect(createStoreMock).not.toHaveBeenCalled();
  });

  it('creates a valid store and returns the activated context', async () => {
    createStoreMock.mockResolvedValue(context);
    const values = { storeName: '  Branch  ', storeCode: '  BR  ' };

    const result = await submitStoreCreation(values, createStoreMock);

    expect(createStoreMock).toHaveBeenCalledWith(values);
    expect(result).toEqual({ status: 'success', context });
  });

  it('maps duplicate store failures to a localized error key', async () => {
    createStoreMock.mockRejectedValue(new ApiError(409, 'Duplicate code'));

    const result = await submitStoreCreation(
      { storeName: 'Branch', storeCode: 'MAIN' },
      createStoreMock,
    );

    expect(result).toEqual({ status: 'error', errorKey: 'duplicateStore' });
  });

  it('maps network and unexpected failures to a generic error key', async () => {
    createStoreMock.mockRejectedValueOnce(new ApiError(0, 'Network'));
    createStoreMock.mockRejectedValueOnce(new Error('Unexpected'));

    const network = await submitStoreCreation(
      { storeName: 'Branch', storeCode: '' },
      createStoreMock,
    );
    const unexpected = await submitStoreCreation(
      { storeName: 'Branch', storeCode: '' },
      createStoreMock,
    );

    expect(network).toEqual({ status: 'error', errorKey: 'generic' });
    expect(unexpected).toEqual({ status: 'error', errorKey: 'generic' });
    expect(createStore).toBeDefined();
  });
});
