import { describe, expect, it } from 'vite-plus/test';

import {
  hasStoreValidationErrors,
  normalizeCreateStorePayload,
  validateCreateStore,
  type CreateStoreValues,
} from './store-validation';

const validValues: CreateStoreValues = {
  storeName: '  Tambaram Branch  ',
  storeCode: '  TAMBARAM  ',
};

describe('store validation', () => {
  it('accepts valid values and normalizes whitespace', () => {
    expect(validateCreateStore(validValues)).toEqual({});
    expect(hasStoreValidationErrors(validateCreateStore(validValues))).toBe(
      false,
    );
    expect(normalizeCreateStorePayload(validValues)).toEqual({
      storeName: 'Tambaram Branch',
      storeCode: 'TAMBARAM',
    });
  });

  it('requires a store name', () => {
    const errors = validateCreateStore({ storeName: '   ', storeCode: '' });

    expect(errors).toEqual({ storeName: 'storeNameRequired' });
    expect(hasStoreValidationErrors(errors)).toBe(true);
  });

  it('enforces store name and optional code lengths', () => {
    expect(
      validateCreateStore({ storeName: 'a', storeCode: 'c'.repeat(31) }),
    ).toEqual({
      storeName: 'storeNameTooShort',
      storeCode: 'storeCodeTooLong',
    });
    expect(
      validateCreateStore({ storeName: 'a'.repeat(101), storeCode: '' }),
    ).toEqual({ storeName: 'storeNameTooLong' });
    expect(
      validateCreateStore({
        storeName: 'a'.repeat(100),
        storeCode: 'c'.repeat(30),
      }),
    ).toEqual({});
  });

  it('omits a blank optional store code', () => {
    const payload = normalizeCreateStorePayload({
      storeName: '  Branch  ',
      storeCode: '   ',
    });

    expect(payload).toEqual({ storeName: 'Branch' });
    expect(payload).not.toHaveProperty('storeCode');
  });
});
