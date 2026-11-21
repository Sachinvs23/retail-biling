import type { QueryClient } from '@tanstack/react-query';

import { apiContext } from '../../../app/api/api-context';
import { queryClient as sharedQueryClient } from '../../../app/providers/query-client';
import { businessApi } from '../api/business-api';
import { businessKeys } from '../business-keys';
import type {
  BusinessActivationOutcome,
  BusinessContextData,
  BusinessContextResponse,
  BusinessDiscoveryOutcome,
  BusinessSelectionOutcome,
  CreateBusinessResponse,
} from '../types/business.types';
import { isBusinessContextError } from '../utils/business-error';
import { normalizeBusinessResponse } from '../utils/business-normalizer';

export interface BusinessContextService {
  getBusinessId(): string | null;
  getStoreId(): string | null;
  getActiveContext(): BusinessContextData | undefined;
  restore(): Promise<BusinessDiscoveryOutcome>;
  refreshBusinessList(): Promise<BusinessContextData[]>;
  selectBusiness(
    context: BusinessContextData,
    storeId?: string,
  ): BusinessSelectionOutcome;
  selectStore(storeId: string): void;
  applyResponse(
    response: BusinessContextResponse | CreateBusinessResponse,
  ): BusinessContextData;
  clear(): void;
}

export function createBusinessContext(
  client: QueryClient,
): BusinessContextService {
  let restorePromise: Promise<BusinessDiscoveryOutcome> | null = null;

  function isCurrent(generation: number): boolean {
    return generation === apiContext.getSessionGeneration();
  }

  function removeBusinessQueries(businessId: string | null): void {
    if (businessId) {
      client.removeQueries({ queryKey: businessKeys.root(businessId) });
    }
  }

  function activateContext(
    context: BusinessContextData,
    generation: number,
    preferredStoreId?: string,
  ): BusinessActivationOutcome {
    if (!isCurrent(generation)) {
      return { status: 'stale' };
    }

    const currentBusinessId = apiContext.getBusinessId();

    if (currentBusinessId && currentBusinessId !== context.business.id) {
      removeBusinessQueries(currentBusinessId);
    }

    const storedStoreId = apiContext.getStoreId();
    const requestedStoreId =
      preferredStoreId &&
      context.stores.some((store) => store.id === preferredStoreId)
        ? preferredStoreId
        : storedStoreId &&
            context.stores.some((store) => store.id === storedStoreId)
          ? storedStoreId
          : null;

    const store = requestedStoreId
      ? context.stores.find((item) => item.id === requestedStoreId)
      : context.stores.length === 1
        ? context.stores[0]
        : undefined;

    apiContext.setBusinessId(context.business.id);

    if (store) {
      apiContext.setStoreId(store.id);
    } else {
      apiContext.clearStoreId();
    }

    client.setQueryData(businessKeys.context(context.business.id), context);
    client.setQueryData(
      businessKeys.stores(context.business.id),
      context.stores,
    );

    if (context.stores.length === 0) {
      return { status: 'store-setup-required', context };
    }

    if (!store) {
      return { status: 'store-selection-required', context };
    }

    return { status: 'ready', context };
  }

  function clear(): void {
    removeBusinessQueries(apiContext.getBusinessId());
    apiContext.clearBusinessId();
    apiContext.clearStoreId();
  }

  function discardStaleRestore(
    capturedBusinessId: string | null,
  ): BusinessDiscoveryOutcome {
    removeBusinessQueries(capturedBusinessId);
    return { status: 'stale' };
  }

  async function restore(): Promise<BusinessDiscoveryOutcome> {
    if (restorePromise) {
      return restorePromise;
    }

    const generation = apiContext.getSessionGeneration();
    const storedBusinessId = apiContext.getBusinessId();

    restorePromise = (async () => {
      if (storedBusinessId) {
        try {
          const response = await businessApi.getContext(storedBusinessId);

          if (!isCurrent(generation)) {
            return discardStaleRestore(storedBusinessId);
          }

          return activateContext(
            normalizeBusinessResponse(response),
            generation,
          );
        } catch (error) {
          if (!isCurrent(generation)) {
            return discardStaleRestore(storedBusinessId);
          }

          if (!isBusinessContextError(error)) {
            throw error;
          }

          clear();
        }
      } else {
        apiContext.clearStoreId();
      }

      const { businesses } = await businessApi.list();

      if (!isCurrent(generation)) {
        return discardStaleRestore(storedBusinessId);
      }

      if (businesses.length === 0) {
        clear();
        return { status: 'onboarding-required' as const };
      }

      if (businesses.length === 1) {
        return activateContext(businesses[0]!, generation);
      }

      clear();
      return { status: 'selection-required' as const, businesses };
    })().finally(() => {
      restorePromise = null;
    });

    return restorePromise;
  }

  async function refreshBusinessList(): Promise<BusinessContextData[]> {
    const generation = apiContext.getSessionGeneration();
    const { businesses } = await businessApi.list();

    if (isCurrent(generation)) {
      client.setQueryData(businessKeys.discoveryList(), businesses);
    }

    return businesses;
  }

  function applyResponse(
    response: BusinessContextResponse | CreateBusinessResponse,
  ): BusinessContextData {
    const outcome = activateContext(
      normalizeBusinessResponse(response),
      apiContext.getSessionGeneration(),
    );

    if (outcome.status === 'stale') {
      throw new Error('Session changed before business context was applied');
    }

    return outcome.context;
  }

  function selectBusiness(
    context: BusinessContextData,
    storeId?: string,
  ): BusinessSelectionOutcome {
    if (storeId && !context.stores.some((store) => store.id === storeId)) {
      throw new Error('Store does not belong to the selected business');
    }

    const outcome = activateContext(
      context,
      apiContext.getSessionGeneration(),
      storeId,
    );

    if (outcome.status === 'stale') {
      throw new Error('Session changed before business could be selected');
    }

    return outcome;
  }

  function selectStore(storeId: string): void {
    const businessId = apiContext.getBusinessId();

    if (!businessId) {
      throw new Error('No active business is selected');
    }

    const context = client.getQueryData<BusinessContextData>(
      businessKeys.context(businessId),
    );

    if (!context?.stores.some((store) => store.id === storeId)) {
      throw new Error('Store does not belong to the active business');
    }

    const previousStoreId = apiContext.getStoreId();

    if (previousStoreId && previousStoreId !== storeId) {
      client.removeQueries({
        queryKey: businessKeys.storeScope(businessId, previousStoreId),
      });
    }

    apiContext.setStoreId(storeId);
  }

  function getActiveContext(): BusinessContextData | undefined {
    const businessId = apiContext.getBusinessId();

    return businessId
      ? client.getQueryData<BusinessContextData>(
          businessKeys.context(businessId),
        )
      : undefined;
  }

  return {
    getBusinessId: () => apiContext.getBusinessId(),
    getStoreId: () => apiContext.getStoreId(),
    getActiveContext,
    restore,
    refreshBusinessList,
    selectBusiness,
    selectStore,
    applyResponse,
    clear,
  };
}

export const businessContext = createBusinessContext(sharedQueryClient);
