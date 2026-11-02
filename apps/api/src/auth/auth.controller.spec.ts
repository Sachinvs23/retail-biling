import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

describe('AuthController', () => {
  const authService = {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };
  let controller: AuthController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('forwards registration and login DTOs and sets the refresh-token cookie', async () => {
    const register: RegisterDto = {
      email: 'a@b.com',
      password: 'long enough password',
      name: 'A',
    };

    const login: LoginDto = {
      email: 'a@b.com',
      password: 'pass',
    };

    const refreshToken = 'test-refresh-token';

    authService.login.mockResolvedValue({
      access_token: 'signed-token',
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    });

    const response = {
      cookie: vi.fn(),
    };

    await controller.register(register);

    const result = await controller.login(login, response as never);

    expect(authService.register).toHaveBeenCalledWith(register);
    expect(authService.login).toHaveBeenCalledWith(login);

    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      refreshToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    expect(result).toEqual({
      access_token: 'signed-token',
      token_type: 'Bearer',
      expires_in: 900,
    });

    // Refresh token must not appear in the JSON response.
    expect(result).not.toHaveProperty('refresh_token');
  });

  it('rotates the refresh cookie and returns only the access token', async () => {
    authService.refresh.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const request = {
      cookies: {
        refresh_token: 'old-refresh-token',
      },
    };

    const response = {
      cookie: vi.fn(),
    };

    const result = await controller.refresh(
      request as never,
      response as never,
    );

    expect(authService.refresh).toHaveBeenCalledWith('old-refresh-token');

    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    expect(result).toEqual({
      access_token: 'new-access-token',
      token_type: 'Bearer',
      expires_in: 900,
    });

    expect(result).not.toHaveProperty('refresh_token');
  });

  it('rejects refresh when the cookie is missing', async () => {
    const request = { cookies: {} };
    const response = { cookie: vi.fn() };

    await expect(
      controller.refresh(request as never, response as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authService.refresh).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('propagates unauthorized errors from the refresh service', async () => {
    authService.refresh.mockRejectedValue(
      new UnauthorizedException('Invalid refresh token'),
    );

    const request = {
      cookies: {
        refresh_token: 'invalid-refresh-token',
      },
    };

    const response = { cookie: vi.fn() };

    await expect(
      controller.refresh(request as never, response as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('returns only public identity on the guarded current-user route', () => {
    expect(
      controller.getMe({ user: { userId: 'user-1', email: 'a@b.com' } }),
    ).toEqual({ id: 'user-1', email: 'a@b.com' });
    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'getMe',
    )?.value as object;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      AuthGuard('jwt'),
    ]);
  });

  it('revokes the session and clears the refresh-token cookie on logout', async () => {
    const request = {
      cookies: {
        refresh_token: 'test-refresh-token',
      },
    };

    const response = {
      clearCookie: vi.fn(),
    };

    authService.logout.mockResolvedValue(undefined);

    const result = await controller.logout(request as never, response as never);

    expect(authService.logout).toHaveBeenCalledWith('test-refresh-token');

    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });

    expect(result).toEqual({
      message: 'Logged out successfully',
    });
  });

  it('clears the refresh-token cookie when logging out without a cookie', async () => {
    const request = {
      cookies: {},
    };

    const response = {
      clearCookie: vi.fn(),
    };

    authService.logout.mockResolvedValue(undefined);

    const result = await controller.logout(request as never, response as never);

    expect(authService.logout).toHaveBeenCalledWith(undefined);

    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });

    expect(result).toEqual({
      message: 'Logged out successfully',
    });
  });
});
