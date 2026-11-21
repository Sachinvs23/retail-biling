import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { apiContext } from './api-context';

describe('api context', () => {
  beforeEach(() => {
    apiContext.clearState();
  });

  afterEach(() => {
    apiContext.clearState();
  });

  it('stores selected business and store context', () => {
    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('store-2');

    expect(apiContext.getBusinessId()).toBe('business-1');
    expect(apiContext.getStoreId()).toBe('store-2');
  });

  it('clears store context with business context', () => {
    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('store-2');

    apiContext.clearBusinessId();

    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
  });

  it('clears business, store and token together when state is cleared', () => {
    apiContext.setToken('access-token');
    apiContext.setBusinessId('business-1');
    apiContext.setStoreId('store-2');

    apiContext.clearState();

    expect(apiContext.getToken()).toBeNull();
    expect(apiContext.getBusinessId()).toBeNull();
    expect(apiContext.getStoreId()).toBeNull();
  });

  it('invalidates the session generation whenever authentication is cleared', () => {
    const generation = apiContext.getSessionGeneration();

    apiContext.setToken('access-token');
    apiContext.clearSession();

    expect(apiContext.getSessionGeneration()).toBeGreaterThan(generation);
    expect(apiContext.getToken()).toBeNull();
  });
});
