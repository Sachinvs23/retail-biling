import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkDatabase(): Promise<{ status: string }> {
    await this.prisma.$queryRaw`SELECT 1`;

    return { status: 'ok' };
  }
}
