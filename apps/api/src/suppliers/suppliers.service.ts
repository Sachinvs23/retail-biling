import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { ListSuppliersDto } from './dto/list-suppliers.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccessService: BusinessAccessService,
  ) {}

  private async getTenantId(userId: string, businessId: string) {
    const membership = await this.businessAccessService.getActiveMembership(
      userId,
      businessId,
    );

    return membership.tenantId;
  }

  async create(userId: string, businessId: string, dto: CreateSupplierDto) {
    const tenantId = await this.getTenantId(userId, businessId);

    try {
      return await this.prisma.supplier.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          code: dto.code?.trim() || null,
          contactPerson: dto.contactPerson?.trim() || null,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          address: dto.address?.trim() || null,
          gstin: dto.gstin?.trim().toUpperCase() || null,
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
    }
  }

  async list(userId: string, businessId: string, query: ListSuppliersDto) {
    const tenantId = await this.getTenantId(userId, businessId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.SupplierWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              {
                contactPerson: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
              { gstin: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
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

  async findOne(userId: string, businessId: string, supplierId: string) {
    const tenantId = await this.getTenantId(userId, businessId);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(
    userId: string,
    businessId: string,
    supplierId: string,
    dto: UpdateSupplierDto,
  ) {
    const tenantId = await this.getTenantId(userId, businessId);

    const existing = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }

    const data: Prisma.SupplierUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    if (dto.contactPerson !== undefined) {
      data.contactPerson = dto.contactPerson?.trim() || null;
    }
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) {
      data.email = dto.email?.trim().toLowerCase() || null;
    }
    if (dto.address !== undefined) {
      data.address = dto.address?.trim() || null;
    }
    if (dto.gstin !== undefined) {
      data.gstin = dto.gstin?.trim().toUpperCase() || null;
    }

    try {
      return await this.prisma.supplier.update({
        where: {
          tenantId_id: {
            tenantId,
            id: supplierId,
          },
        },
        data,
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
    }
  }

  async updateStatus(
    userId: string,
    businessId: string,
    supplierId: string,
    isActive: boolean,
  ) {
    const tenantId = await this.getTenantId(userId, businessId);

    const result = await this.prisma.supplier.updateMany({
      where: { id: supplierId, tenantId },
      data: { isActive },
    });

    if (result.count === 0) {
      throw new NotFoundException('Supplier not found');
    }

    return this.prisma.supplier.findFirstOrThrow({
      where: { id: supplierId, tenantId },
    });
  }

  private handleUniqueConstraint(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A supplier with this code already exists');
    }

    throw error;
  }
}
