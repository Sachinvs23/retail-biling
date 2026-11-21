import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { apiClient, refreshAccessToken } from './api-client';
import { apiContext } from './api-context';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function refreshedToken() {
  return jsonResponse({
    access_token: 'fresh-token',
    token_type: 'Bearer',
    expires_in: 900,
  });
}

describe('api client authentication', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    apiContext.clearState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    apiContext.clearState();
  });

  it('refreshes an expired access token and retries once', async () => {
    apiContext.setToken('expired-token');

    let refreshCalls = 0;
    let protectedCalls = 0;

    fetchMock.mockImplementation(async (input: unknown, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return refreshedToken();
      }

      protectedCalls += 1;
      const headers = new Headers(init?.headers);

      return headers.get('Authorization') === 'Bearer expired-token'
        ? jsonResponse({ message: 'Unauthorized' }, 401)
        : jsonResponse({ ok: true });
    });

    const result = await apiClient.get<{ ok: boolean }>('/protected');

    expect(result).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
    expect(apiContext.getToken()).toBe('fresh-token');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'include',
    });
  });

  it('uses one refresh request for simultaneous 401 responses', async () => {
    apiContext.setToken('expired-token');

    let refreshCalls = 0;

    fetchMock.mockImplementation(async (input: unknown, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return refreshedToken();
      }

      const headers = new Headers(init?.headers);

      return headers.get('Authorization') === 'Bearer expired-token'
        ? jsonResponse({ message: 'Unauthorized' }, 401)
        : jsonResponse({ path: url });
    });

    const [first, second] = await Promise.all([
      apiClient.get<{ path: string }>('/first'),
      apiClient.get<{ path: string }>('/second'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(first.path).toContain('/first');
    expect(second.path).toContain('/second');
  });

  it('shares direct refresh requests', async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation(async () => {
      refreshCalls += 1;
      return refreshedToken();
    });

    await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(refreshCalls).toBe(1);
  });

  it('clears local session state when refresh fails', async () => {
    apiContext.setToken('expired-token');
    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('store-1');

    let refreshCalls = 0;
    let protectedCalls = 0;

    fetchMock.mockImplementation(async (input: unknown) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse({ message: 'Invalid refresh token' }, 401);
      }

      protectedCalls += 1;
      return jsonResponse({ message: 'Unauthorized' }, 401);
    });

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      status: 401,
    });

    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(1);
    expect(apiContext.getToken()).toBeNull();
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
  });

  it('does not retry indefinitely when the refreshed token is rejected', async () => {
    apiContext.setToken('expired-token');

    let refreshCalls = 0;
    let protectedCalls = 0;

    fetchMock.mockImplementation(async (input: unknown) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return refreshedToken();
      }

      protectedCalls += 1;
      return jsonResponse({ message: 'Unauthorized' }, 401);
    });

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      status: 401,
    });

    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
  });
});
