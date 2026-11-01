import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const business = await tx.tenant.create({
          data: {
            name: dto.businessName.trim(),
            slug: dto.slug.trim(),
          },
        });

        await tx.membership.create({
          data: {
            userId,
            tenantId: business.id,
            role: 'OWNER',
          },
        });

        const store = await tx.store.create({
          data: {
            tenantId: business.id,
            name: dto.storeName.trim(),
            code: dto.storeCode?.trim() || null,
          },
        });

        return {
          business: {
            id: business.id,
            name: business.name,
            slug: business.slug,
            status: business.status,
            createdAt: business.createdAt,
          },
          membership: {
            role: 'OWNER' as const,
          },
          store: {
            id: store.id,
            name: store.name,
            code: store.code,
            createdAt: store.createdAt,
          },
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A business with this slug or a conflicting unique value already exists',
        );
      }

      throw error;
    }
  }
}
