import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { ApiError } from '../../../app/api/api-error';
import { apiContext } from '../../../app/api/api-context';
import { storeApi } from './store-api';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function lastRequest(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.lastCall!;

  return { url: String(url), init: init as RequestInit };
}

describe('store API', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    apiContext.clearState();
    apiContext.setToken('access-token');
    apiContext.setBusinessId('business-1');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    apiContext.clearState();
  });

  it('posts normalized store fields with the selected business header', async () => {
    const created = {
      id: 'store-2',
      name: 'Tambaram Branch',
      code: 'TAMBARAM',
      createdAt: '2026-11-21T10:00:00.000Z',
    };
    fetchMock.mockResolvedValue(jsonResponse(created, 201));

    const result = await storeApi.create({
      storeName: 'Tambaram Branch',
      storeCode: 'TAMBARAM',
    });

    expect(result).toEqual(created);

    const { url, init } = lastRequest();
    expect(url).toContain('/stores');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');

    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get('X-Business-Id')).toBe('business-1');
    expect(headers.get('Content-Type')).toBe('application/json');

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      storeName: 'Tambaram Branch',
      storeCode: 'TAMBARAM',
    });
    expect(body).not.toHaveProperty('businessId');
    expect(body).not.toHaveProperty('tenantId');
  });

  it('propagates duplicate-code errors as ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Duplicate store code' }, 409),
    );

    const error = await storeApi
      .create({ storeName: 'Branch', storeCode: 'MAIN' })
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  });

  it('propagates network failures as ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await storeApi
      .create({ storeName: 'Branch' })
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});
