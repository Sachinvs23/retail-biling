import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BusinessesService } from './businesses.service.js';

describe('BusinessesService', () => {
  const prisma = { $transaction: vi.fn() };
  const tx = {
    tenant: { create: vi.fn() },
    membership: { create: vi.fn() },
    store: { create: vi.fn() },
  };
  const now = new Date('2025-01-01T00:00:00.000Z');
  let service: BusinessesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new BusinessesService(prisma as unknown as PrismaService);
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    tx.tenant.create.mockResolvedValue({
      id: 'tenant-1',
      name: 'Shop',
      slug: 'shop',
      status: 'ACTIVE',
      createdAt: now,
    });
    tx.membership.create.mockResolvedValue({ id: 'membership-1' });
    tx.store.create.mockResolvedValue({
      id: 'store-1',
      name: 'Main Store',
      code: null,
      createdAt: now,
    });
  });

  it('creates tenant, owner membership, and initial store in one transaction', async () => {
    const result = await service.create('user-1', {
      businessName: ' Shop ',
      slug: ' shop ',
      storeName: ' Main Store ',
      storeCode: '  ',
    });
    expect(tx.tenant.create).toHaveBeenCalledWith({
      data: { name: 'Shop', slug: 'shop' },
    });
    expect(tx.membership.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', tenantId: 'tenant-1', role: 'OWNER' },
    });
    expect(tx.store.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', name: 'Main Store', code: null },
    });
    expect(result).toEqual({
      business: {
        id: 'tenant-1',
        name: 'Shop',
        slug: 'shop',
        status: 'ACTIVE',
        createdAt: now,
      },
      membership: { role: 'OWNER' },
      store: { id: 'store-1', name: 'Main Store', code: null, createdAt: now },
    });
    expect(JSON.stringify(result)).not.toContain('user-1');
  });

  it('preserves a trimmed optional store code', async () => {
    await service.create('user-1', {
      businessName: 'Shop',
      slug: 'shop',
      storeName: 'Main',
      storeCode: ' M1 ',
    });
    expect(tx.store.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', name: 'Main', code: 'M1' },
    });
  });

  it('maps duplicate unique values to conflict and propagates other transaction failures', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );
    await expect(
      service.create('user-1', {
        businessName: 'Shop',
        slug: 'shop',
        storeName: 'Main',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const failure = new Error('store write failed');
    prisma.$transaction.mockRejectedValue(failure);
    await expect(
      service.create('user-1', {
        businessName: 'Shop',
        slug: 'shop',
        storeName: 'Main',
      }),
    ).rejects.toBe(failure);
  });
});
