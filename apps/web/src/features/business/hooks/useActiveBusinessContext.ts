import { useQuery } from '@tanstack/react-query';

import { businessKeys } from '../business-keys';
import { businessContext } from '../session/business-context';

export function useActiveBusinessContext() {
  const businessId = businessContext.getBusinessId();
  const storeId = businessContext.getStoreId();

  const query = useQuery({
    queryKey: businessKeys.context(businessId ?? 'none'),
    queryFn: () => {
      const context = businessContext.getActiveContext();

      if (!context) {
        throw new Error('Business context is not available');
      }

      return context;
    },
    enabled: Boolean(businessId),
    retry: false,
    staleTime: Infinity,
  });

  return { context: query.data, storeId };
}
