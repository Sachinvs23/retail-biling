import { useMutation, useQuery } from '@tanstack/react-query';

import { apiContext } from '../../../app/api/api-context';
import { authApi } from '../api/auth-api';
import { authKeys } from '../auth-keys';
import {
  loginWithSession,
  logoutSession,
  registerWithSession,
} from '../services/auth-flows';

export { authKeys } from '../auth-keys';

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: authApi.getCurrentUser,
    enabled: () => apiContext.getToken() !== null,
    retry: false,
    staleTime: Infinity,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: loginWithSession,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: registerWithSession,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: logoutSession,
  });
}
