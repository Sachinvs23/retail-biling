import type { CreateStoreRequest } from './types/business.types';

export interface CreateStoreValues {
  storeName: string;
  storeCode: string;
}

export type StoreField = keyof CreateStoreValues;

export type StoreValidationMessageKey =
  | 'storeNameRequired'
  | 'storeNameTooShort'
  | 'storeNameTooLong'
  | 'storeCodeTooLong';

export type StoreValidationErrors = Partial<
  Record<StoreField, StoreValidationMessageKey>
>;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_STORE_CODE_LENGTH = 30;

export function validateCreateStore(
  values: CreateStoreValues,
): StoreValidationErrors {
  const errors: StoreValidationErrors = {};
  const storeName = values.storeName.trim();
  const storeCode = values.storeCode.trim();

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

export function hasStoreValidationErrors(
  errors: StoreValidationErrors,
): boolean {
  return Object.keys(errors).length > 0;
}

export function normalizeCreateStorePayload(
  values: CreateStoreValues,
): CreateStoreRequest {
  const storeCode = values.storeCode.trim();

  return {
    storeName: values.storeName.trim(),
    ...(storeCode ? { storeCode } : {}),
  };
}
