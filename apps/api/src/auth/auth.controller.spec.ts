import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

describe('AuthController', () => {
  const authService = { register: vi.fn(), login: vi.fn() };
  let controller: AuthController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('forwards registration and login DTOs', async () => {
    const register: RegisterDto = {
      email: 'a@b.com',
      password: 'long enough password',
      name: 'A',
    };
    const login: LoginDto = { email: 'a@b.com', password: 'pass' };
    await controller.register(register);
    await controller.login(login);
    expect(authService.register).toHaveBeenCalledWith(register);
    expect(authService.login).toHaveBeenCalledWith(login);
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
});
