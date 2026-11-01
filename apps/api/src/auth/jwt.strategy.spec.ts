import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('requires JWT_SECRET configuration', () => {
    const config = {
      getOrThrow: vi.fn(() => {
        throw new Error('missing config');
      }),
    };
    expect(() => new JwtStrategy(config as unknown as ConfigService)).toThrow(
      'missing config',
    );
    expect(config.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('maps a validated token payload to authenticated identity', () => {
    const config = { getOrThrow: vi.fn(() => 'test-secret') };
    const strategy = new JwtStrategy(config as unknown as ConfigService);
    expect(
      strategy.validate({ sub: 'user-1', email: 'person@example.com' }),
    ).toEqual({ userId: 'user-1', email: 'person@example.com' });
  });
});
