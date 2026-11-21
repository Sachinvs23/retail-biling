import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ApiError } from '../../../app/api/api-error';
import type { CreateBusinessResponse } from '../types/business.types';

const { createMock, applyResponseMock, refreshBusinessListMock } = vi.hoisted(
  () => ({
    createMock: vi.fn(),
    applyResponseMock: vi.fn(),
    refreshBusinessListMock: vi.fn(),
  }),
);

vi.mock('../api/business-api', () => ({
  businessApi: { create: createMock },
}));

vi.mock('../session/business-context', () => ({
  businessContext: {
    applyResponse: applyResponseMock,
    refreshBusinessList: refreshBusinessListMock,
  },
}));

import { createBusiness } from './business-flows';

const response: CreateBusinessResponse = {
  business: {
    id: 'business-1',
    name: 'Shop',
    slug: 'shop',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  membership: { role: 'OWNER' },
  store: {
    id: 'store-1',
    name: 'Main',
    code: 'MAIN',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

const secondResponse: CreateBusinessResponse = {
  business: {
    id: 'business-2',
    name: 'Second Shop',
    slug: 'second-shop',
    status: 'ACTIVE',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  membership: { role: 'OWNER' },
  store: {
    id: 'store-2',
    name: 'Second Main',
    code: 'SECOND',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
};

const normalizedContext = {
  ...response,
  stores: [response.store],
};

const secondContext = {
  ...secondResponse,
  stores: [secondResponse.store],
};

describe('business flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    refreshBusinessListMock.mockResolvedValue([]);
  });

  it('creates a business with a normalized payload and activates its context', async () => {
    createMock.mockResolvedValue(response);
    applyResponseMock.mockReturnValue(normalizedContext);

    const result = await createBusiness({
      businessName: '  Shop  ',
      slug: 'shop',
      storeName: '  Main  ',
      storeCode: '  MAIN  ',
    });

    expect(createMock).toHaveBeenCalledWith({
      businessName: 'Shop',
      slug: 'shop',
      storeName: 'Main',
      storeCode: 'MAIN',
    });
    expect(applyResponseMock).toHaveBeenCalledWith(response);
    expect(refreshBusinessListMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(normalizedContext);
  });

  it('activates a second business and refreshes the list after creation', async () => {
    createMock.mockResolvedValue(secondResponse);
    applyResponseMock.mockReturnValue(secondContext);

    const result = await createBusiness({
      businessName: 'Second Shop',
      slug: 'second-shop',
      storeName: 'Second Main',
      storeCode: 'SECOND',
    });

    expect(applyResponseMock).toHaveBeenCalledWith(secondResponse);
    expect(refreshBusinessListMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(secondContext);
  });

  it('does not refresh or activate context when creation fails', async () => {
    const error = new ApiError(409, 'Duplicate slug');
    createMock.mockRejectedValue(error);

    await expect(
      createBusiness({
        businessName: 'Shop',
        slug: 'shop',
        storeName: 'Main',
        storeCode: '',
      }),
    ).rejects.toBe(error);

    expect(applyResponseMock).not.toHaveBeenCalled();
    expect(refreshBusinessListMock).not.toHaveBeenCalled();
  });
});
