import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ApiError } from '../../../app/api/api-error';

const { loginMock, registerMock, logoutMock, startSessionMock, clearMock } =
  vi.hoisted(() => ({
    loginMock: vi.fn(),
    registerMock: vi.fn(),
    logoutMock: vi.fn(),
    startSessionMock: vi.fn(),
    clearMock: vi.fn(),
  }));

vi.mock('../api/auth-api', () => ({
  authApi: {
    login: loginMock,
    register: registerMock,
    logout: logoutMock,
  },
}));

vi.mock('../session/auth-session', () => ({
  authSession: {
    startSession: startSessionMock,
    clear: clearMock,
  },
}));

import {
  loginWithSession,
  logoutSession,
  registerWithSession,
} from './auth-flows';

const loginResponse = {
  access_token: 'access-token',
  token_type: 'Bearer' as const,
  expires_in: 900,
};

const registeredUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('authentication flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('logs in with normalized credentials and starts a session', async () => {
    loginMock.mockResolvedValue(loginResponse);

    const result = await loginWithSession({
      email: '  User@Example.COM ',
      password: 'password',
    });

    expect(loginMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    });
    expect(startSessionMock).toHaveBeenCalledWith('access-token');
    expect(result).toEqual(loginResponse);
  });

  it('does not start a session when login is rejected', async () => {
    const error = new ApiError(401, 'Invalid email or password');
    loginMock.mockRejectedValue(error);

    await expect(
      loginWithSession({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toBe(error);
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('registers and then automatically logs in', async () => {
    registerMock.mockResolvedValue(registeredUser);
    loginMock.mockResolvedValue(loginResponse);

    const result = await registerWithSession({
      name: '  Test User  ',
      email: ' User@Example.com ',
      password: 'long-password',
    });

    expect(registerMock).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'user@example.com',
      password: 'long-password',
    });
    expect(loginMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'long-password',
    });
    expect(startSessionMock).toHaveBeenCalledWith('access-token');
    expect(result).toEqual(loginResponse);
  });

  it('does not attempt login when registration reports a duplicate email', async () => {
    const error = new ApiError(
      409,
      'An account with this email already exists',
    );
    registerMock.mockRejectedValue(error);

    await expect(
      registerWithSession({
        name: 'Test User',
        email: 'user@example.com',
        password: 'long-password',
      }),
    ).rejects.toBe(error);
    expect(loginMock).not.toHaveBeenCalled();
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('logs out and clears the local session', async () => {
    logoutMock.mockResolvedValue({ message: 'Logged out successfully' });

    await logoutSession();

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledTimes(1);
  });

  it('clears the local session even when logout fails', async () => {
    const error = new ApiError(0, 'Unable to connect to the server.');
    logoutMock.mockRejectedValue(error);

    await expect(logoutSession()).rejects.toBe(error);
    expect(clearMock).toHaveBeenCalledTimes(1);
  });
});
