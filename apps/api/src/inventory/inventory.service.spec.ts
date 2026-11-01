import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { OpeningStockDto } from './dto/opening-stock.dto.js';
import { ListInventoryDto } from './dto/list-inventory.dto.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryService', () => {
  const membership = { tenantId: 'business-1', role: 'OWNER' as const };
  const prismaMock = {
    store: { findFirst: vi.fn() },
    product: { findFirst: vi.fn() },
    storeInventory: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  const accessMock = { getActiveMembership: vi.fn() };
  const txMock = {
    storeInventory: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    stockMovement: { create: vi.fn() },
  };
  const queriedStatements: Prisma.Sql[] = [];
  const inventoryRows = [
    {
      inventoryId: 'inventory-1',
      productId: 'product-1',
      name: 'Tea',
      sku: 'TEA-1',
      barcode: '123456',
      unit: 'box',
      quantity: new Prisma.Decimal('4.125'),
      reorderLevel: new Prisma.Decimal('5.000'),
      sellingPrice: new Prisma.Decimal('12.50'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    },
  ];
  let service: InventoryService;

  const runTransaction = async <T>(
    callback: (tx: typeof txMock) => Promise<T>,
  ) => callback(txMock);

  const mockInventoryQueries = (rows = inventoryRows, total = rows.length) => {
    prismaMock.$queryRaw.mockImplementation((query: Prisma.Sql) => {
      queriedStatements.push(query);
      return Promise.resolve(
        query.sql.includes('COUNT(*)::int AS "total"') ? [{ total }] : rows,
      );
    });
  };

  const inventoryQuery = (
    values: Partial<ListInventoryDto> = {},
  ): ListInventoryDto => Object.assign(new ListInventoryDto(), values);

  beforeEach(() => {
    vi.resetAllMocks();
    queriedStatements.length = 0;
    service = new InventoryService(
      prismaMock as unknown as PrismaService,
      accessMock as unknown as BusinessAccessService,
    );
    accessMock.getActiveMembership.mockResolvedValue(membership);
    prismaMock.store.findFirst.mockResolvedValue({ id: 'store-1' });
    prismaMock.product.findFirst.mockResolvedValue({ id: 'product-1' });
    prismaMock.$transaction.mockImplementation(runTransaction);
    prismaMock.storeInventory.findFirst.mockResolvedValue({
      id: 'inventory-1',
      tenantId: 'business-1',
      storeId: 'store-1',
      productId: 'product-1',
      quantity: new Prisma.Decimal('4.125'),
      reorderLevel: new Prisma.Decimal('5.000'),
      product: {
        id: 'product-1',
        name: 'Tea',
        sku: 'TEA-1',
        barcode: '123456',
        unit: 'box',
        sellingPrice: new Prisma.Decimal('12.50'),
      },
    });
    mockInventoryQueries();
    txMock.storeInventory.create.mockResolvedValue({
      id: 'inventory-1',
      quantity: new Prisma.Decimal('12.375'),
    });
    txMock.storeInventory.findUnique.mockResolvedValue({
      id: 'inventory-1',
      quantity: new Prisma.Decimal('12.375'),
    });
    txMock.storeInventory.updateMany.mockResolvedValue({ count: 1 });
    txMock.storeInventory.findUniqueOrThrow.mockResolvedValue({
      id: 'inventory-1',
      quantity: new Prisma.Decimal('13.125'),
    });
    txMock.stockMovement.create.mockResolvedValue({ id: 'movement-1' });
  });

  it('initializes opening stock and records its movement with optional values', async () => {
    const dto: OpeningStockDto = {
      quantity: '12.375',
      unitCost: '4.25',
      note: '  Counted  ',
    };
    const result = await service.openingStock(
      'user-1',
      'business-1',
      'store-1',
      'product-1',
      dto,
    );

    expect(result.quantity).toEqual(new Prisma.Decimal('12.375'));
    expect(accessMock.getActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'business-1',
    );
    expect(prismaMock.store.findFirst).toHaveBeenCalledWith({
      where: { id: 'store-1', tenantId: 'business-1' },
      select: { id: true },
    });
    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-1', tenantId: 'business-1' },
      select: { id: true },
    });
    expect(txMock.storeInventory.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'business-1',
        storeId: 'store-1',
        productId: 'product-1',
        quantity: '12.375',
      },
    });
    expect(txMock.stockMovement.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'business-1',
        storeId: 'store-1',
        productId: 'product-1',
        type: 'OPENING',
        quantity: '12.375',
        unitCost: '4.25',
        note: 'Counted',
      },
    });
  });

  it('uses the default opening note and omits absent unit cost', async () => {
    await service.openingStock('user-1', 'business-1', 'store-1', 'product-1', {
      quantity: '2',
    });
    expect(txMock.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'OPENING',
        note: 'Opening stock',
        unitCost: undefined,
      }),
    });
  });

  it.each(['0', '-1'])(
    'rejects non-positive opening quantity %s before database operations',
    async (quantity) => {
      await expect(
        service.openingStock('user-1', 'business-1', 'store-1', 'product-1', {
          quantity,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.store.findFirst).not.toHaveBeenCalled();
    },
  );

  it.each(['store', 'product'])(
    'rejects a %s outside the business',
    async (resource) => {
      if (resource === 'store')
        prismaMock.store.findFirst.mockResolvedValue(null);
      else prismaMock.product.findFirst.mockResolvedValue(null);
      await expect(
        service.openingStock('user-1', 'business-1', 'store-1', 'product-1', {
          quantity: '1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    },
  );

  it('maps duplicate opening stock to a conflict', async () => {
    prismaMock.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );
    await expect(
      service.openingStock('user-1', 'business-1', 'store-1', 'product-1', {
        quantity: '1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propagates transaction failures without attempting work outside the transaction', async () => {
    const failure = new Error('movement write failed');
    txMock.stockMovement.create.mockRejectedValue(failure);
    await expect(
      service.openingStock('user-1', 'business-1', 'store-1', 'product-1', {
        quantity: '1',
      }),
    ).rejects.toBe(failure);
    expect(txMock.storeInventory.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ADJUSTMENT_IN', '2.125', new Prisma.Decimal('2.125')],
    ['ADJUSTMENT_OUT', '2.125', new Prisma.Decimal('-2.125')],
  ] as const)(
    'records %s with a decimal delta and movement metadata',
    async (type, quantity, delta) => {
      const dto: AdjustStockDto = {
        type,
        quantity,
        note: ' Cycle count ',
        referenceId: 'ref-7',
      };
      await service.adjustStock(
        'user-1',
        'business-1',
        'store-1',
        'product-1',
        dto,
      );
      expect(txMock.storeInventory.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'inventory-1',
          ...(type === 'ADJUSTMENT_OUT' ? { quantity: { gte: quantity } } : {}),
        },
        data: { quantity: { increment: delta } },
      });
      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'business-1',
          storeId: 'store-1',
          productId: 'product-1',
          type,
          quantity,
          note: 'Cycle count',
          referenceId: 'ref-7',
        },
      });
    },
  );

  it.each(['0', '-2'])(
    'rejects non-positive adjustment quantity %s',
    async (quantity) => {
      await expect(
        service.adjustStock('user-1', 'business-1', 'store-1', 'product-1', {
          type: 'ADJUSTMENT_IN',
          quantity,
          note: 'n',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.store.findFirst).not.toHaveBeenCalled();
    },
  );

  it.each(['store', 'product'])(
    'rejects adjustments for a %s outside the business',
    async (resource) => {
      if (resource === 'store')
        prismaMock.store.findFirst.mockResolvedValue(null);
      else prismaMock.product.findFirst.mockResolvedValue(null);
      await expect(
        service.adjustStock('user-1', 'business-1', 'store-1', 'product-1', {
          type: 'ADJUSTMENT_IN',
          quantity: '1',
          note: 'count',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects insufficient reductions without recording a movement', async () => {
    txMock.storeInventory.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.adjustStock('user-1', 'business-1', 'store-1', 'product-1', {
        type: 'ADJUSTMENT_OUT',
        quantity: '20',
        note: 'count',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(txMock.stockMovement.create).not.toHaveBeenCalled();
  });

  it('does not perform inventory operations when business access fails', async () => {
    const failure = new NotFoundException('Business not found');
    accessMock.getActiveMembership.mockRejectedValue(failure);
    await expect(
      service.adjustStock('user-1', 'business-1', 'store-1', 'product-1', {
        type: 'ADJUSTMENT_IN',
        quantity: '1',
        note: 'n',
      }),
    ).rejects.toBe(failure);
    expect(prismaMock.store.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('propagates unexpected database errors', async () => {
    const failure = new Error('database unavailable');
    prismaMock.product.findFirst.mockRejectedValue(failure);
    await expect(
      service.adjustStock('user-1', 'business-1', 'store-1', 'product-1', {
        type: 'ADJUSTMENT_IN',
        quantity: '1',
        note: 'n',
      }),
    ).rejects.toBe(failure);
  });

  describe('listStoreInventory', () => {
    it('returns inventory rows with pagination metadata and scoped database pagination', async () => {
      mockInventoryQueries(inventoryRows, 11);
      const query: ListInventoryDto = { page: 2, limit: 5 };

      await expect(
        service.listStoreInventory('user-1', 'business-1', 'store-1', query),
      ).resolves.toEqual({
        items: inventoryRows,
        pagination: { page: 2, limit: 5, total: 11, totalPages: 3 },
      });

      expect(accessMock.getActiveMembership).toHaveBeenCalledWith(
        'user-1',
        'business-1',
      );
      expect(prismaMock.store.findFirst).toHaveBeenCalledWith({
        where: { id: 'store-1', tenantId: 'business-1' },
        select: { id: true },
      });
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
      expect(queriedStatements).toHaveLength(2);
      for (const statement of queriedStatements) {
        expect(statement.values).toEqual(
          expect.arrayContaining(['business-1', 'store-1']),
        );
      }
      const rowsQuery = queriedStatements.find(
        (statement) => !statement.sql.includes('COUNT(*)::int AS "total"'),
      );
      expect(rowsQuery?.sql).toContain('LIMIT ?');
      expect(rowsQuery?.sql).toContain('OFFSET ?');
      expect(rowsQuery?.values).toEqual(['business-1', 'store-1', 5, 5]);
    });

    it('uses default page and limit values', async () => {
      await expect(
        service.listStoreInventory(
          'user-1',
          'business-1',
          'store-1',
          new ListInventoryDto(),
        ),
      ).resolves.toMatchObject({
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      const rowsQuery = queriedStatements.find(
        (statement) => !statement.sql.includes('COUNT(*)::int AS "total"'),
      );
      expect(rowsQuery?.values).toEqual(['business-1', 'store-1', 20, 0]);
    });

    it('searches product name, SKU, and barcode using the trimmed term', async () => {
      await service.listStoreInventory(
        'user-1',
        'business-1',
        'store-1',
        inventoryQuery({ search: '  tea  ' }),
      );

      for (const statement of queriedStatements) {
        expect(statement.sql).toContain('p."name" ILIKE ?');
        expect(statement.sql).toContain('p."sku" ILIKE ?');
        expect(statement.sql).toContain('p."barcode" ILIKE ?');
        expect(statement.values).toEqual(
          expect.arrayContaining(['%tea%', 'business-1', 'store-1']),
        );
      }
    });

    it('filters low stock to rows with a reorder level at or above quantity', async () => {
      await service.listStoreInventory(
        'user-1',
        'business-1',
        'store-1',
        inventoryQuery({ lowStock: 'true' }),
      );

      for (const statement of queriedStatements) {
        expect(statement.sql).toContain('si."reorderLevel" IS NOT NULL');
        expect(statement.sql).toContain('si."quantity" <= si."reorderLevel"');
      }
    });

    it('excludes items without reorder levels when lowStock is false', async () => {
      await service.listStoreInventory(
        'user-1',
        'business-1',
        'store-1',
        inventoryQuery({ lowStock: 'false' }),
      );

      for (const statement of queriedStatements) {
        expect(statement.sql).toContain('si."reorderLevel" IS NULL');
        expect(statement.sql).toContain('si."quantity" > si."reorderLevel"');
      }
    });

    it('does not add a low-stock predicate when lowStock is omitted', async () => {
      await service.listStoreInventory(
        'user-1',
        'business-1',
        'store-1',
        inventoryQuery(),
      );

      for (const statement of queriedStatements) {
        expect(statement.sql).not.toContain('si."reorderLevel" IS NULL');
        expect(statement.sql).not.toContain('si."reorderLevel" IS NOT NULL');
      }
    });

    it('returns empty results with zero total pages', async () => {
      mockInventoryQueries([], 0);
      await expect(
        service.listStoreInventory(
          'user-1',
          'business-1',
          'store-1',
          inventoryQuery(),
        ),
      ).resolves.toEqual({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    it('returns not found for a store outside the active tenant', async () => {
      prismaMock.store.findFirst.mockResolvedValue(null);
      await expect(
        service.listStoreInventory(
          'user-1',
          'business-1',
          'store-1',
          inventoryQuery(),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it('does not query inventory if business access validation fails', async () => {
      const failure = new NotFoundException('Business not found');
      accessMock.getActiveMembership.mockRejectedValue(failure);
      await expect(
        service.listStoreInventory(
          'user-1',
          'business-1',
          'store-1',
          inventoryQuery(),
        ),
      ).rejects.toBe(failure);
      expect(prismaMock.store.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it('propagates raw-query errors', async () => {
      const failure = new Error('query failed');
      prismaMock.$queryRaw.mockRejectedValue(failure);
      await expect(
        service.listStoreInventory(
          'user-1',
          'business-1',
          'store-1',
          inventoryQuery(),
        ),
      ).rejects.toBe(failure);
    });
  });

  describe('getStoreProductInventory', () => {
    it('returns stock with the selected product details', async () => {
      const inventory = {
        id: 'inventory-1',
        tenantId: 'business-1',
        storeId: 'store-1',
        productId: 'product-1',
        quantity: new Prisma.Decimal('4.125'),
        reorderLevel: new Prisma.Decimal('5.000'),
        product: {
          id: 'product-1',
          name: 'Tea',
          sku: 'TEA-1',
          barcode: '123456',
          unit: 'box',
          sellingPrice: new Prisma.Decimal('12.50'),
        },
      };
      prismaMock.storeInventory.findFirst.mockResolvedValue(inventory);

      await expect(
        service.getStoreProductInventory(
          'user-1',
          'business-1',
          'store-1',
          'product-1',
        ),
      ).resolves.toBe(inventory);
      expect(prismaMock.storeInventory.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'business-1',
          storeId: 'store-1',
          productId: 'product-1',
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              unit: true,
              sellingPrice: true,
            },
          },
        },
      });
    });

    it('returns not found when the requested store is not in the active tenant', async () => {
      prismaMock.store.findFirst.mockResolvedValue(null);
      await expect(
        service.getStoreProductInventory(
          'user-1',
          'business-1',
          'foreign-store',
          'product-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.storeInventory.findFirst).not.toHaveBeenCalled();
    });

    it('returns not found when inventory is absent', async () => {
      prismaMock.storeInventory.findFirst.mockResolvedValue(null);
      await expect(
        service.getStoreProductInventory(
          'user-1',
          'business-1',
          'store-1',
          'product-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not perform database operations when business access fails', async () => {
      const failure = new NotFoundException('Business not found');
      accessMock.getActiveMembership.mockRejectedValue(failure);
      await expect(
        service.getStoreProductInventory(
          'user-1',
          'business-1',
          'store-1',
          'product-1',
        ),
      ).rejects.toBe(failure);
      expect(prismaMock.store.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.storeInventory.findFirst).not.toHaveBeenCalled();
    });

    it('scopes the inventory query to membership tenant, store, and product', async () => {
      prismaMock.storeInventory.findFirst.mockResolvedValue(null);
      await expect(
        service.getStoreProductInventory(
          'user-1',
          'business-1',
          'store-1',
          'foreign-product',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.storeInventory.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'business-1',
            storeId: 'store-1',
            productId: 'foreign-product',
          },
        }),
      );
    });

    it('propagates inventory lookup database errors', async () => {
      const failure = new Error('inventory lookup failed');
      prismaMock.storeInventory.findFirst.mockRejectedValue(failure);
      await expect(
        service.getStoreProductInventory(
          'user-1',
          'business-1',
          'store-1',
          'product-1',
        ),
      ).rejects.toBe(failure);
    });
  });
});
