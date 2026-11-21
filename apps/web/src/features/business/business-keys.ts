export const businessKeys = {
  root: (businessId: string) => ['business', businessId] as const,

  scope: (businessId: string, ...segments: readonly string[]) =>
    [...businessKeys.root(businessId), ...segments] as const,

  context: (businessId: string) => businessKeys.scope(businessId, 'context'),

  stores: (businessId: string) => businessKeys.scope(businessId, 'stores'),

  storeScope: (
    businessId: string,
    storeId: string,
    ...segments: readonly string[]
  ) => businessKeys.scope(businessId, 'store', storeId, ...segments),

  products: (businessId: string, ...segments: readonly string[]) =>
    businessKeys.scope(businessId, 'products', ...segments),

  inventory: (
    businessId: string,
    storeId: string,
    ...segments: readonly string[]
  ) => businessKeys.storeScope(businessId, storeId, 'inventory', ...segments),

  discoveryList: () => ['businesses'] as const,

  discovery: (userId: string) =>
    [...businessKeys.discoveryList(), userId] as const,
};
