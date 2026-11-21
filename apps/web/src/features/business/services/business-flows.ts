import { businessApi } from '../api/business-api';
import { businessContext } from '../session/business-context';
import type { BusinessContextData } from '../types/business.types';
import {
  normalizeCreateBusinessPayload,
  type CreateBusinessValues,
} from '../validation';

export async function createBusiness(
  values: CreateBusinessValues,
): Promise<BusinessContextData> {
  const payload = normalizeCreateBusinessPayload(values);
  const response = await businessApi.create(payload);
  const context = businessContext.applyResponse(response);

  await businessContext.refreshBusinessList().catch(() => undefined);

  return context;
}
