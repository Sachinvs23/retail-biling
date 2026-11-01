import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails safely when DATABASE_URL is not configured', () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(() => new PrismaService()).toThrow(
        'DATABASE_URL is not configured',
      );
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it('delegates module lifecycle hooks to Prisma connect and disconnect', async () => {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    const connect = vi.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = vi
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(connect).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
