import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { OpeningStockDto } from './dto/opening-stock.dto.js';
import { ListInventoryDto } from './dto/list-inventory.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  async openingStock(
    userId: string,
    businessId: string,
    storeId: string,
    productId: string,
    dto: OpeningStockDto,
  ) {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    if (Number(dto.quantity) <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId: membership.tenantId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: membership.tenantId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const inventory = await tx.storeInventory.create({
          data: {
            tenantId: membership.tenantId,
            storeId,
            productId,
            quantity: dto.quantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: membership.tenantId,
            storeId,
            productId,
            type: 'OPENING',
            quantity: dto.quantity,
            unitCost: dto.unitCost,
            note: dto.note?.trim() || 'Opening stock',
          },
        });

        return inventory;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Opening stock has already been recorded for this product at this store',
        );
      }

      throw error;
    }
  }

  async adjustStock(
    userId: string,
    businessId: string,
    storeId: string,
    productId: string,
    dto: AdjustStockDto,
  ) {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    if (Number(dto.quantity) <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId: membership.tenantId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: membership.tenantId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.storeInventory.findUnique({
        where: { storeId_productId: { storeId, productId } },
        select: { id: true, quantity: true },
      });

      if (!inventory) {
        throw new NotFoundException(
          'Inventory not found. Record opening stock first.',
        );
      }

      const delta =
        dto.type === 'ADJUSTMENT_IN'
          ? new Prisma.Decimal(dto.quantity)
          : new Prisma.Decimal(dto.quantity).negated();

      const updated = await tx.storeInventory.updateMany({
        where: {
          id: inventory.id,
          ...(dto.type === 'ADJUSTMENT_OUT'
            ? { quantity: { gte: dto.quantity } }
            : {}),
        },
        data: { quantity: { increment: delta } },
      });

      if (updated.count === 0) {
        throw new BadRequestException('Insufficient stock for this adjustment');
      }

      await tx.stockMovement.create({
        data: {
          tenantId: membership.tenantId,
          storeId,
          productId,
          type: dto.type,
          quantity: dto.quantity,
          note: dto.note.trim(),
          referenceId: dto.referenceId,
        },
      });

      return tx.storeInventory.findUniqueOrThrow({
        where: { storeId_productId: { storeId, productId } },
      });
    });
  }

  async listStoreInventory(
    userId: string,
    businessId: string,
    storeId: string,
    query: ListInventoryDto,
  ) {
    const { tenantId } = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const searchFilter = search
      ? Prisma.sql`AND (
        p."name" ILIKE ${`%${search}%`}
        OR p."sku" ILIKE ${`%${search}%`}
        OR p."barcode" ILIKE ${`%${search}%`}
      )`
      : Prisma.empty;

    const lowStockFilter =
      query.lowStock === 'true'
        ? Prisma.sql`AND (
          si."reorderLevel" IS NOT NULL
          AND si."quantity" <= si."reorderLevel"
        )`
        : query.lowStock === 'false'
          ? Prisma.sql`AND (
            si."reorderLevel" IS NULL
            OR si."quantity" > si."reorderLevel"
          )`
          : Prisma.empty;

    const whereFilters = Prisma.sql`
    WHERE si."tenantId" = ${tenantId}
      AND si."storeId" = ${storeId}
      ${searchFilter}
      ${lowStockFilter}
  `;

    const [items, countResult] = await Promise.all([
      this.prisma.$queryRaw<
        {
          inventoryId: string;
          productId: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          unit: string;
          quantity: Prisma.Decimal;
          reorderLevel: Prisma.Decimal | null;
          sellingPrice: Prisma.Decimal;
          updatedAt: Date;
        }[]
      >(Prisma.sql`
      SELECT
        si."id" AS "inventoryId",
        p."id" AS "productId",
        p."name" AS "name",
        p."sku" AS "sku",
        p."barcode" AS "barcode",
        p."unit" AS "unit",
        si."quantity" AS "quantity",
        si."reorderLevel" AS "reorderLevel",
        p."sellingPrice" AS "sellingPrice",
        si."updatedAt" AS "updatedAt"
      FROM "StoreInventory" si
      INNER JOIN "Product" p
        ON p."id" = si."productId"
        AND p."tenantId" = si."tenantId"
      ${whereFilters}
      ORDER BY p."name" ASC, si."id" ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `),
      this.prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "total"
      FROM "StoreInventory" si
      INNER JOIN "Product" p
        ON p."id" = si."productId"
        AND p."tenantId" = si."tenantId"
      ${whereFilters}
    `),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStoreProductInventory(
    userId: string,
    businessId: string,
    storeId: string,
    productId: string,
  ) {
    const { tenantId } = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const inventory = await this.prisma.storeInventory.findFirst({
      where: {
        tenantId,
        storeId,
        productId,
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

    if (!inventory) {
      throw new NotFoundException(
        'Inventory not found for this product and store',
      );
    }

    return inventory;
  }
}
