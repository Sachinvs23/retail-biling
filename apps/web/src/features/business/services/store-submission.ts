import type { BusinessContextData } from '../types/business.types';
import {
  hasStoreValidationErrors,
  validateCreateStore,
  type CreateStoreValues,
  type StoreValidationErrors,
} from '../store-validation';
import {
  getBusinessErrorKey,
  type BusinessErrorKey,
} from '../utils/business-error';
import { createStore } from './store-flows';

export type StoreSubmissionResult =
  | { status: 'validation'; errors: StoreValidationErrors }
  | { status: 'success'; context: BusinessContextData }
  | { status: 'error'; errorKey: BusinessErrorKey };

export async function submitStoreCreation(
  values: CreateStoreValues,
  create: typeof createStore = createStore,
): Promise<StoreSubmissionResult> {
  const errors = validateCreateStore(values);

  if (hasStoreValidationErrors(errors)) {
    return { status: 'validation', errors };
  }

  try {
    const context = await create(values);

    return { status: 'success', context };
  } catch (error) {
    return {
      status: 'error',
      errorKey: getBusinessErrorKey(error, 'store-create'),
    };
  }
}
