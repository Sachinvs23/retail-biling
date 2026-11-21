import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { MembershipRole, TenantStatus } from '../generated/prisma/enums.js';
import { BusinessAccessService } from '../common/business-access.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import type {
  BusinessContextResponse,
  BusinessListResponse,
  StoreSummary,
} from './dto/business-response.dto.js';

interface SelectedTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: Date;
  stores: StoreSummary[];
}

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  stores: {
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} as const;

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

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

  async list(userId: string): Promise<BusinessListResponse> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        tenant: { status: TenantStatus.ACTIVE },
      },
      select: {
        role: true,
        tenant: { select: tenantSelect },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      businesses: memberships.map(({ role, tenant }) =>
        this.mapBusinessContext(tenant, role),
      ),
    };
  }

  async getContext(
    userId: string,
    businessId?: string,
  ): Promise<BusinessContextResponse> {
    const membership = await this.businessAccess.getActiveMembership(
      userId,
      businessId ?? '',
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: tenantSelect,
    });

    if (!tenant) {
      throw new NotFoundException('Business not found');
    }

    return this.mapBusinessContext(tenant, membership.role);
  }

  private mapBusinessContext(
    tenant: SelectedTenant,
    role: MembershipRole,
  ): BusinessContextResponse {
    return {
      business: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        createdAt: tenant.createdAt,
      },
      membership: { role },
      stores: tenant.stores,
    };
  }
}
