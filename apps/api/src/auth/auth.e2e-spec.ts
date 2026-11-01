import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('Auth HTTP flow', () => {
  const secret = 'test-only-jwt-secret';
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret, signOptions: { expiresIn: '15m' } }),
      ],
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: { register: vi.fn(), login: vi.fn() },
        },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects missing, malformed, and invalidly signed tokens', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer malformed')
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set(
        'Authorization',
        'Bearer ' +
          (await new JwtService({ secret: 'other-secret' }).signAsync({
            sub: 'user-1',
            email: 'a@example.com',
          })),
      )
      .expect(401);
    const expiredToken = await jwt.signAsync(
      { sub: 'user-1', email: 'a@example.com' },
      { expiresIn: '-1s' },
    );
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('authenticates a signed token and returns only the validated public identity', async () => {
    const token = await jwt.signAsync({
      sub: 'user-1',
      email: 'a@example.com',
      role: 'OWNER',
    });
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toEqual({ id: 'user-1', email: 'a@example.com' });
    expect(response.body).not.toHaveProperty('role');
  });
});
