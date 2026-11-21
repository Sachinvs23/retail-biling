import { apiClient } from '../../../app/api/api-client';
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RegisterRequest,
  RegisteredUser,
} from '../types/auth.types';

export const authApi = {
  login: (payload: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', payload, {
      auth: false,
      business: false,
    }),

  register: (payload: RegisterRequest) =>
    apiClient.post<RegisteredUser>('/auth/register', payload, {
      auth: false,
      business: false,
    }),

  getCurrentUser: () =>
    apiClient.get<AuthUser>('/auth/me', {
      business: false,
    }),

  refresh: () =>
    apiClient.post<LoginResponse>('/auth/refresh', undefined, {
      auth: false,
      business: false,
    }),

  logout: () =>
    apiClient.post<LogoutResponse>('/auth/logout', undefined, {
      auth: false,
      business: false,
    }),
};
