import { apiContext } from '../../../app/api/api-context';
import { storeApi } from '../api/store-api';
import { businessContext } from '../session/business-context';
import type { BusinessContextData } from '../types/business.types';
import {
  normalizeCreateStorePayload,
  type CreateStoreValues,
} from '../store-validation';

export async function createStore(
  values: CreateStoreValues,
): Promise<BusinessContextData> {
  const generation = apiContext.getSessionGeneration();
  const businessId = apiContext.getBusinessId();

  if (!businessId) {
    throw new Error('No active business is selected');
  }

  const response = await storeApi.create(normalizeCreateStorePayload(values));

  if (
    generation !== apiContext.getSessionGeneration() ||
    apiContext.getBusinessId() !== businessId
  ) {
    throw new Error('Session or business changed before the store was added');
  }

  return businessContext.applyCreatedStore(response, businessId, generation);
}
