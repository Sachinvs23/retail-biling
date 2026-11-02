import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

vi.mock('argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));

describe('AuthService', () => {
  const prisma = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const jwt = { signAsync: vi.fn() };
  let service: AuthService;

  const tx = {
    refreshToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  };
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  it('normalizes login email, verifies the hash, and creates access and refresh tokens', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      passwordHash: 'stored-hash',
    });

    vi.mocked(argon2.verify).mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue('signed-token');

    prisma.refreshToken.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: 'refresh-1',
    }));

    const result = await service.login({
      email: ' PERSON@example.com ',
      password: 'correct',
    });

    expect(result).toMatchObject({
      access_token: 'signed-token',
      refresh_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
    });

    expect(result.refresh_token).toEqual(expect.any(String));

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'person@example.com' },
      select: { id: true, email: true, passwordHash: true },
    });

    expect(argon2.verify).toHaveBeenCalledWith('stored-hash', 'correct');

    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'person@example.com',
    });

    const storedToken = prisma.refreshToken.create.mock.calls[0][0];

    expect(storedToken.data.userId).toBe('user-1');
    expect(storedToken.data.familyId).toEqual(expect.any(String));
    expect(storedToken.data.tokenHash).toBe(
      createHash('sha256').update(result.refresh_token).digest('hex'),
    );
    expect(storedToken.data.expiresAt).toBeInstanceOf(Date);

    // The raw refresh token must never be stored.
    expect(storedToken.data.tokenHash).not.toBe(result.refresh_token);
  });

  it('rotates a valid refresh token and creates a new token in the same family', async () => {
    const oldRefreshToken = 'old-refresh-token';
    const oldTokenHash = createHash('sha256')
      .update(oldRefreshToken)
      .digest('hex');

    tx.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      familyId: 'family-1',
      tokenHash: oldTokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
      user: {
        email: 'person@example.com',
      },
    });

    tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    tx.refreshToken.create.mockResolvedValue({ id: 'refresh-2' });
    jwt.signAsync.mockResolvedValue('new-access-token');

    const result = await service.refresh(oldRefreshToken);

    expect(result).toMatchObject({
      access_token: 'new-access-token',
      refresh_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
    });

    expect(tx.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: oldTokenHash },
      include: {
        user: { select: { email: true } },
      },
    });

    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'refresh-1',
        usedAt: null,
        revokedAt: null,
        expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
      },
      data: {
        usedAt: expect.any(Date),
      },
    });

    const newToken = tx.refreshToken.create.mock.calls[0][0];

    expect(newToken.data.userId).toBe('user-1');
    expect(newToken.data.familyId).toBe('family-1');

    expect(newToken.data.tokenHash).toBe(
      createHash('sha256').update(result.refresh_token).digest('hex'),
    );

    expect(newToken.data.tokenHash).not.toBe(result.refresh_token);

    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'person@example.com',
    });
  });
  it('rejects an unknown refresh token', async () => {
    tx.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refresh('unknown-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects an expired refresh token', async () => {
    tx.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
      revokedAt: null,
      user: { email: 'person@example.com' },
    });

    await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects a revoked refresh token', async () => {
    tx.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: new Date(),
      user: { email: 'person@example.com' },
    });

    await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('revokes all active refresh tokens belonging to the session family', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      familyId: 'family-1',
    });

    prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await service.logout('valid-refresh-token');

    const expectedHash = createHash('sha256')
      .update('valid-refresh-token')
      .digest('hex');

    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expectedHash },
      select: { familyId: true },
    });

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('does nothing when logging out with an unknown refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.logout('unknown-token')).resolves.toBeUndefined();

    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('does nothing when the refresh token is missing', async () => {
    await expect(service.logout()).resolves.toBeUndefined();

    expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('revokes the entire token family when an already-used refresh token is reused', async () => {
    tx.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(Date.now() - 30_000),
      revokedAt: null,
      user: { email: 'person@example.com' },
    });

    tx.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.refresh('reused-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });

    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects a concurrent refresh attempt when the token was already claimed', async () => {
    tx.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
      user: { email: 'person@example.com' },
    });

    // Simulate another request consuming the token first.
    tx.refreshToken.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 2 });

    await expect(service.refresh('concurrent-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(tx.refreshToken.updateMany).toHaveBeenCalledTimes(2);

    expect(tx.refreshToken.updateMany).toHaveBeenLastCalledWith({
      where: {
        familyId: 'family-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });

    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
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
