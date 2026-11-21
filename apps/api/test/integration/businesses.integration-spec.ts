import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

interface ResponseItem {
  business: Record<string, unknown>;
  membership: Record<string, unknown>;
  stores: Array<Record<string, unknown>>;
}

function compareIds(a: string, b: string): number {
  return a.localeCompare(b);
}

function expectBusinessItemShape(item: ResponseItem): void {
  expect(Object.keys(item).sort()).toEqual([
    'business',
    'membership',
    'stores',
  ]);
  expect(Object.keys(item.business).sort()).toEqual([
    'createdAt',
    'id',
    'name',
    'slug',
    'status',
  ]);
  expect(Object.keys(item.membership)).toEqual(['role']);
  expect(Array.isArray(item.stores)).toBe(true);

  for (const store of item.stores) {
    expect(Object.keys(store).sort()).toEqual([
      'code',
      'createdAt',
      'id',
      'name',
    ]);
  }
}

function expectNoSensitiveFields(body: unknown): void {
  const serialized = JSON.stringify(body);

  for (const field of [
    'passwordHash',
    'refreshToken',
    'tenantId',
    'userId',
    'cookies',
  ]) {
    expect(serialized).not.toContain(field);
  }
}

describe('Businesses HTTP integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let primaryToken = '';
  let otherToken = '';
  let primaryBusinessId = '';
  let secondBusinessId = '';
  let suspendedBusinessId = '';
  let otherBusinessId = '';
  let primaryStoreIds: string[] = [];

  const testId = randomUUID();
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const jwtService = app.get(JwtService, { strict: false });

    const primaryUser = await prisma.user.create({
      data: {
        email: `business-primary-${testId}@example.com`,
        name: 'Business Integration Primary',
        passwordHash: 'integration-test-hash',
      },
    });
    const otherUser = await prisma.user.create({
      data: {
        email: `business-other-${testId}@example.com`,
        name: 'Business Integration Other',
        passwordHash: 'integration-test-hash',
      },
    });
    userIds.push(primaryUser.id, otherUser.id);

    primaryToken = await jwtService.signAsync({
      sub: primaryUser.id,
      email: primaryUser.email,
    });
    otherToken = await jwtService.signAsync({
      sub: otherUser.id,
      email: otherUser.email,
    });

    async function createBusiness(options: {
      userId: string;
      name: string;
      slugPrefix: string;
      role: 'OWNER' | 'ADMIN' | 'CASHIER';
      status?: 'ACTIVE' | 'SUSPENDED';
      stores: Array<{ name: string; code: string | null }>;
    }) {
      const tenant = await prisma!.tenant.create({
        data: {
          name: options.name,
          slug: `${options.slugPrefix}-${testId}`,
          status: options.status ?? 'ACTIVE',
        },
      });
      tenantIds.push(tenant.id);

      await prisma!.membership.create({
        data: {
          userId: options.userId,
          tenantId: tenant.id,
          role: options.role,
        },
      });

      const stores: string[] = [];

      for (const [index, store] of options.stores.entries()) {
        const createdStore = await prisma!.store.create({
          data: {
            tenantId: tenant.id,
            name: store.name,
            code: store.code,
            createdAt: new Date(
              Date.parse('2026-01-01T00:00:00.000Z') + index * 60_000,
            ),
          },
        });
        stores.push(createdStore.id);
      }

      return { tenant, storeIds: stores };
    }

    const primaryBusiness = await createBusiness({
      userId: primaryUser.id,
      name: 'Primary Integration Business',
      slugPrefix: 'primary-integration',
      role: 'OWNER',
      stores: [
        { name: 'Main Store', code: 'MAIN' },
        { name: 'Branch Store', code: 'BRANCH' },
      ],
    });

    const secondBusiness = await createBusiness({
      userId: primaryUser.id,
      name: 'Second Integration Business',
      slugPrefix: 'second-integration',
      role: 'CASHIER',
      stores: [{ name: 'Second Main', code: 'SECOND' }],
    });

    const suspendedBusiness = await createBusiness({
      userId: primaryUser.id,
      name: 'Suspended Integration Business',
      slugPrefix: 'suspended-integration',
      role: 'OWNER',
      status: 'SUSPENDED',
      stores: [{ name: 'Suspended Store', code: 'SUSPENDED' }],
    });

    const otherBusiness = await createBusiness({
      userId: otherUser.id,
      name: 'Other User Integration Business',
      slugPrefix: 'other-integration',
      role: 'OWNER',
      stores: [{ name: 'Other Store', code: 'OTHER' }],
    });

    primaryBusinessId = primaryBusiness.tenant.id;
    primaryStoreIds = primaryBusiness.storeIds;
    secondBusinessId = secondBusiness.tenant.id;
    suspendedBusinessId = suspendedBusiness.tenant.id;
    otherBusinessId = otherBusiness.tenant.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.tenant.deleteMany({
        where: { id: { in: tenantIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    await app?.close();
  });

  function server() {
    return app!.getHttpServer();
  }

  it('lists multiple businesses for one user with a consistent response structure', async () => {
    const response = await request(server())
      .get('/businesses')
      .set('Authorization', `Bearer ${primaryToken}`)
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(['businesses']);
    expect(response.body.businesses).toHaveLength(2);

    const items = response.body.businesses as ResponseItem[];

    for (const item of items) {
      expectBusinessItemShape(item);
    }

    expect(items.map((item) => item.business.id).sort(compareIds)).toEqual(
      [primaryBusinessId, secondBusinessId].sort(compareIds),
    );
    expect(items.map((item) => item.business.id)).not.toContain(
      suspendedBusinessId,
    );
    expect(items.map((item) => item.business.id)).not.toContain(
      otherBusinessId,
    );

    const primaryItem = items.find(
      (item) => item.business.id === primaryBusinessId,
    )!;
    const secondItem = items.find(
      (item) => item.business.id === secondBusinessId,
    )!;

    expect(primaryItem.business.status).toBe('ACTIVE');
    expect(primaryItem.membership).toEqual({ role: 'OWNER' });
    expect(primaryItem.stores.map((store) => store.id)).toEqual(
      primaryStoreIds,
    );

    expect(secondItem.membership).toEqual({ role: 'CASHIER' });
    expect(secondItem.stores).toHaveLength(1);

    expectNoSensitiveFields(response.body);
  });

  it('does not return another user businesses from the list endpoint', async () => {
    const response = await request(server())
      .get('/businesses')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    const items = response.body.businesses as ResponseItem[];

    expect(items).toHaveLength(1);
    expect(items[0]!.business.id).toBe(otherBusinessId);
    expect(items[0]!.membership).toEqual({ role: 'OWNER' });
    expectNoSensitiveFields(response.body);
  });

  it('returns a valid business context with stores', async () => {
    const response = await request(server())
      .get('/businesses/context')
      .set('Authorization', `Bearer ${primaryToken}`)
      .set('X-Business-Id', primaryBusinessId)
      .expect(200);

    const item = response.body as ResponseItem;

    expectBusinessItemShape(item);
    expect(item.business.id).toBe(primaryBusinessId);
    expect(item.business.status).toBe('ACTIVE');
    expect(item.membership).toEqual({ role: 'OWNER' });
    expect(item.stores.map((store) => store.id)).toEqual(primaryStoreIds);
    expectNoSensitiveFields(response.body);
  });

  it('rejects a business-context request without X-Business-Id', async () => {
    await request(server())
      .get('/businesses/context')
      .set('Authorization', `Bearer ${primaryToken}`)
      .expect(403);
  });

  it('rejects a business the authenticated user does not belong to', async () => {
    await request(server())
      .get('/businesses/context')
      .set('Authorization', `Bearer ${primaryToken}`)
      .set('X-Business-Id', otherBusinessId)
      .expect(404);
  });

  it('rejects an inactive business context', async () => {
    await request(server())
      .get('/businesses/context')
      .set('Authorization', `Bearer ${primaryToken}`)
      .set('X-Business-Id', suspendedBusinessId)
      .expect(403);
  });

  it('requires authentication for business discovery', async () => {
    await request(server()).get('/businesses').expect(401);

    await request(server())
      .get('/businesses/context')
      .set('X-Business-Id', primaryBusinessId)
      .expect(401);
  });
});
