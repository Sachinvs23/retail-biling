import { ConflictException, Injectable } from '@nestjs/common';
import { BusinessAccessService } from '../common/business-access.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import type { CreatedStoreResponse } from './dto/store-response.dto.js';
import { assertStoreCreationAllowed } from './store-permissions.js';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  async create(
    userId: string,
    businessId: string,
    dto: CreateStoreDto,
  ): Promise<CreatedStoreResponse> {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId,
    );

    assertStoreCreationAllowed(membership.role);

    try {
      return await this.prisma.store.create({
        data: {
          tenantId: membership.tenantId,
          name: dto.storeName.trim(),
          code: dto.storeCode?.trim() || null,
        },
        select: {
          id: true,
          name: true,
          code: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A store with this code already exists in this business',
        );
      }

      throw error;
    }
  }
}
