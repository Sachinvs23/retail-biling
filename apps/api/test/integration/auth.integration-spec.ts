import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

function getRefreshCookie(setCookie: string[] | string | undefined): string {
  const cookies = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];

  const refreshCookie = cookies.find((cookie) =>
    cookie.startsWith('refresh_token='),
  );

  if (!refreshCookie) {
    throw new Error('Refresh-token cookie was not returned');
  }

  return refreshCookie.split(';')[0]!;
}

describe('Authentication HTTP integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let userId: string | undefined;

  const testId = randomUUID();
  const email = `auth-${testId}@example.com`;
  const password = 'integration-test-password';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Match the production bootstrap configuration.
    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma && userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }

    await app?.close();
  });

  it('completes registration, login, refresh and logout lifecycle', async () => {
    const server = app!.getHttpServer();

    // 1. Register
    const registerResponse = await request(server)
      .post('/auth/register')
      .send({
        name: 'Auth Integration Test',
        email,
        password,
      })
      .expect(201);

    userId = registerResponse.body.id;

    expect(registerResponse.body).toMatchObject({
      email,
      name: 'Auth Integration Test',
    });

    expect(registerResponse.body).not.toHaveProperty('passwordHash');

    // 2. Login
    const loginResponse = await request(server)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginResponse.body).toMatchObject({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
    });

    expect(loginResponse.body).not.toHaveProperty('refresh_token');

    const loginCookie = getRefreshCookie(loginResponse.headers['set-cookie']);

    // 3. Access protected current-user endpoint
    const meResponse = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
      .expect(200);

    expect(meResponse.body).toEqual({
      id: userId,
      email,
    });

    // 4. Refresh the access token
    const refreshResponse = await request(server)
      .post('/auth/refresh')
      .set('Cookie', loginCookie)
      .expect(200);

    expect(refreshResponse.body).toMatchObject({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
    });

    expect(refreshResponse.body).not.toHaveProperty('refresh_token');

    const rotatedCookie = getRefreshCookie(
      refreshResponse.headers['set-cookie'],
    );

    // Verify the refreshed access token works.
    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshResponse.body.access_token}`)
      .expect(200);

    // 5. Logout
    const logoutResponse = await request(server)
      .post('/auth/logout')
      .set('Cookie', rotatedCookie)
      .expect(200);

    expect(logoutResponse.body).toEqual({
      message: 'Logged out successfully',
    });

    expect(logoutResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^refresh_token=;/)]),
    );

    // 6. Verify the revoked refresh token cannot be reused.
    await request(server)
      .post('/auth/refresh')
      .set('Cookie', rotatedCookie)
      .expect(401);
  });
});
