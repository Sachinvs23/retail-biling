import { describe, expect, it } from 'vite-plus/test';

import {
  hasBusinessValidationErrors,
  normalizeCreateBusinessPayload,
  validateCreateBusiness,
  type CreateBusinessValues,
} from './validation';

const validValues: CreateBusinessValues = {
  businessName: '  Sri Murugan Stores  ',
  slug: 'sri-murugan-stores',
  storeName: '  Main Branch  ',
  storeCode: '  MAIN  ',
};

describe('business validation', () => {
  it('accepts values matching the backend DTO constraints', () => {
    expect(validateCreateBusiness(validValues)).toEqual({});
    expect(
      hasBusinessValidationErrors(validateCreateBusiness(validValues)),
    ).toBe(false);
    expect(normalizeCreateBusinessPayload(validValues)).toEqual({
      businessName: 'Sri Murugan Stores',
      slug: 'sri-murugan-stores',
      storeName: 'Main Branch',
      storeCode: 'MAIN',
    });
  });

  it('omits a blank optional store code from the request', () => {
    const payload = normalizeCreateBusinessPayload({
      ...validValues,
      storeCode: '   ',
    });

    expect(payload).not.toHaveProperty('storeCode');
  });

  it('reports required and invalid field values', () => {
    const errors = validateCreateBusiness({
      businessName: ' ',
      slug: 'Invalid Slug',
      storeName: 'x',
      storeCode: 'c'.repeat(31),
    });

    expect(errors).toEqual({
      businessName: 'businessNameRequired',
      slug: 'slugInvalid',
      storeName: 'storeNameTooShort',
      storeCode: 'storeCodeTooLong',
    });
    expect(hasBusinessValidationErrors(errors)).toBe(true);
  });

  it('enforces backend length boundaries', () => {
    expect(
      validateCreateBusiness({
        businessName: 'a',
        slug: 'ab',
        storeName: 'a'.repeat(101),
        storeCode: '',
      }),
    ).toEqual({
      businessName: 'businessNameTooShort',
      slug: 'slugTooShort',
      storeName: 'storeNameTooLong',
    });

    expect(
      validateCreateBusiness({
        ...validValues,
        businessName: 'a'.repeat(101),
        slug: 'a'.repeat(61),
      }),
    ).toEqual({
      businessName: 'businessNameTooLong',
      slug: 'slugTooLong',
    });
  });
});
