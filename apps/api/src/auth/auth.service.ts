import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtService } from '@nestjs/jwt';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name.trim(),
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    // Generate a cryptographically secure refresh token.
    const refreshToken = randomBytes(32).toString('hex');

    // Group tokens belonging to this login session.
    const familyId = randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // Store only the SHA-256 hash, never the raw token.
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (
        !storedToken ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= now
      ) {
        return { success: false as const };
      }

      // A previously used token indicates possible token theft.
      if (storedToken.usedAt) {
        await tx.refreshToken.updateMany({
          where: {
            familyId: storedToken.familyId,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });

        return { success: false as const };
      }

      // Atomically claim the token. This prevents two concurrent
      // refresh requests from successfully rotating the same token.
      const claimed = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimed.count !== 1) {
        await tx.refreshToken.updateMany({
          where: {
            familyId: storedToken.familyId,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });

        return { success: false as const };
      }

      const newRefreshToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

      await tx.refreshToken.create({
        data: {
          userId: storedToken.userId,
          familyId: storedToken.familyId,
          tokenHash: hashRefreshToken(newRefreshToken),
          expiresAt,
        },
      });

      return {
        success: true as const,
        userId: storedToken.userId,
        email: storedToken.user.email,
        refreshToken: newRefreshToken,
      };
    });

    if (!result.success) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: result.userId,
      email: result.email,
    });

    return {
      access_token: accessToken,
      refresh_token: result.refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { familyId: true },
    });

    if (!storedToken) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        familyId: storedToken.familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
