import { useRouteContext } from '@tanstack/react-router';

import type { BusinessDiscoveryOutcome } from '../types/business.types';

interface OnboardingRouteContext {
  businessOutcome: BusinessDiscoveryOutcome;
}

export function useBusinessSetupOutcome(): BusinessDiscoveryOutcome {
  const context = useRouteContext({
    from: '/_onboarding',
  }) as unknown as OnboardingRouteContext;

  return context.businessOutcome;
}
