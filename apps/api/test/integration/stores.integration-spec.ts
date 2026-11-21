import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

type StoreRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER';

describe('Stores HTTP integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let ownerToken = '';
  let adminToken = '';
  let managerToken = '';
  let cashierToken = '';
  let inactiveOwnerToken = '';
  let noMembershipToken = '';
  let ownerBusinessId = '';
  let otherBusinessId = '';
  let suspendedBusinessId = '';

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

    async function createUser(
      prefix: string,
    ): Promise<{ id: string; token: string }> {
      const user = await prisma!.user.create({
        data: {
          email: `${prefix}-${testId}@example.com`,
          name: `${prefix} store integration`,
          passwordHash: 'integration-test-hash',
        },
      });
      userIds.push(user.id);

      return {
        id: user.id,
        token: await jwtService.signAsync({
          sub: user.id,
          email: user.email,
        }),
      };
    }

    async function createBusiness(options: {
      userId: string;
      role: StoreRole;
      slugPrefix: string;
      status?: 'ACTIVE' | 'SUSPENDED';
    }): Promise<string> {
      const tenant = await prisma!.tenant.create({
        data: {
          name: `${options.slugPrefix} business`,
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

      await prisma!.store.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Store',
          code: 'MAIN',
        },
      });

      return tenant.id;
    }

    async function addMembership(
      userId: string,
      tenantId: string,
      role: StoreRole,
    ): Promise<void> {
      await prisma!.membership.create({
        data: { userId, tenantId, role },
      });
    }

    const ownerUser = await createUser('stores-owner');
    const adminUser = await createUser('stores-admin');
    const managerUser = await createUser('stores-manager');
    const cashierUser = await createUser('stores-cashier');
    const inactiveUser = await createUser('stores-inactive');
    const otherUser = await createUser('stores-other');
    const noMembershipUser = await createUser('stores-no-membership');

    ownerToken = ownerUser.token;
    adminToken = adminUser.token;
    managerToken = managerUser.token;
    cashierToken = cashierUser.token;
    inactiveOwnerToken = inactiveUser.token;
    noMembershipToken = noMembershipUser.token;

    ownerBusinessId = await createBusiness({
      userId: ownerUser.id,
      role: 'OWNER',
      slugPrefix: 'stores-owner',
    });

    await addMembership(adminUser.id, ownerBusinessId, 'ADMIN');
    await addMembership(managerUser.id, ownerBusinessId, 'MANAGER');
    await addMembership(cashierUser.id, ownerBusinessId, 'CASHIER');

    suspendedBusinessId = await createBusiness({
      userId: inactiveUser.id,
      role: 'OWNER',
      slugPrefix: 'stores-inactive',
      status: 'SUSPENDED',
    });

    otherBusinessId = await createBusiness({
      userId: otherUser.id,
      role: 'OWNER',
      slugPrefix: 'stores-other',
    });
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

  function storeRequest(token: string, businessId?: string) {
    const builder = request(server())
      .post('/stores')
      .set('Authorization', `Bearer ${token}`);

    if (businessId) {
      builder.set('X-Business-Id', businessId);
    }

    return builder;
  }

  it('creates a trimmed store for the selected active business', async () => {
    const response = await storeRequest(ownerToken, ownerBusinessId)
      .send({ storeName: '  Tambaram Branch  ', storeCode: '  TAMBARAM  ' })
      .expect(201);

    expect(Object.keys(response.body).sort()).toEqual([
      'code',
      'createdAt',
      'id',
      'name',
    ]);
    expect(response.body.name).toBe('Tambaram Branch');
    expect(response.body.code).toBe('TAMBARAM');
    expect(typeof response.body.id).toBe('string');
    expect(new Date(response.body.createdAt).toISOString()).toBe(
      response.body.createdAt,
    );
    expect(JSON.stringify(response.body)).not.toContain('tenantId');

    const stored = await prisma!.store.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(stored.tenantId).toBe(ownerBusinessId);
    expect(stored.name).toBe('Tambaram Branch');
    expect(stored.code).toBe('TAMBARAM');
  });

  it('normalizes a whitespace-only store code to null', async () => {
    const response = await storeRequest(ownerToken, ownerBusinessId)
      .send({ storeName: 'Vadapalani Branch', storeCode: '   ' })
      .expect(201);

    expect(response.body.code).toBeNull();

    const stored = await prisma!.store.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(stored.code).toBeNull();
  });

  it('allows an ADMIN to create a store', async () => {
    const response = await storeRequest(adminToken, ownerBusinessId)
      .send({ storeName: 'Admin Branch', storeCode: 'ADMIN-BRANCH' })
      .expect(201);

    expect(response.body.name).toBe('Admin Branch');
  });

  it('rejects a request without X-Business-Id', async () => {
    await storeRequest(ownerToken)
      .send({ storeName: 'Missing Header', storeCode: 'MISSING' })
      .expect(403);
  });

  it('rejects a user without a membership for the business', async () => {
    await storeRequest(noMembershipToken, ownerBusinessId)
      .send({ storeName: 'No Membership', storeCode: 'NO-MEMBERSHIP' })
      .expect(404);
  });

  it('rejects an inactive business', async () => {
    await storeRequest(inactiveOwnerToken, suspendedBusinessId)
      .send({ storeName: 'Inactive Branch', storeCode: 'INACTIVE' })
      .expect(403);
  });

  it.each(['MANAGER', 'CASHIER'])('rejects the %s role', async (role) => {
    const token = role === 'MANAGER' ? managerToken : cashierToken;

    await storeRequest(token, ownerBusinessId)
      .send({ storeName: `${role} Branch`, storeCode: `${role}-BRANCH` })
      .expect(403);
  });

  it.each([
    {},
    { storeName: 'x' },
    { storeName: '   ' },
    { storeName: 'Valid Branch', storeCode: 'c'.repeat(31) },
    { storeName: 'Valid Branch', tenantId: otherBusinessId },
  ])('rejects an invalid request body (%j)', async (body) => {
    await storeRequest(ownerToken, ownerBusinessId).send(body).expect(400);
  });

  it('maps a duplicate store code to a conflict', async () => {
    await storeRequest(ownerToken, ownerBusinessId)
      .send({ storeName: 'Duplicate Branch', storeCode: '  TAMBARAM  ' })
      .expect(409);
  });

  it('does not allow creating a store under another user business', async () => {
    await storeRequest(ownerToken, otherBusinessId)
      .send({ storeName: 'Intruder Branch', storeCode: 'INTRUDER' })
      .expect(404);
  });

  it('requires authentication', async () => {
    await request(server())
      .post('/stores')
      .set('X-Business-Id', ownerBusinessId)
      .send({ storeName: 'Anonymous Branch', storeCode: 'ANONYMOUS' })
      .expect(401);
  });
});
