import { authApi } from '../api/auth-api';
import { authSession } from '../session/auth-session';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../types/auth.types';
import { normalizeEmail } from '../validation';

export async function loginWithSession(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const response = await authApi.login({
    email: normalizeEmail(payload.email),
    password: payload.password,
  });

  await authSession.startSession(response.access_token);
  return response;
}

export async function logoutSession(): Promise<void> {
  try {
    await authApi.logout();
  } finally {
    authSession.clear();
  }
}

export async function registerWithSession(
  payload: RegisterRequest,
): Promise<LoginResponse> {
  const registrationPayload: RegisterRequest = {
    name: payload.name.trim(),
    email: normalizeEmail(payload.email),
    password: payload.password,
  };

  await authApi.register(registrationPayload);

  const response = await authApi.login({
    email: registrationPayload.email,
    password: registrationPayload.password,
  });

  await authSession.startSession(response.access_token);
  return response;
}
