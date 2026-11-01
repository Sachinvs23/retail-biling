import { PrismaService } from './prisma/prisma.service.js';
import { AppService } from './app.service.js';

describe('AppService', () => {
  const prisma = { $queryRaw: vi.fn() };
  let service: AppService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AppService(prisma as unknown as PrismaService);
  });

  it('returns the basic health response', () => {
    expect(service.getHello()).toBe('Hello World!');
  });

  it('checks database health with a trivial query', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await expect(service.checkDatabase()).resolves.toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('propagates database health failures', async () => {
    const failure = new Error('database unavailable');
    prisma.$queryRaw.mockRejectedValue(failure);
    await expect(service.checkDatabase()).rejects.toBe(failure);
  });
});
