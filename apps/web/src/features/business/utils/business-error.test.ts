import { describe, expect, it } from 'vite-plus/test';

import { ApiError } from '../../../app/api/api-error';
import { getBusinessErrorKey, isBusinessContextError } from './business-error';

describe('business error handling', () => {
  it('treats 403 and 404 context failures as stale context', () => {
    expect(isBusinessContextError(new ApiError(403, 'Forbidden'))).toBe(true);
    expect(isBusinessContextError(new ApiError(404, 'Not found'))).toBe(true);
    expect(isBusinessContextError(new ApiError(401, 'Unauthorized'))).toBe(
      false,
    );
    expect(isBusinessContextError(new Error('Network'))).toBe(false);
  });

  it('maps context failures to localized message keys', () => {
    expect(getBusinessErrorKey(new ApiError(404, 'Not found'), 'context')).toBe(
      'invalidContext',
    );
    expect(getBusinessErrorKey(new ApiError(403, 'Forbidden'), 'context')).toBe(
      'invalidContext',
    );
  });

  it('maps creation and authentication failures', () => {
    expect(getBusinessErrorKey(new ApiError(409, 'Conflict'), 'create')).toBe(
      'duplicateBusiness',
    );
    expect(
      getBusinessErrorKey(new ApiError(400, 'Bad request'), 'create'),
    ).toBe('validation');
    expect(
      getBusinessErrorKey(new ApiError(401, 'No token'), 'discovery'),
    ).toBe('unauthorized');
    expect(getBusinessErrorKey(new Error('Network'), 'create')).toBe('generic');
  });
});
