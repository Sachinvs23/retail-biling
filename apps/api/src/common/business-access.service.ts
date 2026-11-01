import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BusinessAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveMembership(userId: string, businessId: string) {
    if (!businessId?.trim()) {
      throw new ForbiddenException('X-Business-Id header is required');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: businessId,
        },
      },
      select: {
        tenantId: true,
        role: true,
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Business not found');
    }

    if (membership.tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Business is not active');
    }

    return {
      tenantId: membership.tenantId,
      role: membership.role,
    };
  }
}
