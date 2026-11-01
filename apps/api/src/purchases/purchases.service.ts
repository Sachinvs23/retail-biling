import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePurchaseDto } from './dto/create-purchase.dto.js';
import { calculatePurchaseTotals } from './purchase-calculation.js';
import { CreatePurchasePaymentDto } from './dto/create-purchase-payment.dto.js';
import { ListPurchasesDto } from './dto/list-purchases.dto.js';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccess: BusinessAccessService,
  ) {}
  private getPaymentStatus(
    totalPaid: Prisma.Decimal,
    outstanding: Prisma.Decimal,
  ) {
    if (totalPaid.isZero()) {
      return 'UNPAID';
    }

    if (outstanding.isZero()) {
      return 'PAID';
    }

    return 'PARTIALLY_PAID';
  }
  async create(userId: string, businessId: string, dto: CreatePurchaseDto) {
    const { tenantId } = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    // Reject duplicate product lines to keep invoice calculations clear.
    const productIds = dto.items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException(
        'A product can only appear once in a purchase',
      );
    }

    const [store, supplier, products] = await Promise.all([
      this.prisma.store.findFirst({
        where: { id: dto.storeId, tenantId },
        select: { id: true },
      }),
      this.prisma.supplier.findFirst({
        where: {
          id: dto.supplierId,
          tenantId,
          isActive: true,
        },
        select: { id: true },
      }),
      this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          hsnCode: true,
          gstRate: true,
        },
      }),
    ]);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (!supplier) {
      throw new NotFoundException('Active supplier not found');
    }

    if (products.length !== productIds.length) {
      throw new NotFoundException(
        'One or more products were not found or are inactive',
      );
    }

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    const calculation = calculatePurchaseTotals({
      priceMode: dto.priceMode,
      taxType: dto.taxType,
      items: dto.items.map((item) => {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        return {
          quantity: item.quantity,
          unitCost: item.unitCost,
          gstRate: product.gstRate.toString(),
          discountAmount: item.discountAmount,
        };
      }),
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        return tx.purchase.create({
          data: {
            tenantId,
            storeId: store.id,
            supplierId: supplier.id,
            invoiceNumber: dto.invoiceNumber.trim(),
            invoiceDate: new Date(dto.invoiceDate),
            priceMode: dto.priceMode,
            taxType: dto.taxType,
            status: 'DRAFT',
            subtotal: calculation.subtotal,
            discountAmount: calculation.discountAmount,
            taxAmount: calculation.taxAmount,
            totalAmount: calculation.totalAmount,
            notes: dto.notes?.trim() || null,

            items: {
              create: calculation.items.map((calculatedItem, index) => {
                const inputItem = dto.items[index];
                const product = productsById.get(inputItem.productId);

                if (!product) {
                  throw new NotFoundException('Product not found');
                }

                return {
                  tenantId,
                  productId: product.id,
                  productName: product.name,
                  sku: product.sku,
                  hsnCode: product.hsnCode,
                  quantity: calculatedItem.quantity,
                  unitCost: calculatedItem.unitCost,
                  gstRate: calculatedItem.gstRate,
                  discountAmount: calculatedItem.discountAmount,
                  taxableAmount: calculatedItem.taxableAmount,
                  cgstAmount: calculatedItem.cgstAmount,
                  sgstAmount: calculatedItem.sgstAmount,
                  igstAmount: calculatedItem.igstAmount,
                  taxAmount: calculatedItem.taxAmount,
                  totalAmount: calculatedItem.totalAmount,
                };
              }),
            },
          },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                gstin: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            items: true,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This supplier invoice number already exists',
        );
      }

      throw error;
    }
  }

  async receive(userId: string, businessId: string, purchaseId: string) {
    const { tenantId } = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const receivedPurchaseId = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: {
          id: purchaseId,
          tenantId,
        },
        include: {
          items: true,
        },
      });

      if (!purchase) {
        throw new NotFoundException('Purchase not found');
      }

      if (purchase.status !== 'DRAFT') {
        throw new BadRequestException('Only draft purchases can be received');
      }

      const receivedAt = new Date();

      // Conditional update prevents the same purchase being received twice.
      const updated = await tx.purchase.updateMany({
        where: {
          id: purchaseId,
          tenantId,
          status: 'DRAFT',
        },
        data: {
          status: 'RECEIVED',
          receivedAt,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Purchase has already been received or modified',
        );
      }

      for (const item of purchase.items) {
        await tx.storeInventory.upsert({
          where: {
            storeId_productId: {
              storeId: purchase.storeId,
              productId: item.productId,
            },
          },
          create: {
            tenantId,
            storeId: purchase.storeId,
            productId: item.productId,
            quantity: item.quantity,
          },
          update: {
            quantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            storeId: purchase.storeId,
            productId: item.productId,
            type: 'PURCHASE',
            quantity: item.quantity,
            unitCost: item.unitCost,
            referenceId: purchase.id,
            note: `Purchase received: ${purchase.invoiceNumber}`,
          },
        });
      }

      // Return only the ID; the transaction commits after this callback completes.
      return purchase.id;
    });

    // Fetch relations after the transaction has committed.
    return this.prisma.purchase.findFirstOrThrow({
      where: {
        id: receivedPurchaseId,
        tenantId,
      },
      include: {
        supplier: true,
        store: true,
        items: true,
      },
    });
  }

  async recordPayment(
    userId: string,
    businessId: string,
    purchaseId: string,
    dto: CreatePurchasePaymentDto,
  ) {
    const { tenantId } = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const amount = new Prisma.Decimal(dto.amount);

    if (!amount.isFinite() || amount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock the purchase row to serialize concurrent payments.
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
        SELECT "id"
        FROM "Purchase"
        WHERE "id" = ${purchaseId}
          AND "tenantId" = ${tenantId}
        FOR UPDATE
      `,
      );

      if (lockedRows.length === 0) {
        throw new NotFoundException('Purchase not found');
      }

      const purchase = await tx.purchase.findFirst({
        where: {
          id: purchaseId,
          tenantId,
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          payments: {
            select: {
              amount: true,
            },
          },
        },
      });

      if (!purchase) {
        throw new NotFoundException('Purchase not found');
      }

      if (purchase.status !== 'RECEIVED') {
        throw new BadRequestException(
          'Payments can only be recorded for received purchases',
        );
      }

      const totalPaid = purchase.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0),
      );

      const outstanding = purchase.totalAmount.minus(totalPaid);

      if (amount.gt(outstanding)) {
        throw new BadRequestException(
          `Payment exceeds outstanding balance of ${outstanding.toFixed(2)}`,
        );
      }

      const payment = await tx.purchasePayment.create({
        data: {
          tenantId,
          purchaseId,
          amount,
          method: dto.method,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });

      const updatedTotalPaid = totalPaid.plus(amount);
      const updatedOutstanding = purchase.totalAmount.minus(updatedTotalPaid);

      return {
        payment,
        totalAmount: purchase.totalAmount,
        totalPaid: updatedTotalPaid,
        outstanding: updatedOutstanding,
        paymentStatus: updatedOutstanding.isZero() ? 'PAID' : 'PARTIALLY_PAID',
      };
    });
  }
  async findAll(userId: string, businessId: string, dto: ListPurchasesDto) {
    const { tenantId } = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    if (
      dto.fromDate &&
      dto.toDate &&
      new Date(dto.fromDate) > new Date(dto.toDate)
    ) {
      throw new BadRequestException('fromDate cannot be later than toDate');
    }

    const invoiceDate: Prisma.DateTimeFilter = {};

    if (dto.fromDate) {
      invoiceDate.gte = new Date(dto.fromDate);
    }

    if (dto.toDate) {
      const endDate = new Date(dto.toDate);

      // Treat date-only values as inclusive calendar dates.
      if (/^\d{4}-\d{2}-\d{2}$/.test(dto.toDate)) {
        endDate.setUTCHours(23, 59, 59, 999);
      }

      invoiceDate.lte = endDate;
    }

    const where: Prisma.PurchaseWhereInput = {
      tenantId,
      ...(dto.status && { status: dto.status }),
      ...(dto.supplierId && { supplierId: dto.supplierId }),
      ...(dto.search && {
        OR: [
          {
            invoiceNumber: {
              contains: dto.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            supplier: {
              name: {
                contains: dto.search.trim(),
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
      ...(Object.keys(invoiceDate).length > 0 && { invoiceDate }),
    };

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          payments: {
            select: {
              amount: true,
            },
          },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    const data = purchases.map((purchase) => {
      const totalPaid = purchase.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0),
      );

      const outstanding = purchase.totalAmount.minus(totalPaid);

      return {
        ...purchase,
        totalPaid,
        outstanding,
        paymentStatus: this.getPaymentStatus(totalPaid, outstanding),
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(userId: string, businessId: string, purchaseId: string) {
    const { tenantId } = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const purchase = await this.prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        tenantId,
      },
      include: {
        supplier: true,
        store: true,
        items: true,
        payments: {
          orderBy: {
            paidAt: 'desc',
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    const totalPaid = purchase.payments.reduce(
      (total, payment) => total.plus(payment.amount),
      new Prisma.Decimal(0),
    );

    const outstanding = purchase.totalAmount.minus(totalPaid);

    return {
      ...purchase,
      totalPaid,
      outstanding,
      paymentStatus: this.getPaymentStatus(totalPaid, outstanding),
    };
  }
}
