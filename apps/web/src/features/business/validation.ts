import type { CreateBusinessRequest } from './types/business.types';

export interface CreateBusinessValues {
  businessName: string;
  slug: string;
  storeName: string;
  storeCode: string;
}

export type BusinessField = keyof CreateBusinessValues;

export type BusinessValidationMessageKey =
  | 'businessNameRequired'
  | 'businessNameTooShort'
  | 'businessNameTooLong'
  | 'slugRequired'
  | 'slugTooShort'
  | 'slugTooLong'
  | 'slugInvalid'
  | 'storeNameRequired'
  | 'storeNameTooShort'
  | 'storeNameTooLong'
  | 'storeCodeTooLong';

export type BusinessValidationErrors = Partial<
  Record<BusinessField, BusinessValidationMessageKey>
>;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 60;
const MAX_STORE_CODE_LENGTH = 30;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateCreateBusiness(
  values: CreateBusinessValues,
): BusinessValidationErrors {
  const errors: BusinessValidationErrors = {};
  const businessName = values.businessName.trim();
  const slug = values.slug.trim();
  const storeName = values.storeName.trim();
  const storeCode = values.storeCode.trim();

  if (!businessName) {
    errors.businessName = 'businessNameRequired';
  } else if (businessName.length < MIN_NAME_LENGTH) {
    errors.businessName = 'businessNameTooShort';
  } else if (businessName.length > MAX_NAME_LENGTH) {
    errors.businessName = 'businessNameTooLong';
  }

  if (!slug) {
    errors.slug = 'slugRequired';
  } else if (slug.length < MIN_SLUG_LENGTH) {
    errors.slug = 'slugTooShort';
  } else if (slug.length > MAX_SLUG_LENGTH) {
    errors.slug = 'slugTooLong';
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = 'slugInvalid';
  }

  if (!storeName) {
    errors.storeName = 'storeNameRequired';
  } else if (storeName.length < MIN_NAME_LENGTH) {
    errors.storeName = 'storeNameTooShort';
  } else if (storeName.length > MAX_NAME_LENGTH) {
    errors.storeName = 'storeNameTooLong';
  }

  if (storeCode.length > MAX_STORE_CODE_LENGTH) {
    errors.storeCode = 'storeCodeTooLong';
  }

  return errors;
}

export function hasBusinessValidationErrors(
  errors: BusinessValidationErrors,
): boolean {
  return Object.keys(errors).length > 0;
}

export function normalizeCreateBusinessPayload(
  values: CreateBusinessValues,
): CreateBusinessRequest {
  const storeCode = values.storeCode.trim();

  return {
    businessName: values.businessName.trim(),
    slug: values.slug.trim(),
    storeName: values.storeName.trim(),
    ...(storeCode ? { storeCode } : {}),
  };
}
