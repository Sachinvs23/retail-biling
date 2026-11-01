import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PurchasesService } from './purchases.service.js';

describe('PurchasesService', () => {
  const prismaMock = {
    store: {
      findFirst: vi.fn(),
    },
    supplier: {
      findFirst: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    purchase: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const txMock = {
    stockMovement: {
      create: vi.fn(),
    },
    purchase: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },

    storeInventory: {
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
    purchasePayment: {
      create: vi.fn(),
    },
  };

  const accessMock = {
    getActiveMembership: vi.fn(),
  };

  let service: PurchasesService;

  const validDto = {
    storeId: 'store-1',
    supplierId: 'supplier-1',
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-10-30T00:00:00.000Z',
    priceMode: 'GST_EXCLUSIVE' as const,
    taxType: 'CGST_SGST' as const,
    notes: 'October purchase',
    items: [
      {
        productId: 'product-1',
        quantity: '10',
        unitCost: '100',
        discountAmount: '0',
      },
    ],
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new PurchasesService(
      prismaMock as unknown as PrismaService,
      accessMock as unknown as BusinessAccessService,
    );

    accessMock.getActiveMembership.mockResolvedValue({
      tenantId: 'business-1',
      role: 'OWNER',
    });

    prismaMock.store.findFirst.mockResolvedValue({
      id: 'store-1',
    });

    prismaMock.supplier.findFirst.mockResolvedValue({
      id: 'supplier-1',
    });

    prismaMock.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Rice',
        sku: 'RICE-001',
        hsnCode: '1006',
        gstRate: new Prisma.Decimal('5'),
      },
    ]);

    txMock.purchase.create.mockResolvedValue({
      id: 'purchase-1',
      status: 'DRAFT',
      totalAmount: new Prisma.Decimal('1050'),
    });

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
    );
  });

  it('creates a draft purchase under the validated business', async () => {
    const result = await service.create('user-1', 'business-1', validDto);

    expect(accessMock.getActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'business-1',
    );

    expect(prismaMock.store.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'store-1',
        tenantId: 'business-1',
      },
      select: { id: true },
    });

    expect(prismaMock.supplier.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'supplier-1',
        tenantId: 'business-1',
        isActive: true,
      },
      select: { id: true },
    });

    expect(txMock.purchase.create).toHaveBeenCalledTimes(1);

    const createArgs = txMock.purchase.create.mock.calls[0][0];

    expect(createArgs.data).toMatchObject({
      tenantId: 'business-1',
      storeId: 'store-1',
      supplierId: 'supplier-1',
      invoiceNumber: 'INV-001',
      priceMode: 'GST_EXCLUSIVE',
      taxType: 'CGST_SGST',
      status: 'DRAFT',
    });

    expect(createArgs.data.totalAmount.toString()).toBe('1050');
    expect(createArgs.data.items.create).toHaveLength(1);

    expect(result).toEqual({
      id: 'purchase-1',
      status: 'DRAFT',
      totalAmount: new Prisma.Decimal('1050'),
    });
  });

  it('does not create a purchase when the store is invalid', async () => {
    prismaMock.store.findFirst.mockResolvedValue(null);

    await expect(
      service.create('user-1', 'business-1', validDto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(txMock.purchase.create).not.toHaveBeenCalled();
  });

  it('does not create a purchase when the supplier is invalid', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null);

    await expect(
      service.create('user-1', 'business-1', validDto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(txMock.purchase.create).not.toHaveBeenCalled();
  });

  it('rejects products that do not belong to the business or are inactive', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await expect(
      service.create('user-1', 'business-1', validDto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(txMock.purchase.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate product lines', async () => {
    const dto = {
      ...validDto,
      items: [...validDto.items, ...validDto.items],
    };

    await expect(
      service.create('user-1', 'business-1', dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.store.findFirst).not.toHaveBeenCalled();
    expect(txMock.purchase.create).not.toHaveBeenCalled();
  });

  it('maps duplicate supplier invoice numbers to a conflict', async () => {
    txMock.purchase.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );

    await expect(
      service.create('user-1', 'business-1', validDto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not modify inventory when creating a draft purchase', async () => {
    await service.create('user-1', 'business-1', validDto);

    expect(txMock.storeInventory.create).not.toHaveBeenCalled();
    expect(txMock.storeInventory.update).not.toHaveBeenCalled();
    expect(txMock.stockMovement.create).not.toHaveBeenCalled();
  });

  it('does not access purchase data if business access fails', async () => {
    const failure = new NotFoundException('Business not found');

    accessMock.getActiveMembership.mockRejectedValue(failure);

    await expect(service.create('user-1', 'business-1', validDto)).rejects.toBe(
      failure,
    );

    expect(prismaMock.store.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.supplier.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('receives a purchase and updates inventory atomically', async () => {
    txMock.purchase.findFirst.mockResolvedValue({
      id: 'purchase-1',
      tenantId: 'business-1',
      storeId: 'store-1',
      invoiceNumber: 'INV-001',
      status: 'DRAFT',
      items: [
        {
          productId: 'product-1',
          quantity: new Prisma.Decimal('10'),
          unitCost: new Prisma.Decimal('100'),
        },
      ],
    });

    txMock.purchase.updateMany.mockResolvedValue({ count: 1 });

    txMock.storeInventory.upsert.mockResolvedValue({});
    txMock.stockMovement.create.mockResolvedValue({});

    const receivedPurchase = {
      id: 'purchase-1',
      status: 'RECEIVED',
    };

    prismaMock.purchase.findFirstOrThrow.mockResolvedValue(receivedPurchase);

    const result = await service.receive('user-1', 'business-1', 'purchase-1');

    expect(txMock.purchase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'purchase-1',
          tenantId: 'business-1',
          status: 'DRAFT',
        },
        data: expect.objectContaining({
          status: 'RECEIVED',
          receivedAt: expect.any(Date),
        }),
      }),
    );

    expect(txMock.storeInventory.upsert).toHaveBeenCalledWith({
      where: {
        storeId_productId: {
          storeId: 'store-1',
          productId: 'product-1',
        },
      },
      create: {
        tenantId: 'business-1',
        storeId: 'store-1',
        productId: 'product-1',
        quantity: new Prisma.Decimal('10'),
      },
      update: {
        quantity: {
          increment: new Prisma.Decimal('10'),
        },
      },
    });

    expect(txMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'business-1',
          type: 'PURCHASE',
          referenceId: 'purchase-1',
        }),
      }),
    );

    expect(result).toEqual(receivedPurchase);
  });

  it('rejects receiving a purchase that does not exist', async () => {
    txMock.purchase.findFirst.mockResolvedValue(null);

    await expect(
      service.receive('user-1', 'business-1', 'missing-purchase'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(txMock.storeInventory.upsert).not.toHaveBeenCalled();
    expect(txMock.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects receiving an already received purchase', async () => {
    txMock.purchase.findFirst.mockResolvedValue({
      id: 'purchase-1',
      status: 'RECEIVED',
      items: [],
    });

    await expect(
      service.receive('user-1', 'business-1', 'purchase-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(txMock.storeInventory.upsert).not.toHaveBeenCalled();
  });

  it('does not update inventory if the conditional receipt update fails', async () => {
    txMock.purchase.findFirst.mockResolvedValue({
      id: 'purchase-1',
      storeId: 'store-1',
      invoiceNumber: 'INV-001',
      status: 'DRAFT',
      items: [
        {
          productId: 'product-1',
          quantity: new Prisma.Decimal('10'),
          unitCost: new Prisma.Decimal('100'),
        },
      ],
    });

    txMock.purchase.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.receive('user-1', 'business-1', 'purchase-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(txMock.storeInventory.upsert).not.toHaveBeenCalled();
    expect(txMock.stockMovement.create).not.toHaveBeenCalled();
  });

  describe('recordPayment', () => {
    const paymentDto = {
      amount: '4000',
      method: 'UPI' as const,
      reference: 'UPI-10001',
    };

    beforeEach(() => {
      txMock.$queryRaw.mockResolvedValue([{ id: 'purchase-1' }]);

      txMock.purchase.findFirst.mockResolvedValue({
        id: 'purchase-1',
        status: 'RECEIVED',
        totalAmount: new Prisma.Decimal('10000'),
        payments: [{ amount: new Prisma.Decimal('2000') }],
      });

      txMock.purchasePayment.create.mockResolvedValue({
        id: 'payment-1',
        amount: new Prisma.Decimal('4000'),
        method: 'UPI',
      });
    });

    it('records a partial payment and calculates outstanding balance', async () => {
      const result = await service.recordPayment(
        'user-1',
        'business-1',
        'purchase-1',
        paymentDto,
      );

      expect(result.totalPaid.toString()).toBe('6000');
      expect(result.outstanding.toString()).toBe('4000');
      expect(result.paymentStatus).toBe('PARTIALLY_PAID');

      expect(txMock.purchasePayment.create).toHaveBeenCalledTimes(1);
    });

    it('marks the purchase as paid when the full balance is paid', async () => {
      txMock.purchase.findFirst.mockResolvedValue({
        id: 'purchase-1',
        status: 'RECEIVED',
        totalAmount: new Prisma.Decimal('6000'),
        payments: [{ amount: new Prisma.Decimal('2000') }],
      });

      const result = await service.recordPayment(
        'user-1',
        'business-1',
        'purchase-1',
        {
          ...paymentDto,
          amount: '4000',
        },
      );

      expect(result.outstanding.toString()).toBe('0');
      expect(result.paymentStatus).toBe('PAID');
    });

    it('rejects payments exceeding the outstanding balance', async () => {
      await expect(
        service.recordPayment('user-1', 'business-1', 'purchase-1', {
          ...paymentDto,
          amount: '9000',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(txMock.purchasePayment.create).not.toHaveBeenCalled();
    });

    it('rejects payments against draft purchases', async () => {
      txMock.purchase.findFirst.mockResolvedValue({
        id: 'purchase-1',
        status: 'DRAFT',
        totalAmount: new Prisma.Decimal('10000'),
        payments: [],
      });

      await expect(
        service.recordPayment('user-1', 'business-1', 'purchase-1', paymentDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(txMock.purchasePayment.create).not.toHaveBeenCalled();
    });

    it('rejects payments when the purchase does not exist', async () => {
      txMock.$queryRaw.mockResolvedValue([]);

      await expect(
        service.recordPayment(
          'user-1',
          'business-1',
          'missing-purchase',
          paymentDto,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(txMock.purchasePayment.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const purchaseData = [
      {
        id: 'purchase-1',
        tenantId: 'business-1',
        invoiceNumber: 'INV-001',
        status: 'RECEIVED',
        totalAmount: new Prisma.Decimal('10000'),
        invoiceDate: new Date('2026-10-30T00:00:00.000Z'),
        createdAt: new Date('2026-10-30T00:00:00.000Z'),
        supplier: { id: 'supplier-1', name: 'ABC Traders' },
        store: { id: 'store-1', name: 'Main Store' },
        payments: [{ amount: new Prisma.Decimal('4000') }],
      },
      {
        id: 'purchase-2',
        tenantId: 'business-1',
        invoiceNumber: 'INV-002',
        status: 'DRAFT',
        totalAmount: new Prisma.Decimal('5000'),
        invoiceDate: new Date('2026-10-29T00:00:00.000Z'),
        createdAt: new Date('2026-10-29T00:00:00.000Z'),
        supplier: { id: 'supplier-1', name: 'ABC Traders' },
        store: { id: 'store-1', name: 'Main Store' },
        payments: [],
      },
    ];

    it('returns all purchase statuses by default', async () => {
      prismaMock.purchase.findMany.mockResolvedValue(purchaseData);
      prismaMock.purchase.count.mockResolvedValue(2);

      const result = await service.findAll('user-1', 'business-1', {});

      expect(prismaMock.purchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'business-1' },
          skip: 0,
          take: 20,
        }),
      );

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('filters purchases by status', async () => {
      prismaMock.purchase.findMany.mockResolvedValue([]);
      prismaMock.purchase.count.mockResolvedValue(0);

      await service.findAll('user-1', 'business-1', {
        status: 'RECEIVED',
      });

      expect(prismaMock.purchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'business-1',
            status: 'RECEIVED',
          },
        }),
      );
    });

    it('filters purchases by supplier and search term', async () => {
      prismaMock.purchase.findMany.mockResolvedValue([]);
      prismaMock.purchase.count.mockResolvedValue(0);

      await service.findAll('user-1', 'business-1', {
        supplierId: 'supplier-1',
        search: 'ABC',
      });

      expect(prismaMock.purchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'business-1',
            supplierId: 'supplier-1',
            OR: [
              {
                invoiceNumber: {
                  contains: 'ABC',
                  mode: 'insensitive',
                },
              },
              {
                supplier: {
                  name: {
                    contains: 'ABC',
                    mode: 'insensitive',
                  },
                },
              },
            ],
          },
        }),
      );
    });

    it('filters purchases by invoice date range', async () => {
      prismaMock.purchase.findMany.mockResolvedValue([]);
      prismaMock.purchase.count.mockResolvedValue(0);

      await service.findAll('user-1', 'business-1', {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      });

      expect(prismaMock.purchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'business-1',
            invoiceDate: {
              gte: new Date('2026-10-01'),
              lte: new Date('2026-10-31T23:59:59.999Z'),
            },
          },
        }),
      );
    });

    it('calculates payment balances and statuses', async () => {
      prismaMock.purchase.findMany.mockResolvedValue(purchaseData);
      prismaMock.purchase.count.mockResolvedValue(2);

      const result = await service.findAll('user-1', 'business-1', {});

      expect(result.data[0].totalPaid.toString()).toBe('4000');
      expect(result.data[0].outstanding.toString()).toBe('6000');
      expect(result.data[0].paymentStatus).toBe('PARTIALLY_PAID');

      expect(result.data[1].totalPaid.toString()).toBe('0');
      expect(result.data[1].outstanding.toString()).toBe('5000');
      expect(result.data[1].paymentStatus).toBe('UNPAID');
    });

    it('returns correct pagination metadata', async () => {
      prismaMock.purchase.findMany.mockResolvedValue([]);
      prismaMock.purchase.count.mockResolvedValue(45);

      const result = await service.findAll('user-1', 'business-1', {
        page: 2,
        limit: 20,
      });

      expect(prismaMock.purchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('rejects an inverted date range', async () => {
      await expect(
        service.findAll('user-1', 'business-1', {
          fromDate: '2026-10-31',
          toDate: '2026-10-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaMock.purchase.findMany).not.toHaveBeenCalled();
    });

    it('does not query purchases if business access fails', async () => {
      accessMock.getActiveMembership.mockRejectedValue(
        new NotFoundException('Business not found'),
      );

      await expect(
        service.findAll('user-1', 'business-1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.purchase.findMany).not.toHaveBeenCalled();
      expect(prismaMock.purchase.count).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const purchaseData = {
      id: 'purchase-1',
      tenantId: 'business-1',
      status: 'RECEIVED',
      totalAmount: new Prisma.Decimal('10000'),
      supplier: { id: 'supplier-1', name: 'ABC Traders' },
      store: { id: 'store-1', name: 'Main Store' },
      items: [
        {
          id: 'item-1',
          productName: 'Rice',
          quantity: new Prisma.Decimal('10'),
        },
      ],
      payments: [
        {
          id: 'payment-1',
          amount: new Prisma.Decimal('4000'),
        },
      ],
    };

    it('returns purchase details with payment history', async () => {
      prismaMock.purchase.findFirst.mockResolvedValue(purchaseData);

      const result = await service.findOne(
        'user-1',
        'business-1',
        'purchase-1',
      );

      expect(prismaMock.purchase.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'purchase-1',
            tenantId: 'business-1',
          },
          include: expect.objectContaining({
            supplier: true,
            store: true,
            items: true,
            payments: expect.any(Object),
          }),
        }),
      );

      expect(result.items).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
      expect(result.totalPaid.toString()).toBe('4000');
      expect(result.outstanding.toString()).toBe('6000');
      expect(result.paymentStatus).toBe('PARTIALLY_PAID');
    });

    it('calculates UNPAID status', async () => {
      prismaMock.purchase.findFirst.mockResolvedValue({
        ...purchaseData,
        payments: [],
      });

      const result = await service.findOne(
        'user-1',
        'business-1',
        'purchase-1',
      );

      expect(result.paymentStatus).toBe('UNPAID');
      expect(result.totalPaid.toString()).toBe('0');
    });

    it('calculates PAID status', async () => {
      prismaMock.purchase.findFirst.mockResolvedValue({
        ...purchaseData,
        payments: [{ id: 'payment-1', amount: new Prisma.Decimal('10000') }],
      });

      const result = await service.findOne(
        'user-1',
        'business-1',
        'purchase-1',
      );

      expect(result.paymentStatus).toBe('PAID');
      expect(result.outstanding.toString()).toBe('0');
    });

    it('returns 404 when purchase does not exist in the business', async () => {
      prismaMock.purchase.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('user-1', 'business-1', 'purchase-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.purchase.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'purchase-1',
            tenantId: 'business-1',
          },
        }),
      );
    });

    it('does not query purchases if business access fails', async () => {
      accessMock.getActiveMembership.mockRejectedValue(
        new NotFoundException('Business not found'),
      );

      await expect(
        service.findOne('user-1', 'business-1', 'purchase-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.purchase.findFirst).not.toHaveBeenCalled();
    });
  });
});
