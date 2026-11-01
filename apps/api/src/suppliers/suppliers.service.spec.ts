import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SuppliersService } from './suppliers.service.js';

describe('SuppliersService', () => {
  const prismaMock = {
    supplier: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const accessMock = {
    getActiveMembership: vi.fn(),
  };

  let service: SuppliersService;

  beforeEach(() => {
    vi.resetAllMocks();

    service = new SuppliersService(
      prismaMock as unknown as PrismaService,
      accessMock as unknown as BusinessAccessService,
    );

    accessMock.getActiveMembership.mockResolvedValue({
      tenantId: 'business-1',
      role: 'OWNER',
    });
  });

  it('creates a supplier under the validated business', async () => {
    prismaMock.supplier.create.mockResolvedValue({
      id: 'supplier-1',
      tenantId: 'business-1',
      name: 'ABC Traders',
      code: 'SUP-001',
    });

    const result = await service.create('user-1', 'business-1', {
      name: ' ABC Traders ',
      code: ' SUP-001 ',
      email: 'SALES@EXAMPLE.COM',
    });

    expect(accessMock.getActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'business-1',
    );

    expect(prismaMock.supplier.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'business-1',
        name: 'ABC Traders',
        code: 'SUP-001',
        contactPerson: null,
        phone: null,
        email: 'sales@example.com',
        address: null,
        gstin: null,
      },
    });

    expect(result.id).toBe('supplier-1');
  });

  it('lists suppliers using tenant-scoped pagination', async () => {
    const items = [{ id: 'supplier-1', name: 'ABC Traders' }];

    prismaMock.supplier.findMany.mockResolvedValue(items);
    prismaMock.supplier.count.mockResolvedValue(1);
    prismaMock.$transaction.mockResolvedValue([items, 1]);

    const result = await service.list('user-1', 'business-1', {
      page: 1,
      limit: 20,
      search: 'ABC',
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      items,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('does not return a supplier belonging to another business', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('user-1', 'business-1', 'supplier-other'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.supplier.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'supplier-other',
        tenantId: 'business-1',
      },
    });
  });

  it('maps duplicate supplier codes to a conflict', async () => {
    prismaMock.supplier.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );

    await expect(
      service.create('user-1', 'business-1', {
        name: 'ABC Traders',
        code: 'SUP-001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not access supplier data if business access fails', async () => {
    const failure = new NotFoundException('Business not found');

    accessMock.getActiveMembership.mockRejectedValue(failure);

    await expect(
      service.list('user-1', 'business-1', {
        page: 1,
        limit: 20,
      }),
    ).rejects.toBe(failure);

    expect(prismaMock.supplier.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
