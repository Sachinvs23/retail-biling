import { QueryClient } from '@tanstack/react-query';
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
import { authKeys } from '../auth-keys';

const { refreshMock, getCurrentUserMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
}));

vi.mock('../../../app/api/api-client', () => ({
  refreshAccessToken: refreshMock,
}));

vi.mock('../api/auth-api', () => ({
  authApi: {
    getCurrentUser: getCurrentUserMock,
  },
}));

import { createAuthSession } from './auth-session';

const user = { id: 'user-1', email: 'user@example.com' };
const previousUser = { id: 'user-0', email: 'previous@example.com' };

const sessions: Array<ReturnType<typeof createAuthSession>> = [];

function createTestSession() {
  const client = new QueryClient();
  const session = createAuthSession(client);
  sessions.push(session);
  return { client, session };
}

describe('auth session', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiContext.clearState();
  });

  afterEach(() => {
    sessions.splice(0).forEach((session) => session.dispose());
    apiContext.clearState();
  });

  it('restores a session by refreshing and loading the current user', async () => {
    refreshMock.mockImplementation(async () => {
      apiContext.setToken('restored-token');
    });
    getCurrentUserMock.mockResolvedValue(user);

    const { client, session } = createTestSession();
    const restored = await session.restore();

    expect(restored).toBe(true);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(authKeys.currentUser)).toEqual(user);
    expect(session.status).toBe('authenticated');
  });

  it('shares one restoration attempt across concurrent callers', async () => {
    refreshMock.mockImplementation(async () => {
      apiContext.setToken('restored-token');
    });
    getCurrentUserMock.mockResolvedValue(user);

    const { session } = createTestSession();
    const results = await Promise.all([session.restore(), session.restore()]);

    expect(results).toEqual([true, true]);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it('clears stale state and cache when refresh fails', async () => {
    const generation = apiContext.getSessionGeneration();

    apiContext.setBusinessId('old-business');
    apiContext.setStoreId('old-store');

    const { client, session } = createTestSession();
    client.setQueryData(authKeys.currentUser, previousUser);
    refreshMock.mockRejectedValue(new ApiError(401, 'Invalid refresh token'));

    const restored = await session.restore();

    expect(restored).toBe(false);
    expect(apiContext.getToken()).toBeNull();
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
    expect(client.getQueryData(authKeys.currentUser)).toBeUndefined();
    expect(apiContext.getSessionGeneration()).toBeGreaterThan(generation);
    expect(session.status).toBe('unauthenticated');
  });

  it('clears previous business context when starting a new session', async () => {
    const generation = apiContext.getSessionGeneration();

    apiContext.setBusinessId('old-business');
    apiContext.setStoreId('old-store');
    getCurrentUserMock.mockResolvedValue(user);

    const { client, session } = createTestSession();
    client.setQueryData(authKeys.currentUser, previousUser);

    await session.startSession('new-token');

    expect(apiContext.getToken()).toBe('new-token');
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
    expect(client.getQueryData(authKeys.currentUser)).toEqual(user);
    expect(apiContext.getSessionGeneration()).toBeGreaterThan(generation);
    expect(session.status).toBe('authenticated');
  });

  it('invalidates the session generation when cleared explicitly', () => {
    const generation = apiContext.getSessionGeneration();
    const { client, session } = createTestSession();

    client.setQueryData(authKeys.currentUser, previousUser);
    session.clear();

    expect(apiContext.getSessionGeneration()).toBeGreaterThan(generation);
    expect(client.getQueryData(authKeys.currentUser)).toBeUndefined();
    expect(session.status).toBe('unauthenticated');
  });
});
