import { ApiError } from '../../../app/api/api-error';

export type BusinessFlow = 'context' | 'discovery' | 'create' | 'store-create';

export type BusinessErrorKey =
  | 'invalidContext'
  | 'duplicateBusiness'
  | 'duplicateStore'
  | 'validation'
  | 'unauthorized'
  | 'generic';

export function isBusinessContextError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError && (error.status === 403 || error.status === 404)
  );
}

export function getBusinessErrorKey(
  error: unknown,
  flow: BusinessFlow,
): BusinessErrorKey {
  if (!(error instanceof ApiError)) {
    return 'generic';
  }

  if (error.status === 401) {
    return 'unauthorized';
  }

  if (flow === 'context' && (error.status === 403 || error.status === 404)) {
    return 'invalidContext';
  }

  if (flow === 'create' && error.status === 409) {
    return 'duplicateBusiness';
  }

  if (flow === 'store-create' && error.status === 409) {
    return 'duplicateStore';
  }

  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }

  return 'generic';
}
