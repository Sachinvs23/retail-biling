import { describe, expect, it } from 'vite-plus/test';

import { ApiError } from '../../app/api/api-error';
import { getAuthErrorKey } from './utils/auth-error';
import { resolveSafeRedirect } from './utils/redirect';
import { normalizeEmail, validateLogin, validateRegister } from './validation';

describe('authentication helpers', () => {
  it('normalizes email addresses', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('validates login input', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'emailRequired',
      password: 'passwordRequired',
    });
    expect(
      validateLogin({ email: 'not-an-email', password: 'secret' }),
    ).toEqual({ email: 'emailInvalid' });
    expect(
      validateLogin({ email: 'user@example.com', password: 'secret' }),
    ).toEqual({});
  });

  it('validates registration input', () => {
    const errors = validateRegister({
      name: '',
      email: 'user@example.com',
      password: 'short',
      confirmPassword: 'different',
    });

    expect(errors).toEqual({
      name: 'nameRequired',
      password: 'passwordTooShort',
      confirmPassword: 'passwordMismatch',
    });
  });

  it('accepts only same-origin relative redirects', () => {
    expect(
      resolveSafeRedirect('/dashboard?tab=sales', '/', 'https://app.test'),
    ).toBe('/dashboard?tab=sales');
    expect(
      resolveSafeRedirect('https://evil.test', '/', 'https://app.test'),
    ).toBe('/');
    expect(resolveSafeRedirect('//evil.test', '/', 'https://app.test')).toBe(
      '/',
    );
    expect(resolveSafeRedirect('/\\evil.test', '/', 'https://app.test')).toBe(
      '/',
    );
  });

  it('maps server errors to localized error keys', () => {
    expect(getAuthErrorKey(new ApiError(401, 'Invalid'), 'login')).toBe(
      'invalidCredentials',
    );
    expect(getAuthErrorKey(new ApiError(409, 'Duplicate'), 'register')).toBe(
      'duplicateEmail',
    );
    expect(getAuthErrorKey(new ApiError(400, 'Bad request'), 'register')).toBe(
      'validation',
    );
    expect(getAuthErrorKey(new Error('offline'), 'login')).toBe('generic');
  });
});
