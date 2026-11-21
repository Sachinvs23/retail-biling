import { createFileRoute } from '@tanstack/react-router';

import OnboardingPage from '../../features/business/pages/OnboardingPage';
import type { BusinessDiscoveryOutcome } from '../../features/business/types/business.types';
import {
  isAddBusinessIntent,
  parseBusinessOnboardingSearch,
  requireBusinessSetupOutcome,
} from '../../features/business/utils/business-routing';

export const Route = createFileRoute('/_onboarding/onboarding')({
  validateSearch: (search: Record<string, unknown>) =>
    parseBusinessOnboardingSearch(search),

  beforeLoad: ({ context, location }) => {
    const outcome = (
      context as unknown as {
        businessOutcome: BusinessDiscoveryOutcome;
      }
    ).businessOutcome;

    if (outcome.status === 'ready' && isAddBusinessIntent(location.search)) {
      return;
    }

    requireBusinessSetupOutcome(outcome, 'onboarding-required', location.href);
  },
  component: OnboardingPage,
});
