import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

vi.mock('argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));

describe('AuthService', () => {
  const prisma = { user: { create: vi.fn(), findUnique: vi.fn() } };
  const jwt = { signAsync: vi.fn() };
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  it('normalizes registration email, hashes the password, and returns only selected public fields', async () => {
    vi.mocked(argon2.hash).mockResolvedValue('argon-hash');
    const publicUser = {
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      createdAt: new Date('2025-01-01'),
    };
    prisma.user.create.mockResolvedValue(publicUser);
    const result = await service.register({
      email: ' Person@Example.com ',
      password: 'password-secret',
      name: ' Person ',
    });
    expect(argon2.hash).toHaveBeenCalledWith('password-secret');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'person@example.com',
        name: 'Person',
        passwordHash: 'argon-hash',
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    expect(result).toEqual(publicUser);
    expect(JSON.stringify(result)).not.toContain('argon-hash');
    expect(JSON.stringify(result)).not.toContain('password-secret');
  });

  it('maps duplicate registration to conflict and propagates other database errors', async () => {
    vi.mocked(argon2.hash).mockResolvedValue('hash');
    prisma.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.register({
        email: 'a@b.com',
        password: 'long enough password',
        name: 'A',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const failure = new Error('database unavailable');
    prisma.user.create.mockRejectedValue(failure);
    await expect(
      service.register({
        email: 'a@b.com',
        password: 'long enough password',
        name: 'A',
      }),
    ).rejects.toBe(failure);
  });

  it('normalizes login email, verifies the hash, and returns bearer token metadata', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      passwordHash: 'stored-hash',
    });
    vi.mocked(argon2.verify).mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue('signed-token');
    await expect(
      service.login({ email: ' PERSON@example.com ', password: 'correct' }),
    ).resolves.toEqual({
      access_token: 'signed-token',
      token_type: 'Bearer',
      expires_in: 900,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'person@example.com' },
      select: { id: true, email: true, passwordHash: true },
    });
    expect(argon2.verify).toHaveBeenCalledWith('stored-hash', 'correct');
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'person@example.com',
    });
  });

  it('uses the same generic unauthorized error for unknown users and wrong passwords', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'missing@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(argon2.verify).not.toHaveBeenCalled();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      passwordHash: 'hash',
    });
    vi.mocked(argon2.verify).mockResolvedValue(false);
    await expect(
      service.login({ email: 'person@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
