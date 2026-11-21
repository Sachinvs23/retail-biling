import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('../../../app/api/api-client', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
  },
}));

import { businessApi } from './business-api';

describe('business API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('discovers businesses without a business header', async () => {
    await businessApi.list();

    expect(getMock).toHaveBeenCalledWith('/businesses', { business: false });
  });

  it('validates context with an explicit business header only', async () => {
    await businessApi.getContext('business-1');

    expect(getMock).toHaveBeenCalledWith('/businesses/context', {
      business: false,
      headers: { 'X-Business-Id': 'business-1' },
    });
  });

  it('creates a business without a business header', async () => {
    const payload = {
      businessName: 'Shop',
      slug: 'shop',
      storeName: 'Main',
    };

    await businessApi.create(payload);

    expect(postMock).toHaveBeenCalledWith('/businesses', payload, {
      business: false,
    });
  });
});
