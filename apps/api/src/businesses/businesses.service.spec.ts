import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BusinessesService } from './businesses.service.js';

const expectedTenantSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  stores: {
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
};

describe('BusinessesService', () => {
  const prisma = {
    $transaction: vi.fn(),
    membership: { findMany: vi.fn() },
    tenant: { findUnique: vi.fn() },
    store: { create: vi.fn() },
  };
  const tx = {
    tenant: { create: vi.fn() },
    membership: { create: vi.fn() },
    store: { create: vi.fn() },
  };
  const businessAccess = { getActiveMembership: vi.fn() };
  const now = new Date('2025-01-01T00:00:00.000Z');
  let service: BusinessesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new BusinessesService(
      prisma as unknown as PrismaService,
      businessAccess as unknown as BusinessAccessService,
    );
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

  it('lists only active tenant memberships with consistent response shapes', async () => {
    prisma.membership.findMany.mockResolvedValue([
      {
        role: 'OWNER',
        tenant: {
          id: 'tenant-1',
          name: 'Shop',
          slug: 'shop',
          status: 'ACTIVE',
          createdAt: now,
          stores: [
            { id: 'store-1', name: 'Main', code: 'MAIN', createdAt: now },
          ],
        },
      },
      {
        role: 'CASHIER',
        tenant: {
          id: 'tenant-2',
          name: 'Second Shop',
          slug: 'second-shop',
          status: 'ACTIVE',
          createdAt: now,
          stores: [],
        },
      },
    ]);

    const result = await service.list('user-1');

    expect(prisma.membership.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        tenant: { status: 'ACTIVE' },
      },
      select: {
        role: true,
        tenant: { select: expectedTenantSelect },
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual({
      businesses: [
        {
          business: {
            id: 'tenant-1',
            name: 'Shop',
            slug: 'shop',
            status: 'ACTIVE',
            createdAt: now,
          },
          membership: { role: 'OWNER' },
          stores: [
            { id: 'store-1', name: 'Main', code: 'MAIN', createdAt: now },
          ],
        },
        {
          business: {
            id: 'tenant-2',
            name: 'Second Shop',
            slug: 'second-shop',
            status: 'ACTIVE',
            createdAt: now,
          },
          membership: { role: 'CASHIER' },
          stores: [],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('user-1');
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('returns validated business context with stores', async () => {
    businessAccess.getActiveMembership.mockResolvedValue({
      tenantId: 'tenant-1',
      role: 'MANAGER',
    });
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      name: 'Shop',
      slug: 'shop',
      status: 'ACTIVE',
      createdAt: now,
      stores: [
        { id: 'store-1', name: 'Main', code: 'MAIN', createdAt: now },
        { id: 'store-2', name: 'Branch', code: null, createdAt: now },
      ],
    });

    const result = await service.getContext('user-1', 'tenant-1');

    expect(businessAccess.getActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'tenant-1',
    );
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      select: expectedTenantSelect,
    });
    expect(result).toEqual({
      business: {
        id: 'tenant-1',
        name: 'Shop',
        slug: 'shop',
        status: 'ACTIVE',
        createdAt: now,
      },
      membership: { role: 'MANAGER' },
      stores: [
        { id: 'store-1', name: 'Main', code: 'MAIN', createdAt: now },
        { id: 'store-2', name: 'Branch', code: null, createdAt: now },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('delegates missing business IDs to the authorization service', async () => {
    const error = new ForbiddenException('X-Business-Id header is required');
    businessAccess.getActiveMembership.mockRejectedValue(error);

    await expect(service.getContext('user-1')).rejects.toBe(error);

    expect(businessAccess.getActiveMembership).toHaveBeenCalledWith(
      'user-1',
      '',
    );
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('rejects context lookup when the validated tenant cannot be loaded', async () => {
    businessAccess.getActiveMembership.mockResolvedValue({
      tenantId: 'tenant-1',
      role: 'OWNER',
    });
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(
      service.getContext('user-1', 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
