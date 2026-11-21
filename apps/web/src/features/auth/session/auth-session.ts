import type { QueryClient } from '@tanstack/react-query';

import { refreshAccessToken } from '../../../app/api/api-client';
import { apiContext, onSessionCleared } from '../../../app/api/api-context';
import { queryClient as sharedQueryClient } from '../../../app/providers/query-client';
import { authApi } from '../api/auth-api';
import { authKeys } from '../auth-keys';

export type AuthSessionStatus =
  | 'idle'
  | 'restoring'
  | 'authenticated'
  | 'unauthenticated';

export interface AuthSession {
  readonly status: AuthSessionStatus;
  isAuthenticated(): boolean;
  restore(): Promise<boolean>;
  startSession(accessToken: string): Promise<void>;
  clear(): void;
  dispose(): void;
}

export function createAuthSession(client: QueryClient): AuthSession {
  let status: AuthSessionStatus = 'idle';
  let restorePromise: Promise<boolean> | null = null;

  function clear(): void {
    apiContext.clearState();
    client.clear();
    status = 'unauthenticated';
  }

  const dispose = onSessionCleared(clear);

  function loadCurrentUser() {
    return client.ensureQueryData({
      queryKey: authKeys.currentUser,
      queryFn: authApi.getCurrentUser,
      retry: false,
      staleTime: Infinity,
    });
  }

  async function restore(): Promise<boolean> {
    if (status === 'authenticated' && apiContext.getToken()) {
      return true;
    }

    if (status === 'unauthenticated') {
      return false;
    }

    if (restorePromise) {
      return restorePromise;
    }

    status = 'restoring';

    restorePromise = (async () => {
      try {
        if (!apiContext.getToken()) {
          await refreshAccessToken();
        }

        await loadCurrentUser();
        status = 'authenticated';
        return true;
      } catch {
        clear();
        return false;
      }
    })().finally(() => {
      restorePromise = null;
    });

    return restorePromise;
  }

  async function startSession(accessToken: string): Promise<void> {
    clear();
    apiContext.setToken(accessToken);

    try {
      await loadCurrentUser();
      status = 'authenticated';
    } catch (error) {
      clear();
      throw error;
    }
  }

  return {
    get status() {
      return status;
    },
    isAuthenticated() {
      return status === 'authenticated' && apiContext.getToken() !== null;
    },
    restore,
    startSession,
    clear,
    dispose,
  };
}

export const authSession = createAuthSession(sharedQueryClient);
