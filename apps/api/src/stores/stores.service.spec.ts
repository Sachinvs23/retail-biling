import { ConflictException, ForbiddenException } from '@nestjs/common';
import { BusinessAccessService } from '../common/business-access.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { StoresService } from './stores.service.js';

describe('StoresService', () => {
  const prisma = { store: { create: vi.fn() } };
  const access = { getActiveMembership: vi.fn() };
  let service: StoresService;

  const createdAt = new Date('2026-11-21T10:00:00.000Z');

  const dto: CreateStoreDto = {
    storeName: '  Tambaram Branch  ',
    storeCode: '  TAMBARAM  ',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    service = new StoresService(
      prisma as unknown as PrismaService,
      access as unknown as BusinessAccessService,
    );
    access.getActiveMembership.mockResolvedValue({
      tenantId: 'tenant-1',
      role: 'OWNER',
    });
    prisma.store.create.mockResolvedValue({
      id: 'store-1',
      name: 'Tambaram Branch',
      code: 'TAMBARAM',
      createdAt,
    });
  });

  it('creates a store with the validated tenant ID and trimmed values', async () => {
    await expect(service.create('user-1', 'business-1', dto)).resolves.toEqual({
      id: 'store-1',
      name: 'Tambaram Branch',
      code: 'TAMBARAM',
      createdAt,
    });

    expect(access.getActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'business-1',
    );
    expect(prisma.store.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Tambaram Branch',
        code: 'TAMBARAM',
      },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
      },
    });
  });

  it('normalizes a blank store code to null', async () => {
    await service.create('user-1', 'business-1', {
      storeName: 'Tambaram Branch',
      storeCode: '   ',
    });

    expect(prisma.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          tenantId: 'tenant-1',
          name: 'Tambaram Branch',
          code: null,
        },
      }),
    );
  });

  it.each(['OWNER', 'ADMIN'] as const)('allows %s roles', async (role) => {
    access.getActiveMembership.mockResolvedValue({
      tenantId: 'tenant-1',
      role,
    });

    await expect(
      service.create('user-1', 'business-1', dto),
    ).resolves.toHaveProperty('id', 'store-1');
    expect(prisma.store.create).toHaveBeenCalledTimes(1);
  });

  it.each(['MANAGER', 'CASHIER'] as const)('forbids %s roles', async (role) => {
    access.getActiveMembership.mockResolvedValue({
      tenantId: 'tenant-1',
      role,
    });

    await expect(
      service.create('user-1', 'business-1', dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.store.create).not.toHaveBeenCalled();
  });

  it('maps duplicate store codes to a conflict', async () => {
    prisma.store.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );

    await expect(
      service.create('user-1', 'business-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propagates unrelated database errors', async () => {
    const failure = new Error('database unavailable');
    prisma.store.create.mockRejectedValue(failure);

    await expect(service.create('user-1', 'business-1', dto)).rejects.toBe(
      failure,
    );
  });
});
