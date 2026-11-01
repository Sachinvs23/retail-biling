import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BusinessAccessService } from './business-access.service.js';

describe('BusinessAccessService', () => {
  const prisma = { membership: { findUnique: vi.fn() } };
  let service: BusinessAccessService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new BusinessAccessService(prisma as unknown as PrismaService);
  });

  it.each(['', '   '])(
    'rejects blank business IDs (%j) without querying',
    async (businessId) => {
      await expect(
        service.getActiveMembership('user-1', businessId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.membership.findUnique).not.toHaveBeenCalled();
    },
  );

  it('queries membership by authenticated user and requested business', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      role: 'MANAGER',
      tenant: { status: 'ACTIVE' },
    });
    await expect(
      service.getActiveMembership('user-1', 'tenant-1'),
    ).resolves.toEqual({ tenantId: 'tenant-1', role: 'MANAGER' });
    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: { userId_tenantId: { userId: 'user-1', tenantId: 'tenant-1' } },
      select: {
        tenantId: true,
        role: true,
        tenant: { select: { status: true } },
      },
    });
  });

  it('rejects non-members and suspended businesses', async () => {
    prisma.membership.findUnique.mockResolvedValue(null);
    await expect(
      service.getActiveMembership('user-1', 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    prisma.membership.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      role: 'OWNER',
      tenant: { status: 'SUSPENDED' },
    });
    await expect(
      service.getActiveMembership('user-1', 'tenant-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates database errors', async () => {
    const failure = new Error('database unavailable');
    prisma.membership.findUnique.mockRejectedValue(failure);
    await expect(
      service.getActiveMembership('user-1', 'tenant-1'),
    ).rejects.toBe(failure);
  });
});
