import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { BusinessAccessService } from '../common/business-access.service.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  async create(userId: string, businessId: string, dto: CreateProductDto) {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    if (!membership) {
      throw new NotFoundException('No active business membership found');
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          tenantId: membership.tenantId,
          name: dto.name.trim(),
          sku: dto.sku?.trim() || null,
          barcode: dto.barcode?.trim() || null,
          description: dto.description?.trim() || null,
          unit: dto.unit?.trim() || 'piece',
          purchasePrice: dto.purchasePrice ?? '0',
          sellingPrice: dto.sellingPrice,
          gstRate: dto.gstRate ?? '0',
          hsnCode: dto.hsnCode?.trim() || null,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          description: true,
          unit: true,
          purchasePrice: true,
          sellingPrice: true,
          gstRate: true,
          hsnCode: true,
          isActive: true,
          createdAt: true,
        },
      });

      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A product with this SKU or barcode already exists in this business',
        );
      }

      throw error;
    }
  }

  async list(userId: string, businessId: string, query: ListProductsDto) {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    if (!membership) {
      throw new NotFoundException('No active business membership found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      tenantId: membership.tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          unit: true,
          sellingPrice: true,
          gstRate: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

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

  async findOne(userId: string, businessId: string, productId: string) {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: membership.tenantId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        description: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
        gstRate: true,
        hsnCode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    userId: string,
    businessId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    const existing = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.sku !== undefined) data.sku = dto.sku?.trim() || null;
    if (dto.barcode !== undefined) {
      data.barcode = dto.barcode?.trim() || null;
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.unit !== undefined) data.unit = dto.unit.trim();
    if (dto.sellingPrice !== undefined) {
      data.sellingPrice = dto.sellingPrice;
    }
    if (dto.purchasePrice !== undefined) {
      data.purchasePrice = dto.purchasePrice;
    }
    if (dto.gstRate !== undefined) data.gstRate = dto.gstRate;
    if (dto.hsnCode !== undefined) {
      data.hsnCode = dto.hsnCode?.trim() || null;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.product.update({
        where: { id: existing.id },
        data,
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          description: true,
          unit: true,
          purchasePrice: true,
          sellingPrice: true,
          gstRate: true,
          hsnCode: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A product with this SKU or barcode already exists in this business',
        );
      }

      throw error;
    }
  }
}
