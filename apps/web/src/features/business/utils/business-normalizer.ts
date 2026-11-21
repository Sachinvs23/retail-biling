import type {
  BusinessContextData,
  BusinessContextResponse,
  CreateBusinessResponse,
} from '../types/business.types';

export function normalizeBusinessResponse(
  response: BusinessContextResponse | CreateBusinessResponse,
): BusinessContextData {
  const stores =
    'stores' in response
      ? response.stores
      : response.store
        ? [response.store]
        : [];

  return {
    business: { ...response.business },
    membership: { ...response.membership },
    stores: stores.map((store) => ({ ...store })),
  };
}
