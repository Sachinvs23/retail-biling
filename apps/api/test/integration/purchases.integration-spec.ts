import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { BusinessAccessService } from '../../src/common/business-access.service.js';
import { PurchasesService } from '../../src/purchases/purchases.service.js';

describe('PurchasesService PostgreSQL integration', () => {
  const prisma = new PrismaService();

  let tenantId: string | undefined;
  let storeId: string | undefined;
  let productId: string | undefined;
  let supplierId: string | undefined;
  let purchaseId: string | undefined;
  let service: PurchasesService;

  const testId = randomUUID();

  beforeAll(async () => {
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        email: `integration-${testId}@example.com`,
        passwordHash: 'integration-test-hash',
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: `Integration Business ${testId}`,
        slug: `integration-${testId}`,
      },
    });
    tenantId = tenant.id;

    await prisma.membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    });

    const store = await prisma.store.create({
      data: {
        tenantId: tenant.id,
        name: 'Integration Store',
      },
    });
    storeId = store.id;

    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: 'Integration Product',
        sku: `SKU-${testId}`,
        sellingPrice: '15.00',
      },
    });
    productId = product.id;

    const supplier = await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: 'Integration Supplier',
      },
    });
    supplierId = supplier.id;

    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        supplierId: supplier.id,
        invoiceNumber: `INV-${testId}`,
        invoiceDate: new Date(),
        taxType: 'CGST_SGST',
        subtotal: '50.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '50.00',
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: '5.000',
            unitCost: '10.00',
            gstRate: '0.00',
            discountAmount: '0.00',
            taxableAmount: '50.00',
            cgstAmount: '0.00',
            sgstAmount: '0.00',
            igstAmount: '0.00',
            taxAmount: '0.00',
            totalAmount: '50.00',
          },
        },
      },
    });
    purchaseId = purchase.id;

    service = new PurchasesService(prisma, {
      getActiveMembership: vi.fn().mockResolvedValue({
        tenantId: tenant.id,
      }),
    } as unknown as BusinessAccessService);

    // Keep the authenticated user ID for the test.
    Object.assign(testContext, { userId: user.id });
  });

  const testContext: { userId?: string } = {};

  afterAll(async () => {
    if (purchaseId) {
      await prisma.stockMovement.deleteMany({
        where: { referenceId: purchaseId },
      });
      await prisma.purchasePayment.deleteMany({
        where: { purchaseId },
      });
      await prisma.purchaseItem.deleteMany({
        where: { purchaseId },
      });
      await prisma.purchase.deleteMany({
        where: { id: purchaseId },
      });
    }

    if (storeId && productId) {
      await prisma.storeInventory.deleteMany({
        where: { storeId, productId },
      });
    }

    if (supplierId) {
      await prisma.supplier.deleteMany({
        where: { id: supplierId },
      });
    }

    if (productId) {
      await prisma.product.deleteMany({
        where: { id: productId },
      });
    }

    if (storeId) {
      await prisma.store.deleteMany({
        where: { id: storeId },
      });
    }

    if (tenantId) {
      await prisma.membership.deleteMany({
        where: { tenantId },
      });
      await prisma.tenant.deleteMany({
        where: { id: tenantId },
      });
    }

    if (testContext.userId) {
      await prisma.user.deleteMany({
        where: { id: testContext.userId },
      });
    }

    await prisma.$disconnect();
  });

  it('receives a purchase, updates inventory and prevents duplicate receipt', async () => {
    const received = await service.receive(
      testContext.userId!,
      tenantId!,
      purchaseId!,
    );

    expect(received.status).toBe('RECEIVED');
    expect(received.receivedAt).toBeInstanceOf(Date);

    const inventory = await prisma.storeInventory.findUnique({
      where: {
        storeId_productId: {
          storeId: storeId!,
          productId: productId!,
        },
      },
    });

    expect(inventory).not.toBeNull();
    expect(inventory!.quantity.equals('5')).toBe(true);

    const movements = await prisma.stockMovement.findMany({
      where: { referenceId: purchaseId },
    });

    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('PURCHASE');
    expect(movements[0].quantity.equals('5')).toBe(true);

    await expect(
      service.receive(testContext.userId!, tenantId!, purchaseId!),
    ).rejects.toThrow(BadRequestException);

    const inventoryAfterRetry = await prisma.storeInventory.findUnique({
      where: {
        storeId_productId: {
          storeId: storeId!,
          productId: productId!,
        },
      },
    });

    const movementsAfterRetry = await prisma.stockMovement.count({
      where: { referenceId: purchaseId },
    });

    expect(inventoryAfterRetry!.quantity.equals('5')).toBe(true);
    expect(movementsAfterRetry).toBe(1);
  });
  it('rolls back inventory changes when stock movement creation fails', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `ROLLBACK-${testId}`,
        invoiceDate: new Date(),
        taxType: 'CGST_SGST',
        subtotal: '30.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '30.00',
        items: {
          create: {
            productId: productId!,
            productName: 'Integration Product',
            sku: `SKU-${testId}`,
            quantity: '3.000',
            unitCost: '10.00',
            gstRate: '0.00',
            discountAmount: '0.00',
            taxableAmount: '30.00',
            cgstAmount: '0.00',
            sgstAmount: '0.00',
            igstAmount: '0.00',
            taxAmount: '0.00',
            totalAmount: '30.00',
          },
        },
      },
    });

    // Make PostgreSQL reject stock movement inserts temporarily.
    await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION public.test_reject_stock_movement()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Intentional integration test failure';
    END;
    $$ LANGUAGE plpgsql;
  `;

    await prisma.$executeRaw`
    CREATE TRIGGER test_reject_stock_movement_trigger
    BEFORE INSERT ON "StockMovement"
    FOR EACH ROW
    EXECUTE FUNCTION public.test_reject_stock_movement();
  `;

    try {
      await prisma.storeInventory.upsert({
        where: {
          storeId_productId: {
            storeId: storeId!,
            productId: productId!,
          },
        },
        create: {
          tenantId: tenantId!,
          storeId: storeId!,
          productId: productId!,
          quantity: '5.000',
        },
        update: {
          quantity: '5.000',
        },
      });
      await expect(
        service.receive(testContext.userId!, tenantId!, purchase.id),
      ).rejects.toThrow();

      const inventory = await prisma.storeInventory.findUnique({
        where: {
          storeId_productId: {
            storeId: storeId!,
            productId: productId!,
          },
        },
      });

      // The first test already added 5 units.
      // The failed receipt must not add another 3.
      expect(inventory!.quantity.equals('5')).toBe(true);

      const savedPurchase = await prisma.purchase.findUnique({
        where: { id: purchase.id },
      });

      expect(savedPurchase!.status).toBe('DRAFT');

      const movementCount = await prisma.stockMovement.count({
        where: { referenceId: purchase.id },
      });

      expect(movementCount).toBe(0);
    } finally {
      await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS test_reject_stock_movement_trigger
      ON "StockMovement";
    `;

      await prisma.$executeRaw`
      DROP FUNCTION IF EXISTS public.test_reject_stock_movement();
    `;

      await prisma.purchaseItem.deleteMany({
        where: { purchaseId: purchase.id },
      });

      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });
  it('prevents duplicate inventory updates when two requests receive the same purchase concurrently', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `CONCURRENT-${testId}`,
        invoiceDate: new Date(),
        taxType: 'CGST_SGST',
        subtotal: '40.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '40.00',
        items: {
          create: {
            productId: productId!,
            productName: 'Integration Product',
            sku: `SKU-${testId}`,
            quantity: '4.000',
            unitCost: '10.00',
            gstRate: '0.00',
            discountAmount: '0.00',
            taxableAmount: '40.00',
            cgstAmount: '0.00',
            sgstAmount: '0.00',
            igstAmount: '0.00',
            taxAmount: '0.00',
            totalAmount: '40.00',
          },
        },
      },
    });

    try {
      await prisma.storeInventory.upsert({
        where: {
          storeId_productId: {
            storeId: storeId!,
            productId: productId!,
          },
        },
        create: {
          tenantId: tenantId!,
          storeId: storeId!,
          productId: productId!,
          quantity: '5.000',
        },
        update: {
          quantity: '5.000',
        },
      });
      const results = await Promise.allSettled([
        service.receive(testContext.userId!, tenantId!, purchase.id),
        service.receive(testContext.userId!, tenantId!, purchase.id),
      ]);

      const successfulRequests = results.filter(
        (result) => result.status === 'fulfilled',
      );

      const failedRequests = results.filter(
        (result) => result.status === 'rejected',
      );

      expect(successfulRequests).toHaveLength(1);
      expect(failedRequests).toHaveLength(1);

      const inventory = await prisma.storeInventory.findUnique({
        where: {
          storeId_productId: {
            storeId: storeId!,
            productId: productId!,
          },
        },
      });

      // Previous tests added 5 units.
      // This purchase should add only 4 units.
      expect(inventory!.quantity.equals('9')).toBe(true);

      const movementCount = await prisma.stockMovement.count({
        where: { referenceId: purchase.id },
      });

      expect(movementCount).toBe(1);

      const savedPurchase = await prisma.purchase.findUnique({
        where: { id: purchase.id },
      });

      expect(savedPurchase!.status).toBe('RECEIVED');
    } finally {
      await prisma.stockMovement.deleteMany({
        where: { referenceId: purchase.id },
      });

      await prisma.purchaseItem.deleteMany({
        where: { purchaseId: purchase.id },
      });

      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });

  it('records partial and final payments with correct outstanding balance', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `PAYMENT-${testId}`,
        invoiceDate: new Date(),
        status: 'RECEIVED',
        taxType: 'CGST_SGST',
        subtotal: '100.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '100.00',
      },
    });

    try {
      // First payment: ₹30
      const firstPayment = await service.recordPayment(
        testContext.userId!,
        tenantId!,
        purchase.id,
        {
          amount: '30.00',
          method: 'CASH',
        },
      );

      expect(firstPayment.totalPaid.toString()).toBe('30');
      expect(firstPayment.outstanding.toString()).toBe('70');
      expect(firstPayment.paymentStatus).toBe('PARTIALLY_PAID');

      // Second payment: ₹70
      const secondPayment = await service.recordPayment(
        testContext.userId!,
        tenantId!,
        purchase.id,
        {
          amount: '70.00',
          method: 'UPI',
        },
      );

      expect(secondPayment.totalPaid.toString()).toBe('100');
      expect(secondPayment.outstanding.toString()).toBe('0');
      expect(secondPayment.paymentStatus).toBe('PAID');

      const savedPayments = await prisma.purchasePayment.findMany({
        where: { purchaseId: purchase.id },
      });

      expect(savedPayments).toHaveLength(2);

      const totalPaid = savedPayments.reduce(
        (total, payment) => total.plus(payment.amount),
        new (
          await import('../../src/generated/prisma/client.js')
        ).Prisma.Decimal(0),
      );

      expect(totalPaid.equals('100')).toBe(true);
    } finally {
      await prisma.purchasePayment.deleteMany({
        where: { purchaseId: purchase.id },
      });

      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });
  it('rejects payments that exceed the outstanding balance', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `OVERPAY-${testId}`,
        invoiceDate: new Date(),
        status: 'RECEIVED',
        taxType: 'CGST_SGST',
        subtotal: '100.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '100.00',
      },
    });

    try {
      await service.recordPayment(testContext.userId!, tenantId!, purchase.id, {
        amount: '30.00',
        method: 'CASH',
      });

      await expect(
        service.recordPayment(testContext.userId!, tenantId!, purchase.id, {
          amount: '80.00',
          method: 'UPI',
        }),
      ).rejects.toThrow();

      const payments = await prisma.purchasePayment.findMany({
        where: { purchaseId: purchase.id },
      });

      expect(payments).toHaveLength(1);
      expect(payments[0].amount.equals('30')).toBe(true);
    } finally {
      await prisma.purchasePayment.deleteMany({
        where: { purchaseId: purchase.id },
      });
      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });
  it('prevents concurrent payments from exceeding the purchase total', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `CONCURRENT-PAY-${testId}`,
        invoiceDate: new Date(),
        status: 'RECEIVED',
        taxType: 'CGST_SGST',
        subtotal: '100.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '100.00',
      },
    });

    try {
      const results = await Promise.allSettled([
        service.recordPayment(testContext.userId!, tenantId!, purchase.id, {
          amount: '70.00',
          method: 'CASH',
        }),
        service.recordPayment(testContext.userId!, tenantId!, purchase.id, {
          amount: '70.00',
          method: 'UPI',
        }),
      ]);

      const successful = results.filter(
        (result) => result.status === 'fulfilled',
      );

      const failed = results.filter((result) => result.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);

      const payments = await prisma.purchasePayment.findMany({
        where: { purchaseId: purchase.id },
      });

      expect(payments).toHaveLength(1);
      expect(payments[0].amount.equals('70')).toBe(true);

      const totalPaid = payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new (
          await import('../../src/generated/prisma/client.js')
        ).Prisma.Decimal(0),
      );

      expect(totalPaid.equals('70')).toBe(true);
    } finally {
      await prisma.purchasePayment.deleteMany({
        where: { purchaseId: purchase.id },
      });
      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });
  it('rejects payments for draft purchases', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `DRAFT-PAY-${testId}`,
        invoiceDate: new Date(),
        status: 'DRAFT',
        taxType: 'CGST_SGST',
        subtotal: '100.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '100.00',
      },
    });

    try {
      await expect(
        service.recordPayment(testContext.userId!, tenantId!, purchase.id, {
          amount: '50.00',
          method: 'CASH',
        }),
      ).rejects.toThrow();

      const payments = await prisma.purchasePayment.count({
        where: { purchaseId: purchase.id },
      });

      expect(payments).toBe(0);
    } finally {
      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });
  it('rejects receiving and payment for cancelled purchases', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `CANCELLED-${testId}`,
        invoiceDate: new Date(),
        status: 'CANCELLED',
        cancelledAt: new Date(),
        taxType: 'CGST_SGST',
        subtotal: '100.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '100.00',
      },
    });

    try {
      await expect(
        service.receive(testContext.userId!, tenantId!, purchase.id),
      ).rejects.toThrow();

      await expect(
        service.recordPayment(testContext.userId!, tenantId!, purchase.id, {
          amount: '50.00',
          method: 'CASH',
        }),
      ).rejects.toThrow();

      const savedPurchase = await prisma.purchase.findUnique({
        where: { id: purchase.id },
      });

      expect(savedPurchase!.status).toBe('CANCELLED');

      const payments = await prisma.purchasePayment.count({
        where: { purchaseId: purchase.id },
      });

      expect(payments).toBe(0);

      const movements = await prisma.stockMovement.count({
        where: { referenceId: purchase.id },
      });

      expect(movements).toBe(0);
    } finally {
      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });

  it('prevents users from accessing another business purchases and payments', async () => {
    const secondUser = await prisma.user.create({
      data: {
        email: `second-${testId}@example.com`,
        passwordHash: 'integration-test-hash',
      },
    });

    const secondTenant = await prisma.tenant.create({
      data: {
        name: `Second Business ${testId}`,
        slug: `second-${testId}`,
      },
    });

    await prisma.membership.create({
      data: {
        userId: secondUser.id,
        tenantId: secondTenant.id,
        role: 'OWNER',
      },
    });

    const secondStore = await prisma.store.create({
      data: {
        tenantId: secondTenant.id,
        name: 'Second Business Store',
      },
    });

    const secondSupplier = await prisma.supplier.create({
      data: {
        tenantId: secondTenant.id,
        name: 'Second Business Supplier',
      },
    });

    const secondPurchase = await prisma.purchase.create({
      data: {
        tenantId: secondTenant.id,
        storeId: secondStore.id,
        supplierId: secondSupplier.id,
        invoiceNumber: `SECOND-${testId}`,
        invoiceDate: new Date(),
        status: 'RECEIVED',
        taxType: 'CGST_SGST',
        subtotal: '100.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '100.00',
      },
    });

    try {
      // This service instance represents the original business user.
      // It must not access the second business purchase.
      await expect(
        service.findOne(testContext.userId!, tenantId!, secondPurchase.id),
      ).rejects.toThrow();

      await expect(
        service.recordPayment(
          testContext.userId!,
          tenantId!,
          secondPurchase.id,
          { amount: '50.00', method: 'CASH' },
        ),
      ).rejects.toThrow();

      const paymentCount = await prisma.purchasePayment.count({
        where: { purchaseId: secondPurchase.id },
      });

      expect(paymentCount).toBe(0);
    } finally {
      await prisma.purchasePayment.deleteMany({
        where: { purchaseId: secondPurchase.id },
      });

      await prisma.purchase.delete({
        where: { id: secondPurchase.id },
      });

      await prisma.supplier.delete({
        where: { id: secondSupplier.id },
      });

      await prisma.store.delete({
        where: { id: secondStore.id },
      });

      await prisma.membership.deleteMany({
        where: { tenantId: secondTenant.id },
      });

      await prisma.tenant.delete({
        where: { id: secondTenant.id },
      });

      await prisma.user.delete({
        where: { id: secondUser.id },
      });
    }
  });
  it('rejects zero and negative payment amounts', async () => {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantId!,
        storeId: storeId!,
        supplierId: supplierId!,
        invoiceNumber: `INVALID-PAY-${testId}`,
        invoiceDate: new Date(),
        status: 'RECEIVED',
        taxType: 'CGST_SGST',
        subtotal: '100.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        totalAmount: '100.00',
      },
    });

    try {
      for (const amount of ['0', '-10.00']) {
        await expect(
          service.recordPayment(testContext.userId!, tenantId!, purchase.id, {
            amount,
            method: 'CASH',
          }),
        ).rejects.toThrow();
      }

      const paymentCount = await prisma.purchasePayment.count({
        where: { purchaseId: purchase.id },
      });

      expect(paymentCount).toBe(0);
    } finally {
      await prisma.purchasePayment.deleteMany({
        where: { purchaseId: purchase.id },
      });

      await prisma.purchase.delete({
        where: { id: purchase.id },
      });
    }
  });
});
