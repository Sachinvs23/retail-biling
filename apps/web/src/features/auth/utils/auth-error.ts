import { ApiError } from '../../../app/api/api-error';

export type AuthFlow = 'login' | 'register';

export type AuthErrorKey =
  | 'invalidCredentials'
  | 'duplicateEmail'
  | 'validation'
  | 'generic';

export function getAuthErrorKey(error: unknown, flow: AuthFlow): AuthErrorKey {
  if (!(error instanceof ApiError)) {
    return 'generic';
  }

  if (flow === 'login' && error.status === 401) {
    return 'invalidCredentials';
  }

  if (flow === 'register' && error.status === 409) {
    return 'duplicateEmail';
  }

  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }

  return 'generic';
}
