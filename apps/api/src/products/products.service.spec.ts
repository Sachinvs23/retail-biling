import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  const prisma = {
    product: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const access = { getActiveMembership: vi.fn() };
  let service: ProductsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ProductsService(
      prisma as unknown as PrismaService,
      access as unknown as BusinessAccessService,
    );
    access.getActiveMembership.mockResolvedValue({
      tenantId: 'tenant-1',
      role: 'OWNER',
    });
  });

  it('creates a tenant-scoped product with decimal strings and defaults', async () => {
    const dto: CreateProductDto = {
      name: ' Tea ',
      sellingPrice: '12.35',
      purchasePrice: '8.10',
      gstRate: '5.00',
    };
    const product = {
      id: 'product-1',
      name: 'Tea',
      sellingPrice: new Prisma.Decimal('12.35'),
      purchasePrice: new Prisma.Decimal('8.10'),
      gstRate: new Prisma.Decimal('5.00'),
    };
    prisma.product.create.mockResolvedValue(product);
    await expect(service.create('user-1', 'business-1', dto)).resolves.toBe(
      product,
    );
    expect(access.getActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'business-1',
    );
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          tenantId: 'tenant-1',
          name: 'Tea',
          sku: null,
          barcode: null,
          description: null,
          unit: 'piece',
          purchasePrice: '8.10',
          sellingPrice: '12.35',
          gstRate: '5.00',
          hsnCode: null,
        },
      }),
    );
    const args = prisma.product.create.mock.calls[0]?.[0];
    expect(args?.select).not.toHaveProperty('tenantId');
  });

  it('maps duplicate SKU or barcode and propagates other create failures', async () => {
    prisma.product.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );
    await expect(
      service.create('user-1', 'business-1', {
        name: 'Tea',
        sellingPrice: '1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const failure = new Error('write failed');
    prisma.product.create.mockRejectedValue(failure);
    await expect(
      service.create('user-1', 'business-1', {
        name: 'Tea',
        sellingPrice: '1',
      }),
    ).rejects.toBe(failure);
  });

  it('lists within the active tenant with default pagination and trimmed search', async () => {
    const items = [{ id: 'product-1', name: 'Tea' }];
    prisma.product.findMany.mockResolvedValue(items);
    prisma.product.count.mockResolvedValue(1);
    prisma.$transaction.mockImplementation(
      async (operations: readonly Promise<unknown>[]) =>
        Promise.all(operations),
    );
    const result = await service.list('user-1', 'business-1', {
      search: ' Tea ',
    } as ListProductsDto);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          OR: [
            { name: { contains: 'Tea', mode: 'insensitive' } },
            { sku: { contains: 'Tea', mode: 'insensitive' } },
            { barcode: { contains: 'Tea', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' },
      }),
    );
    expect(result).toEqual({
      items,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('lists empty results and calculates zero pages', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(
      async (operations: readonly Promise<unknown>[]) =>
        Promise.all(operations),
    );
    await expect(
      service.list('user-1', 'business-1', {
        page: 2,
        limit: 10,
      } as ListProductsDto),
    ).resolves.toEqual({
      items: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1' },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('retrieves only a product in the validated tenant and returns not found across tenants', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(
      service.findOne('user-1', 'business-1', 'foreign-product'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-product', tenantId: 'tenant-1' },
      }),
    );
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      name: 'Tea',
    });
    await expect(
      service.findOne('user-1', 'business-1', 'product-1'),
    ).resolves.toEqual({ id: 'product-1', name: 'Tea' });
  });

  it('updates only a tenant-owned product and keeps omitted fields out of update data', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
    const updated = { id: 'product-1', name: 'Tea' };
    prisma.product.update.mockResolvedValue(updated);
    await expect(
      service.update('user-1', 'business-1', 'product-1', { name: ' Tea ' }),
    ).resolves.toBe(updated);
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        data: { name: 'Tea' },
      }),
    );
  });

  it('does not update foreign or missing products', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(
      service.update('user-1', 'business-1', 'foreign-product', {
        name: 'Changed',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('maps duplicate values during update to conflict', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
    prisma.product.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );
    await expect(
      service.update('user-1', 'business-1', 'product-1', { sku: 'taken' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
